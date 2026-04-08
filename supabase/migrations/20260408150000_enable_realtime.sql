-- Enable Supabase Realtime for tables used by frontend subscriptions.
-- alerts: used by AppLayout TopBar to keep unread count live.
-- workspace_billing: used by useSubscription to detect plan changes instantly.

DO $$
BEGIN
  -- alerts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  END IF;

  -- workspace_billing
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'workspace_billing'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_billing;
  END IF;
END $$;
