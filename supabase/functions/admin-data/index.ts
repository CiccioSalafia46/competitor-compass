import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  HttpError,
  assertPlatformAdmin,
  isPlatformAdmin,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";

type AuditMetadata = Record<string, unknown>;
type AuthListUsersResponse = {
  users?: AuthListUser[];
  total?: number;
};
type AuthListUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
};
type ProfileRow = {
  user_id: string;
  display_name: string | null;
};
type UserRoleRow = {
  user_id: string;
  role: string;
  workspace_id: string;
};
type WorkspaceMemberRow = {
  user_id: string;
  workspace_id: string;
  role: string;
  workspaces?: { name?: string | null } | null;
};
type WorkspaceRow = {
  id: string;
  owner_id: string | null;
  created_at: string;
  name: string;
  slug: string;
};
type WorkspaceScopedRow = {
  workspace_id: string;
  id: string;
};
type GmailConnectionIdRow = {
  id: string;
};
type RateLimitRow = {
  endpoint: string | null;
};
type TokenRow = {
  id: string;
  token_expires_at: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json();
    const { action } = body;
    const { user } = await requireAuthenticatedUser(supabaseAdmin, req);
    const adminUserId = user.id;

    if (action === "auth_status") {
      return jsonResponse({ isPlatformAdmin: await isPlatformAdmin(supabaseAdmin, user) });
    }

    await assertPlatformAdmin(supabaseAdmin, user);

    // Helper: log admin action
    async function auditLog(actionName: string, entityType: string, entityId?: string, metadata?: AuditMetadata) {
      // Find any workspace for the admin to attach the log
      const { data: ws } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", adminUserId)
        .limit(1);
      const workspaceId = ws?.[0]?.workspace_id;
      if (!workspaceId) return;
      await supabaseAdmin.from("audit_log").insert({
        workspace_id: workspaceId,
        user_id: adminUserId,
        action: actionName,
        entity_type: entityType,
        entity_id: entityId || null,
        metadata: metadata || {},
      });
    }

    switch (action) {
      case "overview": {
        const now = Date.now();
        const weekAgo = new Date(now - 7 * 86400000).toISOString();
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
        const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();

        const [
          { count: totalUsers },
          { count: totalWorkspaces },
          { count: gmailConnections },
          { count: totalNewsletters },
          { count: totalInsights },
          { count: totalCompetitors },
          { count: totalAnalyses },
          { count: totalMetaAds },
          { count: rateLimitHits },
          { count: recentSignups },
          { count: newUsersToday },
          { count: failedAnalysesCount },
        ] = await Promise.all([
          supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("workspaces").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("gmail_connections").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("newsletter_inbox").select("id", { count: "exact", head: true }).eq("is_newsletter", true),
          supabaseAdmin.from("insights").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("competitors").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("analyses").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("meta_ads").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("rate_limits").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
          supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
          supabaseAdmin.from("analyses").select("id", { count: "exact", head: true }).eq("status", "failed"),
        ]);

        const { data: recentActivity } = await supabaseAdmin
          .from("audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(15);

        const { data: syncErrors } = await supabaseAdmin
          .from("gmail_connections")
          .select("id, email_address, sync_status, sync_error, last_sync_at, workspace_id")
          .not("sync_error", "is", null)
          .limit(10);

        // Active workspaces: distinct workspace_ids from analyses or insights in last 30 days
        const { data: activeWsData } = await supabaseAdmin
          .from("analyses")
          .select("workspace_id")
          .gte("created_at", thirtyDaysAgo)
          .not("workspace_id", "is", null);
        const activeWorkspaces = new Set(
          (activeWsData ?? []).map((r: { workspace_id: string }) => r.workspace_id)
        ).size;

        // 7-day signup trend: profiles created in last 7 days, grouped by day
        const { data: trendProfiles } = await supabaseAdmin
          .from("profiles")
          .select("created_at")
          .gte("created_at", weekAgo)
          .order("created_at", { ascending: true });

        const dayCounts: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now - i * 86400000);
          const key = d.toISOString().slice(0, 10);
          dayCounts[key] = 0;
        }
        (trendProfiles ?? []).forEach((p: { created_at: string }) => {
          const key = p.created_at.slice(0, 10);
          if (key in dayCounts) dayCounts[key]++;
        });
        const signupTrend = Object.entries(dayCounts).map(([day, count]) => ({ day, count }));

        return jsonResponse({
          totalUsers: totalUsers || 0,
          totalWorkspaces: totalWorkspaces || 0,
          gmailConnections: gmailConnections || 0,
          totalNewsletters: totalNewsletters || 0,
          totalInsights: totalInsights || 0,
          totalCompetitors: totalCompetitors || 0,
          totalAnalyses: totalAnalyses || 0,
          totalMetaAds: totalMetaAds || 0,
          rateLimitHits: rateLimitHits || 0,
          recentSignups: recentSignups || 0,
          newUsersToday: newUsersToday || 0,
          activeWorkspaces,
          failedAnalysesCount: failedAnalysesCount || 0,
          recentActivity: recentActivity || [],
          syncErrors: syncErrors || [],
          signupTrend,
        });
      }

      case "users": {
        const page = body.page || 1;
        const perPage = body.perPage || 50;
        const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
        const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
        const { data: members } = await supabaseAdmin.from("workspace_members").select("*, workspaces(name)");

        const authUsers = (((users as AuthListUsersResponse | null)?.users ?? []) as AuthListUser[]);
        const totalUsers = typeof (users as AuthListUsersResponse | null)?.total === "number"
          ? (users as AuthListUsersResponse).total as number
          : authUsers.length;
        const profileRows = (profiles ?? []) as ProfileRow[];
        const roleRows = (roles ?? []) as UserRoleRow[];
        const memberRows = (members ?? []) as WorkspaceMemberRow[];

        return jsonResponse({
          users: authUsers.map((u) => {
            const profile = profileRows.find((p) => p.user_id === u.id);
            const userRoles = roleRows.filter((r) => r.user_id === u.id);
            const userWorkspaces = memberRows.filter((m) => m.user_id === u.id);
            return {
              id: u.id,
              email: u.email,
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at,
              email_confirmed_at: u.email_confirmed_at,
              banned: u.banned_until ? true : false,
              banned_until: u.banned_until,
              display_name: profile?.display_name || u.email,
              roles: userRoles.map((r) => ({ role: r.role, workspace_id: r.workspace_id })),
              workspaces: userWorkspaces.map((w) => ({
                workspace_id: w.workspace_id,
                name: w.workspaces?.name,
                role: w.role,
              })),
            };
          }),
          total: totalUsers,
          page,
          perPage,
        });
      }

      case "delete_user": {
        const { target_user_id } = body;
        if (!target_user_id) return jsonResponse({ error: "target_user_id required" }, 400);
        if (target_user_id === adminUserId) return jsonResponse({ error: "Cannot delete yourself" }, 400);

        // Remove from workspace_members, user_roles, profiles
        await supabaseAdmin.from("workspace_members").delete().eq("user_id", target_user_id);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id);
        await supabaseAdmin.from("profiles").delete().eq("user_id", target_user_id);

        const { error } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
        if (error) return jsonResponse({ error: error.message }, 500);

        await auditLog("admin.delete_user", "user", target_user_id);
        return jsonResponse({ success: true });
      }

      case "ban_user": {
        const { target_user_id, ban } = body;
        if (!target_user_id) return jsonResponse({ error: "target_user_id required" }, 400);
        if (target_user_id === adminUserId) return jsonResponse({ error: "Cannot ban yourself" }, 400);

        if (ban) {
          // Ban for 100 years effectively = disable
          const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
            ban_duration: "876000h",
          });
          if (error) return jsonResponse({ error: error.message }, 500);
        } else {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
            ban_duration: "none",
          });
          if (error) return jsonResponse({ error: error.message }, 500);
        }

        await auditLog(ban ? "admin.ban_user" : "admin.unban_user", "user", target_user_id);
        return jsonResponse({ success: true });
      }

      case "workspaces": {
        const { data: workspaces } = await supabaseAdmin
          .from("workspaces")
          .select("*")
          .order("created_at", { ascending: false });

        const { data: members } = await supabaseAdmin
          .from("workspace_members")
          .select("workspace_id, user_id, role");

        const { data: competitors } = await supabaseAdmin
          .from("competitors")
          .select("workspace_id, id");

        const { data: newsletters } = await supabaseAdmin
          .from("newsletter_inbox")
          .select("workspace_id, id")
          .eq("is_newsletter", true);

        const { data: insights } = await supabaseAdmin
          .from("insights")
          .select("workspace_id, id");

        const { data: analyses } = await supabaseAdmin
          .from("analyses")
          .select("workspace_id, id");

        // Owners
        const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name");

        const workspaceRows = (workspaces ?? []) as WorkspaceRow[];
        const memberRows = (members ?? []) as WorkspaceMemberRow[];
        const competitorRows = (competitors ?? []) as WorkspaceScopedRow[];
        const newsletterRows = (newsletters ?? []) as WorkspaceScopedRow[];
        const insightRows = (insights ?? []) as WorkspaceScopedRow[];
        const analysisRows = (analyses ?? []) as WorkspaceScopedRow[];
        const profileRows = (profiles ?? []) as ProfileRow[];

        return jsonResponse({
          workspaces: workspaceRows.map((ws) => {
            const ownerProfile = profileRows.find((p) => p.user_id === ws.owner_id);
            return {
              ...ws,
              owner_display_name: ownerProfile?.display_name || ws.owner_id?.slice(0, 8),
              memberCount: memberRows.filter((member) => member.workspace_id === ws.id).length,
              competitorCount: competitorRows.filter((competitor) => competitor.workspace_id === ws.id).length,
              newsletterCount: newsletterRows.filter((newsletter) => newsletter.workspace_id === ws.id).length,
              insightCount: insightRows.filter((insight) => insight.workspace_id === ws.id).length,
              analysisCount: analysisRows.filter((analysis) => analysis.workspace_id === ws.id).length,
              members: memberRows.filter((member) => member.workspace_id === ws.id),
            };
          }),
        });
      }

      case "delete_workspace": {
        const { workspace_id } = body;
        if (!workspace_id) return jsonResponse({ error: "workspace_id required" }, 400);

        // Cascade delete related data
        await Promise.all([
          supabaseAdmin.from("newsletter_extractions").delete().eq("workspace_id", workspace_id),
          supabaseAdmin.from("meta_ad_analyses").delete().eq("workspace_id", workspace_id),
          supabaseAdmin.from("insights").delete().eq("workspace_id", workspace_id),
          supabaseAdmin.from("analyses").delete().eq("workspace_id", workspace_id),
          supabaseAdmin.from("alerts").delete().eq("workspace_id", workspace_id),
          supabaseAdmin.from("alert_rules").delete().eq("workspace_id", workspace_id),
          supabaseAdmin.from("audit_log").delete().eq("workspace_id", workspace_id),
          supabaseAdmin.from("usage_events").delete().eq("workspace_id", workspace_id),
          supabaseAdmin.from("rate_limits").delete().eq("workspace_id", workspace_id),
        ]);
        await supabaseAdmin.from("newsletter_inbox").delete().eq("workspace_id", workspace_id);
        await supabaseAdmin.from("newsletter_entries").delete().eq("workspace_id", workspace_id);
        await supabaseAdmin.from("meta_ads").delete().eq("workspace_id", workspace_id);
        await supabaseAdmin.from("competitors").delete().eq("workspace_id", workspace_id);

        // Delete gmail tokens first, then connections
        const { data: gmailConns } = await supabaseAdmin
          .from("gmail_connections")
          .select("id")
          .eq("workspace_id", workspace_id);
        if (gmailConns?.length) {
          const connIds = (gmailConns as GmailConnectionIdRow[]).map((connection) => connection.id);
          await supabaseAdmin.from("gmail_tokens").delete().in("gmail_connection_id", connIds);
        }
        await supabaseAdmin.from("gmail_connections").delete().eq("workspace_id", workspace_id);

        await supabaseAdmin.from("user_roles").delete().eq("workspace_id", workspace_id);
        await supabaseAdmin.from("workspace_members").delete().eq("workspace_id", workspace_id);
        await supabaseAdmin.from("workspaces").delete().eq("id", workspace_id);

        await auditLog("admin.delete_workspace", "workspace", workspace_id);
        return jsonResponse({ success: true });
      }

      case "logs": {
        const page = body.page || 1;
        const perPage = body.perPage || 100;
        const from = (page - 1) * perPage;

        const query = supabaseAdmin
          .from("audit_log")
          .select("id, action, entity_type, entity_id, user_id, metadata, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, from + perPage - 1);

        const { data: logs, count } = await query;
        return jsonResponse({ logs: logs || [], total: count || 0 });
      }

      case "integrations": {
        const { data: gmailConns } = await supabaseAdmin
          .from("gmail_connections")
          .select("*")
          .order("created_at", { ascending: false });

        const { data: rateLimits } = await supabaseAdmin
          .from("rate_limits")
          .select("endpoint, called_at, user_id")
          .order("called_at", { ascending: false })
          .limit(200);

        const endpointCounts: Record<string, number> = {};
        ((rateLimits ?? []) as RateLimitRow[]).forEach((rateLimit) => {
          if (!rateLimit.endpoint) return;
          endpointCounts[rateLimit.endpoint] = (endpointCounts[rateLimit.endpoint] || 0) + 1;
        });

        return jsonResponse({
          gmailConnections: gmailConns || [],
          rateLimitsByEndpoint: endpointCounts,
        });
      }

      case "force_resync": {
        const { connection_id } = body;
        if (!connection_id) return jsonResponse({ error: "connection_id required" }, 400);

        await supabaseAdmin
          .from("gmail_connections")
          .update({ sync_status: "idle", sync_error: null, last_history_id: null })
          .eq("id", connection_id);

        await auditLog("admin.force_resync", "gmail_connection", connection_id);
        return jsonResponse({ success: true });
      }

      case "disconnect_gmail": {
        const { connection_id } = body;
        if (!connection_id) return jsonResponse({ error: "connection_id required" }, 400);

        await supabaseAdmin.from("gmail_tokens").delete().eq("gmail_connection_id", connection_id);
        await supabaseAdmin.from("gmail_connections").delete().eq("id", connection_id);

        await auditLog("admin.disconnect_gmail", "gmail_connection", connection_id);
        return jsonResponse({ success: true });
      }

      case "issues": {
        // Gmail sync errors
        const { data: syncErrors } = await supabaseAdmin
          .from("gmail_connections")
          .select("id, email_address, sync_status, sync_error, last_sync_at, workspace_id, user_id")
          .not("sync_error", "is", null)
          .order("last_sync_at", { ascending: false });

        // Failed analyses
        const { data: failedAnalyses } = await supabaseAdmin
          .from("analyses")
          .select("id, workspace_id, analysis_type, error_message, created_at, status")
          .eq("status", "failed")
          .order("created_at", { ascending: false })
          .limit(50);

        return jsonResponse({
          syncErrors: syncErrors || [],
          failedAnalyses: failedAnalyses || [],
        });
      }

      case "integration_health": {
        // Check which secrets are configured (never return values, only status)
        const secretNames = [
          "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
          "STRIPE_SECRET_KEY",
          "STRIPE_WEBHOOK_SECRET",
          "OPENAI_API_KEY",
          "SUPABASE_SERVICE_ROLE_KEY",
        ];
        const secretStatus: Record<string, { configured: boolean; masked: string }> = {};
        for (const name of secretNames) {
          const val = Deno.env.get(name);
          secretStatus[name] = {
            configured: !!val && val.length > 0,
            masked: val ? `${"•".repeat(Math.min(val.length, 20))}${val.slice(-4)}` : "—",
          };
        }

        // Gmail health
        const { count: totalGmail } = await supabaseAdmin
          .from("gmail_connections")
          .select("id", { count: "exact", head: true });
        const { count: gmailErrors } = await supabaseAdmin
          .from("gmail_connections")
          .select("id", { count: "exact", head: true })
          .not("sync_error", "is", null);

        // Token health: check if tokens exist and if any are expired
        const { data: tokenData } = await supabaseAdmin
          .from("gmail_tokens")
          .select("id, token_expires_at")
          .limit(100);
        const now = new Date();
        const expiredTokens = ((tokenData ?? []) as TokenRow[]).filter(
          (token) => Boolean(token.token_expires_at) && new Date(token.token_expires_at as string) < now
        ).length;

        // Analysis health
        const { count: failedAnalyses } = await supabaseAdmin
          .from("analyses")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed");
        const { count: totalAnalyses } = await supabaseAdmin
          .from("analyses")
          .select("id", { count: "exact", head: true });

        // Feature flags
        const { data: flags } = await supabaseAdmin
          .from("feature_flags")
          .select("*")
          .order("category", { ascending: true });

        // Build integration registry
        const integrations = [
          {
            id: "google_oauth",
            name: "Google OAuth / Gmail",
            category: "integrations",
            envStatus: secretStatus["GOOGLE_CLIENT_ID"]?.configured && secretStatus["GOOGLE_CLIENT_SECRET"]?.configured
              ? "configured" : "missing",
            productionReady: secretStatus["GOOGLE_CLIENT_ID"]?.configured && secretStatus["GOOGLE_CLIENT_SECRET"]?.configured,
            health: {
              totalConnections: totalGmail || 0,
              errorConnections: gmailErrors || 0,
              expiredTokens,
              totalTokens: tokenData?.length || 0,
            },
            secrets: [
              { name: "GOOGLE_CLIENT_ID", ...secretStatus["GOOGLE_CLIENT_ID"] },
              { name: "GOOGLE_CLIENT_SECRET", ...secretStatus["GOOGLE_CLIENT_SECRET"] },
            ],
            notes: "Requires Google Cloud Console verification for production. OAuth redirect must point to gmail-auth edge function.",
          },
          {
            id: "stripe",
            name: "Stripe Billing",
            category: "billing",
            envStatus: secretStatus["STRIPE_SECRET_KEY"]?.configured ? "configured" : "missing",
            productionReady:
              Boolean(secretStatus["STRIPE_SECRET_KEY"]?.configured) &&
              Boolean(secretStatus["STRIPE_WEBHOOK_SECRET"]?.configured),
            health: {},
            secrets: [
              { name: "STRIPE_SECRET_KEY", ...secretStatus["STRIPE_SECRET_KEY"] },
              { name: "STRIPE_WEBHOOK_SECRET", ...secretStatus["STRIPE_WEBHOOK_SECRET"] },
            ],
            notes: "Requires both Stripe secret key and webhook secret. Billing sync is driven by webhook events plus on-demand subscription refresh.",
          },
          {
            id: "ai_provider",
            name: "AI Provider (OpenAI)",
            category: "intelligence",
            envStatus: secretStatus["OPENAI_API_KEY"]?.configured ? "configured" : "missing",
            productionReady: secretStatus["OPENAI_API_KEY"]?.configured,
            health: {
              totalAnalyses: totalAnalyses || 0,
              failedAnalyses: failedAnalyses || 0,
            },
            secrets: [
              { name: "OPENAI_API_KEY", ...secretStatus["OPENAI_API_KEY"] },
            ],
            notes: "Used by newsletter analysis, extraction, ad analysis and insight generation functions.",
          },
          {
            id: "supabase_service",
            name: "Backend Service Role",
            category: "infrastructure",
            envStatus: secretStatus["SUPABASE_SERVICE_ROLE_KEY"]?.configured ? "configured" : "missing",
            productionReady: secretStatus["SUPABASE_SERVICE_ROLE_KEY"]?.configured,
            health: {},
            secrets: [
              { name: "SUPABASE_SERVICE_ROLE_KEY", ...secretStatus["SUPABASE_SERVICE_ROLE_KEY"] },
            ],
            notes: "Auto-provisioned. Never expose client-side.",
          },
        ];

        return jsonResponse({ integrations, flags: flags || [] });
      }

      case "test_integration": {
        const { integration_id } = body;
        if (!integration_id) return jsonResponse({ error: "integration_id required" }, 400);

        const results: { test: string; status: "pass" | "fail" | "warn"; message: string }[] = [];

        if (integration_id === "google_oauth") {
          const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
          const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
          results.push({
            test: "Client ID configured",
            status: clientId ? "pass" : "fail",
            message: clientId ? "Present" : "GOOGLE_CLIENT_ID is missing",
          });
          results.push({
            test: "Client Secret configured",
            status: clientSecret ? "pass" : "fail",
            message: clientSecret ? "Present" : "GOOGLE_CLIENT_SECRET is missing",
          });
          // Check for active connections
          const { count } = await supabaseAdmin
            .from("gmail_connections")
            .select("id", { count: "exact", head: true });
          results.push({
            test: "Active connections",
            status: (count || 0) > 0 ? "pass" : "warn",
            message: `${count || 0} connections found`,
          });
        } else if (integration_id === "stripe") {
          const key = Deno.env.get("STRIPE_SECRET_KEY");
          const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
          results.push({
            test: "Secret Key configured",
            status: key ? "pass" : "fail",
            message: key ? "Present" : "STRIPE_SECRET_KEY is missing",
          });
          results.push({
            test: "Webhook secret configured",
            status: webhookSecret ? "pass" : "fail",
            message: webhookSecret ? "Present" : "STRIPE_WEBHOOK_SECRET is missing",
          });
          if (key) {
            results.push({
              test: "Environment mode",
              status: key.startsWith("sk_live_") ? "pass" : "warn",
              message: key.startsWith("sk_live_") ? "Production (live) key" : "Test/sandbox key detected",
            });
          }
        } else if (integration_id === "ai_provider") {
          const key = Deno.env.get("OPENAI_API_KEY");
          results.push({
            test: "API Key configured",
            status: key ? "pass" : "fail",
            message: key ? "Present" : "OPENAI_API_KEY is missing",
          });
          const { count: total } = await supabaseAdmin
            .from("analyses")
            .select("id", { count: "exact", head: true });
          const { count: failed } = await supabaseAdmin
            .from("analyses")
            .select("id", { count: "exact", head: true })
            .eq("status", "failed");
          const failRate = total && total > 0 ? ((failed || 0) / total * 100).toFixed(1) : "0";
          results.push({
            test: "Analysis success rate",
            status: Number(failRate) < 10 ? "pass" : Number(failRate) < 30 ? "warn" : "fail",
            message: `${failRate}% failure rate (${failed || 0}/${total || 0})`,
          });
        }

        await auditLog("admin.test_integration", "integration", integration_id);
        return jsonResponse({ results });
      }

      case "toggle_flag": {
        const { flag_key, enabled } = body;
        if (!flag_key || typeof enabled !== "boolean") return jsonResponse({ error: "flag_key and enabled required" }, 400);

        const { error: updateErr } = await supabaseAdmin
          .from("feature_flags")
          .update({ enabled, updated_by: adminUserId, updated_at: new Date().toISOString() })
          .eq("key", flag_key);

        if (updateErr) return jsonResponse({ error: updateErr.message }, 500);

        await auditLog("admin.toggle_flag", "feature_flag", flag_key, { enabled });
        return jsonResponse({ success: true });
      }

      case "billing": {
        const [
          { data: billingRows },
          { data: workspaceRows },
          { data: memberRows },
        ] = await Promise.all([
          supabaseAdmin
            .from("workspace_billing")
            .select("workspace_id, stripe_customer_id, stripe_subscription_id, stripe_status, plan_key, current_period_end"),
          supabaseAdmin.from("workspaces").select("id, name"),
          supabaseAdmin.from("workspace_members").select("workspace_id, user_id"),
        ]);

        const wsMap: Record<string, { name: string }> = {};
        ((workspaceRows ?? []) as { id: string; name: string }[]).forEach((w) => {
          wsMap[w.id] = { name: w.name };
        });

        const memberCounts: Record<string, number> = {};
        ((memberRows ?? []) as { workspace_id: string; user_id: string }[]).forEach((m) => {
          memberCounts[m.workspace_id] = (memberCounts[m.workspace_id] || 0) + 1;
        });

        type BillingRow = {
          workspace_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_status: string | null;
          plan_key: string | null;
          current_period_end: string | null;
        };

        const subscriptions = ((billingRows ?? []) as BillingRow[]).map((b) => ({
          workspace_id: b.workspace_id,
          workspace_name: wsMap[b.workspace_id]?.name || b.workspace_id?.slice(0, 8) || "",
          member_count: memberCounts[b.workspace_id] || 0,
          stripe_status: b.stripe_status,
          plan_key: b.plan_key,
          current_period_end: b.current_period_end,
          stripe_customer_id: b.stripe_customer_id,
          stripe_subscription_id: b.stripe_subscription_id,
        }));

        const tierCounts: Record<string, number> = {};
        const statusCounts: Record<string, number> = {};
        subscriptions.forEach((s) => {
          const tier = s.plan_key || "free";
          tierCounts[tier] = (tierCounts[tier] || 0) + 1;
          const status = s.stripe_status || "unknown";
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const totalPaid = statusCounts["active"] || 0;
        return jsonResponse({ subscriptions, tierCounts, statusCounts, totalPaid });
      }

      case "system_health": {
        const [
          { count: totalGmail },
          { count: gmailErrors },
          { count: totalAnalyses },
          { count: failedAnalyses },
          { data: tokenData },
          { data: recentErrors },
        ] = await Promise.all([
          supabaseAdmin.from("gmail_connections").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("gmail_connections").select("id", { count: "exact", head: true }).not("sync_error", "is", null),
          supabaseAdmin.from("analyses").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("analyses").select("id", { count: "exact", head: true }).eq("status", "failed"),
          supabaseAdmin.from("gmail_tokens").select("id, token_expires_at").limit(200),
          supabaseAdmin.from("audit_log").select("id").gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        ]);

        const now = new Date();
        const expiredTokenCount = ((tokenData ?? []) as TokenRow[]).filter(
          (t) => Boolean(t.token_expires_at) && new Date(t.token_expires_at as string) < now
        ).length;

        const gmailHealthPct = totalGmail && totalGmail > 0
          ? Math.round((1 - (gmailErrors || 0) / totalGmail) * 100)
          : 100;

        const analysisSuccessRate = totalAnalyses && totalAnalyses > 0
          ? Math.round((1 - (failedAnalyses || 0) / totalAnalyses) * 100)
          : 100;

        const recentErrorCount = recentErrors?.length || 0;

        // Build health checks
        const checks: { name: string; status: "healthy" | "warning" | "critical" | "unknown"; message: string; value?: number | string | null }[] = [];

        checks.push({
          name: "Database",
          status: "healthy",
          message: "PostgreSQL responding normally",
        });

        checks.push({
          name: "Gmail Connections",
          status: gmailHealthPct >= 90 ? "healthy" : gmailHealthPct >= 70 ? "warning" : "critical",
          message: `${gmailErrors || 0} of ${totalGmail || 0} connections have errors`,
          value: `${gmailHealthPct}%`,
        });

        checks.push({
          name: "OAuth Tokens",
          status: expiredTokenCount === 0 ? "healthy" : expiredTokenCount < 5 ? "warning" : "critical",
          message: expiredTokenCount === 0 ? "All tokens valid" : `${expiredTokenCount} token(s) expired`,
          value: expiredTokenCount > 0 ? expiredTokenCount : null,
        });

        checks.push({
          name: "AI Analysis Pipeline",
          status: analysisSuccessRate >= 90 ? "healthy" : analysisSuccessRate >= 70 ? "warning" : "critical",
          message: `${failedAnalyses || 0} failed out of ${totalAnalyses || 0} total analyses`,
          value: `${analysisSuccessRate}%`,
        });

        checks.push({
          name: "Audit Activity",
          status: recentErrorCount < 50 ? "healthy" : "warning",
          message: `${recentErrorCount} entries in last 24h`,
          value: recentErrorCount,
        });

        // Compute overall score
        let score = 100;
        const syncErrRate = (gmailErrors || 0) / Math.max(totalGmail || 1, 1);
        if (syncErrRate >= 0.5) score -= 30;
        else if (syncErrRate >= 0.2) score -= 15;
        else if (syncErrRate > 0) score -= 5;

        const failRate = (failedAnalyses || 0) / Math.max(totalAnalyses || 1, 1);
        if (failRate >= 0.3) score -= 25;
        else if (failRate >= 0.1) score -= 12;
        else if (failRate > 0) score -= 4;

        if (expiredTokenCount > 10) score -= 15;
        else if (expiredTokenCount > 0) score -= 5;

        return jsonResponse({
          overallScore: Math.max(0, Math.round(score)),
          checks,
          gmailHealthPct,
          analysisSuccessRate,
          recentErrorCount,
          expiredTokenCount,
        });
      }

      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[admin-data] Error:", message);
    if (error instanceof HttpError) {
      return jsonResponse({ error: message }, error.status);
    }
    return jsonResponse({ error: "An error occurred" }, 500);
  }
});
