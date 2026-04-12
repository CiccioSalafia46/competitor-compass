import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  HttpError,
  assertVerifiedUser,
  assertWorkspaceAnalyst,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { assertActiveSubscription } from "../_shared/billing.ts";
import {
  evaluateAlertRules,
  scheduleBackgroundAlertEvaluation,
} from "../_shared/alerts.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";
import { createOpenAiChatCompletion } from "../_shared/openai.ts";

type ToolCallFunction = {
  arguments?: string;
};

type ToolCall = {
  function?: ToolCallFunction;
};

type ChatMessage = {
  content?: string;
  tool_calls?: ToolCall[];
};

type ChatChoice = {
  message?: ChatMessage;
};

type OpenAiPayload = {
  choices?: ChatChoice[];
};

type ExtractionPayload = Record<string, unknown>;

function parseToolArguments(aiData: unknown) {
  const payload = aiData as OpenAiPayload;
  const toolCall = payload.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments) as ExtractionPayload;
  }

  const rawContent = payload.choices?.[0]?.message?.content;
  if (typeof rawContent === "string") {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ExtractionPayload;
    }
  }

  throw new Error("No structured extraction in AI response");
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function toSentenceCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function inferCampaignType(subject: string, content: string) {
  const combined = `${subject} ${content}`.toLowerCase();

  if (/abandoned cart|complete your purchase|left in your cart/.test(combined)) return "abandoned_cart";
  if (/webinar|event|conference|register now|join us/.test(combined)) return "event";
  if (/launch|new arrival|introducing|just dropped|new product/.test(combined)) return "product_launch";
  if (/loyalty|member exclusive|vip|rewards/.test(combined)) return "loyalty";
  if (/survey|feedback|tell us what you think/.test(combined)) return "survey";
  if (/holiday|black friday|cyber monday|christmas|easter|summer sale|spring sale/.test(combined)) return "seasonal";
  if (/discount|off\b|sale|deal|coupon|promo code|free shipping|limited time/.test(combined)) return "promotional";
  if (/guide|tips|playbook|learn|best practices|case study/.test(combined)) return "educational";
  if (/announcement|update|new feature|release notes/.test(combined)) return "announcement";
  if (/newsletter|digest|roundup|weekly|monthly/.test(combined)) return "newsletter";

  return "other";
}

function extractDiscountPercentage(content: string) {
  const match = content.match(/\b([1-9]\d?)\s?%\s?(?:off|discount|save)?\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function extractCouponCode(content: string) {
  const patterns = [
    /(?:coupon|promo)\s+code[:\s]+([A-Z0-9-]{4,20})/i,
    /use\s+code[:\s]+([A-Z0-9-]{4,20})/i,
    /code[:\s]+([A-Z0-9-]{4,20})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

function extractExpiryDate(content: string) {
  const phrases = [
    /today only/i,
    /ends tonight/i,
    /ending soon/i,
    /last chance/i,
    /while supplies last/i,
    /expires?\s+(?:on\s+)?([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?)/i,
    /valid until\s+([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?)/i,
  ];

  for (const pattern of phrases) {
    const match = content.match(pattern);
    if (!match) continue;
    return match[1] ? truncate(match[1], 80) : truncate(match[0], 80);
  }

  return null;
}

function extractCallsToAction(content: string) {
  const definitions = [
    { pattern: /\bshop now\b/i, text: "Shop now", urgency: "medium" },
    { pattern: /\blearn more\b/i, text: "Learn more", urgency: "low" },
    { pattern: /\bget started\b/i, text: "Get started", urgency: "medium" },
    { pattern: /\bbook a demo\b/i, text: "Book a demo", urgency: "medium" },
    { pattern: /\bregister now\b/i, text: "Register now", urgency: "high" },
    { pattern: /\bclaim (?:your )?offer\b/i, text: "Claim offer", urgency: "high" },
    { pattern: /\bstart free trial\b/i, text: "Start free trial", urgency: "medium" },
  ];

  const callsToAction = definitions
    .filter((definition) => definition.pattern.test(content))
    .map((definition) => ({
      text: definition.text,
      urgency: definition.urgency,
    }));

  return uniqueStrings(callsToAction.map((item) => item.text))
    .map((text) => callsToAction.find((item) => item.text === text)!)
    .slice(0, 5);
}

function extractUrgencySignals(content: string) {
  const definitions = [
    { pattern: /\btoday only\b/i, signal: "Offer limited to today", type: "time_limited" },
    { pattern: /\bends tonight\b/i, signal: "Promotion ends tonight", type: "time_limited" },
    { pattern: /\bending soon\b/i, signal: "Promotion ending soon", type: "time_limited" },
    { pattern: /\blast chance\b/i, signal: "Last chance framing", type: "time_limited" },
    { pattern: /\bwhile supplies last\b/i, signal: "Scarcity based on inventory", type: "quantity_limited" },
    { pattern: /\bexclusive\b/i, signal: "Exclusive access messaging", type: "exclusive" },
    { pattern: /\bspring|summer|autumn|fall|winter|holiday|black friday|cyber monday\b/i, signal: "Seasonal timing cue", type: "seasonal" },
  ];

  const signals = definitions
    .filter((definition) => definition.pattern.test(content))
    .map((definition) => ({
      signal: definition.signal,
      type: definition.type,
    }));

  return uniqueStrings(signals.map((item) => `${item.type}:${item.signal}`))
    .map((value) => {
      const [type, signal] = value.split(":");
      return { type, signal };
    })
    .slice(0, 5);
}

function extractProductCategories(content: string) {
  const categoryMap = [
    { pattern: /\bai|automation|workflow|software|platform|saas\b/i, label: "Software" },
    { pattern: /\btemplate|playbook|guide|ebook|report\b/i, label: "Content" },
    { pattern: /\bpricing|plan|subscription|tier\b/i, label: "Subscription" },
    { pattern: /\bapparel|clothing|fashion|shoes\b/i, label: "Apparel" },
    { pattern: /\bskincare|beauty|cosmetic|makeup\b/i, label: "Beauty" },
    { pattern: /\bhome|furniture|decor|kitchen\b/i, label: "Home" },
    { pattern: /\bevent|webinar|conference|workshop\b/i, label: "Events" },
  ];

  return uniqueStrings(
    categoryMap.filter((entry) => entry.pattern.test(content)).map((entry) => entry.label),
  ).slice(0, 6);
}

function buildOffers(content: string, discountPercentage: number | null, couponCode: string | null, freeShipping: boolean) {
  const offers: Array<{ description: string; type: string; value?: string }> = [];

  if (discountPercentage !== null) {
    offers.push({
      description: `${discountPercentage}% discount highlighted in the newsletter`,
      type: "discount",
      value: `${discountPercentage}% off`,
    });
  }

  if (couponCode) {
    offers.push({
      description: `Coupon code ${couponCode} is used to unlock the offer`,
      type: "discount",
      value: couponCode,
    });
  }

  if (freeShipping) {
    offers.push({
      description: "Free shipping is used as an incentive",
      type: "free_shipping",
    });
  }

  if (offers.length === 0 && /\btrial\b/i.test(content)) {
    offers.push({
      description: "Trial-based conversion offer detected",
      type: "trial",
    });
  }

  if (offers.length === 0 && /\bbundle\b/i.test(content)) {
    offers.push({
      description: "Bundle offer messaging detected",
      type: "bundle",
    });
  }

  return offers.slice(0, 4);
}

function buildStrategyTakeaways(
  campaignType: string,
  offers: Array<{ description: string; type: string; value?: string }>,
  callsToAction: Array<{ text: string; urgency?: string }>,
  urgencySignals: Array<{ signal: string; type: string }>,
  productCategories: string[],
  freeShipping: boolean,
) {
  const takeaways = [
    {
      insight: `The campaign is primarily positioned as ${campaignType.replace(/_/g, " ")} communication rather than passive brand storytelling.`,
      category: "campaign_strategy",
      confidence: 0.62,
    },
  ];

  if (offers.length > 0) {
    takeaways.push({
      insight: "The competitor is using explicit economic incentives to compress decision time and increase conversion intent.",
      category: "promotions",
      confidence: 0.68,
    });
  }

  if (urgencySignals.length > 0) {
    takeaways.push({
      insight: "Urgency language is part of the message architecture, suggesting the brand is trying to accelerate response rather than rely on evergreen demand.",
      category: "messaging",
      confidence: 0.66,
    });
  }

  if (callsToAction.length > 0) {
    takeaways.push({
      insight: `The email is optimized around clear CTA pressure, with primary actions such as ${callsToAction.map((item) => item.text).slice(0, 2).join(" and ")}.`,
      category: "conversion",
      confidence: 0.64,
    });
  }

  if (productCategories.length > 0) {
    takeaways.push({
      insight: `The promoted category emphasis centers on ${productCategories.slice(0, 2).join(" and ")}, which helps map current commercial focus.`,
      category: "product_focus",
      confidence: 0.58,
    });
  }

  if (freeShipping) {
    takeaways.push({
      insight: "Shipping economics are part of the offer framing, indicating the competitor is reducing purchase friction beyond pure price discounts.",
      category: "pricing",
      confidence: 0.61,
    });
  }

  return takeaways.slice(0, 4);
}

function buildConfidenceScores(extraction: {
  campaign_type: string;
  main_message: string;
  offers: Array<unknown>;
  discount_percentage: number | null;
  coupon_code: string | null;
  calls_to_action: Array<unknown>;
  urgency_signals: Array<unknown>;
}) {
  return {
    campaign_type: extraction.campaign_type === "other" ? 0.48 : 0.68,
    main_message: extraction.main_message ? 0.72 : 0.4,
    offers: extraction.offers.length > 0 ? 0.7 : 0.45,
    discount_percentage: extraction.discount_percentage !== null ? 0.82 : 0.38,
    coupon_code: extraction.coupon_code ? 0.84 : 0.3,
    calls_to_action: extraction.calls_to_action.length > 0 ? 0.64 : 0.35,
    urgency_signals: extraction.urgency_signals.length > 0 ? 0.66 : 0.32,
  };
}

function buildFallbackExtraction(newsletter: Record<string, unknown>) {
  const subject = normalizeText(newsletter.subject);
  const textContent = normalizeText(newsletter.text_content);
  const htmlContent = normalizeText(newsletter.html_content);
  const content = textContent || htmlContent || subject;
  const campaignType = inferCampaignType(subject, content);
  const discountPercentage = extractDiscountPercentage(content);
  const couponCode = extractCouponCode(content);
  const freeShipping = /\bfree shipping\b/i.test(content);
  const callsToAction = extractCallsToAction(content);
  const urgencySignals = extractUrgencySignals(content);
  const productCategories = extractProductCategories(content);
  const offers = buildOffers(content, discountPercentage, couponCode, freeShipping);
  const mainMessage = truncate(
    subject ||
      content.split(/(?<=[.!?])\s+/)[0] ||
      "Competitor newsletter extracted with heuristic fallback due to AI unavailability.",
    500,
  );
  const confidenceScores = buildConfidenceScores({
    campaign_type: campaignType,
    main_message: mainMessage,
    offers,
    discount_percentage: discountPercentage,
    coupon_code: couponCode,
    calls_to_action: callsToAction,
    urgency_signals: urgencySignals,
  });
  const confidenceValues = Object.values(confidenceScores);
  const overallConfidence = Number(
    (confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2),
  );

  return {
    campaign_type: campaignType,
    main_message: mainMessage,
    offers,
    discount_percentage: discountPercentage,
    coupon_code: couponCode,
    free_shipping: freeShipping,
    expiry_date: extractExpiryDate(content),
    calls_to_action: callsToAction,
    urgency_signals: urgencySignals,
    product_categories: productCategories,
    event_mentions: /\bwebinar|event|conference|workshop\b/i.test(content)
      ? [
          {
            event: "Promotional event or registration moment mentioned",
            type: "event",
          },
        ]
      : [],
    strategy_takeaways: buildStrategyTakeaways(
      campaignType,
      offers,
      callsToAction,
      urgencySignals,
      productCategories,
      freeShipping,
    ),
    confidence_scores: confidenceScores,
    overall_confidence: overallConfidence,
    raw_extraction: {
      method: "heuristic_fallback",
      subject,
      inferred_keywords: uniqueStrings(
        [
          campaignType !== "other" ? toSentenceCase(campaignType) : "",
          discountPercentage !== null ? "Discount" : "",
          couponCode ? "Coupon Code" : "",
          freeShipping ? "Free Shipping" : "",
          ...productCategories,
        ].filter(Boolean),
      ),
    },
  };
}

async function saveExtraction(
  supabase: ReturnType<typeof createClient>,
  newsletter: Record<string, unknown>,
  newsletterInboxId: string,
  extraction: ExtractionPayload,
  modelUsed: string,
  extractionMethod: string,
) {
  const confidenceValues = Object.values(extraction.confidence_scores || {}).filter((v): v is number => typeof v === "number");
  const overallConfidence =
    typeof extraction.overall_confidence === "number"
      ? extraction.overall_confidence
      : confidenceValues.length > 0
        ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
        : 0.5;

  const { data: saved, error: saveErr } = await supabase
    .from("newsletter_extractions")
    .insert({
      workspace_id: String(newsletter.workspace_id),
      newsletter_inbox_id: newsletterInboxId,
      campaign_type: extraction.campaign_type,
      main_message: normalizeText(extraction.main_message).substring(0, 5000),
      offers: extraction.offers || [],
      discount_percentage: extraction.discount_percentage || null,
      coupon_code: extraction.coupon_code ? String(extraction.coupon_code).substring(0, 100) : null,
      free_shipping: Boolean(extraction.free_shipping),
      expiry_date: extraction.expiry_date || null,
      calls_to_action: extraction.calls_to_action || [],
      urgency_signals: extraction.urgency_signals || [],
      product_categories: (extraction.product_categories || []).map(String).slice(0, 20),
      event_mentions: extraction.event_mentions || [],
      strategy_takeaways: extraction.strategy_takeaways || [],
      confidence_scores: extraction.confidence_scores || {},
      overall_confidence: overallConfidence,
      model_used: modelUsed,
      extraction_method: extractionMethod,
      is_valid: true,
      raw_extraction: extraction.raw_extraction || extraction,
    })
    .select()
    .single();

  if (saveErr) throw saveErr;
  return saved;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user } = await requireAuthenticatedUser(supabase, req);
    await assertVerifiedUser(user);
    const userId = user.id;

    const body = await req.json();
    const newsletterInboxId = body?.newsletterInboxId;
    if (!newsletterInboxId || typeof newsletterInboxId !== "string") {
      return jsonResponse({ error: "newsletterInboxId is required" }, 400);
    }
    const SUPPORTED_LANGUAGES = ["en", "it", "de", "fr", "es"] as const;
    const LANGUAGE_NAMES: Record<string, string> = {
      en: "English", it: "Italian", de: "German", fr: "French", es: "Spanish",
    };
    const requestedLang = typeof body?.language === "string" ? body.language : "en";
    const language = (SUPPORTED_LANGUAGES as readonly string[]).includes(requestedLang) ? requestedLang : "en";
    const languageName = LANGUAGE_NAMES[language] ?? "English";

    const { data: exists } = await supabase.rpc("check_extraction_exists", { _newsletter_inbox_id: newsletterInboxId });
    if (exists) {
      return jsonResponse({ error: "This newsletter has already been extracted." }, 409);
    }

    const { data: newsletter, error: fetchErr } = await supabase
      .from("newsletter_inbox")
      .select("*")
      .eq("id", newsletterInboxId)
      .single();

    if (fetchErr || !newsletter) {
      return jsonResponse({ error: "Newsletter not found" }, 404);
    }

    await assertWorkspaceAnalyst(supabase, userId, newsletter.workspace_id);
    await assertActiveSubscription(supabase, newsletter.workspace_id);

    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _user_id: userId,
      _workspace_id: newsletter.workspace_id,
      _endpoint: "extract-newsletter",
      _max_per_hour: 30,
    });
    if (!allowed) {
      return jsonResponse({ error: "Rate limit reached. You can extract up to 30 newsletters per hour." }, 429);
    }

    const content = newsletter.text_content || newsletter.html_content || "";
    if (content.length < 50) {
      return jsonResponse({ error: "Newsletter content too short for extraction" }, 400);
    }

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
Extract structured intelligence from the newsletter content provided. Write all text values in ${languageName}. JSON keys, competitor names, brand names, product names, URLs, coupon codes, and numeric values must remain in English.

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

    const completion = await createOpenAiChatCompletion({
      modelCandidates: [
        Deno.env.get("OPENAI_MODEL_NEWSLETTER_EXTRACTION") || "gpt-4.1",
        "gpt-4.1-mini",
      ],
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
                },
                main_message: { type: "string" },
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
                discount_percentage: { type: "number" },
                coupon_code: { type: "string" },
                free_shipping: { type: "boolean" },
                expiry_date: { type: "string" },
                calls_to_action: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { text: { type: "string" }, url: { type: "string" }, urgency: { type: "string", enum: ["low", "medium", "high"] } },
                    required: ["text"],
                  },
                },
                urgency_signals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { signal: { type: "string" }, type: { type: "string", enum: ["time_limited", "quantity_limited", "exclusive", "seasonal", "other"] } },
                    required: ["signal", "type"],
                  },
                },
                product_categories: { type: "array", items: { type: "string" } },
                event_mentions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { event: { type: "string" }, date: { type: "string" }, type: { type: "string", enum: ["webinar", "conference", "sale", "launch", "holiday", "other"] } },
                    required: ["event", "type"],
                  },
                },
                strategy_takeaways: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { insight: { type: "string" }, category: { type: "string" }, confidence: { type: "number" } },
                    required: ["insight", "category", "confidence"],
                  },
                },
                confidence_scores: {
                  type: "object",
                  properties: {
                    campaign_type: { type: "number" }, main_message: { type: "number" },
                    offers: { type: "number" }, discount_percentage: { type: "number" },
                    coupon_code: { type: "number" }, calls_to_action: { type: "number" },
                    urgency_signals: { type: "number" },
                  },
                },
              },
              required: ["campaign_type", "main_message", "confidence_scores"],
            },
          },
        },
      ],
      toolChoice: { type: "function", function: { name: "submit_extraction" } },
    });

    let extraction: ExtractionPayload;
    let modelUsed = "heuristic-fallback";
    let extractionMethod = "heuristic";

    if (!completion.ok) {
      console.error("OpenAI error:", completion.status, completion.errorText);
      extraction = buildFallbackExtraction(newsletter);
      extraction.raw_extraction = {
        ...(extraction.raw_extraction || {}),
        fallback_reason: `openai_${completion.status}`,
      };
    } else {
      modelUsed = completion.model;
      extractionMethod = "ai";
      try {
        extraction = parseToolArguments(completion.data);
      } catch {
        extraction = buildFallbackExtraction(newsletter);
        extraction.raw_extraction = {
          ...(extraction.raw_extraction || {}),
          fallback_reason: "invalid_ai_payload",
          ai_model: completion.model,
        };
        modelUsed = "heuristic-fallback";
        extractionMethod = "heuristic";
      }
    }

    if (!extraction.campaign_type || !extraction.main_message) {
      extraction = buildFallbackExtraction(newsletter);
      extraction.raw_extraction = {
        ...(extraction.raw_extraction || {}),
        fallback_reason: "missing_required_fields",
      };
      modelUsed = "heuristic-fallback";
      extractionMethod = "heuristic";
    }

    const saved = await saveExtraction(
      supabase,
      newsletter,
      newsletterInboxId,
      extraction,
      modelUsed,
      extractionMethod,
    );

    await supabase.from("usage_events").insert({
      workspace_id: String(newsletter.workspace_id),
      event_type: "extraction_performed",
      quantity: 1,
      metadata: {
        newsletter_inbox_id: newsletterInboxId,
        extraction_method: extractionMethod,
        model_used: modelUsed,
      },
    });

    scheduleBackgroundAlertEvaluation(
      evaluateAlertRules(supabase, {
        workspaceId: String(newsletter.workspace_id),
        source: "newsletter_extraction",
        triggeredBy: userId,
        newsletterIds: [newsletterInboxId],
        extractionIds: [String(saved.id)],
      }),
    );

    return jsonResponse({ success: true, extraction: saved });
  } catch (err) {
    console.error("Extraction error:", err);
    if (err instanceof HttpError) {
      return jsonResponse({ error: getErrorMessage(err) }, err.status);
    }
    return jsonResponse({ error: "An internal error occurred. Please try again." }, 500);
  }
});
