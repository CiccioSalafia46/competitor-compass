/**
 * Plan feature limits. A value of -1 means unlimited — enforced in
 * useUsage.tsx `limitFor()`. Do not use 0 for unlimited; use -1.
 */
export const PLAN_LIMITS = {
  free: {
    label: "Free",
    seats: 1,
    competitors: 3,
    newsletters_per_month: 200,
    analyses_per_month: 50,
  },
  starter: {
    label: "Starter",
    seats: 3,
    competitors: 10,
    newsletters_per_month: 2000,
    analyses_per_month: 500,
  },
  premium: {
    label: "Premium",
    seats: 10,
    competitors: -1,
    newsletters_per_month: 20000,
    analyses_per_month: 5000,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;
