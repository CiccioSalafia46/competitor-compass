import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  buildBillingStateFromInactive,
  buildBillingStateFromSubscription,
  getCheckoutEmailFromSession,
  getStripeClient,
  getSubscriptionPriceId,
  getWorkspaceIdFromMetadata,
} from "../_shared/stripe-billing.ts";

type WebhookEventInsert = {
  event_id: string;
  event_type: string;
  workspace_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  payload: Record<string, unknown>;
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getObjectMetadata(object: unknown) {
  if (!object || typeof object !== "object") return undefined;
  const metadata = (object as { metadata?: Record<string, string | null | undefined> }).metadata;
  return metadata && typeof metadata === "object" ? metadata : undefined;
}

function getObjectId(object: unknown) {
  if (!object || typeof object !== "object") return null;
  const id = (object as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function getObjectCustomerId(object: unknown) {
  if (!object || typeof object !== "object") return null;
  const customer = (object as { customer?: unknown }).customer;
  return typeof customer === "string" && customer.trim() ? customer.trim() : null;
}

function getObjectSubscriptionId(object: unknown) {
  if (!object || typeof object !== "object") return null;
  const subscription = (object as { subscription?: unknown }).subscription;
  return typeof subscription === "string" && subscription.trim() ? subscription.trim() : null;
}

async function markEventProcessed(
  supabase: ReturnType<typeof createClient>,
  row: WebhookEventInsert,
) {
  const { error } = await supabase.from("stripe_webhook_events").insert(row);
  if (!error) return { duplicate: false };

  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    return { duplicate: true };
  }

  throw error;
}

async function resolveWorkspaceId(params: {
  supabase: ReturnType<typeof createClient>;
  object: unknown;
  fallbackWorkspaceId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const metadataWorkspaceId = getWorkspaceIdFromMetadata(
    getObjectMetadata(params.object),
    params.fallbackWorkspaceId ?? null,
  );
  if (metadataWorkspaceId) return metadataWorkspaceId;

  if (params.stripeSubscriptionId) {
    const { data: bySubscription } = await params.supabase
      .from("workspace_billing")
      .select("workspace_id")
      .eq("stripe_subscription_id", params.stripeSubscriptionId)
      .maybeSingle();
    if (bySubscription?.workspace_id) return bySubscription.workspace_id;
  }

  if (params.stripeCustomerId) {
    const { data: byCustomer } = await params.supabase
      .from("workspace_billing")
      .select("workspace_id")
      .eq("stripe_customer_id", params.stripeCustomerId)
      .maybeSingle();
    if (byCustomer?.workspace_id) return byCustomer.workspace_id;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("missing_secrets");
    return jsonResponse({ error: "Stripe webhook is not configured." }, 500);
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) {
    return jsonResponse({ error: "Missing Stripe-Signature header." }, 400);
  }

  const payload = await req.text();
  const stripe = getStripeClient(stripeKey);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (error) {
    logStep("invalid_signature", { message: error instanceof Error ? error.message : String(error) });
    return jsonResponse({ error: "Invalid webhook signature." }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const dataObject = event.data.object;
  const stripeCustomerId = getObjectCustomerId(dataObject);
  const stripeSubscriptionId =
    getObjectId(dataObject) && event.type.startsWith("customer.subscription.")
      ? getObjectId(dataObject)
      : getObjectSubscriptionId(dataObject);
  const workspaceId = await resolveWorkspaceId({
    supabase,
    object: dataObject,
    fallbackWorkspaceId:
      typeof dataObject === "object" && dataObject && "client_reference_id" in dataObject
        ? ((dataObject as { client_reference_id?: string | null }).client_reference_id ?? null)
        : null,
    stripeCustomerId,
    stripeSubscriptionId,
  });

  const processed = await markEventProcessed(supabase, {
    event_id: event.id,
    event_type: event.type,
    workspace_id: workspaceId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    payload: {
      api_version: event.api_version,
      created: event.created,
      livemode: event.livemode,
      pending_webhooks: event.pending_webhooks,
      object_type: dataObject.object,
    },
  });

  if (processed.duplicate) {
    logStep("duplicate_event", { eventId: event.id, eventType: event.type });
    return new Response("ok", { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = dataObject as Stripe.Checkout.Session;
        const sessionWorkspaceId = workspaceId;
        if (!sessionWorkspaceId) {
          logStep("missing_workspace_for_checkout_session", { eventId: event.id, sessionId: session.id });
          break;
        }

        if (session.customer && typeof session.customer === "string") {
          await supabase.from("workspace_billing").upsert({
            workspace_id: sessionWorkspaceId,
            stripe_customer_id: session.customer,
            checkout_email: getCheckoutEmailFromSession(session),
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = dataObject as Stripe.Subscription;
        const subscriptionWorkspaceId = workspaceId;
        if (!subscriptionWorkspaceId) {
          logStep("missing_workspace_for_subscription", {
            eventId: event.id,
            subscriptionId: subscription.id,
            customerId: typeof subscription.customer === "string" ? subscription.customer : null,
          });
          break;
        }

        const stripeCustomer =
          typeof subscription.customer === "string" ? subscription.customer : null;

        const { data: existingBilling } = await supabase
          .from("workspace_billing")
          .select("checkout_email")
          .eq("workspace_id", subscriptionWorkspaceId)
          .maybeSingle();

        const billingState = buildBillingStateFromSubscription({
          workspaceId: subscriptionWorkspaceId,
          stripeCustomerId: stripeCustomer,
          subscription,
          checkoutEmail: existingBilling?.checkout_email ?? null,
        });

        await supabase.from("workspace_billing").upsert(billingState);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = dataObject as Stripe.Invoice;
        const invoiceWorkspaceId = workspaceId;
        const invoiceCustomer =
          typeof invoice.customer === "string" ? invoice.customer : null;
        const invoiceSubscription =
          typeof invoice.subscription === "string" ? invoice.subscription : null;

        if (!invoiceWorkspaceId) {
          logStep("missing_workspace_for_invoice", {
            eventId: event.id,
            invoiceId: invoice.id,
            customerId: invoiceCustomer,
            subscriptionId: invoiceSubscription,
          });
          break;
        }

        const { data: existingBilling } = await supabase
          .from("workspace_billing")
          .select("checkout_email")
          .eq("workspace_id", invoiceWorkspaceId)
          .maybeSingle();

        if (invoiceSubscription) {
          const subscription = await stripe.subscriptions.retrieve(invoiceSubscription);
          const billingState = buildBillingStateFromSubscription({
            workspaceId: invoiceWorkspaceId,
            stripeCustomerId: invoiceCustomer,
            subscription,
            checkoutEmail: existingBilling?.checkout_email ?? invoice.customer_email ?? null,
          });
          await supabase.from("workspace_billing").upsert(billingState);
        } else {
          await supabase.from("workspace_billing").upsert(
            buildBillingStateFromInactive({
              workspaceId: invoiceWorkspaceId,
              stripeCustomerId: invoiceCustomer,
              checkoutEmail: existingBilling?.checkout_email ?? invoice.customer_email ?? null,
            }),
          );
        }
        break;
      }

      default:
        logStep("ignored_event", { eventId: event.id, eventType: event.type });
        break;
    }

    logStep("processed", { eventId: event.id, eventType: event.type, workspaceId });
    return new Response("ok", { status: 200 });
  } catch (error) {
    logStep("handler_error", {
      eventId: event.id,
      eventType: event.type,
      workspaceId,
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "Webhook processing failed." }, 500);
  }
});
