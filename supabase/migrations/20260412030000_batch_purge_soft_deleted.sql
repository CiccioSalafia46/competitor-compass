-- ============================================================
-- Replace unbatched purge_soft_deleted_rows with a batched
-- version that deletes at most _batch_size rows per table per
-- call, avoiding long-held locks on large workloads.
--
-- The cron job can call it multiple times per run window if
-- needed, but a single weekly call with batch_size=10000 is
-- sufficient for typical SaaS volumes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.purge_soft_deleted_rows(
  _retention_days int DEFAULT 90,
  _batch_size     int DEFAULT 10000
)
RETURNS TABLE (
  table_name  text,
  rows_purged bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cutoff timestamptz := now() - (_retention_days || ' days')::interval;
  _count  bigint;
BEGIN
  -- newsletter_inbox
  WITH deleted AS (
    DELETE FROM public.newsletter_inbox
    WHERE id IN (
      SELECT id FROM public.newsletter_inbox
      WHERE deleted_at IS NOT NULL AND deleted_at < _cutoff
      LIMIT _batch_size
    )
    RETURNING id
  )
  SELECT count(*) INTO _count FROM deleted;
  RETURN QUERY SELECT 'newsletter_inbox'::text, _count;

  -- insights
  WITH deleted AS (
    DELETE FROM public.insights
    WHERE id IN (
      SELECT id FROM public.insights
      WHERE deleted_at IS NOT NULL AND deleted_at < _cutoff
      LIMIT _batch_size
    )
    RETURNING id
  )
  SELECT count(*) INTO _count FROM deleted;
  RETURN QUERY SELECT 'insights'::text, _count;

  -- alert_rules
  WITH deleted AS (
    DELETE FROM public.alert_rules
    WHERE id IN (
      SELECT id FROM public.alert_rules
      WHERE deleted_at IS NOT NULL AND deleted_at < _cutoff
      LIMIT _batch_size
    )
    RETURNING id
  )
  SELECT count(*) INTO _count FROM deleted;
  RETURN QUERY SELECT 'alert_rules'::text, _count;

  -- competitors
  WITH deleted AS (
    DELETE FROM public.competitors
    WHERE id IN (
      SELECT id FROM public.competitors
      WHERE deleted_at IS NOT NULL AND deleted_at < _cutoff
      LIMIT _batch_size
    )
    RETURNING id
  )
  SELECT count(*) INTO _count FROM deleted;
  RETURN QUERY SELECT 'competitors'::text, _count;
END;
$$;

-- Update the cron to pass explicit batch size for visibility
SELECT cron.unschedule('weekly-soft-delete-retention')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'weekly-soft-delete-retention'
  );

SELECT cron.schedule(
  'weekly-soft-delete-retention',
  '0 3 * * 0',
  'SELECT public.purge_soft_deleted_rows(90, 10000);'
);
