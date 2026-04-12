import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  HttpError,
  assertWorkspaceAdmin,
  assertVerifiedUser,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";

const VALID_ROLES = ["admin", "analyst", "viewer"] as const;
type InviteRole = (typeof VALID_ROLES)[number];

function normalizeEmail(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const { user } = await requireAuthenticatedUser(supabase, req);
    await assertVerifiedUser(user);

    const body = await req.json();
    const workspaceId: string = typeof body?.workspaceId === "string" ? body.workspaceId.trim() : "";
    const email = normalizeEmail(body?.email);
    const role: InviteRole = VALID_ROLES.includes(body?.role) ? body.role : "viewer";

    if (!workspaceId) throw new HttpError(400, "workspaceId is required.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, "A valid email address is required.");
    }

    await assertWorkspaceAdmin(supabase, user.id, workspaceId);

    // Prevent self-invite
    if (user.email && normalizeEmail(user.email) === email) {
      throw new HttpError(400, "You cannot invite yourself.");
    }

    // Check whether the invitee already has an account — targeted lookup
    // via SECURITY DEFINER function to avoid loading the entire user table.
    const { data: existingUserId, error: lookupError } = await supabase.rpc(
      "find_user_id_by_email",
      { p_email: email },
    );

    if (lookupError) {
      console.error("[invite-member] user lookup failed:", lookupError);
      throw new HttpError(500, "Failed to look up user account.");
    }

    if (existingUserId) {
      // User already exists — add them to the workspace directly.
      const membershipRole = role === "admin" ? "admin" : "member";

      const { error: memberError } = await supabase
        .from("workspace_members")
        .upsert(
          { workspace_id: workspaceId, user_id: existingUserId, role: membershipRole },
          { onConflict: "workspace_id,user_id", ignoreDuplicates: false },
        );
      if (memberError) {
        console.error("[invite-member] membership upsert failed:", memberError);
        throw new HttpError(500, "Failed to add member to workspace.");
      }

      await supabase
        .from("user_roles")
        .upsert(
          { workspace_id: workspaceId, user_id: existingUserId, role },
          { onConflict: "workspace_id,user_id,role", ignoreDuplicates: true },
        );

      return jsonResponse({ status: "added", email });
    }

    // New user — upsert a pending invitation record and send the invite email.
    // The on_user_invite_accepted trigger will add them to the workspace on signup.
    const { error: inviteRecordError } = await supabase
      .from("workspace_invitations")
      .upsert(
        {
          workspace_id: workspaceId,
          invited_email: email,
          invited_role: role,
          invited_by: user.id,
          // Reset expiry on re-invite
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          accepted_at: null,
        },
        { onConflict: "workspace_id,invited_email" },
      );
    if (inviteRecordError) {
      console.error("[invite-member] invitation record upsert failed:", inviteRecordError);
      throw new HttpError(500, "Failed to create invitation record.");
    }

    // Send the magic-link invite email via Supabase Auth admin API.
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        invited_workspace_id: workspaceId,
        invited_role: role,
      },
      redirectTo: `${Deno.env.get("APP_URL") ?? ""}/redirect`,
    });

    // If inviteUserByEmail fails (e.g. email provider misconfigured), the
    // invitation record still exists — new users who sign up with this email
    // will be processed by the trigger. Log the error but don't fail the request.
    if (inviteError) {
      console.error("[invite-member] inviteUserByEmail failed:", inviteError.message);
    }

    return jsonResponse({ status: "invited", email });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ error: getErrorMessage(error) }, status);
  }
});
