-- Enable Supabase Realtime on newsletter_inbox.
-- Used by the dashboard Signal Stream to show new signals
-- within seconds of gmail-sync inserting them.
-- Follows the same pattern as 20260408150000_enable_realtime.sql.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'newsletter_inbox'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.newsletter_inbox;
  END IF;
END $$;
