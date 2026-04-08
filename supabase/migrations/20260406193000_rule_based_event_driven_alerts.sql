ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS evaluation_mode text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS last_evaluated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'alert_rules_evaluation_mode_check'
  ) THEN
    ALTER TABLE public.alert_rules
      ADD CONSTRAINT alert_rules_evaluation_mode_check
      CHECK (evaluation_mode IN ('event', 'scheduled', 'both'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_alert_rules_workspace_active_mode
  ON public.alert_rules (workspace_id, is_active, evaluation_mode);

CREATE INDEX IF NOT EXISTS idx_alert_rules_created_by
  ON public.alert_rules (created_by);

DROP POLICY IF EXISTS "Members can view alert rules" ON public.alert_rules;
CREATE POLICY "Members can view alert rules"
  ON public.alert_rules FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_workspace_admin_member(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Analysts can update alert rules" ON public.alert_rules;
CREATE POLICY "Users can update own alert rules"
  ON public.alert_rules FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_workspace_admin_member(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Analysts can delete alert rules" ON public.alert_rules;
CREATE POLICY "Users can delete own alert rules"
  ON public.alert_rules FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_workspace_admin_member(auth.uid(), workspace_id)
  );

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid;

UPDATE public.alerts AS alerts
SET recipient_user_id = rules.created_by
FROM public.alert_rules AS rules
WHERE alerts.alert_rule_id = rules.id
  AND alerts.recipient_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_workspace_recipient_unread
  ON public.alerts (workspace_id, recipient_user_id, is_read, is_dismissed, created_at DESC);

DROP POLICY IF EXISTS "Members can view alerts" ON public.alerts;
CREATE POLICY "Members can view alerts"
  ON public.alerts FOR SELECT TO authenticated
  USING (
    ((recipient_user_id IS NULL) AND public.is_workspace_member(auth.uid(), workspace_id))
    OR recipient_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Members can update alerts" ON public.alerts;
CREATE POLICY "Members can update alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (
    ((recipient_user_id IS NULL) AND public.is_workspace_member(auth.uid(), workspace_id))
    OR recipient_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Members can delete alerts" ON public.alerts;
CREATE POLICY "Members can delete alerts"
  ON public.alerts FOR DELETE TO authenticated
  USING (
    ((recipient_user_id IS NULL) AND public.is_workspace_member(auth.uid(), workspace_id))
    OR recipient_user_id = auth.uid()
  );

CREATE TABLE IF NOT EXISTS public.alert_trigger_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  alert_rule_id uuid NOT NULL REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  recipient_user_id uuid,
  competitor_id uuid REFERENCES public.competitors(id) ON DELETE SET NULL,
  event_source text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'triggered',
  dedupe_key text,
  title text NOT NULL,
  message text,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_trigger_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'alert_trigger_logs_status_check'
  ) THEN
    ALTER TABLE public.alert_trigger_logs
      ADD CONSTRAINT alert_trigger_logs_status_check
      CHECK (status IN ('triggered', 'suppressed', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_alert_trigger_logs_workspace_created_at
  ON public.alert_trigger_logs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_trigger_logs_workspace_recipient_created_at
  ON public.alert_trigger_logs (workspace_id, recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_trigger_logs_rule_created_at
  ON public.alert_trigger_logs (alert_rule_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_trigger_logs_dedupe_key
  ON public.alert_trigger_logs (dedupe_key);

DROP POLICY IF EXISTS "Members can view alert trigger logs" ON public.alert_trigger_logs;
CREATE POLICY "Members can view alert trigger logs"
  ON public.alert_trigger_logs FOR SELECT TO authenticated
  USING (
    ((recipient_user_id IS NULL) AND public.is_workspace_member(auth.uid(), workspace_id))
    OR recipient_user_id = auth.uid()
  );
