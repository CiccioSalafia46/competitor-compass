import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { HttpError } from "./auth.ts";

export type BillingPlan = "starter" | "premium";

type BillingPlanConfig = {
  plan: BillingPlan;
  label: string;
  priceId: string;
};

const BILLING_PLAN_CONFIG: Record<BillingPlan, BillingPlanConfig> = {
  starter: {
    plan: "starter",
    label: "Starter",
    priceId: Deno.env.get("STRIPE_PRICE_STARTER") || "price_1THG2Z1A6XiCCUbzrdMuP3Xj",
  },
  premium: {
    plan: "premium",
    label: "Premium",
    priceId: Deno.env.get("STRIPE_PRICE_PREMIUM") || "price_1THG2r1A6XiCCUbz0FlpAOGa",
  },
};

export function getBillingPlanConfig(plan: string | null | undefined) {
  if (!plan || (plan !== "starter" && plan !== "premium")) {
    throw new Error("Invalid billing plan.");
  }

  return BILLING_PLAN_CONFIG[plan];
}

export function resolveTierFromPriceId(priceId: string | null | undefined): BillingPlan | "free" {
  const normalized = typeof priceId === "string" ? priceId.trim() : "";
  if (!normalized) return "free";

  const match = Object.values(BILLING_PLAN_CONFIG).find((item) => item.priceId === normalized);
  return match?.plan ?? "free";
}

// ---------------------------------------------------------------------------
// Subscription-gating helpers
// ---------------------------------------------------------------------------

type BillingRow = {
  stripe_status: string | null;
  plan_key: string | null;
};

/**
 * Returns true when the workspace has an active or trialing subscription
 * (any paid plan). Free-tier workspaces (no billing row, or status is
 * canceled/unpaid/past_due) return false.
 */
export function isSubscriptionActive(billing: BillingRow | null): boolean {
  if (!billing) return false;
  return billing.stripe_status === "active" || billing.stripe_status === "trialing";
}

/**
 * Looks up the workspace billing row.
 * Returns null if no billing row exists (free tier).
 */
export async function getWorkspaceBilling(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
): Promise<BillingRow | null> {
  const { data } = await supabase
    .from("workspace_billing")
    .select("stripe_status, plan_key")
    .eq("workspace_id", workspaceId)
    .maybeSingle<BillingRow>();
  return data ?? null;
}

/**
 * Throws HttpError(402) if the workspace doesn't have an active subscription.
 * Use this before any AI/expensive operation.
 */
export async function assertActiveSubscription(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
): Promise<void> {
  const billing = await getWorkspaceBilling(supabase, workspaceId);
  if (!isSubscriptionActive(billing)) {
    throw new HttpError(402, "An active subscription is required to use AI features. Please upgrade your plan.");
  }
}
