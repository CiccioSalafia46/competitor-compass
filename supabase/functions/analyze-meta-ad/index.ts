import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ANALYZE-META-AD] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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

    if (!claimsData.claims.email_confirmed_at) {
      return new Response(JSON.stringify({ error: "Please verify your email before analyzing ads." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const metaAdId = body?.metaAdId;
    if (!metaAdId || typeof metaAdId !== "string") {
      return new Response(JSON.stringify({ error: "metaAdId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Dedup: check if analysis already exists
    const { data: exists } = await supabase.rpc("check_ad_analysis_exists", { _meta_ad_id: metaAdId });
    if (exists) {
      return new Response(JSON.stringify({ error: "This ad has already been analyzed." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch the ad
    const { data: ad, error: adErr } = await supabase.from("meta_ads").select("*").eq("id", metaAdId).single();
    if (adErr || !ad) {
      return new Response(JSON.stringify({ error: "Ad not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit: 20 ad analyses per hour
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _user_id: userId,
      _workspace_id: ad.workspace_id,
      _endpoint: "analyze-meta-ad",
      _max_per_hour: 20,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit reached. You can analyze up to 20 ads per hour." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    logStep("Analyzing ad", { adId: ad.id, pageName: ad.page_name });

    const adText = [
      ...(ad.ad_creative_bodies || []),
      ...(ad.ad_creative_link_titles || []),
      ...(ad.ad_creative_link_descriptions || []),
    ].join("\n");

    if (!adText.trim()) {
      return new Response(JSON.stringify({ error: "No ad copy to analyze" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Analyze this Meta/Facebook ad from "${ad.page_name || 'Unknown'}". Return a JSON object with these fields:
- message_angle: The core message strategy
- offer_angle: What's being offered and how it's positioned
- promo_language: Key promotional phrases used
- urgency_style: How urgency is created if at all
- audience_clues: Array of inferred target audience signals
- funnel_intent: Where in the funnel this ad sits
- creative_pattern: Visual/copy pattern classification
- product_category: Product or service category
- strategy_takeaways: Array of 2-4 actionable strategic observations
- confidence: Overall confidence 0-1

Ad Copy:
${adText.substring(0, 4000)}

Platform: ${(ad.publisher_platforms || []).join(", ") || "Unknown"}
CTA: ${ad.cta_type || "Unknown"}
Active since: ${ad.ad_delivery_start_time || "Unknown"}
Still running: ${ad.is_active ? "Yes" : "No"}

Return ONLY valid JSON, no markdown.`;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not set");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert paid media analyst. Analyze ads and return structured JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      logStep("AI API error", { status: aiResp.status });
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "AI service rate limited, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI analysis failed: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let analysis: any;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      logStep("Failed to parse AI response");
      return new Response(JSON.stringify({ error: "Failed to parse AI analysis" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: stored, error: storeErr } = await supabase
      .from("meta_ad_analyses")
      .insert({
        workspace_id: ad.workspace_id,
        meta_ad_id: ad.id,
        message_angle: analysis.message_angle ? String(analysis.message_angle).substring(0, 500) : null,
        offer_angle: analysis.offer_angle ? String(analysis.offer_angle).substring(0, 500) : null,
        promo_language: analysis.promo_language ? String(analysis.promo_language).substring(0, 1000) : null,
        urgency_style: analysis.urgency_style ? String(analysis.urgency_style).substring(0, 200) : null,
        audience_clues: Array.isArray(analysis.audience_clues) ? analysis.audience_clues.map(String).slice(0, 20) : [],
        funnel_intent: analysis.funnel_intent ? String(analysis.funnel_intent).substring(0, 200) : null,
        creative_pattern: analysis.creative_pattern ? String(analysis.creative_pattern).substring(0, 200) : null,
        product_category: analysis.product_category ? String(analysis.product_category).substring(0, 200) : null,
        strategy_takeaways: Array.isArray(analysis.strategy_takeaways) ? analysis.strategy_takeaways.map(String).slice(0, 10) : [],
        confidence_scores: analysis.confidence_scores || {},
        overall_confidence: Math.min(1, Math.max(0, Number(analysis.confidence) || 0.5)),
        model_used: "google/gemini-2.5-flash",
        raw_analysis: analysis,
      })
      .select()
      .single();

    if (storeErr) throw new Error(`Failed to store analysis: ${storeErr.message}`);

    await supabase.from("usage_events").insert({
      workspace_id: ad.workspace_id,
      event_type: "meta_ad_analyzed",
      quantity: 1,
    });

    logStep("Analysis complete", { analysisId: stored.id });

    return new Response(JSON.stringify({ success: true, analysis: stored }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
