import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  HttpError,
  assertWorkspaceAnalyst,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";
import { createOpenAiChatCompletion } from "../_shared/openai.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[WEEKLY-BRIEFING] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);

function getWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  // ISO week: Monday → Sunday
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // offset to Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase environment not configured." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { user } = await requireAuthenticatedUser(supabase, req);
    const body = await req.json().catch(() => ({}));
    const { workspaceId, forceRegenerate = false } = body;

    if (!workspaceId) {
      return jsonResponse({ error: "workspaceId is required." }, 400);
    }

    await assertWorkspaceAnalyst(supabase, user.id, workspaceId);

    const { weekStart, weekEnd } = getWeekBounds(new Date());

    // Check for existing ready briefing unless forced
    if (!forceRegenerate) {
      const { data: existing } = await supabase
        .from("weekly_briefings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("week_start", weekStart)
        .eq("status", "ready")
        .maybeSingle();

      if (existing) {
        return jsonResponse({ briefing: existing, cached: true });
      }
    }

    // Upsert placeholder row with "generating" status
    const { data: briefingRow, error: upsertError } = await supabase
      .from("weekly_briefings")
      .upsert(
        {
          workspace_id: workspaceId,
          week_start: weekStart,
          week_end: weekEnd,
          status: "generating",
          generated_at: new Date().toISOString(),
          error_message: null,
        },
        { onConflict: "workspace_id,week_start" },
      )
      .select()
      .single();

    if (upsertError) throw upsertError;
    const briefingId = briefingRow.id;

    // Gather data for the briefing
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - 7);
    const rangeStartISO = rangeStart.toISOString();

    const [
      newslettersRes,
      insightsRes,
      alertsRes,
      competitorsRes,
      adsRes,
    ] = await Promise.all([
      supabase
        .from("newsletter_inbox")
        .select("from_name, from_email, subject, received_at, competitor_id")
        .eq("workspace_id", workspaceId)
        .eq("is_newsletter", true)
        .gte("received_at", rangeStartISO)
        .order("received_at", { ascending: false })
        .limit(80),
      supabase
        .from("insights")
        .select("title, category, priority_level, impact_area, strategic_takeaway, affected_competitors, confidence")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("alerts")
        .select("title, severity, created_at, is_read")
        .eq("workspace_id", workspaceId)
        .gte("created_at", rangeStartISO)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("competitors")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .eq("is_monitored", true),
      supabase
        .from("meta_ads")
        .select("page_name, cta_type, is_active, competitor_id")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .limit(40),
    ]);

    const newsletters = newslettersRes.data ?? [];
    const insights = insightsRes.data ?? [];
    const alerts = alertsRes.data ?? [];
    const competitors = competitorsRes.data ?? [];
    const activeAds = adsRes.data ?? [];

    const competitorNameById = new Map(competitors.map((c) => [c.id, c.name]));

    // Build a concise payload for the AI
    const payload = {
      week: `${weekStart} to ${weekEnd}`,
      metrics: {
        newsletters_this_week: newsletters.length,
        active_ads: activeAds.length,
        tracked_competitors: competitors.length,
        alerts_this_week: alerts.length,
        unread_alerts: alerts.filter((a) => !a.is_read).length,
        high_priority_insights: insights.filter((i) => i.priority_level === "high").length,
      },
      top_newsletters: newsletters.slice(0, 15).map((n) => ({
        subject: n.subject,
        from: n.from_name || n.from_email,
        competitor: n.competitor_id ? (competitorNameById.get(n.competitor_id) ?? "Unknown") : null,
        received_at: n.received_at,
      })),
      top_insights: insights.slice(0, 10).map((i) => ({
        title: i.title,
        category: i.category,
        priority: i.priority_level,
        impact: i.impact_area,
        takeaway: i.strategic_takeaway,
        competitors: i.affected_competitors,
        confidence: i.confidence,
      })),
      alerts: alerts.slice(0, 10).map((a) => ({
        title: a.title,
        severity: a.severity,
      })),
      active_ad_competitors: [...new Set(activeAds.map((ad) =>
        ad.competitor_id ? (competitorNameById.get(ad.competitor_id) ?? ad.page_name ?? "Unknown") : (ad.page_name ?? "Unknown")
      ))].slice(0, 8),
    };

    const completion = await createOpenAiChatCompletion({
      modelCandidates: [Deno.env.get("OPENAI_MODEL_INSIGHTS") || "gpt-4.1", "gpt-4.1-mini"],
      temperature: 0.2,
      responseFormat: { type: "json_object" },
      maxCompletionTokens: 2000,
      messages: [
        {
          role: "system",
          content:
            "You are a senior competitive intelligence analyst. Generate a concise weekly briefing for a B2B SaaS growth team. Output only a JSON object with the exact shape requested — no markdown, no preamble.",
        },
        {
          role: "user",
          content: [
            `Generate a weekly competitive intelligence briefing for week ${payload.week}.`,
            "Return a JSON object with this exact shape:",
            JSON.stringify({
              executive_summary: "2-3 sentence overview of the week's competitive landscape",
              key_signals: [{ competitor: "string", signal: "string", category: "string" }],
              top_insights: [{ title: "string", priority: "string", category: "string", takeaway: "string" }],
              action_items: [{ action: "string", urgency: "high|medium|low" }],
              competitor_spotlight: { name: "string or null", headline: "string", details: "string" },
            }),
            "Rules:",
            "- executive_summary: factual, quantified where possible, no filler",
            "- key_signals: up to 5 most important signals from this week's data",
            "- top_insights: up to 5 most actionable insights",
            "- action_items: up to 4 concrete actions the team should take this week",
            "- competitor_spotlight: the single most active or notable competitor this week (or null name if unclear)",
            "",
            "Data payload:",
            JSON.stringify(payload),
          ].join("\n"),
        },
      ],
    });

    let briefingContent: Record<string, unknown> = {};
    let status = "failed";
    let errorMessage: string | null = null;

    if (completion.ok) {
      const raw = (completion.data as { choices?: Array<{ message?: { content?: string } }> })
        ?.choices?.[0]?.message?.content ?? "";
      try {
        briefingContent = JSON.parse(raw.trim());
        status = "ready";
        log("briefing_generated", { workspaceId, model: completion.model });
      } catch {
        errorMessage = "AI response could not be parsed.";
        log("parse_error", { workspaceId });
      }
    } else {
      errorMessage = `OpenAI error (${completion.status}): ${completion.errorText.slice(0, 200)}`;
      log("openai_failed", { workspaceId, status: completion.status });
    }

    const { data: finalRow, error: updateError } = await supabase
      .from("weekly_briefings")
      .update({
        status,
        error_message: errorMessage,
        generated_at: new Date().toISOString(),
        executive_summary: briefingContent.executive_summary as string ?? null,
        key_signals: briefingContent.key_signals ?? [],
        top_insights: briefingContent.top_insights ?? [],
        action_items: briefingContent.action_items ?? [],
        competitor_spotlight: briefingContent.competitor_spotlight ?? {},
        metrics_snapshot: payload.metrics,
      })
      .eq("id", briefingId)
      .select()
      .single();

    if (updateError) throw updateError;

    return jsonResponse({ briefing: finalRow, cached: false });
  } catch (error) {
    const message = getErrorMessage(error);
    log("ERROR", { message });
    if (error instanceof HttpError) {
      return jsonResponse({ error: message }, error.status);
    }
    return jsonResponse({ error: message }, 500);
  }
});
