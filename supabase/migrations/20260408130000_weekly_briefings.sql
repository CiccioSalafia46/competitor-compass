-- Weekly briefings table
-- Stores auto-generated weekly competitive intelligence summaries per workspace.

CREATE TABLE IF NOT EXISTS public.weekly_briefings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  week_start    date NOT NULL,           -- Monday of the briefing week (ISO week)
  week_end      date NOT NULL,           -- Sunday of the briefing week
  generated_at  timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  error_message text,
  -- Core content fields (all nullable so partial saves are valid)
  executive_summary    text,
  key_signals          jsonb DEFAULT '[]'::jsonb,   -- [{competitor, signal, category}]
  top_insights         jsonb DEFAULT '[]'::jsonb,   -- [{title, priority, category}]
  action_items         jsonb DEFAULT '[]'::jsonb,   -- [{action, urgency}]
  competitor_spotlight jsonb DEFAULT '{}'::jsonb,   -- {name, headline, details}
  metrics_snapshot     jsonb DEFAULT '{}'::jsonb,   -- {newsletters, ads, insights, alerts}
  UNIQUE (workspace_id, week_start)
);

ALTER TABLE public.weekly_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_view_briefings"
  ON public.weekly_briefings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = weekly_briefings.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_briefings"
  ON public.weekly_briefings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for efficient per-workspace lookup ordered by week
CREATE INDEX IF NOT EXISTS idx_weekly_briefings_workspace_week
  ON public.weekly_briefings (workspace_id, week_start DESC);
