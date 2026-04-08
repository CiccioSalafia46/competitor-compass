import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  HttpError,
  assertVerifiedUser,
  assertWorkspaceAnalyst,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";
import { createOpenAiChatCompletion } from "../_shared/openai.ts";

type AnalysisPayload = Record<string, unknown>;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ANALYZE-META-AD] ${step}${d}`);
};

function parseJsonObject(rawContent: string) {
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found");
  return JSON.parse(jsonMatch[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { user } = await requireAuthenticatedUser(supabase, req);
    await assertVerifiedUser(user);
    const userId = user.id;

    const body = await req.json();
    const metaAdId = body?.metaAdId;
    if (!metaAdId || typeof metaAdId !== "string") {
      return jsonResponse({ error: "metaAdId is required" }, 400);
    }

    const { data: exists } = await supabase.rpc("check_ad_analysis_exists", { _meta_ad_id: metaAdId });
    if (exists) {
      return jsonResponse({ error: "This ad has already been analyzed." }, 409);
    }

    const { data: ad, error: adErr } = await supabase.from("meta_ads").select("*").eq("id", metaAdId).single();
    if (adErr || !ad) {
      return jsonResponse({ error: "Ad not found" }, 404);
    }

    await assertWorkspaceAnalyst(supabase, userId, ad.workspace_id);

    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _user_id: userId,
      _workspace_id: ad.workspace_id,
      _endpoint: "analyze-meta-ad",
      _max_per_hour: 20,
    });
    if (!allowed) {
      return jsonResponse({ error: "Rate limit reached. You can analyze up to 20 ads per hour." }, 429);
    }

    logStep("Analyzing ad", { adId: ad.id, pageName: ad.page_name });

    const adText = [
      ...(ad.ad_creative_bodies || []),
      ...(ad.ad_creative_link_titles || []),
      ...(ad.ad_creative_link_descriptions || []),
    ].join("\n");

    if (!adText.trim()) {
      return jsonResponse({ error: "No ad copy to analyze" }, 400);
    }

    const prompt = `Analyze this Meta/Facebook ad from "${ad.page_name || "Unknown"}". Return a JSON object with these fields:
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

    const completion = await createOpenAiChatCompletion({
      modelCandidates: [
        Deno.env.get("OPENAI_MODEL_META_AD_ANALYSIS") || "gpt-4.1",
        "gpt-4.1-mini",
      ],
      messages: [
        { role: "system", content: "You are an expert paid media analyst. Analyze ads and return structured JSON." },
        { role: "user", content: prompt },
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.3,
    });

    if (!completion.ok) {
      logStep("OpenAI error", { status: completion.status, model: completion.model });
      if (completion.status === 429) {
        return jsonResponse({ error: "AI service rate limited, please try again later." }, 429);
      }
      throw new Error(`AI analysis failed: ${completion.status}`);
    }

    const rawContent = completion.data?.choices?.[0]?.message?.content || "";

    let analysis: AnalysisPayload;
    try {
      analysis = parseJsonObject(rawContent);
    } catch {
      logStep("Failed to parse AI response");
      return jsonResponse({ error: "Failed to parse AI analysis" }, 422);
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
        model_used: completion.model,
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
    return jsonResponse({ success: true, analysis: stored });
  } catch (err) {
    const msg = getErrorMessage(err);
    logStep("ERROR", { message: msg });
    if (err instanceof HttpError) {
      return jsonResponse({ error: msg }, err.status);
    }
    return jsonResponse({ error: "An internal error occurred. Please try again." }, 500);
  }
});
