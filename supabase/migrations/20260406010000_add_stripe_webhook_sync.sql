ALTER TABLE public.workspace_billing
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_workspace_id
  ON public.stripe_webhook_events (workspace_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_customer_id
  ON public.stripe_webhook_events (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_subscription_id
  ON public.stripe_webhook_events (stripe_subscription_id);
