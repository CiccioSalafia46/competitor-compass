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
