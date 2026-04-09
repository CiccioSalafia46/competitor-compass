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
