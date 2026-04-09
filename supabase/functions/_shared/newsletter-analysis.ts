import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createOpenAiChatCompletion } from "./openai.ts";
import { getErrorMessage } from "./http.ts";

type ConfidenceLevel = "high" | "medium" | "low";

type NewsletterEntryRow = {
  id: string;
  workspace_id: string;
  competitor_id: string | null;
  subject: string | null;
  content: string;
  sender_email: string | null;
  received_at: string | null;
  source: string;
  created_by: string;
};

type AnalysisRow = {
  id: string;
  workspace_id: string;
  newsletter_entry_id: string;
  status: string;
  requested_by: string | null;
  source_snapshot: Record<string, unknown> | null;
  attempt_count: number | null;
  max_attempts: number | null;
};

type CompetitorRow = {
  name: string;
  website: string | null;
  description: string | null;
};

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

type PositioningSignal = {
  observation: string;
  confidence: ConfidenceLevel;
  evidence: string;
};

type MessagingSignal = {
  theme: string;
  examples: string[];
  observation: string;
};

type ProductLaunchSignal = {
  product: string;
  description: string;
  significance: string;
};

type PricingSignal = {
  signal: string;
  detail: string;
  confidence: ConfidenceLevel;
};

type CompetitiveMove = {
  move: string;
  impact: string;
  urgency: ConfidenceLevel;
};

export type NewsletterSourceSnapshot = {
  subject: string | null;
  content: string;
  sender_email: string | null;
  received_at: string | null;
  source: string;
  competitor_id: string | null;
};

export type StructuredNewsletterAnalysis = {
  summary: string;
  positioning: PositioningSignal[];
  messaging: MessagingSignal[];
  product_launches: ProductLaunchSignal[];
  pricing_signals: PricingSignal[];
  competitive_moves: CompetitiveMove[];
  recommendations: string[];
};

type ValidationResult = {
  normalized: StructuredNewsletterAnalysis;
  validationErrors: string[];
};

export class AnalysisValidationError extends Error {
  validationErrors: string[];

  constructor(message: string, validationErrors: string[]) {
    super(message);
    this.name = "AnalysisValidationError";
    this.validationErrors = validationErrors;
  }
}

function parseToolArguments(aiData: unknown) {
  const payload = aiData as OpenAiPayload;
  const toolCall = payload.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
  }

  const rawContent = payload.choices?.[0]?.message?.content;
  if (typeof rawContent === "string") {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    }
  }

  throw new Error("No structured analysis in AI response");
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readConfidence(value: unknown): ConfidenceLevel | null {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return null;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateArrayField<T>(
  value: unknown,
  fieldName: string,
  parser: (item: unknown, index: number, errors: string[]) => T | null,
  errors: string[],
) {
  if (value == null) {
    return [] as T[];
  }

  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array.`);
    return [] as T[];
  }

  return value
    .map((item, index) => parser(item, index, errors))
    .filter((item): item is T => item !== null);
}

function parsePositioningSignal(item: unknown, index: number, errors: string[]) {
  if (typeof item !== "object" || item === null) {
    errors.push(`positioning[${index}] must be an object.`);
    return null;
  }

  const observation = readString((item as Record<string, unknown>).observation);
  const confidence = readConfidence((item as Record<string, unknown>).confidence);
  const evidence = readString((item as Record<string, unknown>).evidence);

  if (!observation || !confidence || !evidence) {
    errors.push(`positioning[${index}] is missing observation, confidence, or evidence.`);
    return null;
  }

  return { observation, confidence, evidence };
}

function parseMessagingSignal(item: unknown, index: number, errors: string[]) {
  if (typeof item !== "object" || item === null) {
    errors.push(`messaging[${index}] must be an object.`);
    return null;
  }

  const theme = readString((item as Record<string, unknown>).theme);
  const observation = readString((item as Record<string, unknown>).observation);
  const examples = readStringArray((item as Record<string, unknown>).examples);

  if (!theme || !observation) {
    errors.push(`messaging[${index}] is missing theme or observation.`);
    return null;
  }

  return { theme, observation, examples };
}

function parseProductLaunch(item: unknown, index: number, errors: string[]) {
  if (typeof item !== "object" || item === null) {
    errors.push(`product_launches[${index}] must be an object.`);
    return null;
  }

  const product = readString((item as Record<string, unknown>).product);
  const description = readString((item as Record<string, unknown>).description);
  const significance = readString((item as Record<string, unknown>).significance);

  if (!product || !description || !significance) {
    errors.push(`product_launches[${index}] is missing product, description, or significance.`);
    return null;
  }

  return { product, description, significance };
}

function parsePricingSignal(item: unknown, index: number, errors: string[]) {
  if (typeof item !== "object" || item === null) {
    errors.push(`pricing_signals[${index}] must be an object.`);
    return null;
  }

  const signal = readString((item as Record<string, unknown>).signal);
  const detail = readString((item as Record<string, unknown>).detail);
  const confidence = readConfidence((item as Record<string, unknown>).confidence);

  if (!signal || !detail || !confidence) {
    errors.push(`pricing_signals[${index}] is missing signal, detail, or confidence.`);
    return null;
  }

  return { signal, detail, confidence };
}

function parseCompetitiveMove(item: unknown, index: number, errors: string[]) {
  if (typeof item !== "object" || item === null) {
    errors.push(`competitive_moves[${index}] must be an object.`);
    return null;
  }

  const move = readString((item as Record<string, unknown>).move);
  const impact = readString((item as Record<string, unknown>).impact);
  const urgency = readConfidence((item as Record<string, unknown>).urgency);

  if (!move || !impact || !urgency) {
    errors.push(`competitive_moves[${index}] is missing move, impact, or urgency.`);
    return null;
  }

  return { move, impact, urgency };
}

export function buildNewsletterSourceSnapshot(entry: NewsletterEntryRow): NewsletterSourceSnapshot {
  return {
    subject: entry.subject,
    content: entry.content,
    sender_email: entry.sender_email,
    received_at: entry.received_at,
    source: entry.source,
    competitor_id: entry.competitor_id,
  };
}

export function validateStructuredNewsletterAnalysis(raw: Record<string, unknown>): ValidationResult {
  const validationErrors: string[] = [];
  const summary = readString(raw.summary);

  if (!summary) {
    throw new AnalysisValidationError("AI returned an invalid analysis payload.", ["summary is required."]);
  }

  const normalized: StructuredNewsletterAnalysis = {
    summary,
    positioning: validateArrayField(raw.positioning, "positioning", parsePositioningSignal, validationErrors),
    messaging: validateArrayField(raw.messaging, "messaging", parseMessagingSignal, validationErrors),
    product_launches: validateArrayField(raw.product_launches, "product_launches", parseProductLaunch, validationErrors),
    pricing_signals: validateArrayField(raw.pricing_signals, "pricing_signals", parsePricingSignal, validationErrors),
    competitive_moves: validateArrayField(raw.competitive_moves, "competitive_moves", parseCompetitiveMove, validationErrors),
    recommendations: readStringArray(raw.recommendations),
  };

  const hasAnySignals =
    normalized.positioning.length > 0 ||
    normalized.messaging.length > 0 ||
    normalized.product_launches.length > 0 ||
    normalized.pricing_signals.length > 0 ||
    normalized.competitive_moves.length > 0 ||
    normalized.recommendations.length > 0;

  if (!hasAnySignals && normalized.summary.length < 24) {
    throw new AnalysisValidationError(
      "AI returned too little structured detail to save a reliable analysis.",
      validationErrors.length > 0 ? validationErrors : ["No actionable signals were returned."],
    );
  }

  return { normalized, validationErrors };
}

function getOverallConfidence(
  entry: NewsletterEntryRow,
  result: StructuredNewsletterAnalysis,
): "high" | "medium" | "low" {
  if (entry.content.length < 200) {
    return "low";
  }

  const highConfidenceSignals =
    result.positioning.filter((item) => item.confidence === "high").length +
    result.pricing_signals.filter((item) => item.confidence === "high").length;

  if (entry.content.length > 1000 && highConfidenceSignals > 0) {
    return "high";
  }

  return "medium";
}

function isRetryableAnalysisError(error: unknown) {
  if (error instanceof AnalysisValidationError) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("not found") ||
    message.includes("workspace mismatch") ||
    message.includes("forbidden") ||
    message.includes("unauthorized")
  ) {
    return false;
  }

  return true;
}

async function sleep(delayMs: number) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function processNewsletterAnalysisJob(
  supabase: SupabaseClient,
  params: {
    analysisId: string;
    newsletterEntryId: string;
  },
): Promise<void> {
  const { analysisId, newsletterEntryId } = params;
  const startedAt = new Date().toISOString();

  const { data: analysis, error: analysisError } = await supabase
    .from("analyses")
    .select("id, workspace_id, newsletter_entry_id, status, requested_by, source_snapshot, attempt_count, max_attempts")
    .eq("id", analysisId)
    .single<AnalysisRow>();

  if (analysisError || !analysis) {
    throw new Error("Analysis job not found.");
  }

  const maxAttempts = analysis.max_attempts ?? 3;
  const nextAttemptCount = (analysis.attempt_count ?? 0) + 1;

  await supabase
    .from("analyses")
    .update({
      status: "processing",
      attempt_count: nextAttemptCount,
      last_attempt_at: startedAt,
      processing_started_at: startedAt,
      error_message: null,
      validation_errors: null,
    })
    .eq("id", analysisId);

  try {
    const { data: entry, error: entryError } = await supabase
      .from("newsletter_entries")
      .select("id, workspace_id, competitor_id, subject, content, sender_email, received_at, source, created_by")
      .eq("id", newsletterEntryId)
      .single<NewsletterEntryRow>();

    if (entryError || !entry) {
      throw new Error("Newsletter entry not found.");
    }

    if (entry.workspace_id !== analysis.workspace_id) {
      throw new Error("Workspace mismatch.");
    }

    const sourceSnapshot = buildNewsletterSourceSnapshot(entry);

    if (!analysis.requested_by || !analysis.source_snapshot || Object.keys(analysis.source_snapshot).length === 0) {
      await supabase
        .from("analyses")
        .update({
          requested_by: analysis.requested_by ?? entry.created_by,
          source_snapshot: sourceSnapshot,
        })
        .eq("id", analysisId);
    }

    let competitorContext = "";

    if (entry.competitor_id) {
      const { data: competitor } = await supabase
        .from("competitors")
        .select("name, website, description")
        .eq("id", entry.competitor_id)
        .single<CompetitorRow>();

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
${entry.content.substring(0, 10000)}`;

    const completion = await createOpenAiChatCompletion({
      modelCandidates: [
        Deno.env.get("OPENAI_MODEL_NEWSLETTER_ANALYSIS") || "gpt-4.1",
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
                recommendations: { type: "array", items: { type: "string" } },
              },
              required: ["summary"],
            },
          },
        },
      ],
      toolChoice: { type: "function", function: { name: "submit_analysis" } },
    });

    if (!completion.ok) {
      if (completion.status === 429) {
        throw new Error("AI service rate limited. Please try again later.");
      }

      console.error("OpenAI error:", completion.status, completion.errorText);
      throw new Error(`OpenAI returned ${completion.status}`);
    }

    const parsedResult = parseToolArguments(completion.data);
    const { normalized, validationErrors } = validateStructuredNewsletterAnalysis(parsedResult);

    await supabase
      .from("analyses")
      .update({
        status: "completed",
        result: normalized,
        confidence: getOverallConfidence(entry, normalized),
        model_used: completion.model,
        completed_at: new Date().toISOString(),
        processing_started_at: null,
        error_message: null,
        source_snapshot: sourceSnapshot,
        validation_errors: validationErrors.length > 0 ? validationErrors : null,
      })
      .eq("id", analysisId);
  } catch (error) {
    const errorMessage = getErrorMessage(error, "An internal error occurred.");
    const validationErrors = error instanceof AnalysisValidationError ? error.validationErrors : null;
    const shouldRetry = isRetryableAnalysisError(error) && nextAttemptCount < maxAttempts;

    if (shouldRetry) {
      await supabase
        .from("analyses")
        .update({
          status: "pending",
          processing_started_at: null,
          completed_at: null,
          error_message: `${errorMessage} Retrying automatically (${nextAttemptCount}/${maxAttempts})...`,
          validation_errors: validationErrors,
        })
        .eq("id", analysisId);

      await sleep(Math.min(1500 * nextAttemptCount, 5000));
      await processNewsletterAnalysisJob(supabase, params);
      return;
    }

    await supabase
      .from("analyses")
      .update({
        status: "failed",
        processing_started_at: null,
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
        validation_errors: validationErrors,
      })
      .eq("id", analysisId);

    throw error;
  }
}
