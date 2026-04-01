
-- Alert rules table
CREATE TABLE public.alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  delivery_channels TEXT[] NOT NULL DEFAULT '{in_app}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view alert rules" ON public.alert_rules FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can create alert rules" ON public.alert_rules FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);
CREATE POLICY "Members can update alert rules" ON public.alert_rules FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete alert rules" ON public.alert_rules FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- Alert history / notifications table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  category TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  competitor_id UUID REFERENCES public.competitors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view alerts" ON public.alerts FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete alerts" ON public.alerts FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));

-- AI insights cache table
CREATE TABLE public.insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  what_is_happening TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  strategic_implication TEXT NOT NULL,
  recommended_response TEXT NOT NULL,
  confidence NUMERIC,
  supporting_evidence JSONB DEFAULT '[]'::jsonb,
  affected_competitors TEXT[] DEFAULT '{}'::text[],
  source_type TEXT NOT NULL DEFAULT 'newsletter',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view insights" ON public.insights FOR SELECT TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert insights" ON public.insights FOR INSERT TO authenticated WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete insights" ON public.insights FOR DELETE TO authenticated USING (is_workspace_member(auth.uid(), workspace_id));
