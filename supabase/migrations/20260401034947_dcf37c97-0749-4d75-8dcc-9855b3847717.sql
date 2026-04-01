
-- Gmail connections (public info accessible to workspace members)
CREATE TABLE public.gmail_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email_address text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  last_history_id text,
  sync_status text NOT NULL DEFAULT 'idle',
  sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email_address)
);
ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view gmail connections"
  ON public.gmail_connections FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert gmail connections"
  ON public.gmail_connections FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can delete gmail connections"
  ON public.gmail_connections FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update gmail connections"
  ON public.gmail_connections FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Gmail tokens (service role ONLY — no policies = no authenticated user access)
CREATE TABLE public.gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_connection_id uuid NOT NULL REFERENCES public.gmail_connections(id) ON DELETE CASCADE UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scopes text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: only service_role (edge functions) can read/write tokens

-- Newsletter inbox
CREATE TABLE public.newsletter_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  gmail_connection_id uuid REFERENCES public.gmail_connections(id) ON DELETE SET NULL,
  gmail_message_id text,
  from_email text,
  from_name text,
  subject text,
  html_content text,
  text_content text,
  received_at timestamptz,
  is_newsletter boolean NOT NULL DEFAULT false,
  newsletter_score numeric(3,2) DEFAULT 0,
  classification_method text,
  competitor_id uuid REFERENCES public.competitors(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}',
  headers_json jsonb DEFAULT '{}',
  is_demo boolean NOT NULL DEFAULT false,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, gmail_message_id)
);
ALTER TABLE public.newsletter_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view inbox"
  ON public.newsletter_inbox FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert inbox items"
  ON public.newsletter_inbox FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update inbox items"
  ON public.newsletter_inbox FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete inbox items"
  ON public.newsletter_inbox FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Newsletter extractions
CREATE TABLE public.newsletter_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  newsletter_inbox_id uuid NOT NULL REFERENCES public.newsletter_inbox(id) ON DELETE CASCADE,
  campaign_type text,
  main_message text,
  offers jsonb DEFAULT '[]',
  discount_percentage numeric,
  coupon_code text,
  free_shipping boolean DEFAULT false,
  expiry_date text,
  calls_to_action jsonb DEFAULT '[]',
  urgency_signals jsonb DEFAULT '[]',
  product_categories text[] DEFAULT '{}',
  event_mentions jsonb DEFAULT '[]',
  strategy_takeaways jsonb DEFAULT '[]',
  confidence_scores jsonb DEFAULT '{}',
  overall_confidence numeric(3,2),
  model_used text,
  extraction_method text DEFAULT 'ai',
  is_valid boolean NOT NULL DEFAULT true,
  raw_extraction jsonb,
  extracted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view extractions"
  ON public.newsletter_extractions FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert extractions"
  ON public.newsletter_extractions FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Add domains and tags to competitors for sender mapping
ALTER TABLE public.competitors ADD COLUMN IF NOT EXISTS domains text[] DEFAULT '{}';
ALTER TABLE public.competitors ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.competitors ADD COLUMN IF NOT EXISTS is_monitored boolean NOT NULL DEFAULT true;

-- Indexes
CREATE INDEX idx_newsletter_inbox_workspace ON public.newsletter_inbox(workspace_id, received_at DESC);
CREATE INDEX idx_newsletter_inbox_competitor ON public.newsletter_inbox(competitor_id);
CREATE INDEX idx_newsletter_inbox_gmail_msg ON public.newsletter_inbox(workspace_id, gmail_message_id);
CREATE INDEX idx_newsletter_inbox_newsletter ON public.newsletter_inbox(workspace_id, is_newsletter, is_archived);
CREATE INDEX idx_newsletter_extractions_inbox ON public.newsletter_extractions(newsletter_inbox_id);
