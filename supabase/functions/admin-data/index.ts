import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const userId = userData.user.id;

    // Verify admin role - must have 'admin' role in at least one workspace
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1);

    if (!adminRoles || adminRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();

    let result: any = null;

    switch (action) {
      case "overview": {
        // Total users
        const { count: totalUsers } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true });

        // Workspaces
        const { count: totalWorkspaces } = await supabaseAdmin
          .from("workspaces")
          .select("id", { count: "exact", head: true });

        // Gmail connections
        const { count: gmailConnections } = await supabaseAdmin
          .from("gmail_connections")
          .select("id", { count: "exact", head: true });

        // Total newsletters
        const { count: totalNewsletters } = await supabaseAdmin
          .from("newsletter_inbox")
          .select("id", { count: "exact", head: true })
          .eq("is_newsletter", true);

        // Total insights
        const { count: totalInsights } = await supabaseAdmin
          .from("insights")
          .select("id", { count: "exact", head: true });

        // Total competitors
        const { count: totalCompetitors } = await supabaseAdmin
          .from("competitors")
          .select("id", { count: "exact", head: true });

        // Recent audit log
        const { data: recentActivity } = await supabaseAdmin
          .from("audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        // Gmail sync errors
        const { data: syncErrors } = await supabaseAdmin
          .from("gmail_connections")
          .select("id, email_address, sync_status, sync_error, last_sync_at")
          .not("sync_error", "is", null)
          .limit(5);

        // Rate limit usage (last hour)
        const { count: rateLimitHits } = await supabaseAdmin
          .from("rate_limits")
          .select("id", { count: "exact", head: true });

        result = {
          totalUsers: totalUsers || 0,
          totalWorkspaces: totalWorkspaces || 0,
          gmailConnections: gmailConnections || 0,
          totalNewsletters: totalNewsletters || 0,
          totalInsights: totalInsights || 0,
          totalCompetitors: totalCompetitors || 0,
          rateLimitHits: rateLimitHits || 0,
          recentActivity: recentActivity || [],
          syncErrors: syncErrors || [],
        };
        break;
      }

      case "users": {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
        const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
        const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
        const { data: members } = await supabaseAdmin.from("workspace_members").select("*, workspaces(name)");

        result = {
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
              display_name: profile?.display_name || u.email,
              roles: userRoles.map((r: any) => r.role),
              workspaces: userWorkspaces.map((w: any) => ({
                id: w.workspace_id,
                name: w.workspaces?.name,
                role: w.role,
              })),
            };
          }),
        };
        break;
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

        result = {
          workspaces: (workspaces || []).map((ws: any) => ({
            ...ws,
            memberCount: members?.filter((m: any) => m.workspace_id === ws.id).length || 0,
            competitorCount: competitors?.filter((c: any) => c.workspace_id === ws.id).length || 0,
            newsletterCount: newsletters?.filter((n: any) => n.workspace_id === ws.id).length || 0,
          })),
        };
        break;
      }

      case "logs": {
        const { data: logs } = await supabaseAdmin
          .from("audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);

        result = { logs: logs || [] };
        break;
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
          .limit(100);

        // Group rate limits by endpoint
        const endpointCounts: Record<string, number> = {};
        (rateLimits || []).forEach((r: any) => {
          endpointCounts[r.endpoint] = (endpointCounts[r.endpoint] || 0) + 1;
        });

        result = {
          gmailConnections: gmailConns || [],
          rateLimitsByEndpoint: endpointCounts,
          recentRateLimits: (rateLimits || []).slice(0, 20),
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[admin-data] Error:", message);
    return new Response(
      JSON.stringify({ error: message === "Authentication failed" || message === "Forbidden" ? message : "An error occurred" }),
      { status: message === "Forbidden" ? 403 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
