import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { HttpError, assertWorkspaceMember, requireAuthenticatedUser } from "../_shared/auth.ts";
import {
  buildBillingStateFromInactive,
  buildBillingStateFromSubscription,
  getStripeClient,
} from "../_shared/stripe-billing.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { user } = await requireAuthenticatedUser(supabase, req);
    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return jsonResponse({ error: "workspaceId is required" }, 400);
    }

    await assertWorkspaceMember(supabase, user.id, workspaceId);

    const { data: billingRow } = await supabase
      .from("workspace_billing")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!billingRow?.stripe_customer_id) {
      return jsonResponse({ subscribed: false, tier: "free" });
    }

    const stripe = getStripeClient(stripeKey);
    const subscriptions = await stripe.subscriptions.list({
      customer: billingRow.stripe_customer_id,
      status: "all",
      limit: 20,
    });

    const activeSubscription = subscriptions.data.find((subscription) =>
      ["active", "trialing", "past_due"].includes(subscription.status),
    );

    if (!activeSubscription) {
      await supabase.from("workspace_billing").upsert(
        buildBillingStateFromInactive({
          workspaceId,
          stripeCustomerId: billingRow.stripe_customer_id,
          checkoutEmail: billingRow.checkout_email || user.email || null,
        }),
      );

      return jsonResponse({ subscribed: false, tier: "free" });
    }

    const billingState = buildBillingStateFromSubscription({
      workspaceId,
      stripeCustomerId: billingRow.stripe_customer_id,
      subscription: activeSubscription,
      checkoutEmail: billingRow.checkout_email || user.email || null,
    });

    await supabase.from("workspace_billing").upsert(billingState);

    logStep("Subscription synced", { workspaceId, tier: billingState.plan_key, status: billingState.stripe_status });
    return jsonResponse({
      subscribed: true,
      tier: billingState.plan_key,
      price_id: billingState.stripe_price_id,
      subscription_end: billingState.current_period_end,
      status: billingState.stripe_status,
      cancel_at_period_end: billingState.cancel_at_period_end,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    logStep("ERROR", { message });
    if (error instanceof HttpError) {
      return jsonResponse({ error: message }, error.status);
    }
    return jsonResponse({ error: message }, 500);
  }
});
