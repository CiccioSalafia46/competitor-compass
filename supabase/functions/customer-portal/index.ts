import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { HttpError, assertWorkspaceAdmin, requireAuthenticatedUser } from "../_shared/auth.ts";
import { sanitizeRedirectUrl } from "../_shared/app.ts";
import { getStripeClient } from "../_shared/stripe-billing.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[CUSTOMER-PORTAL] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { user } = await requireAuthenticatedUser(supabase, req);
    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return jsonResponse({ error: "workspaceId is required" }, 400);
    }

    await assertWorkspaceAdmin(supabase, user.id, workspaceId);

    const { data: billingRow } = await supabase
      .from("workspace_billing")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!billingRow?.stripe_customer_id) {
      return jsonResponse({ error: "No Stripe customer found for this workspace." }, 404);
    }

    const stripe = getStripeClient(stripeKey);
    const appOrigin = sanitizeRedirectUrl(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billingRow.stripe_customer_id,
      return_url: `${appOrigin}/settings/billing`,
    });

    logStep("Portal session created", { workspaceId });
    return jsonResponse({ url: portalSession.url });
  } catch (error) {
    const message = getErrorMessage(error);
    logStep("ERROR", { message });
    if (error instanceof HttpError) {
      return jsonResponse({ error: message }, error.status);
    }
    return jsonResponse({ error: message }, 500);
  }
});
