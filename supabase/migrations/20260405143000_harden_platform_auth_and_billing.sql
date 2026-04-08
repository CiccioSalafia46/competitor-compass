CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.workspace_billing (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  stripe_status text,
  plan_key text,
  checkout_email text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_billing ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_workspace_admin_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND role IN ('owner', 'admin')
  )
  OR public.has_role(_user_id, _workspace_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_competitive_data(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_workspace_admin_member(_user_id, _workspace_id)
  OR public.has_any_role(_user_id, _workspace_id, ARRAY['admin', 'analyst']::public.app_role[]);
$$;

DROP POLICY IF EXISTS "Members can create competitors" ON public.competitors;
DROP POLICY IF EXISTS "Members can update competitors" ON public.competitors;
DROP POLICY IF EXISTS "Members can delete competitors" ON public.competitors;

CREATE POLICY "Analysts can create competitors"
  ON public.competitors FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can update competitors"
  ON public.competitors FOR UPDATE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can delete competitors"
  ON public.competitors FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can create newsletter entries" ON public.newsletter_entries;
DROP POLICY IF EXISTS "Members can delete newsletter entries" ON public.newsletter_entries;

CREATE POLICY "Analysts can create newsletter entries"
  ON public.newsletter_entries FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_competitive_data(auth.uid(), workspace_id)
    AND auth.uid() = created_by
  );

CREATE POLICY "Analysts can delete newsletter entries"
  ON public.newsletter_entries FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can create analyses" ON public.analyses;
DROP POLICY IF EXISTS "Members can update analyses" ON public.analyses;

CREATE POLICY "Analysts can create analyses"
  ON public.analyses FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can update analyses"
  ON public.analyses FOR UPDATE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can insert gmail connections" ON public.gmail_connections;
DROP POLICY IF EXISTS "Members can delete gmail connections" ON public.gmail_connections;
DROP POLICY IF EXISTS "Members can update gmail connections" ON public.gmail_connections;

CREATE POLICY "Admins can insert gmail connections"
  ON public.gmail_connections FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_admin_member(auth.uid(), workspace_id)
    AND auth.uid() = user_id
  );

CREATE POLICY "Admins can delete gmail connections"
  ON public.gmail_connections FOR DELETE TO authenticated
  USING (public.is_workspace_admin_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can update gmail connections"
  ON public.gmail_connections FOR UPDATE TO authenticated
  USING (public.is_workspace_admin_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can insert inbox items" ON public.newsletter_inbox;
DROP POLICY IF EXISTS "Members can delete inbox items" ON public.newsletter_inbox;

CREATE POLICY "Analysts can insert inbox items"
  ON public.newsletter_inbox FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can delete inbox items"
  ON public.newsletter_inbox FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can insert extractions" ON public.newsletter_extractions;

DROP POLICY IF EXISTS "Members can insert meta ads" ON public.meta_ads;
DROP POLICY IF EXISTS "Members can update meta ads" ON public.meta_ads;
DROP POLICY IF EXISTS "Members can delete meta ads" ON public.meta_ads;

DROP POLICY IF EXISTS "Members can insert ad analyses" ON public.meta_ad_analyses;

DROP POLICY IF EXISTS "Members can create alert rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Members can update alert rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Members can delete alert rules" ON public.alert_rules;

CREATE POLICY "Analysts can create alert rules"
  ON public.alert_rules FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_competitive_data(auth.uid(), workspace_id)
    AND auth.uid() = created_by
  );

CREATE POLICY "Analysts can update alert rules"
  ON public.alert_rules FOR UPDATE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can delete alert rules"
  ON public.alert_rules FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can insert alerts" ON public.alerts;

DROP POLICY IF EXISTS "Members can insert insights" ON public.insights;
DROP POLICY IF EXISTS "Members can delete insights" ON public.insights;
