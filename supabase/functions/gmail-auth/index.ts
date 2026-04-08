import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  HttpError,
  assertWorkspaceAdmin,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { sanitizeRedirectUrl } from "../_shared/app.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];
const STATE_VERSION = 1;
const STATE_TTL_MS = 30 * 60 * 1000;

type OAuthStatePayload = {
  version: number;
  workspaceId: string;
  userId: string;
  redirectUrl: string;
  expiresAt: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }

  return mismatch === 0;
}

async function signState(payloadEncoded: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadEncoded),
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

async function createStateToken(payload: OAuthStatePayload, secret: string) {
  const payloadEncoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signatureEncoded = await signState(payloadEncoded, secret);
  return `${payloadEncoded}.${signatureEncoded}`;
}

async function parseStateToken(rawState: string | null, secret: string): Promise<OAuthStatePayload | null> {
  if (!rawState) {
    return null;
  }

  const [payloadEncoded, signatureEncoded, extraSegment] = rawState.split(".");
  if (!payloadEncoded || !signatureEncoded || extraSegment) {
    return null;
  }

  try {
    const expectedSignature = await signState(payloadEncoded, secret);
    const expectedBytes = base64UrlToBytes(expectedSignature);
    const actualBytes = base64UrlToBytes(signatureEncoded);

    if (!constantTimeEqual(expectedBytes, actualBytes)) {
      return null;
    }

    const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadEncoded));
    const payload = JSON.parse(payloadJson) as Partial<OAuthStatePayload>;

    if (
      payload.version !== STATE_VERSION ||
      typeof payload.workspaceId !== "string" ||
      typeof payload.userId !== "string" ||
      typeof payload.redirectUrl !== "string" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return payload as OAuthStatePayload;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return jsonResponse(
      { error: "Google OAuth credentials not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const redirectUri = `${supabaseUrl}/functions/v1/gmail-auth`;

  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const stateData = await parseStateToken(state, supabaseServiceKey);
    if (!stateData) {
      return new Response("Invalid state parameter", { status: 400 });
    }

    const redirectUrl = sanitizeRedirectUrl(req, stateData.redirectUrl);

    if (error) {
      return Response.redirect(`${redirectUrl}?gmail_error=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !stateData.workspaceId || !stateData.userId) {
      return new Response("Missing code or state parameter", { status: 400 });
    }

    try {
      await assertWorkspaceAdmin(supabase, stateData.userId, stateData.workspaceId);

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
        return Response.redirect(`${redirectUrl}?gmail_error=token_exchange_failed`, 302);
      }

      const tokenData = await tokenResp.json();
      const userInfoResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userInfoResp.ok) {
        return Response.redirect(`${redirectUrl}?gmail_error=userinfo_failed`, 302);
      }

      const userInfo = await userInfoResp.json();
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
          { onConflict: "workspace_id,email_address" },
        )
        .select()
        .single();

      if (connError) {
        console.error("Connection upsert error:", connError);
        return Response.redirect(`${redirectUrl}?gmail_error=db_error`, 302);
      }

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
          { onConflict: "gmail_connection_id" },
        );

      if (tokenError) {
        console.error("Token storage error:", tokenError);
        return Response.redirect(`${redirectUrl}?gmail_error=token_storage_failed`, 302);
      }

      await supabase.from("audit_log").insert({
        workspace_id: stateData.workspaceId,
        user_id: stateData.userId,
        action: "gmail_connected",
        entity_type: "gmail_connection",
        entity_id: connection.id,
        metadata: { email: userInfo.email },
      });

      return Response.redirect(`${redirectUrl}?gmail_connected=true`, 302);
    } catch (error) {
      console.error("OAuth callback error:", error);
      return Response.redirect(`${redirectUrl}?gmail_error=callback_failed`, 302);
    }
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { action } = body;
      const { user } = await requireAuthenticatedUser(supabase, req);

      if (action === "initiate") {
        const { workspaceId, redirectUrl } = body;
        if (!workspaceId) {
          return jsonResponse({ error: "workspaceId is required" }, 400);
        }

        await assertWorkspaceAdmin(supabase, user.id, workspaceId);

        // Rate limit: max 5 OAuth initiations per user per hour
        const { data: allowed } = await supabase.rpc("check_rate_limit", {
          _user_id: user.id,
          _workspace_id: workspaceId,
          _endpoint: "gmail-auth-initiate",
          _max_per_hour: 5,
        });
        if (!allowed) {
          return jsonResponse(
            { error: "Too many OAuth attempts. Please wait before trying again." },
            429,
          );
        }

        const safeRedirectUrl = sanitizeRedirectUrl(req, redirectUrl);
        const state = await createStateToken(
          {
            version: STATE_VERSION,
            workspaceId,
            userId: user.id,
            redirectUrl: safeRedirectUrl,
            expiresAt: Date.now() + STATE_TTL_MS,
          },
          supabaseServiceKey,
        );

        const authUrl = new URL(GOOGLE_OAUTH_URL);
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", GMAIL_SCOPES.join(" "));
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("state", state);

        return jsonResponse({ url: authUrl.toString() });
      }

      if (action === "disconnect") {
        const { connectionId } = body;
        if (!connectionId) {
          return jsonResponse({ error: "connectionId is required" }, 400);
        }

        const { data: connection } = await supabase
          .from("gmail_connections")
          .select("id, workspace_id")
          .eq("id", connectionId)
          .maybeSingle();

        if (!connection) {
          return jsonResponse({ error: "Connection not found" }, 404);
        }

        await assertWorkspaceAdmin(supabase, user.id, connection.workspace_id);
        await supabase.from("gmail_tokens").delete().eq("gmail_connection_id", connectionId);
        await supabase.from("gmail_connections").delete().eq("id", connectionId);

        await supabase.from("audit_log").insert({
          workspace_id: connection.workspace_id,
          user_id: user.id,
          action: "gmail_disconnected",
          entity_type: "gmail_connection",
          entity_id: connectionId,
        });

        return jsonResponse({ success: true });
      }

      return jsonResponse({ error: "Unknown action. Use 'initiate' or 'disconnect'." }, 400);
    } catch (error) {
      console.error("POST error:", error);
      const message = getErrorMessage(error);
      if (error instanceof HttpError) {
        return jsonResponse({ error: message }, error.status);
      }
      return jsonResponse({ error: message }, 500);
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
