import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, d?: any) => console.log(`[GENERATE-INSIGHTS] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    // Email verification check
    if (!claimsData.claims.email_confirmed_at) {
      return new Response(JSON.stringify({ error: "Please verify your email before generating insights." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const workspaceId = body?.workspaceId;
    const category = body?.category;
    if (!workspaceId || typeof workspaceId !== "string") {
      return new Response(JSON.stringify({ error: "workspaceId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit: 10 insight generations per hour per user
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _user_id: userId,
      _workspace_id: workspaceId,
      _endpoint: "generate-insights",
      _max_per_hour: 10,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit reached. You can generate insights up to 10 times per hour." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Gather platform data for context
    const [newsletters, extractions, ads, adAnalyses, competitors] = await Promise.all([
      supabase.from("newsletter_inbox").select("subject, from_name, from_email, received_at, tags, is_newsletter")
        .eq("workspace_id", workspaceId).eq("is_newsletter", true).order("received_at", { ascending: false }).limit(50),
      supabase.from("newsletter_extractions").select("campaign_type, main_message, coupon_code, discount_percentage, free_shipping, product_categories, calls_to_action, urgency_signals, overall_confidence")
        .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
      supabase.from("meta_ads").select("page_name, cta_type, is_active, ad_delivery_start_time, ad_delivery_stop_time, platforms, ad_creative_bodies")
        .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
      supabase.from("meta_ad_analyses").select("message_angle, offer_angle, funnel_intent, creative_pattern, product_category, strategy_takeaways, urgency_style, audience_clues")
        .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
      supabase.from("competitors").select("name, website, tags").eq("workspace_id", workspaceId),
    ]);

    const competitorNames = (competitors.data || []).map((c: any) => c.name);
    const dataContext = {
      newsletters: (newsletters.data || []).length,
      extractions: extractions.data || [],
      ads: (ads.data || []).length,
      adAnalyses: adAnalyses.data || [],
      competitorNames,
      newsletterSample: (newsletters.data || []).slice(0, 20).map((n: any) => ({
        subject: n.subject, from: n.from_name, date: n.received_at
      })),
      adSample: (ads.data || []).slice(0, 15).map((a: any) => ({
        page: a.page_name, cta: a.cta_type, active: a.is_active,
        body: (a.ad_creative_bodies || []).slice(0, 1).join("").substring(0, 200)
      })),
    };

    if (dataContext.newsletters === 0 && dataContext.ads === 0) {
      return new Response(JSON.stringify({ insights: [], message: "Insufficient data" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log("Generating insights", { newsletters: dataContext.newsletters, ads: dataContext.ads, category });

    const categoryFilter = category ? `Focus specifically on the "${category}" category.` : "Cover all relevant categories.";

    const prompt = `You are a senior competitive intelligence analyst. Based on the following platform data, generate 4-8 structured strategic insights.

${categoryFilter}

AVAILABLE CATEGORIES: pricing, promotions, email_strategy, paid_ads, product_focus, seasonal_strategy, messaging_positioning, cadence_frequency

DATA CONTEXT:
- ${dataContext.newsletters} newsletters tracked across ${competitorNames.length} competitors: ${competitorNames.join(", ")}
- ${dataContext.ads} Meta ads tracked
- Newsletter extractions (promo/campaign data): ${JSON.stringify(dataContext.extractions.slice(0, 10))}
- Ad analyses: ${JSON.stringify(dataContext.adAnalyses.slice(0, 10))}
- Recent newsletters: ${JSON.stringify(dataContext.newsletterSample)}
- Recent ads: ${JSON.stringify(dataContext.adSample)}

For EACH insight, return a JSON object with:
- category: one of the categories above
- title: concise insight title (analyst-level, not generic)
- what_is_happening: specific observation grounded in data
- why_it_matters: business significance
- strategic_implication: what this means for the competitive landscape
- recommended_response: actionable recommendation
- confidence: 0-1 based on data quality/volume
- affected_competitors: array of competitor names involved
- source_type: "newsletter" or "meta_ad" or "cross_channel"

Rules:
- Do NOT generate shallow generic advice. Each insight must cite specific patterns from the data.
- If data is insufficient for a category, skip it rather than fabricating.
- Confidence below 0.3 should not be included.
- Write like a senior analyst briefing a CMO.

Return a JSON array of insight objects. Return ONLY valid JSON, no markdown.`;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not set");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a senior competitive intelligence analyst. Return only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "AI service rate limited, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await aiResp.text();
      log("AI error", { status: aiResp.status, body: errText.substring(0, 200) });
      throw new Error(`AI error: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const raw = aiData.choices?.[0]?.message?.content || "";
    
    let insights: any[];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array found");
      insights = JSON.parse(match[0]);
    } catch {
      log("Parse failure", { raw: raw.substring(0, 300) });
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate and filter insights
    const rows = insights
      .filter((i: any) => i.confidence >= 0.3 && i.title && i.what_is_happening)
      .slice(0, 10) // Cap at 10 to prevent runaway
      .map((i: any) => ({
        workspace_id: workspaceId,
        category: String(i.category || "general").substring(0, 100),
        title: String(i.title).substring(0, 500),
        what_is_happening: String(i.what_is_happening).substring(0, 2000),
        why_it_matters: String(i.why_it_matters || "").substring(0, 2000),
        strategic_implication: String(i.strategic_implication || "").substring(0, 2000),
        recommended_response: String(i.recommended_response || "").substring(0, 2000),
        confidence: Math.min(1, Math.max(0, Number(i.confidence) || 0.5)),
        supporting_evidence: Array.isArray(i.supporting_evidence) ? i.supporting_evidence : [],
        affected_competitors: Array.isArray(i.affected_competitors) ? i.affected_competitors.map(String).slice(0, 20) : [],
        source_type: ["newsletter", "meta_ad", "cross_channel"].includes(i.source_type) ? i.source_type : "newsletter",
      }));

    if (rows.length > 0) {
      const { error: insertErr } = await supabase.from("insights").insert(rows);
      if (insertErr) log("Insert error", { error: insertErr.message });
    }

    // Track usage
    await supabase.from("usage_events").insert({
      workspace_id: workspaceId,
      event_type: "insights_generated",
      quantity: rows.length,
    });

    log("Done", { count: rows.length });

    return new Response(JSON.stringify({ success: true, insights: rows }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
