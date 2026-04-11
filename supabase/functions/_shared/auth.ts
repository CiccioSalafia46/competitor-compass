type AuthenticatedUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};

type QueryResult<T> = {
  data: T[] | null;
  error: unknown;
};

type QueryBuilder<T extends Record<string, unknown>> = PromiseLike<QueryResult<T>> & {
  select: (columns: string) => QueryBuilder<T>;
  eq: (column: string, value: string) => QueryBuilder<T>;
  maybeSingle: () => Promise<{ data: T | null; error: unknown }>;
};

type SupabaseClientLike = {
  auth: {
    getUser: (token: string) => Promise<{ data: { user: AuthenticatedUser | null }; error: unknown }>;
  };
  from: <T extends Record<string, unknown>>(table: string) => QueryBuilder<T>;
};

type WorkspaceAccess = {
  membershipRole: string | null;
  appRoles: string[];
};

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeOrigins(rawValue: string | undefined | null) {
  return (rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Parse PLATFORM_ADMIN_EMAILS once at module load instead of on every request.
// Deno modules are long-lived per isolate, so this Set persists across calls.
const PLATFORM_ADMIN_EMAIL_SET: Set<string> = new Set(
  normalizeOrigins(Deno.env.get("PLATFORM_ADMIN_EMAILS")).map(normalizeEmail),
);

export async function requireAuthenticatedUser(supabase: SupabaseClientLike, req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new HttpError(401, "Unauthorized");
  }

  return { user: data.user, token };
}

export async function getWorkspaceAccess(
  supabase: SupabaseClientLike,
  userId: string,
  workspaceId: string,
): Promise<WorkspaceAccess> {
  type MembershipRow = { role?: string | null };
  type UserRoleRow = { role?: string | null };

  const [{ data: membership }, { data: userRoles }] = await Promise.all([
    supabase
      .from<MembershipRow>("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from<UserRoleRow>("user_roles")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId),
  ]);

  return {
    membershipRole: membership?.role ?? null,
    appRoles: Array.isArray(userRoles)
      ? userRoles
          .map((item: { role?: unknown }) => (typeof item.role === "string" ? item.role : ""))
          .filter(Boolean)
      : [],
  };
}

export async function assertWorkspaceMember(supabase: SupabaseClientLike, userId: string, workspaceId: string) {
  const access = await getWorkspaceAccess(supabase, userId, workspaceId);
  if (!access.membershipRole) {
    throw new HttpError(403, "Forbidden");
  }

  return access;
}

export async function assertWorkspaceAdmin(supabase: SupabaseClientLike, userId: string, workspaceId: string) {
  const access = await assertWorkspaceMember(supabase, userId, workspaceId);
  const isAdmin =
    access.membershipRole === "owner" ||
    access.membershipRole === "admin" ||
    access.appRoles.includes("admin");

  if (!isAdmin) {
    throw new HttpError(403, "Forbidden");
  }

  return access;
}

export async function assertWorkspaceAnalyst(supabase: SupabaseClientLike, userId: string, workspaceId: string) {
  const access = await assertWorkspaceMember(supabase, userId, workspaceId);
  const canAnalyze =
    access.membershipRole === "owner" ||
    access.membershipRole === "admin" ||
    access.appRoles.includes("admin") ||
    access.appRoles.includes("analyst");

  if (!canAnalyze) {
    throw new HttpError(403, "Forbidden");
  }

  return access;
}

export async function assertVerifiedUser(user: AuthenticatedUser | null) {
  if (!user?.email_confirmed_at) {
    throw new HttpError(403, "Please verify your email before continuing.");
  }
}

export async function isPlatformAdmin(supabase: SupabaseClientLike, user: AuthenticatedUser) {
  const email = normalizeEmail(user?.email);

  if (email && PLATFORM_ADMIN_EMAIL_SET.has(email)) {
    return true;
  }

  const { data, error } = await supabase
    .from<{ user_id?: string | null }>("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[auth] platform_admin lookup failed", error);
    return false;
  }

  return Boolean(data?.user_id);
}

export async function assertPlatformAdmin(supabase: SupabaseClientLike, user: AuthenticatedUser) {
  const allowed = await isPlatformAdmin(supabase, user);
  if (!allowed) {
    throw new HttpError(403, "Forbidden");
  }
}
