import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { HttpError, assertVerifiedUser, assertWorkspaceAdmin, requireAuthenticatedUser } from "../_shared/auth.ts";
import { sanitizeRedirectUrl } from "../_shared/app.ts";
import { getBillingPlanConfig } from "../_shared/billing.ts";
import { buildBillingStateFromCheckoutPending, getStripeClient } from "../_shared/stripe-billing.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
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
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const { user } = await requireAuthenticatedUser(supabase, req);
    await assertVerifiedUser(user);
    const { workspaceId, plan } = await req.json();

    if (!workspaceId) {
      return jsonResponse({ error: "workspaceId is required" }, 400);
    }

    const planConfig = getBillingPlanConfig(plan);
    await assertWorkspaceAdmin(supabase, user.id, workspaceId);

    const stripe = getStripeClient(stripeKey);

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name, slug")
      .eq("id", workspaceId)
      .single();

    const { data: billingRow } = await supabase
      .from("workspace_billing")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    let customerId = billingRow?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: workspace?.name || undefined,
        metadata: {
          workspace_id: workspaceId,
          workspace_slug: workspace?.slug || "",
        },
      });
      customerId = customer.id;
    }

    const appOrigin = sanitizeRedirectUrl(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: workspaceId,
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${appOrigin}/settings/billing?checkout=success`,
      cancel_url: `${appOrigin}/settings/billing?checkout=canceled`,
      metadata: {
        workspace_id: workspaceId,
        plan: planConfig.plan,
        created_by: user.id,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          plan: planConfig.plan,
          created_by: user.id,
        },
      },
    });

    await supabase.from("workspace_billing").upsert(
      buildBillingStateFromCheckoutPending({
        workspaceId,
        stripeCustomerId: customerId,
        priceId: planConfig.priceId,
        checkoutEmail: user.email || null,
      }),
    );

    logStep("Checkout session created", {
      workspaceId,
      plan: planConfig.plan,
      sessionId: session.id,
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    const message = getErrorMessage(error);
    logStep("ERROR", { message });
    if (error instanceof HttpError) {
      return jsonResponse({ error: message }, error.status);
    }
    return jsonResponse({ error: message }, 500);
  }
});
