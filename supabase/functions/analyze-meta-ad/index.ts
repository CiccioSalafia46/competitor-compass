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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { metaAdId } = await req.json();
    if (!metaAdId) throw new Error("metaAdId is required");

    // Fetch the ad
    const { data: ad, error: adErr } = await supabase
      .from("meta_ads")
      .select("*")
      .eq("id", metaAdId)
      .single();

    if (adErr || !ad) throw new Error("Ad not found");
    logStep("Analyzing ad", { adId: ad.id, pageName: ad.page_name });

    // Build ad context for AI
    const adText = [
      ...(ad.ad_creative_bodies || []),
      ...(ad.ad_creative_link_titles || []),
      ...(ad.ad_creative_link_descriptions || []),
    ].join("\n");

    if (!adText.trim()) {
      return new Response(
        JSON.stringify({ error: "No ad copy to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Analyze this Meta/Facebook ad from "${ad.page_name || 'Unknown'}". Return a JSON object with these fields:
- message_angle: The core message strategy (e.g., "social proof", "fear of missing out", "educational", "emotional storytelling")
- offer_angle: What's being offered and how it's positioned (e.g., "free trial", "discount bundle", "limited edition")
- promo_language: Key promotional phrases used (the actual language from the ad)
- urgency_style: How urgency is created if at all (e.g., "countdown", "limited stock", "seasonal", "none")
- audience_clues: Array of inferred target audience signals (demographics, interests, pain points)
- funnel_intent: Where in the funnel this ad sits (e.g., "top-of-funnel awareness", "mid-funnel consideration", "bottom-of-funnel conversion", "retargeting")
- creative_pattern: Visual/copy pattern classification (e.g., "testimonial", "before-after", "product showcase", "UGC-style", "listicle")
- product_category: Product or service category
- strategy_takeaways: Array of 2-4 actionable strategic observations
- confidence: Overall confidence 0-1

Ad Copy:
${adText}

Platform: ${(ad.publisher_platforms || []).join(", ") || "Unknown"}
CTA: ${ad.cta_type || "Unknown"}
Active since: ${ad.ad_delivery_start_time || "Unknown"}
Still running: ${ad.is_active ? "Yes" : "No"}

Return ONLY valid JSON, no markdown.`;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not set");

    const aiResp = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
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
      logStep("AI API error", { status: aiResp.status, body: errText });
      throw new Error(`AI analysis failed: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    logStep("AI response received", { length: rawContent.length });

    // Parse JSON from response
    let analysis: any;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      logStep("Failed to parse AI response", { raw: rawContent.substring(0, 200) });
      return new Response(
        JSON.stringify({ error: "Failed to parse AI analysis", raw: rawContent }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store analysis
    const { data: stored, error: storeErr } = await supabase
      .from("meta_ad_analyses")
      .insert({
        workspace_id: ad.workspace_id,
        meta_ad_id: ad.id,
        message_angle: analysis.message_angle || null,
        offer_angle: analysis.offer_angle || null,
        promo_language: analysis.promo_language || null,
        urgency_style: analysis.urgency_style || null,
        audience_clues: analysis.audience_clues || [],
        funnel_intent: analysis.funnel_intent || null,
        creative_pattern: analysis.creative_pattern || null,
        product_category: analysis.product_category || null,
        strategy_takeaways: analysis.strategy_takeaways || [],
        confidence_scores: analysis.confidence_scores || {},
        overall_confidence: analysis.confidence || null,
        model_used: "google/gemini-2.5-flash",
        raw_analysis: analysis,
      })
      .select()
      .single();

    if (storeErr) {
      logStep("Store error", { error: storeErr.message });
      throw new Error(`Failed to store analysis: ${storeErr.message}`);
    }

    // Track usage
    await supabase.from("usage_events").insert({
      workspace_id: ad.workspace_id,
      event_type: "meta_ad_analyzed",
      quantity: 1,
    });

    logStep("Analysis complete", { analysisId: stored.id });

    return new Response(
      JSON.stringify({ success: true, analysis: stored }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
