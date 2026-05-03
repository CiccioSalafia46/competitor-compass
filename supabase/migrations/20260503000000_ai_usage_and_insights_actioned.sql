-- B-005: AI usage tracking for cost guardrails and rate limiting
-- B-003: Mark insight as actioned

-- ─── AI Usage Tracking ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  function_name text NOT NULL,
  model text NOT NULL,
  tokens_in int NOT NULL DEFAULT 0,
  tokens_out int NOT NULL DEFAULT 0,
  cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_usage_workspace_created ON public.ai_usage(workspace_id, created_at DESC);
CREATE INDEX idx_ai_usage_function_created ON public.ai_usage(function_name, created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Read-only for workspace members (usage dashboard)
CREATE POLICY "ai_usage_select_own_workspace" ON public.ai_usage
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE only via service_role (edge functions)

-- ─── Insights: Mark as Actioned ─────────────────────────────────────

ALTER TABLE public.insights
  ADD COLUMN IF NOT EXISTS actioned_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actioned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_insights_actioned ON public.insights(workspace_id, actioned_at)
  WHERE actioned_at IS NOT NULL;
