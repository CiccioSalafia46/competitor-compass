export const STRIPE_PLANS = {
  free: { label: "Free" },
  starter: { label: "Starter" },
  premium: { label: "Premium" },
} as const;

export type PlanTier = keyof typeof STRIPE_PLANS;
