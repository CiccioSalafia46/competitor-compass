
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'general',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Only service role can access (admin edge function uses service role)
CREATE POLICY "Deny all client access to feature_flags"
  ON public.feature_flags FOR ALL TO authenticated
  USING (false);

-- Seed default flags
INSERT INTO public.feature_flags (key, label, description, category, enabled) VALUES
  ('gmail_sync', 'Gmail Sync', 'Enable Gmail integration and email syncing', 'integrations', true),
  ('meta_ads', 'Meta Ads', 'Enable Meta Ad Library monitoring', 'integrations', false),
  ('ai_extraction', 'AI Extraction', 'Enable AI-powered newsletter intelligence extraction', 'integrations', true),
  ('stripe_billing', 'Stripe Billing', 'Enable Stripe checkout and subscription management', 'billing', true),
  ('auto_insights', 'Auto Insights', 'Automatically generate insights from new data', 'intelligence', false),
  ('rate_limiting', 'Rate Limiting', 'Enforce per-user rate limits on AI endpoints', 'security', true);
