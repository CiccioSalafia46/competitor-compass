-- ============================================================
-- Complete missing RLS UPDATE and DELETE policies.
--
-- Context: migration 20260410000000 restored INSERT + DELETE for
-- insights and INSERT for alerts, but left UPDATE on insights and
-- UPDATE + DELETE on alerts uncovered.  This migration closes
-- those gaps so all four operations are consistently guarded.
--
-- Uses DROP ... IF EXISTS before each CREATE to be safely
-- re-runnable regardless of partial prior state.
-- ============================================================

-- ─── 1. insights — add missing UPDATE ────────────────────────────────────────

DROP POLICY IF EXISTS "Analysts can update insights" ON public.insights;
CREATE POLICY "Analysts can update insights"
  ON public.insights FOR UPDATE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

-- ─── 2. alerts — add missing UPDATE and DELETE ────────────────────────────────

DROP POLICY IF EXISTS "Members can update alerts" ON public.alerts;
CREATE POLICY "Members can update alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Analysts can delete alerts" ON public.alerts;
CREATE POLICY "Analysts can delete alerts"
  ON public.alerts FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));
