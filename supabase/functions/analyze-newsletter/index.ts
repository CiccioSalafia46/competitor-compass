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
    const { analysisId, newsletterEntryId } = await req.json();

    if (!analysisId || !newsletterEntryId) {
      return new Response(
        JSON.stringify({ error: "analysisId and newsletterEntryId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status to processing
    await supabase
      .from("analyses")
      .update({ status: "processing" })
      .eq("id", analysisId);

    // Fetch the newsletter content
    const { data: entry, error: entryError } = await supabase
      .from("newsletter_entries")
      .select("*")
      .eq("id", newsletterEntryId)
      .single();

    if (entryError || !entry) {
      await supabase
        .from("analyses")
        .update({ status: "failed", error_message: "Newsletter entry not found" })
        .eq("id", analysisId);
      return new Response(
        JSON.stringify({ error: "Newsletter entry not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch competitor info if available
    let competitorContext = "";
    if (entry.competitor_id) {
      const { data: competitor } = await supabase
        .from("competitors")
        .select("name, website, description")
        .eq("id", entry.competitor_id)
        .single();
      if (competitor) {
        competitorContext = `\n\nCompetitor context:\n- Company: ${competitor.name}\n- Website: ${competitor.website || "unknown"}\n- Notes: ${competitor.description || "none"}`;
      }
    }

    const systemPrompt = `You are a competitive intelligence analyst specializing in B2B SaaS. Analyze the following newsletter content and extract structured competitive intelligence.

Your analysis MUST be thorough, actionable, and clearly labeled with confidence levels.

IMPORTANT RULES:
- Only report what you can directly observe or reasonably infer from the content
- Label each finding with confidence: "high" (directly stated), "medium" (reasonably inferred), or "low" (speculative)
- If the content is too short or vague for meaningful analysis, say so explicitly
- Never fabricate metrics, numbers, or claims not present in the source material

Return a JSON object with the following structure:
{
  "summary": "2-3 sentence executive summary of the newsletter",
  "positioning": [
    { "observation": "what they're positioning as", "confidence": "high|medium|low", "evidence": "quote or reference from content" }
  ],
  "messaging": [
    { "theme": "key messaging theme", "examples": ["exact phrases or close paraphrases"], "observation": "analysis of the messaging approach" }
  ],
  "product_launches": [
    { "product": "name or description", "description": "what it does", "significance": "why this matters competitively" }
  ],
  "pricing_signals": [
    { "signal": "what pricing signal was detected", "detail": "specifics", "confidence": "high|medium|low" }
  ],
  "competitive_moves": [
    { "move": "what competitive action was taken", "impact": "potential impact", "urgency": "high|medium|low" }
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ]
}

Only include sections that have actual findings. If a category has no relevant findings, return an empty array for it.`;

    const userPrompt = `Analyze this competitor newsletter:

Subject: ${entry.subject || "Not provided"}
Sender: ${entry.sender_email || "Not provided"}
${competitorContext}

Newsletter Content:
${entry.content}`;

    // Call Lovable AI Gateway
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
              name: "submit_analysis",
              description: "Submit the competitive intelligence analysis results",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  positioning: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        observation: { type: "string" },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        evidence: { type: "string" },
                      },
                      required: ["observation", "confidence", "evidence"],
                    },
                  },
                  messaging: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        theme: { type: "string" },
                        examples: { type: "array", items: { type: "string" } },
                        observation: { type: "string" },
                      },
                      required: ["theme", "examples", "observation"],
                    },
                  },
                  product_launches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product: { type: "string" },
                        description: { type: "string" },
                        significance: { type: "string" },
                      },
                      required: ["product", "description", "significance"],
                    },
                  },
                  pricing_signals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        signal: { type: "string" },
                        detail: { type: "string" },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["signal", "detail", "confidence"],
                    },
                  },
                  competitive_moves: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        move: { type: "string" },
                        impact: { type: "string" },
                        urgency: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["move", "impact", "urgency"],
                    },
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        await supabase
          .from("analyses")
          .update({ status: "failed", error_message: "Rate limited. Please try again in a moment." })
          .eq("id", analysisId);
        return new Response(
          JSON.stringify({ error: "Rate limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (aiResponse.status === 402) {
        await supabase
          .from("analyses")
          .update({ status: "failed", error_message: "AI credits exhausted. Please add funds." })
          .eq("id", analysisId);
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const analysisResult = JSON.parse(toolCall.function.arguments);

    // Determine confidence based on content length and findings
    let overallConfidence = "medium";
    if (entry.content.length < 200) {
      overallConfidence = "low";
    } else if (entry.content.length > 1000 && analysisResult.positioning?.length > 0) {
      overallConfidence = "high";
    }

    // Save results
    await supabase
      .from("analyses")
      .update({
        status: "completed",
        result: analysisResult,
        confidence: overallConfidence,
        model_used: "google/gemini-3-flash-preview",
        completed_at: new Date().toISOString(),
      })
      .eq("id", analysisId);

    return new Response(
      JSON.stringify({ success: true, analysisId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analysis error:", error);

    // Try to update analysis status
    try {
      const { analysisId } = await req.clone().json().catch(() => ({}));
      if (analysisId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from("analyses")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", analysisId);
      }
    } catch (e) {
      console.error("Failed to update analysis status:", e);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
