import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

// Known newsletter/marketing email platforms
const NEWSLETTER_DOMAINS = new Set([
  "mailchimp.com", "mail.mailchimp.com", "list-manage.com",
  "constantcontact.com", "sendinblue.com", "brevo.com",
  "sendgrid.net", "convertkit.com", "substack.com",
  "beehiiv.com", "hubspot.com", "mailerlite.com",
  "campaignmonitor.com", "aweber.com", "drip.com",
  "activecampaign.com", "klaviyo.com", "getresponse.com",
  "moosend.com", "omnisend.com", "flodesk.com",
  "buttondown.email", "ghost.io", "revue.email",
  "tinyletter.com", "benchmark.email", "emailoctopus.com",
]);

interface ClassificationResult {
  isNewsletter: boolean;
  score: number;
  method: string;
}

function classifyEmail(headers: Record<string, string>, fromEmail: string, textContent: string): ClassificationResult {
  let score = 0;
  const methods: string[] = [];

  // 1. List-Unsubscribe header (strong signal)
  if (headers["list-unsubscribe"] || headers["List-Unsubscribe"]) {
    score += 0.35;
    methods.push("header:list-unsubscribe");
  }

  // 2. Precedence header (bulk/list)
  const precedence = (headers["precedence"] || headers["Precedence"] || "").toLowerCase();
  if (precedence === "bulk" || precedence === "list") {
    score += 0.2;
    methods.push("header:precedence");
  }

  // 3. Sender domain matches known newsletter platforms
  const senderDomain = fromEmail.split("@")[1]?.toLowerCase() || "";
  for (const domain of NEWSLETTER_DOMAINS) {
    if (senderDomain === domain || senderDomain.endsWith("." + domain)) {
      score += 0.3;
      methods.push("sender:known-platform");
      break;
    }
  }

  // 4. Content signals
  const lowerContent = textContent.toLowerCase();
  if (lowerContent.includes("unsubscribe") || lowerContent.includes("opt out") || lowerContent.includes("opt-out")) {
    score += 0.15;
    methods.push("content:unsubscribe-link");
  }

  // 5. Marketing patterns
  const marketingPatterns = [
    /\b(limited time|act now|don't miss|exclusive offer|special deal)\b/i,
    /\b(click here|shop now|buy now|get started|learn more)\b/i,
    /\b\d+%\s*(off|discount|savings?)\b/i,
    /\b(free shipping|coupon|promo code)\b/i,
  ];
  let marketingHits = 0;
  for (const pattern of marketingPatterns) {
    if (pattern.test(textContent)) marketingHits++;
  }
  if (marketingHits >= 2) {
    score += 0.15;
    methods.push("content:marketing-patterns");
  }

  // 6. Negative signals (transactional/operational)
  const transactionalPatterns = [
    /\b(order confirmation|shipping notification|password reset|account verification)\b/i,
    /\b(invoice|receipt|payment confirmation|billing)\b/i,
    /\b(your ticket|support request|case #)\b/i,
  ];
  for (const pattern of transactionalPatterns) {
    if (pattern.test(textContent)) {
      score -= 0.3;
      methods.push("negative:transactional");
      break;
    }
  }

  return {
    isNewsletter: score >= 0.4,
    score: Math.max(0, Math.min(1, score)),
    method: methods.join(", ") || "none",
  };
}

async function refreshToken(
  supabase: any,
  connectionId: string,
  refreshTokenValue: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshTokenValue,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await resp.json();

  await supabase
    .from("gmail_tokens")
    .update({
      access_token: data.access_token,
      token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("gmail_connection_id", connectionId);

  return data.access_token;
}

function extractHeaders(payload: any): Record<string, string> {
  const headers: Record<string, string> = {};
  if (payload?.headers) {
    for (const h of payload.headers) {
      headers[h.name] = h.value;
    }
  }
  return headers;
}

function extractBody(payload: any): { html: string; text: string } {
  let html = "";
  let text = "";

  function walk(part: any) {
    if (!part) return;
    if (part.mimeType === "text/html" && part.body?.data) {
      html = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }
    if (part.mimeType === "text/plain" && part.body?.data) {
      text = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }
    if (part.parts) {
      for (const sub of part.parts) walk(sub);
    }
  }

  walk(payload);

  // If only body.data on the top-level payload
  if (!html && !text && payload?.body?.data) {
    const decoded = atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    if (payload.mimeType === "text/html") html = decoded;
    else text = decoded;
  }

  return { html, text };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth: verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { connectionId, fullSync, maxResults } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: "connectionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get connection info
    const { data: connection, error: connErr } = await supabase
      .from("gmail_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connErr || !connection) {
      return new Response(
        JSON.stringify({ error: "Connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update sync status
    await supabase
      .from("gmail_connections")
      .update({ sync_status: "syncing", sync_error: null })
      .eq("id", connectionId);

    // Get tokens (service role bypasses RLS)
    const { data: tokens, error: tokenErr } = await supabase
      .from("gmail_tokens")
      .select("*")
      .eq("gmail_connection_id", connectionId)
      .single();

    if (tokenErr || !tokens) {
      await supabase
        .from("gmail_connections")
        .update({ sync_status: "error", sync_error: "No tokens found. Please reconnect Gmail." })
        .eq("id", connectionId);
      return new Response(
        JSON.stringify({ error: "No tokens found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh token if expired
    let accessToken = tokens.access_token;
    if (new Date(tokens.token_expires_at) <= new Date()) {
      try {
        accessToken = await refreshToken(supabase, connectionId, tokens.refresh_token, clientId, clientSecret);
      } catch (err) {
        await supabase
          .from("gmail_connections")
          .update({ sync_status: "error", sync_error: "Token refresh failed. Please reconnect." })
          .eq("id", connectionId);
        return new Response(
          JSON.stringify({ error: "Token refresh failed" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get competitors for auto-association
    const { data: competitors } = await supabase
      .from("competitors")
      .select("id, name, domains")
      .eq("workspace_id", connection.workspace_id)
      .eq("is_monitored", true);

    const competitorDomainMap = new Map<string, string>();
    for (const c of competitors || []) {
      for (const domain of c.domains || []) {
        competitorDomainMap.set(domain.toLowerCase(), c.id);
      }
    }

    // Build Gmail query
    const limit = maxResults || 50;
    let query = "category:promotions OR label:^unsub";
    if (!fullSync && connection.last_sync_at) {
      const afterDate = new Date(connection.last_sync_at);
      const afterEpoch = Math.floor(afterDate.getTime() / 1000);
      query += ` after:${afterEpoch}`;
    }

    // Fetch message list from Gmail
    const listUrl = `${GMAIL_API}/messages?q=${encodeURIComponent(query)}&maxResults=${limit}`;
    const listResp = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResp.ok) {
      const errText = await listResp.text();
      console.error("Gmail list error:", listResp.status, errText);

      if (listResp.status === 401) {
        await supabase
          .from("gmail_connections")
          .update({ sync_status: "error", sync_error: "Gmail access revoked. Please reconnect." })
          .eq("id", connectionId);
      } else {
        await supabase
          .from("gmail_connections")
          .update({ sync_status: "error", sync_error: `Gmail API error: ${listResp.status}` })
          .eq("id", connectionId);
      }

      return new Response(
        JSON.stringify({ error: `Gmail API error: ${listResp.status}` }),
        { status: listResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const listData = await listResp.json();
    const messages = listData.messages || [];

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const msg of messages) {
      try {
        // Check for dedup
        const { data: existing } = await supabase
          .from("newsletter_inbox")
          .select("id")
          .eq("workspace_id", connection.workspace_id)
          .eq("gmail_message_id", msg.id)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Fetch full message
        const msgResp = await fetch(`${GMAIL_API}/messages/${msg.id}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!msgResp.ok) {
          errors++;
          continue;
        }

        const msgData = await msgResp.json();
        const headers = extractHeaders(msgData.payload);
        const { html, text } = extractBody(msgData.payload);

        const fromHeader = headers["From"] || headers["from"] || "";
        const fromMatch = fromHeader.match(/(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?/);
        const fromName = fromMatch?.[1]?.trim() || "";
        const fromEmail = fromMatch?.[2]?.trim() || fromHeader;
        const subject = headers["Subject"] || headers["subject"] || "";
        const dateStr = headers["Date"] || headers["date"] || "";
        const receivedAt = dateStr ? new Date(dateStr).toISOString() : new Date(parseInt(msgData.internalDate)).toISOString();

        // Classify
        const classification = classifyEmail(headers, fromEmail, text || html);

        // Auto-associate with competitor
        const senderDomain = fromEmail.split("@")[1]?.toLowerCase() || "";
        let competitorId: string | null = competitorDomainMap.get(senderDomain) || null;

        // Insert into inbox
        await supabase.from("newsletter_inbox").insert({
          workspace_id: connection.workspace_id,
          gmail_connection_id: connectionId,
          gmail_message_id: msg.id,
          from_email: fromEmail,
          from_name: fromName,
          subject,
          html_content: html || null,
          text_content: text || null,
          received_at: receivedAt,
          is_newsletter: classification.isNewsletter,
          newsletter_score: classification.score,
          classification_method: classification.method,
          competitor_id: competitorId,
          headers_json: headers,
          is_demo: false,
        });

        imported++;
      } catch (err) {
        console.error(`Error processing message ${msg.id}:`, err);
        errors++;
      }
    }

    // Update connection
    await supabase
      .from("gmail_connections")
      .update({
        sync_status: "idle",
        sync_error: errors > 0 ? `${errors} message(s) failed to import` : null,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    // Track usage
    if (imported > 0) {
      await supabase.from("usage_events").insert({
        workspace_id: connection.workspace_id,
        event_type: "newsletter_imported",
        quantity: imported,
        metadata: { source: "gmail", connection_id: connectionId },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped,
        errors,
        total: messages.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
