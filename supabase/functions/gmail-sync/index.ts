import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  HttpError,
  assertWorkspaceMember,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import {
  evaluateAlertRules,
  scheduleBackgroundAlertEvaluation,
} from "../_shared/alerts.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";

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

function normalizeDomain(value: string | null | undefined) {
  if (!value) return null;

  let normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  normalized = normalized.replace(/^[a-z]+:\/\//, "");

  if (normalized.includes("@")) {
    const parts = normalized.split("@");
    normalized = parts[parts.length - 1] ?? "";
  }

  normalized = normalized.split("/")[0] ?? normalized;
  normalized = normalized.split("?")[0] ?? normalized;
  normalized = normalized.split("#")[0] ?? normalized;
  normalized = normalized.split(":")[0] ?? normalized;
  normalized = normalized.replace(/^www\./, "").replace(/\.$/, "");

  return normalized || null;
}

function collectCompetitorDomains(website: string | null | undefined, domains: string[] | null | undefined) {
  return Array.from(
    new Set(
      [normalizeDomain(website), ...(domains ?? []).map((entry) => normalizeDomain(entry))]
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );
}

type TokenStoreClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<unknown>;
    };
  };
};

type GmailHeader = {
  name: string;
  value: string;
};

type GmailBody = {
  data?: string;
};

type GmailPayloadPart = {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPayloadPart[];
};

type SyncSummary = {
  status: "up_to_date" | "imported" | "completed_with_issues";
  message: string;
};

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
  supabase: TokenStoreClient,
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

  // Persist the refreshed token — retry up to 3 times because a transient DB
  // failure here causes the *next* sync to load the stale expired token and
  // present a misleading "Gmail disconnected" error to the user.
  const tokenPayload = {
    access_token: data.access_token,
    token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  let persisted = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error: updateError } = await supabase
      .from("gmail_tokens")
      .update(tokenPayload)
      .eq("gmail_connection_id", connectionId);
    if (!updateError) { persisted = true; break; }
    console.error(`[gmail-sync] Token persist attempt ${attempt}/3 failed:`, updateError);
    if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  if (!persisted) {
    throw new Error("Refreshed token with Google but failed to persist to DB after 3 attempts");
  }

  return data.access_token;
}

function extractHeaders(payload: GmailPayloadPart | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  if (payload?.headers) {
    for (const h of payload.headers) {
      headers[h.name] = h.value;
    }
  }
  return headers;
}

function extractBody(payload: GmailPayloadPart | undefined): { html: string; text: string } {
  let html = "";
  let text = "";

  function walk(part: GmailPayloadPart | undefined) {
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

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildSyncSummary(params: {
  imported: number;
  skipped: number;
  errors: number;
  total: number;
  attributed: number;
  needsReview: number;
}): SyncSummary {
  const { imported, skipped, errors, total, attributed, needsReview } = params;
  const attributionSummary = imported > 0
    ? `${attributed > 0 ? ` Matched ${pluralize(attributed, "email")} to tracked competitors.` : ""}${needsReview > 0 ? ` ${pluralize(needsReview, "email")} still need competitor review.` : ""}`.trim()
    : "";

  if (errors > 0) {
    if (imported > 0) {
      return {
        status: "completed_with_issues",
        message: `Sync completed with issues. Imported ${pluralize(imported, "new email")}, skipped ${pluralize(skipped, "duplicate")}, and ${pluralize(errors, "message")} failed.${attributionSummary ? ` ${attributionSummary}` : ""}`,
      };
    }

    return {
      status: "completed_with_issues",
      message: `Sync completed with issues. No new emails were imported and ${pluralize(errors, "message")} failed.`,
    };
  }

  if (total === 0) {
    return {
      status: "up_to_date",
      message: "Sync completed. No new competitor emails were found in the current sync window.",
    };
  }

  if (imported === 0) {
    return {
      status: "up_to_date",
      message: skipped > 0
        ? `Sync completed. No new emails were imported; ${pluralize(skipped, "message")} already existed in your inbox.`
        : "Sync completed. There was nothing new to import.",
    };
  }

  return {
    status: "imported",
    message: `Sync completed. Imported ${pluralize(imported, "new email")}${skipped > 0 ? ` and skipped ${pluralize(skipped, "duplicate")}` : ""}.${attributionSummary ? ` ${attributionSummary}` : ""}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user } = await requireAuthenticatedUser(supabase, req);

    const { connectionId, fullSync, maxResults } = await req.json();

    if (!connectionId) {
      return jsonResponse({ error: "connectionId is required" }, 400);
    }

    // Get connection info
    const { data: connection, error: connErr } = await supabase
      .from("gmail_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connErr || !connection) {
      return jsonResponse({ error: "Connection not found" }, 404);
    }

    await assertWorkspaceMember(supabase, user.id, connection.workspace_id);

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
      return jsonResponse({ error: "No tokens found" }, 404);
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
        return jsonResponse({ error: "Token refresh failed" }, 401);
      }
    }

    // Get competitors for auto-association
    const { data: competitors } = await supabase
      .from("competitors")
      .select("id, name, website, domains")
      .eq("workspace_id", connection.workspace_id)
      .eq("is_monitored", true);

    const competitorDomainMap = new Map<string, string>();
    for (const c of competitors || []) {
      for (const domain of collectCompetitorDomains(c.website, c.domains)) {
        competitorDomainMap.set(domain, c.id);
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

      return jsonResponse({ error: `Gmail API error: ${listResp.status}` }, listResp.status);
    }

    const listData = await listResp.json();
    const messages = listData.messages || [];

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    let attributed = 0;
    let needsReview = 0;
    const importedNewsletterIds: string[] = [];

    // Bulk dedup: fetch all already-existing gmail_message_ids in one query
    const allMessageIds = messages.map((m: { id: string }) => m.id);
    const existingIds = new Set<string>();
    if (allMessageIds.length > 0) {
      const { data: existingRows } = await supabase
        .from("newsletter_inbox")
        .select("gmail_message_id")
        .eq("workspace_id", connection.workspace_id)
        .in("gmail_message_id", allMessageIds);
      for (const row of existingRows ?? []) {
        if (row.gmail_message_id) existingIds.add(row.gmail_message_id);
      }
    }

    for (const msg of messages) {
      try {
        if (existingIds.has(msg.id)) {
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
        const senderDomain = normalizeDomain(fromEmail);
        const competitorId: string | null = senderDomain ? competitorDomainMap.get(senderDomain) ?? null : null;

        // Insert into inbox
        const { data: insertedNewsletter, error: insertError } = await supabase
          .from("newsletter_inbox")
          .insert({
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
          })
          .select("id")
          .single<{ id: string }>();

        if (insertError || !insertedNewsletter) {
          throw insertError || new Error("Unable to insert newsletter inbox item");
        }

        imported++;
        importedNewsletterIds.push(insertedNewsletter.id);
        if (competitorId) {
          attributed++;
        } else if (classification.isNewsletter) {
          needsReview++;
        }
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

    const syncedAt = new Date().toISOString();
    const summary = buildSyncSummary({
      imported,
      skipped,
      errors,
      total: messages.length,
      attributed,
      needsReview,
    });

    if (importedNewsletterIds.length > 0) {
      scheduleBackgroundAlertEvaluation(
        evaluateAlertRules(supabase, {
          workspaceId: connection.workspace_id,
          source: "gmail_sync",
          triggeredBy: user.id,
          newsletterIds: importedNewsletterIds,
        }),
      );
    }

    return jsonResponse({
      success: true,
      status: summary.status,
      imported,
      skipped,
      errors,
      attributed,
      needs_review: needsReview,
      total: messages.length,
      sync_mode: fullSync ? "full" : "incremental",
      synced_at: syncedAt,
      message: summary.message,
    });
  } catch (err) {
    const message = getErrorMessage(err);
    console.error("Sync error:", err);
    if (err instanceof HttpError) {
      return jsonResponse({ error: message }, err.status);
    }
    return jsonResponse({ error: message }, 500);
  }
});
