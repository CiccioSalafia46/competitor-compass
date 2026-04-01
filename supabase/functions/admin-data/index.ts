import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const adminUserId = userData.user.id;

    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .limit(1);

    if (!adminRoles || adminRoles.length === 0) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { action } = body;

    // Helper: log admin action
    async function auditLog(actionName: string, entityType: string, entityId?: string, metadata?: any) {
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
        ]);

        const { data: recentActivity } = await supabaseAdmin
          .from("audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(15);

        const { data: syncErrors } = await supabaseAdmin
          .from("gmail_connections")
          .select("id, email_address, sync_status, sync_error, last_sync_at")
          .not("sync_error", "is", null)
          .limit(10);

        // Recent signups (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const { count: recentSignups } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", weekAgo);

        return json({
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
          recentActivity: recentActivity || [],
          syncErrors: syncErrors || [],
        });
      }

      case "users": {
        const page = body.page || 1;
        const perPage = body.perPage || 50;
        const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
        const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
        const { data: members } = await supabaseAdmin.from("workspace_members").select("*, workspaces(name)");

        return json({
          users: (users?.users || []).map((u: any) => {
            const profile = profiles?.find((p: any) => p.user_id === u.id);
            const userRoles = roles?.filter((r: any) => r.user_id === u.id) || [];
            const userWorkspaces = members?.filter((m: any) => m.user_id === u.id) || [];
            return {
              id: u.id,
              email: u.email,
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at,
              email_confirmed_at: u.email_confirmed_at,
              banned: u.banned_until ? true : false,
              banned_until: u.banned_until,
              display_name: profile?.display_name || u.email,
              roles: userRoles.map((r: any) => ({ role: r.role, workspace_id: r.workspace_id })),
              workspaces: userWorkspaces.map((w: any) => ({
                id: w.workspace_id,
                name: w.workspaces?.name,
                role: w.role,
              })),
            };
          }),
          total: users?.users?.length || 0,
        });
      }

      case "delete_user": {
        const { target_user_id } = body;
        if (!target_user_id) return json({ error: "target_user_id required" }, 400);
        if (target_user_id === adminUserId) return json({ error: "Cannot delete yourself" }, 400);

        // Remove from workspace_members, user_roles, profiles
        await supabaseAdmin.from("workspace_members").delete().eq("user_id", target_user_id);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id);
        await supabaseAdmin.from("profiles").delete().eq("user_id", target_user_id);

        const { error } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
        if (error) return json({ error: error.message }, 500);

        await auditLog("admin.delete_user", "user", target_user_id);
        return json({ success: true });
      }

      case "ban_user": {
        const { target_user_id, ban } = body;
        if (!target_user_id) return json({ error: "target_user_id required" }, 400);
        if (target_user_id === adminUserId) return json({ error: "Cannot ban yourself" }, 400);

        if (ban) {
          // Ban for 100 years effectively = disable
          const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
            ban_duration: "876000h",
          });
          if (error) return json({ error: error.message }, 500);
        } else {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
            ban_duration: "none",
          });
          if (error) return json({ error: error.message }, 500);
        }

        await auditLog(ban ? "admin.ban_user" : "admin.unban_user", "user", target_user_id);
        return json({ success: true });
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

        return json({
          workspaces: (workspaces || []).map((ws: any) => {
            const ownerProfile = profiles?.find((p: any) => p.user_id === ws.owner_id);
            return {
              ...ws,
              owner_display_name: ownerProfile?.display_name || ws.owner_id?.slice(0, 8),
              memberCount: members?.filter((m: any) => m.workspace_id === ws.id).length || 0,
              competitorCount: competitors?.filter((c: any) => c.workspace_id === ws.id).length || 0,
              newsletterCount: newsletters?.filter((n: any) => n.workspace_id === ws.id).length || 0,
              insightCount: insights?.filter((i: any) => i.workspace_id === ws.id).length || 0,
              analysisCount: analyses?.filter((a: any) => a.workspace_id === ws.id).length || 0,
              members: members?.filter((m: any) => m.workspace_id === ws.id) || [],
            };
          }),
        });
      }

      case "delete_workspace": {
        const { workspace_id } = body;
        if (!workspace_id) return json({ error: "workspace_id required" }, 400);

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
          const connIds = gmailConns.map((c: any) => c.id);
          await supabaseAdmin.from("gmail_tokens").delete().in("gmail_connection_id", connIds);
        }
        await supabaseAdmin.from("gmail_connections").delete().eq("workspace_id", workspace_id);

        await supabaseAdmin.from("user_roles").delete().eq("workspace_id", workspace_id);
        await supabaseAdmin.from("workspace_members").delete().eq("workspace_id", workspace_id);
        await supabaseAdmin.from("workspaces").delete().eq("id", workspace_id);

        await auditLog("admin.delete_workspace", "workspace", workspace_id);
        return json({ success: true });
      }

      case "logs": {
        const page = body.page || 1;
        const perPage = body.perPage || 100;
        const from = (page - 1) * perPage;

        let query = supabaseAdmin
          .from("audit_log")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, from + perPage - 1);

        const { data: logs, count } = await query;
        return json({ logs: logs || [], total: count || 0 });
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
        (rateLimits || []).forEach((r: any) => {
          endpointCounts[r.endpoint] = (endpointCounts[r.endpoint] || 0) + 1;
        });

        return json({
          gmailConnections: gmailConns || [],
          rateLimitsByEndpoint: endpointCounts,
        });
      }

      case "force_resync": {
        const { connection_id } = body;
        if (!connection_id) return json({ error: "connection_id required" }, 400);

        await supabaseAdmin
          .from("gmail_connections")
          .update({ sync_status: "idle", sync_error: null, last_history_id: null })
          .eq("id", connection_id);

        await auditLog("admin.force_resync", "gmail_connection", connection_id);
        return json({ success: true });
      }

      case "disconnect_gmail": {
        const { connection_id } = body;
        if (!connection_id) return json({ error: "connection_id required" }, 400);

        await supabaseAdmin.from("gmail_tokens").delete().eq("gmail_connection_id", connection_id);
        await supabaseAdmin.from("gmail_connections").delete().eq("id", connection_id);

        await auditLog("admin.disconnect_gmail", "gmail_connection", connection_id);
        return json({ success: true });
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

        return json({
          syncErrors: syncErrors || [],
          failedAnalyses: failedAnalyses || [],
        });
      }

      case "integration_health": {
        // Check which secrets are configured (never return values, only status)
        const secretNames = [
          "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
          "STRIPE_SECRET_KEY",
          "LOVABLE_API_KEY",
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
        const expiredTokens = (tokenData || []).filter(
          (t: any) => new Date(t.token_expires_at) < now
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
            productionReady: secretStatus["STRIPE_SECRET_KEY"]?.configured
              && secretStatus["STRIPE_SECRET_KEY"]?.masked?.includes("live") || false,
            health: {},
            secrets: [
              { name: "STRIPE_SECRET_KEY", ...secretStatus["STRIPE_SECRET_KEY"] },
            ],
            notes: "Check if key starts with sk_live_ for production. Test keys start with sk_test_.",
          },
          {
            id: "ai_provider",
            name: "AI Provider (Lovable AI)",
            category: "intelligence",
            envStatus: secretStatus["LOVABLE_API_KEY"]?.configured ? "configured" : "missing",
            productionReady: secretStatus["LOVABLE_API_KEY"]?.configured,
            health: {
              totalAnalyses: totalAnalyses || 0,
              failedAnalyses: failedAnalyses || 0,
            },
            secrets: [
              { name: "LOVABLE_API_KEY", ...secretStatus["LOVABLE_API_KEY"] },
            ],
            notes: "Managed by Lovable platform. No rotation needed.",
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

        return json({ integrations, flags: flags || [], secretStatus });
      }

      case "test_integration": {
        const { integration_id } = body;
        if (!integration_id) return json({ error: "integration_id required" }, 400);

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
          results.push({
            test: "Secret Key configured",
            status: key ? "pass" : "fail",
            message: key ? "Present" : "STRIPE_SECRET_KEY is missing",
          });
          if (key) {
            results.push({
              test: "Environment mode",
              status: key.startsWith("sk_live_") ? "pass" : "warn",
              message: key.startsWith("sk_live_") ? "Production (live) key" : "Test/sandbox key detected",
            });
          }
        } else if (integration_id === "ai_provider") {
          const key = Deno.env.get("LOVABLE_API_KEY");
          results.push({
            test: "API Key configured",
            status: key ? "pass" : "fail",
            message: key ? "Present" : "LOVABLE_API_KEY is missing",
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
        return json({ results });
      }

      case "toggle_flag": {
        const { flag_key, enabled } = body;
        if (!flag_key || typeof enabled !== "boolean") return json({ error: "flag_key and enabled required" }, 400);

        const { error: updateErr } = await supabaseAdmin
          .from("feature_flags")
          .update({ enabled, updated_by: adminUserId, updated_at: new Date().toISOString() })
          .eq("key", flag_key);

        if (updateErr) return json({ error: updateErr.message }, 500);

        await auditLog("admin.toggle_flag", "feature_flag", flag_key, { enabled });
        return json({ success: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[admin-data] Error:", message);
    return json(
      { error: message === "Authentication failed" || message === "Forbidden" ? message : "An error occurred" },
      message === "Forbidden" ? 403 : 500
    );
  }
});
