import type { Page, Route } from "@playwright/test";

type MockUser = {
  id: string;
  email: string;
  email_confirmed_at: string | null;
};

type MockWorkspace = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

type MockCompetitor = {
  id: string;
  workspace_id: string;
  name: string;
  website: string | null;
  is_monitored: boolean;
};

type MockGmailConnection = {
  id: string;
  workspace_id: string;
  user_id: string;
  email_address: string;
  connected_at: string;
  last_sync_at: string | null;
  sync_status: string;
  sync_error: string | null;
  last_history_id: string | null;
  created_at: string;
  updated_at: string;
};

type MockBillingState = {
  subscribed: boolean;
  tier: "free" | "starter" | "premium";
  price_id?: string | null;
  subscription_end?: string | null;
  cancel_at_period_end?: boolean;
};

type MockAdminOverview = {
  recentSignups: number;
  totalUsers: number;
  totalWorkspaces: number;
  gmailConnections: number;
  totalNewsletters: number;
  totalInsights: number;
  totalCompetitors: number;
  totalAnalyses: number;
  totalMetaAds: number;
  rateLimitHits: number;
  recentActivity?: Array<{
    id: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    created_at: string;
  }>;
  syncErrors?: Array<{
    id: string;
    email_address: string;
    sync_status: string;
    sync_error: string | null;
  }>;
};

type MockDashboardSnapshot = {
  workspaceId: string;
  workspaceName: string;
  gmailConnected: boolean;
  unreadAlertCount: number;
  stats: {
    newsletters: number;
    competitors: number;
    completedAnalyses: number;
    metaAds: number;
    activeAds: number;
    inboxItems: number;
    insightCount: number;
  };
  usage: {
    competitors: number;
    newsletters_this_month: number;
    analyses_this_month: number;
    seats_used: number;
  };
  limits: {
    competitors: number;
    newsletters_per_month: number;
    analyses_per_month: number;
  };
  recentInbox: Array<{
    id: string;
    subject: string | null;
    from_name: string | null;
    from_email: string | null;
    received_at: string | null;
    is_read: boolean;
  }>;
  competitors: Array<{
    id: string;
    name: string;
    website: string | null;
    is_monitored: boolean;
  }>;
  decisionModel: {
    dailyHighlights: Array<{ title: string; detail: string; tone: "positive" | "warning" | "neutral" }>;
    prioritizedInsights: Array<{
      id: string;
      workspace_id: string;
      category: string;
      title: string;
      what_is_happening: string;
      why_it_matters: string;
      strategic_implication: string;
      recommended_response: string;
      confidence: number | null;
      supporting_evidence: Array<{ label: string; detail: string }>;
      affected_competitors: string[];
      source_type: string;
      priority_level: "critical" | "high" | "medium" | "monitor";
      created_at: string;
    }>;
    anomalies: Array<{
      title: string;
      detail: string;
      severity: "critical" | "high" | "medium" | "monitor";
      path: string;
    }>;
    competitorSummary: Array<{
      competitor: string;
      newsletters: number;
      ads: number;
      promoRate?: number;
    }>;
    recommendedActions: Array<{
      title: string;
      detail: string;
      path: string;
      priority: "critical" | "high" | "medium" | "monitor";
      cta: string;
    }>;
  };
};

type MockAppOptions = {
  user?: Partial<MockUser>;
  workspaces?: MockWorkspace[];
  membershipRole?: "owner" | "admin" | "member" | null;
  appRoles?: Array<"admin" | "analyst" | "viewer">;
  isPlatformAdmin?: boolean;
  competitors?: MockCompetitor[];
  gmailConnection?: MockGmailConnection | null;
  dashboardSnapshot?: MockDashboardSnapshot;
  billing?: MockBillingState;
  adminOverview?: MockAdminOverview;
  unreadAlertCount?: number;
  inboxCount?: number;
  insightCount?: number;
  totalNewsletters?: number;
  newslettersThisMonth?: number;
  totalAnalyses?: number;
  analysesThisMonth?: number;
  totalMetaAds?: number;
  activeAds?: number;
  seatsUsed?: number;
  gmailAuthUrl?: string;
  checkoutUrl?: string;
  customerPortalUrl?: string;
};

type MutableState = Required<
  Pick<
    MockAppOptions,
    | "workspaces"
    | "membershipRole"
    | "appRoles"
    | "isPlatformAdmin"
    | "competitors"
    | "gmailConnection"
    | "billing"
    | "adminOverview"
    | "unreadAlertCount"
    | "inboxCount"
    | "insightCount"
    | "totalNewsletters"
    | "newslettersThisMonth"
    | "totalAnalyses"
    | "analysesThisMonth"
    | "totalMetaAds"
    | "activeAds"
    | "seatsUsed"
    | "gmailAuthUrl"
    | "checkoutUrl"
    | "customerPortalUrl"
  >
> & {
  user: MockUser;
  dashboardSnapshot?: MockDashboardSnapshot;
  functionCalls: string[];
  restCalls: string[];
};

function nowIso() {
  return "2026-04-06T09:00:00.000Z";
}

function buildUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: overrides.id ?? "user-1",
    email: overrides.email ?? "owner@example.com",
    email_confirmed_at:
      overrides.email_confirmed_at === undefined ? "2026-04-06T08:00:00.000Z" : overrides.email_confirmed_at,
  };
}

function buildWorkspace(userId: string, overrides: Partial<MockWorkspace> = {}): MockWorkspace {
  return {
    id: overrides.id ?? "workspace-1",
    name: overrides.name ?? "Acme Ops",
    slug: overrides.slug ?? "acme-ops",
    owner_id: overrides.owner_id ?? userId,
    created_at: overrides.created_at ?? nowIso(),
    updated_at: overrides.updated_at ?? nowIso(),
  };
}

function buildSession(user: MockUser) {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(new Date("2026-04-06T10:00:00.000Z").getTime() / 1000),
    user: {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { display_name: "Mock User" },
      aud: "authenticated",
      role: "authenticated",
      created_at: "2026-04-06T08:00:00.000Z",
      updated_at: "2026-04-06T08:00:00.000Z",
    },
  };
}

function json(route: Route, body: unknown, status = 200, headers: Record<string, string> = {}) {
  return route.fulfill({
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function headCount(route: Route, count: number) {
  return route.fulfill({
    status: 200,
    headers: {
      "content-range": `0-0/${count}`,
      "range-unit": "items",
    },
  });
}

function safePostDataJson(route: Route) {
  try {
    return route.request().postDataJSON() as Record<string, unknown> | undefined;
  } catch {
    return undefined;
  }
}

function getEq(params: URLSearchParams, key: string) {
  const value = params.get(key);
  return value?.startsWith("eq.") ? decodeURIComponent(value.slice(3)) : value;
}

function buildDefaultDashboardSnapshot(state: MutableState): MockDashboardSnapshot {
  const workspace = state.workspaces[0] ?? buildWorkspace(state.user.id);
  const competitors = state.competitors.slice(0, 8).map((item) => ({
    id: item.id,
    name: item.name,
    website: item.website,
    is_monitored: item.is_monitored,
  }));

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    gmailConnected: Boolean(state.gmailConnection),
    unreadAlertCount: state.unreadAlertCount,
    stats: {
      newsletters: state.totalNewsletters,
      competitors: state.competitors.length,
      completedAnalyses: state.totalAnalyses,
      metaAds: state.totalMetaAds,
      activeAds: state.activeAds,
      inboxItems: state.inboxCount,
      insightCount: state.insightCount,
    },
    usage: {
      competitors: state.competitors.length,
      newsletters_this_month: state.newslettersThisMonth,
      analyses_this_month: state.analysesThisMonth,
      seats_used: state.seatsUsed,
    },
    limits: {
      competitors: state.billing.tier === "premium" ? -1 : state.billing.tier === "starter" ? 10 : 3,
      newsletters_per_month: state.billing.tier === "premium" ? 20000 : state.billing.tier === "starter" ? 2000 : 200,
      analyses_per_month: state.billing.tier === "premium" ? 5000 : state.billing.tier === "starter" ? 500 : 50,
    },
    recentInbox: [],
    competitors,
    decisionModel: {
      dailyHighlights: [
        {
          title: "Competitive activity stable",
          detail: "The current snapshot is mocked for browser verification.",
          tone: "neutral",
        },
      ],
      prioritizedInsights: [],
      anomalies: [],
      competitorSummary: competitors.map((item) => ({
        competitor: item.name,
        newsletters: 0,
        ads: 0,
      })),
      recommendedActions: state.competitors.length === 0
        ? [
            {
              title: "Add tracked competitors",
              detail: "The workspace needs competitors before intelligence can become useful.",
              path: "/competitors",
              priority: "critical",
              cta: "Add competitors",
            },
          ]
        : [],
    },
  };
}

export async function mockApp(page: Page, options: MockAppOptions = {}) {
  const user = buildUser(options.user);
  const state: MutableState = {
    user,
    workspaces: options.workspaces ?? [buildWorkspace(user.id)],
    membershipRole: options.membershipRole ?? "owner",
    appRoles: options.appRoles ?? ["admin"],
    isPlatformAdmin: options.isPlatformAdmin ?? false,
    competitors: options.competitors ?? [],
    gmailConnection: options.gmailConnection ?? null,
    billing: options.billing ?? {
      subscribed: false,
      tier: "free",
      price_id: null,
      subscription_end: null,
      cancel_at_period_end: false,
    },
    adminOverview: options.adminOverview ?? {
      recentSignups: 2,
      totalUsers: 12,
      totalWorkspaces: 4,
      gmailConnections: 3,
      totalNewsletters: 240,
      totalInsights: 18,
      totalCompetitors: 22,
      totalAnalyses: 90,
      totalMetaAds: 14,
      rateLimitHits: 0,
      recentActivity: [],
      syncErrors: [],
    },
    unreadAlertCount: options.unreadAlertCount ?? 0,
    inboxCount: options.inboxCount ?? 0,
    insightCount: options.insightCount ?? 0,
    totalNewsletters: options.totalNewsletters ?? 0,
    newslettersThisMonth: options.newslettersThisMonth ?? 0,
    totalAnalyses: options.totalAnalyses ?? 0,
    analysesThisMonth: options.analysesThisMonth ?? 0,
    totalMetaAds: options.totalMetaAds ?? 0,
    activeAds: options.activeAds ?? 0,
    seatsUsed: options.seatsUsed ?? 1,
    gmailAuthUrl: options.gmailAuthUrl ?? "https://example.com/oauth/mock-gmail",
    checkoutUrl: options.checkoutUrl ?? "https://example.com/mock-checkout",
    customerPortalUrl: options.customerPortalUrl ?? "https://example.com/mock-billing-portal",
    dashboardSnapshot: options.dashboardSnapshot,
    functionCalls: [],
    restCalls: [],
  };

  await page.route("**/auth/v1/**", async (route) => {
    try {
      const url = new URL(route.request().url());

      if (url.pathname.endsWith("/token") && route.request().method() === "POST") {
        return json(route, buildSession(state.user));
      }

      if (url.pathname.endsWith("/signup") && route.request().method() === "POST") {
        return json(route, {
          user: buildSession(state.user).user,
          session: null,
        });
      }

      if (url.pathname.endsWith("/user")) {
        return json(route, { user: buildSession(state.user).user });
      }

      if (url.pathname.endsWith("/logout")) {
        return json(route, {});
      }

      return json(route, {});
    } catch (error) {
      return json(route, { error: error instanceof Error ? error.message : "mock auth handler failed" }, 500);
    }
  });

  await page.route("**/rest/v1/**", async (route) => {
    try {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const method = request.method();
      const isHead = method === "HEAD";
      state.restCalls.push(`${method} ${path}`);

      if (path.endsWith("/rpc/create_workspace") && method === "POST") {
        const body = safePostDataJson(route) as { _name: string; _slug: string };
        const workspace = buildWorkspace(state.user.id, {
          id: `workspace-${state.workspaces.length + 1}`,
          name: body._name,
          slug: body._slug,
        });
        state.workspaces = [...state.workspaces, workspace];
        state.dashboardSnapshot = undefined;
        return json(route, workspace);
      }

      if (path.endsWith("/workspaces")) {
        return json(route, state.workspaces);
      }

      if (path.endsWith("/user_roles")) {
        const workspaceId = getEq(url.searchParams, "workspace_id");
        const userId = getEq(url.searchParams, "user_id");
        if (workspaceId && userId && userId === state.user.id) {
          return json(
            route,
            state.appRoles.map((role, index) => ({
              id: `role-${index + 1}`,
              user_id: state.user.id,
              workspace_id: workspaceId,
              role,
              created_at: nowIso(),
            })),
          );
        }

        return json(route, []);
      }

      if (path.endsWith("/workspace_members")) {
        if (isHead) {
          return headCount(route, state.seatsUsed);
        }

        const workspaceId = getEq(url.searchParams, "workspace_id");
        const userId = getEq(url.searchParams, "user_id");
        if (workspaceId && userId && state.membershipRole) {
          return json(route, { role: state.membershipRole });
        }

        return json(route, null);
      }

      if (path.endsWith("/competitors")) {
        if (isHead) {
          const workspaceId = getEq(url.searchParams, "workspace_id");
          const count = workspaceId
            ? state.competitors.filter((item) => item.workspace_id === workspaceId).length
            : state.competitors.length;
          return headCount(route, count);
        }

        if (method === "POST") {
          const raw = safePostDataJson(route);
          const rows = Array.isArray(raw) ? raw : [raw];
          const inserts = rows.map((row, index) => ({
            id: `competitor-${state.competitors.length + index + 1}`,
            workspace_id: String(row.workspace_id),
            name: String(row.name),
            website: row.website ? String(row.website) : null,
            is_monitored: true,
          }));
          state.competitors = [...state.competitors, ...inserts];
          state.dashboardSnapshot = undefined;
          return json(route, inserts);
        }

        const workspaceId = getEq(url.searchParams, "workspace_id");
        const monitored = getEq(url.searchParams, "is_monitored");
        const rows = state.competitors.filter((item) => {
          const workspaceMatches = workspaceId ? item.workspace_id === workspaceId : true;
          const monitoredMatches = monitored ? String(item.is_monitored) === monitored : true;
          return workspaceMatches && monitoredMatches;
        });
        return json(route, rows);
      }

      if (path.endsWith("/newsletter_entries")) {
        const hasMonthFilter = Boolean(url.searchParams.get("created_at"));
        const count = hasMonthFilter ? state.newslettersThisMonth : state.totalNewsletters;
        return isHead ? headCount(route, count) : json(route, []);
      }

      if (path.endsWith("/analyses")) {
        const hasMonthFilter = Boolean(url.searchParams.get("created_at"));
        const count = hasMonthFilter ? state.analysesThisMonth : state.totalAnalyses;
        return isHead ? headCount(route, count) : json(route, []);
      }

      if (path.endsWith("/meta_ads")) {
        const activeOnly = getEq(url.searchParams, "is_active") === "true";
        const count = activeOnly ? state.activeAds : state.totalMetaAds;
        return isHead ? headCount(route, count) : json(route, []);
      }

      if (path.endsWith("/newsletter_inbox")) {
        return isHead ? headCount(route, state.inboxCount) : json(route, []);
      }

      if (path.endsWith("/insights")) {
        return isHead ? headCount(route, state.insightCount) : json(route, []);
      }

      if (path.endsWith("/alerts")) {
        return isHead ? headCount(route, state.unreadAlertCount) : json(route, []);
      }

      if (path.endsWith("/gmail_connections")) {
        return json(route, state.gmailConnection);
      }

      return json(route, []);
    } catch (error) {
      return json(route, { error: error instanceof Error ? error.message : "mock rest handler failed" }, 500);
    }
  });

  await page.route("**/functions/v1/**", async (route) => {
    try {
      const url = new URL(route.request().url());
      const functionName = url.pathname.split("/").pop() ?? "";
      const body = safePostDataJson(route);
      const action = typeof body?.action === "string" ? body.action : "";
      state.functionCalls.push(`${route.request().method()} ${functionName}${action ? `:${action}` : ""}`);

      if (functionName === "check-subscription") {
        return json(route, state.billing);
      }

      if (functionName === "customer-portal") {
        return json(route, { url: state.customerPortalUrl });
      }

      if (functionName === "create-checkout") {
        return json(route, { url: state.checkoutUrl });
      }

      if (functionName === "gmail-auth") {
        if (body?.action === "initiate") {
          return json(route, { url: state.gmailAuthUrl });
        }

        return json(route, { ok: true });
      }

      if (functionName === "admin-data") {
        if (body?.action === "auth_status") {
          return json(route, { isPlatformAdmin: state.isPlatformAdmin });
        }

        if (body?.action === "overview") {
          return json(route, state.adminOverview);
        }

        return json(route, {});
      }

      if (functionName === "dashboard-snapshot") {
        const snapshot = state.dashboardSnapshot ?? buildDefaultDashboardSnapshot(state);
        return json(route, snapshot);
      }

      return json(route, {});
    } catch (error) {
      return json(route, { error: error instanceof Error ? error.message : "mock function handler failed" }, 500);
    }
  });

  return state;
}

export async function signInThroughUi(page: Page, email = "owner@example.com", password = "StrongPass123!") {
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await Promise.all([
    page.waitForURL((url) => {
      const path = url.pathname;
      return path !== "/auth" && path !== "/redirect";
    }),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
}
