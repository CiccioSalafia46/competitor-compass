-- ============================================================
-- Production hardening: restore missing RLS policies +
-- add critical performance indexes.
--
-- Context: migration 20260405143000 dropped several INSERT /
-- UPDATE / DELETE policies without replacement.  Edge functions
-- run as service_role (bypasses RLS) so writes via the API
-- already work, but authenticated clients (and any future
-- direct SDK usage) are blocked.  This migration restores
-- explicit policies and documents the intended access model.
-- ============================================================

-- ─── 1. newsletter_extractions ───────────────────────────────────────────────
-- INSERT was dropped in 20260405143000; UPDATE/DELETE were never created.

CREATE POLICY "Analysts can insert extractions"
  ON public.newsletter_extractions FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can update extractions"
  ON public.newsletter_extractions FOR UPDATE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can delete extractions"
  ON public.newsletter_extractions FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

-- ─── 2. meta_ads ─────────────────────────────────────────────────────────────
-- INSERT / UPDATE / DELETE all dropped in 20260405143000 with no replacements.

CREATE POLICY "Analysts can insert meta ads"
  ON public.meta_ads FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can update meta ads"
  ON public.meta_ads FOR UPDATE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can delete meta ads"
  ON public.meta_ads FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

-- ─── 3. meta_ad_analyses ─────────────────────────────────────────────────────
-- INSERT was dropped in 20260405143000; UPDATE/DELETE were never created.

CREATE POLICY "Analysts can insert ad analyses"
  ON public.meta_ad_analyses FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can update ad analyses"
  ON public.meta_ad_analyses FOR UPDATE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can delete ad analyses"
  ON public.meta_ad_analyses FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

-- ─── 4. alerts ───────────────────────────────────────────────────────────────
-- INSERT was dropped in 20260405143000 with no replacement.
-- All workspace members can receive (and trigger) alerts.

CREATE POLICY "Members can insert alerts"
  ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- ─── 5. insights ─────────────────────────────────────────────────────────────
-- INSERT and DELETE were both dropped in 20260405143000 with no replacements.

CREATE POLICY "Analysts can insert insights"
  ON public.insights FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_competitive_data(auth.uid(), workspace_id));

CREATE POLICY "Analysts can delete insights"
  ON public.insights FOR DELETE TO authenticated
  USING (public.can_manage_competitive_data(auth.uid(), workspace_id));

-- ─── 6. Performance indexes ──────────────────────────────────────────────────
-- Add every index that is missing for production-scale query patterns.
-- All use IF NOT EXISTS so they are safe to re-run.

-- newsletter_extractions: workspace scans (analytics, attribution)
CREATE INDEX IF NOT EXISTS idx_newsletter_extractions_workspace
  ON public.newsletter_extractions (workspace_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_extractions_workspace_inbox
  ON public.newsletter_extractions (workspace_id, newsletter_inbox_id);

-- meta_ads: workspace + time-range queries (analytics, compare page)
CREATE INDEX IF NOT EXISTS idx_meta_ads_workspace
  ON public.meta_ads (workspace_id);

CREATE INDEX IF NOT EXISTS idx_meta_ads_workspace_created
  ON public.meta_ads (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meta_ads_competitor
  ON public.meta_ads (competitor_id)
  WHERE competitor_id IS NOT NULL;

-- alerts: unread count (hot path — TopBar, Alerts page)
CREATE INDEX IF NOT EXISTS idx_alerts_workspace_unread
  ON public.alerts (workspace_id, is_dismissed, is_read, created_at DESC);

-- alert_rules: evaluate-alerts fetches all active rules per workspace
CREATE INDEX IF NOT EXISTS idx_alert_rules_workspace_active
  ON public.alert_rules (workspace_id, is_active);

-- alert_trigger_logs: activity log listing
CREATE INDEX IF NOT EXISTS idx_alert_trigger_logs_workspace_created
  ON public.alert_trigger_logs (workspace_id, created_at DESC);

-- insights: insight listing sorted by created_at
CREATE INDEX IF NOT EXISTS idx_insights_workspace_created
  ON public.insights (workspace_id, created_at DESC);

-- analyses: workspace + status filter used in several pages
CREATE INDEX IF NOT EXISTS idx_analyses_workspace_created
  ON public.analyses (workspace_id, created_at DESC);

-- report_runs: reports page listing
CREATE INDEX IF NOT EXISTS idx_report_runs_workspace_created
  ON public.report_runs (workspace_id, created_at DESC);
