import Stripe from "https://esm.sh/stripe@18.5.0";
import { resolveTierFromPriceId } from "./billing.ts";

export const STRIPE_API_VERSION = "2026-02-25.clover";

export type StripeBillingState = {
  workspace_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_status: string;
  plan_key: "free" | "starter" | "premium";
  checkout_email: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
};

type SubscriptionLike = Pick<
  Stripe.Subscription,
  "id" | "status" | "cancel_at_period_end" | "current_period_end"
> & {
  items?: {
    data: Array<{
      price?: { id?: string | null } | null;
    }>;
  };
};

type CheckoutSessionLike = {
  customer_details?: { email?: string | null } | null;
};

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getStripeClient(secretKey: string) {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}

export function getSubscriptionPriceId(subscription: SubscriptionLike | null | undefined) {
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  return normalizeString(priceId);
}

export function getWorkspaceIdFromMetadata(
  metadata: Record<string, string | null | undefined> | null | undefined,
  clientReferenceId?: string | null,
) {
  return normalizeString(metadata?.workspace_id) ?? normalizeString(clientReferenceId);
}

export function buildBillingStateFromSubscription(params: {
  workspaceId: string;
  stripeCustomerId: string | null;
  subscription: SubscriptionLike | null;
  checkoutEmail?: string | null;
  fallbackPriceId?: string | null;
  now?: string;
}) : StripeBillingState {
  const priceId = getSubscriptionPriceId(params.subscription) ?? normalizeString(params.fallbackPriceId);
  const status = params.subscription?.status ?? "inactive";
  const cancelAtPeriodEnd = Boolean(params.subscription?.cancel_at_period_end);
  const currentPeriodEnd = params.subscription?.current_period_end
    ? new Date(params.subscription.current_period_end * 1000).toISOString()
    : null;

  return {
    workspace_id: params.workspaceId,
    stripe_customer_id: normalizeString(params.stripeCustomerId),
    stripe_subscription_id: normalizeString(params.subscription?.id),
    stripe_price_id: priceId,
    stripe_status: status,
    plan_key: params.subscription ? resolveTierFromPriceId(priceId) : "free",
    checkout_email: normalizeString(params.checkoutEmail),
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
    updated_at: params.now ?? new Date().toISOString(),
  };
}

export function buildBillingStateFromCheckoutPending(params: {
  workspaceId: string;
  stripeCustomerId: string;
  priceId: string;
  checkoutEmail?: string | null;
  now?: string;
}) : StripeBillingState {
  return {
    workspace_id: params.workspaceId,
    stripe_customer_id: params.stripeCustomerId,
    stripe_subscription_id: null,
    stripe_price_id: params.priceId,
    stripe_status: "checkout_pending",
    plan_key: resolveTierFromPriceId(params.priceId),
    checkout_email: normalizeString(params.checkoutEmail),
    current_period_end: null,
    cancel_at_period_end: false,
    updated_at: params.now ?? new Date().toISOString(),
  };
}

export function buildBillingStateFromInactive(params: {
  workspaceId: string;
  stripeCustomerId: string | null;
  checkoutEmail?: string | null;
  now?: string;
}) : StripeBillingState {
  return {
    workspace_id: params.workspaceId,
    stripe_customer_id: normalizeString(params.stripeCustomerId),
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_status: "inactive",
    plan_key: "free",
    checkout_email: normalizeString(params.checkoutEmail),
    current_period_end: null,
    cancel_at_period_end: false,
    updated_at: params.now ?? new Date().toISOString(),
  };
}

export function getCheckoutEmailFromSession(session: CheckoutSessionLike | null | undefined) {
  return normalizeString(session?.customer_details?.email);
}
