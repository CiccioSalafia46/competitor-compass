import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newsletterInboxId } = await req.json();

    if (!newsletterInboxId) {
      return new Response(
        JSON.stringify({ error: "newsletterInboxId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch newsletter
    const { data: newsletter, error: fetchErr } = await supabase
      .from("newsletter_inbox")
      .select("*")
      .eq("id", newsletterInboxId)
      .single();

    if (fetchErr || !newsletter) {
      return new Response(
        JSON.stringify({ error: "Newsletter not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = newsletter.text_content || newsletter.html_content || "";
    if (content.length < 50) {
      return new Response(
        JSON.stringify({ error: "Newsletter content too short for extraction" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get competitor context
    let competitorContext = "";
    if (newsletter.competitor_id) {
      const { data: competitor } = await supabase
        .from("competitors")
        .select("name, website, description")
        .eq("id", newsletter.competitor_id)
        .single();
      if (competitor) {
        competitorContext = `\nCompetitor: ${competitor.name} (${competitor.website || "unknown"})`;
      }
    }

    const systemPrompt = `You are a competitive intelligence analyst specializing in newsletter analysis for B2B and B2C companies. 
Extract structured intelligence from the newsletter content provided.

RULES:
- Only report what you can directly observe or reasonably infer
- Never fabricate data not present in the source
- If a field cannot be determined, use null
- Provide a confidence score (0.0-1.0) for each field you extract
- For arrays, only include items you have evidence for`;

    const userPrompt = `Analyze this competitor newsletter and extract structured intelligence:

Subject: ${newsletter.subject || "N/A"}
From: ${newsletter.from_name || ""} <${newsletter.from_email || "unknown"}>
Date: ${newsletter.received_at || "unknown"}${competitorContext}

Content:
${content.substring(0, 8000)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_extraction",
              description: "Submit the structured newsletter intelligence extraction",
              parameters: {
                type: "object",
                properties: {
                  campaign_type: {
                    type: "string",
                    enum: ["promotional", "product_launch", "newsletter", "event", "seasonal", "abandoned_cart", "loyalty", "educational", "announcement", "survey", "other"],
                    description: "The type of email campaign",
                  },
                  main_message: { type: "string", description: "The primary message or theme of the newsletter" },
                  offers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        type: { type: "string", enum: ["discount", "bogo", "free_shipping", "gift", "bundle", "trial", "other"] },
                        value: { type: "string" },
                      },
                      required: ["description", "type"],
                    },
                  },
                  discount_percentage: { type: "number", description: "Primary discount percentage if mentioned" },
                  coupon_code: { type: "string", description: "Coupon/promo code if mentioned" },
                  free_shipping: { type: "boolean", description: "Whether free shipping is offered" },
                  expiry_date: { type: "string", description: "Expiry date of offers if mentioned (ISO format or descriptive)" },
                  calls_to_action: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        url: { type: "string" },
                        urgency: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["text"],
                    },
                  },
                  urgency_signals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        signal: { type: "string" },
                        type: { type: "string", enum: ["time_limited", "quantity_limited", "exclusive", "seasonal", "other"] },
                      },
                      required: ["signal", "type"],
                    },
                  },
                  product_categories: {
                    type: "array",
                    items: { type: "string" },
                    description: "Product categories mentioned",
                  },
                  event_mentions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        event: { type: "string" },
                        date: { type: "string" },
                        type: { type: "string", enum: ["webinar", "conference", "sale", "launch", "holiday", "other"] },
                      },
                      required: ["event", "type"],
                    },
                  },
                  strategy_takeaways: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        insight: { type: "string" },
                        category: { type: "string", enum: ["pricing", "positioning", "messaging", "product", "audience", "channel", "timing", "other"] },
                        confidence: { type: "number", description: "0.0 to 1.0" },
                      },
                      required: ["insight", "category", "confidence"],
                    },
                  },
                  confidence_scores: {
                    type: "object",
                    properties: {
                      campaign_type: { type: "number" },
                      main_message: { type: "number" },
                      offers: { type: "number" },
                      discount_percentage: { type: "number" },
                      coupon_code: { type: "number" },
                      calls_to_action: { type: "number" },
                      urgency_signals: { type: "number" },
                    },
                    description: "Confidence score (0.0-1.0) for each extracted field",
                  },
                },
                required: ["campaign_type", "main_message", "confidence_scores"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_extraction" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    let extraction: any;
    try {
      extraction = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Invalid JSON in AI response");
    }

    // Validate required fields
    if (!extraction.campaign_type || !extraction.main_message) {
      return new Response(
        JSON.stringify({ error: "Extraction failed: missing required fields" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate overall confidence
    const confidenceValues = Object.values(extraction.confidence_scores || {}).filter(
      (v): v is number => typeof v === "number"
    );
    const overallConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : 0.5;

    // Save extraction
    const { data: saved, error: saveErr } = await supabase
      .from("newsletter_extractions")
      .insert({
        workspace_id: newsletter.workspace_id,
        newsletter_inbox_id: newsletterInboxId,
        campaign_type: extraction.campaign_type,
        main_message: extraction.main_message,
        offers: extraction.offers || [],
        discount_percentage: extraction.discount_percentage || null,
        coupon_code: extraction.coupon_code || null,
        free_shipping: extraction.free_shipping || false,
        expiry_date: extraction.expiry_date || null,
        calls_to_action: extraction.calls_to_action || [],
        urgency_signals: extraction.urgency_signals || [],
        product_categories: extraction.product_categories || [],
        event_mentions: extraction.event_mentions || [],
        strategy_takeaways: extraction.strategy_takeaways || [],
        confidence_scores: extraction.confidence_scores || {},
        overall_confidence: overallConfidence,
        model_used: "google/gemini-3-flash-preview",
        extraction_method: "ai",
        is_valid: true,
        raw_extraction: extraction,
      })
      .select()
      .single();

    if (saveErr) throw saveErr;

    // Track usage
    await supabase.from("usage_events").insert({
      workspace_id: newsletter.workspace_id,
      event_type: "extraction_performed",
      quantity: 1,
      metadata: { newsletter_inbox_id: newsletterInboxId },
    });

    return new Response(
      JSON.stringify({ success: true, extraction: saved }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Extraction error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
