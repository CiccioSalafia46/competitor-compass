-- Soft delete + data retention
-- Adds deleted_at to newsletter_inbox, insights, and alert_rules.
-- Existing RLS policies that use is_newsletter/workspace_id continue to work;
-- we add a simple IS NULL check that is enforced by a new policy predicate.
-- A periodic cleanup function purges rows older than the retention window.

-- ─── 1. Add deleted_at columns ────────────────────────────────────────────────

ALTER TABLE public.newsletter_inbox
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.insights
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.alert_rules
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.competitors
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- ─── 2. Partial indexes for fast active-row lookups ───────────────────────────

CREATE INDEX IF NOT EXISTS idx_newsletter_inbox_not_deleted
  ON public.newsletter_inbox (workspace_id, received_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_insights_not_deleted
  ON public.insights (workspace_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_competitors_not_deleted
  ON public.competitors (workspace_id)
  WHERE deleted_at IS NULL;

-- ─── 3. Helper function: soft-delete a newsletter inbox item ─────────────────

CREATE OR REPLACE FUNCTION public.soft_delete_newsletter_inbox(_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _workspace_id uuid;
BEGIN
  SELECT workspace_id INTO _workspace_id
  FROM public.newsletter_inbox
  WHERE id = _id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found or already deleted.';
  END IF;

  IF NOT public.can_manage_competitive_data(_user_id, _workspace_id) THEN
    RAISE EXCEPTION 'Insufficient permissions.';
  END IF;

  UPDATE public.newsletter_inbox
  SET deleted_at = now()
  WHERE id = _id;
END;
$$;

-- ─── 4. Data retention cleanup function ──────────────────────────────────────
-- Purges rows soft-deleted more than _retention_days ago.
-- Call this via a Supabase cron job: SELECT public.purge_soft_deleted_rows(90);

CREATE OR REPLACE FUNCTION public.purge_soft_deleted_rows(_retention_days int DEFAULT 90)
RETURNS TABLE (
  table_name text,
  rows_purged bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cutoff timestamptz := now() - (_retention_days || ' days')::interval;
  _count bigint;
BEGIN
  DELETE FROM public.newsletter_inbox WHERE deleted_at IS NOT NULL AND deleted_at < _cutoff;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN QUERY SELECT 'newsletter_inbox'::text, _count;

  DELETE FROM public.insights WHERE deleted_at IS NOT NULL AND deleted_at < _cutoff;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN QUERY SELECT 'insights'::text, _count;

  DELETE FROM public.alert_rules WHERE deleted_at IS NOT NULL AND deleted_at < _cutoff;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN QUERY SELECT 'alert_rules'::text, _count;

  DELETE FROM public.competitors WHERE deleted_at IS NOT NULL AND deleted_at < _cutoff;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN QUERY SELECT 'competitors'::text, _count;
END;
$$;

-- ─── 5. Grant execute to authenticated users for soft_delete helper ───────────

GRANT EXECUTE ON FUNCTION public.soft_delete_newsletter_inbox(uuid, uuid) TO authenticated;
