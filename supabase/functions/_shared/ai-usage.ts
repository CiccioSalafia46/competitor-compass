import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getWorkspaceBilling, isSubscriptionActive } from "./billing.ts";

// ─── Cost estimation per 1K tokens (USD) ────────────────────────────

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4.1":       { input: 0.002, output: 0.008 },
  "gpt-4.1-mini":  { input: 0.0004, output: 0.0016 },
  "gpt-4o":        { input: 0.0025, output: 0.01 },
  "gpt-4o-mini":   { input: 0.00015, output: 0.0006 },
};

export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = COST_PER_1K[model];
  if (!pricing) return 0;
  return (tokensIn / 1000) * pricing.input + (tokensOut / 1000) * pricing.output;
}

// ─── Extract token usage from OpenAI response ───────────────────────

export function extractUsage(data: unknown): { tokensIn: number; tokensOut: number } {
  const usage = (data as Record<string, unknown>)?.usage as Record<string, unknown> | undefined;
  return {
    tokensIn: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : 0,
    tokensOut: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : 0,
  };
}

// ─── Log AI usage (non-blocking — never throws) ─────────────────────

export async function logAiUsage(
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    workspaceId: string;
    userId?: string;
    functionName: string;
    model: string;
    tokensIn: number;
    tokensOut: number;
    success: boolean;
    errorMessage?: string;
  },
): Promise<void> {
  try {
    await supabaseAdmin.from("ai_usage").insert({
      workspace_id: params.workspaceId,
      user_id: params.userId ?? null,
      function_name: params.functionName,
      model: params.model,
      tokens_in: params.tokensIn,
      tokens_out: params.tokensOut,
      cost_usd: estimateCost(params.model, params.tokensIn, params.tokensOut),
      success: params.success,
      error_message: params.errorMessage ?? null,
    });
  } catch (err) {
    console.error("[ai-usage] Failed to log:", err);
  }
}

// ─── Rate limiting per workspace ────────────────────────────────────

type TierKey = "free" | "starter" | "premium";

const DAILY_LIMITS: Record<TierKey, Record<string, number>> = {
  free:    { generate_insights: 5, analyze_newsletter: 20, analyze_meta_ad: 5, extract_newsletter_intel: 20 },
  starter: { generate_insights: 30, analyze_newsletter: 200, analyze_meta_ad: 50, extract_newsletter_intel: 200 },
  premium: { generate_insights: 100, analyze_newsletter: 1000, analyze_meta_ad: 500, extract_newsletter_intel: 1000 },
};

// Map edge function names to the keys used in DAILY_LIMITS
const FUNCTION_ALIASES: Record<string, string> = {
  "generate-insights": "generate_insights",
  "analyze-newsletter": "analyze_newsletter",
  "analyze-meta-ad": "analyze_meta_ad",
  "extract-newsletter-intel": "extract_newsletter_intel",
};

function resolveTier(billing: { stripe_status: string | null; plan_key: string | null } | null): TierKey {
  if (!billing || !isSubscriptionActive(billing)) return "free";
  if (billing.plan_key === "premium") return "premium";
  return "starter";
}

export async function checkAiQuota(
  supabaseAdmin: ReturnType<typeof createClient>,
  workspaceId: string,
  functionName: string,
): Promise<{ allowed: boolean; used: number; limit: number; tier: TierKey }> {
  const billing = await getWorkspaceBilling(supabaseAdmin, workspaceId);
  const tier = resolveTier(billing);
  const key = FUNCTION_ALIASES[functionName] ?? functionName;
  const limit = DAILY_LIMITS[tier]?.[key] ?? 0;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("ai_usage")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("function_name", functionName)
    .gte("created_at", since)
    .eq("success", true);

  const used = count ?? 0;
  return { allowed: used < limit, used, limit, tier };
}
