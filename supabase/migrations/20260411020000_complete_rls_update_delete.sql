-- ============================================================
-- Complete missing RLS UPDATE and DELETE policies.
--
-- Context: migration 20260410000000 restored INSERT + DELETE for
-- insights and INSERT for alerts, but left UPDATE on insights and
-- UPDATE + DELETE on alerts uncovered.  This migration closes
-- those gaps so all four operations are consistently guarded.
-- ============================================================

-- ─── 1. insights — add missing UPDATE ────────────────────────────────────────
-- Analysts can update their own workspace insights (e.g. mark as read,
-- archive, change priority).  Mirrors the existing INSERT / DELETE policies.

CREATE POLICY "Analysts can update insights"
  ON public.insights FOR UPDATE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

-- ─── 2. alerts — add missing UPDATE and DELETE ────────────────────────────────
-- All workspace members can mark alerts as read/dismissed (UPDATE),
-- and admins/analysts can delete alert records via the app.
-- INSERT already exists from 20260410000000.

CREATE POLICY "Members can update alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts can delete alerts"
  ON public.alerts FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));
