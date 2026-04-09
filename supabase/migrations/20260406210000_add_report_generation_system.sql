CREATE TABLE IF NOT EXISTS public.report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_key text NOT NULL CHECK (template_key IN ('weekly_competitor_pulse', 'promo_digest', 'messaging_analysis')),
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly')),
  day_of_week smallint CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6),
  hour_of_day smallint NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  minute_of_hour smallint NOT NULL CHECK (minute_of_hour BETWEEN 0 AND 59),
  timezone text NOT NULL DEFAULT 'UTC',
  range_days integer NOT NULL DEFAULT 7 CHECK (range_days BETWEEN 1 AND 180),
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.report_schedules(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  template_key text NOT NULL CHECK (template_key IN ('weekly_competitor_pulse', 'promo_digest', 'messaging_analysis')),
  title text NOT NULL,
  status text NOT NULL CHECK (status IN ('completed', 'failed')),
  range_days integer NOT NULL CHECK (range_days BETWEEN 1 AND 180),
  generated_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_schedules_workspace_next_run_idx
  ON public.report_schedules (workspace_id, is_active, next_run_at);

CREATE INDEX IF NOT EXISTS report_runs_workspace_generated_at_idx
  ON public.report_runs (workspace_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS report_runs_schedule_generated_at_idx
  ON public.report_runs (schedule_id, generated_at DESC);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view report schedules" ON public.report_schedules;
CREATE POLICY "Members can view report schedules"
  ON public.report_schedules FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Analysts can create report schedules" ON public.report_schedules;
CREATE POLICY "Analysts can create report schedules"
  ON public.report_schedules FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_competitive_data(auth.uid(), workspace_id)
    AND auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Analysts can update report schedules" ON public.report_schedules;
CREATE POLICY "Analysts can update report schedules"
  ON public.report_schedules FOR UPDATE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Analysts can delete report schedules" ON public.report_schedules;
CREATE POLICY "Analysts can delete report schedules"
  ON public.report_schedules FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can view report runs" ON public.report_runs;
CREATE POLICY "Members can view report runs"
  ON public.report_runs FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP TRIGGER IF EXISTS update_report_schedules_updated_at ON public.report_schedules;
CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
