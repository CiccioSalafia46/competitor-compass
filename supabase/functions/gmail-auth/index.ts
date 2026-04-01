import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: "Google OAuth credentials not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const redirectUri = `${supabaseUrl}/functions/v1/gmail-auth`;

  // GET: OAuth callback from Google
  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      const stateData = state ? JSON.parse(atob(state)) : {};
      const appUrl = stateData.redirectUrl || supabaseUrl;
      return Response.redirect(`${appUrl}?gmail_error=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !state) {
      return new Response("Missing code or state parameter", { status: 400 });
    }

    let stateData: { workspaceId: string; userId: string; redirectUrl: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response("Invalid state parameter", { status: 400 });
    }

    try {
      // Exchange authorization code for tokens
      const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResp.ok) {
        console.error("Token exchange failed:", tokenResp.status);
        return Response.redirect(`${stateData.redirectUrl}?gmail_error=token_exchange_failed`, 302);
      }

      const tokenData = await tokenResp.json();

      // Get user email from Google
      const userInfoResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userInfoResp.ok) {
        return Response.redirect(`${stateData.redirectUrl}?gmail_error=userinfo_failed`, 302);
      }

      const userInfo = await userInfoResp.json();

      // Upsert gmail connection
      const { data: connection, error: connError } = await supabase
        .from("gmail_connections")
        .upsert(
          {
            workspace_id: stateData.workspaceId,
            user_id: stateData.userId,
            email_address: userInfo.email,
            connected_at: new Date().toISOString(),
            sync_status: "idle",
            sync_error: null,
          },
          { onConflict: "workspace_id,email_address" }
        )
        .select()
        .single();

      if (connError) {
        console.error("Connection upsert error:", connError);
        return Response.redirect(`${stateData.redirectUrl}?gmail_error=db_error`, 302);
      }

      // Store tokens securely (only accessible by service role)
      const { error: tokenError } = await supabase
        .from("gmail_tokens")
        .upsert(
          {
            gmail_connection_id: connection.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || "",
            token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
            scopes: tokenData.scope?.split(" ") || [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "gmail_connection_id" }
        );

      if (tokenError) {
        console.error("Token storage error:", tokenError);
        return Response.redirect(`${stateData.redirectUrl}?gmail_error=token_storage_failed`, 302);
      }

      // Log audit event
      await supabase.from("audit_log").insert({
        workspace_id: stateData.workspaceId,
        user_id: stateData.userId,
        action: "gmail_connected",
        entity_type: "gmail_connection",
        entity_id: connection.id,
        metadata: { email: userInfo.email },
      });

      return Response.redirect(`${stateData.redirectUrl}?gmail_connected=true`, 302);
    } catch (err) {
      console.error("OAuth callback error:", err);
      return Response.redirect(`${stateData.redirectUrl}?gmail_error=callback_failed`, 302);
    }
  }

  // POST: Initiate or disconnect
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { action } = body;

      if (action === "initiate") {
        const { workspaceId, userId, redirectUrl } = body;
        if (!workspaceId || !userId) {
          return new Response(
            JSON.stringify({ error: "workspaceId and userId are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const state = btoa(
          JSON.stringify({
            workspaceId,
            userId,
            redirectUrl: redirectUrl || url.origin,
          })
        );

        const authUrl = new URL(GOOGLE_OAUTH_URL);
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", GMAIL_SCOPES.join(" "));
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("state", state);

        return new Response(
          JSON.stringify({ url: authUrl.toString() }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "disconnect") {
        const { connectionId, workspaceId, userId } = body;
        if (!connectionId) {
          return new Response(
            JSON.stringify({ error: "connectionId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase.from("gmail_tokens").delete().eq("gmail_connection_id", connectionId);
        await supabase.from("gmail_connections").delete().eq("id", connectionId);

        if (workspaceId && userId) {
          await supabase.from("audit_log").insert({
            workspace_id: workspaceId,
            user_id: userId,
            action: "gmail_disconnected",
            entity_type: "gmail_connection",
            entity_id: connectionId,
          });
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Unknown action. Use 'initiate' or 'disconnect'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("POST error:", err);
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
