-- Schedule weekly data retention cleanup via pg_cron.
-- Enables the pg_cron extension if not already present, then registers the job.
-- Safe to re-run: uses IF NOT EXISTS / duplicate job name check.

-- Enable pg_cron (requires pg_cron to be available on the Supabase plan)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage on cron schema to postgres role so the schedule call works
GRANT USAGE ON SCHEMA cron TO postgres;

-- Remove existing job with the same name to allow idempotent re-runs
SELECT cron.unschedule('weekly-soft-delete-retention')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'weekly-soft-delete-retention'
  );

-- Schedule: every Sunday at 03:00 UTC — purge rows soft-deleted > 90 days ago
SELECT cron.schedule(
  'weekly-soft-delete-retention',
  '0 3 * * 0',
  'SELECT public.purge_soft_deleted_rows(90);'
);
