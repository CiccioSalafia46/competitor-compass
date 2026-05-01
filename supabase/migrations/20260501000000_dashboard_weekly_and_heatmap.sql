-- ============================================================
-- Dashboard Iteration 3: Heatmap RPC + Weekly Delta RPC
--
-- get_competitor_daily_activity: Aggregates newsletter_inbox +
--   meta_ads per competitor per day for the activity heatmap.
--
-- get_dashboard_weekly_delta: Returns current-week vs
--   previous-week counts for signals, insights, and alerts.
--
-- Indexes: Optimise the date-range + competitor_id lookups.
-- ============================================================

-- ── Heatmap: per-competitor daily activity ─────────────────

CREATE OR REPLACE FUNCTION public.get_competitor_daily_activity(
  _workspace_id uuid,
  _days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '10s'
AS $$
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Cap days to a reasonable range
  IF _days < 1 THEN _days := 1; END IF;
  IF _days > 90 THEN _days := 90; END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    FROM (
      SELECT
        c.id   AS competitor_id,
        c.name AS competitor_name,
        d.day::date::text AS day,
        coalesce(inbox.cnt, 0) + coalesce(ads.cnt, 0) AS signal_count
      FROM public.competitors c
      CROSS JOIN generate_series(
        current_date - (_days - 1),
        current_date,
        '1 day'::interval
      ) AS d(day)
      LEFT JOIN LATERAL (
        SELECT count(*) AS cnt
        FROM public.newsletter_inbox ni
        WHERE ni.competitor_id = c.id
          AND ni.workspace_id = _workspace_id
          AND ni.deleted_at IS NULL
          AND ni.received_at::date = d.day::date
      ) inbox ON true
      LEFT JOIN LATERAL (
        SELECT count(*) AS cnt
        FROM public.meta_ads ma
        WHERE ma.competitor_id = c.id
          AND ma.workspace_id = _workspace_id
          AND ma.created_at::date = d.day::date
      ) ads ON true
      WHERE c.workspace_id = _workspace_id
        AND c.deleted_at IS NULL
        AND c.is_monitored = true
      ORDER BY c.name, d.day
    ) r
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_competitor_daily_activity(uuid, integer) TO authenticated;

-- ── Weekly delta: current 7d vs previous 7d ────────────────

CREATE OR REPLACE FUNCTION public.get_dashboard_weekly_delta(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '10s'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'signals', jsonb_build_object(
      'current', (
        SELECT count(*) FROM public.newsletter_inbox
        WHERE workspace_id = _workspace_id
          AND deleted_at IS NULL
          AND received_at >= now() - interval '7 days'
      ) + (
        SELECT count(*) FROM public.meta_ads
        WHERE workspace_id = _workspace_id
          AND created_at >= now() - interval '7 days'
      ),
      'previous', (
        SELECT count(*) FROM public.newsletter_inbox
        WHERE workspace_id = _workspace_id
          AND deleted_at IS NULL
          AND received_at >= now() - interval '14 days'
          AND received_at < now() - interval '7 days'
      ) + (
        SELECT count(*) FROM public.meta_ads
        WHERE workspace_id = _workspace_id
          AND created_at >= now() - interval '14 days'
          AND created_at < now() - interval '7 days'
      )
    ),
    'insights', jsonb_build_object(
      'current', (
        SELECT count(*) FROM public.insights
        WHERE workspace_id = _workspace_id
          AND deleted_at IS NULL
          AND created_at >= now() - interval '7 days'
      ),
      'previous', (
        SELECT count(*) FROM public.insights
        WHERE workspace_id = _workspace_id
          AND deleted_at IS NULL
          AND created_at >= now() - interval '14 days'
          AND created_at < now() - interval '7 days'
      )
    ),
    'alerts', jsonb_build_object(
      'current', (
        SELECT count(*) FROM public.alerts
        WHERE workspace_id = _workspace_id
          AND created_at >= now() - interval '7 days'
      ),
      'previous', (
        SELECT count(*) FROM public.alerts
        WHERE workspace_id = _workspace_id
          AND created_at >= now() - interval '14 days'
          AND created_at < now() - interval '7 days'
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_weekly_delta(uuid) TO authenticated;

-- ── Indexes for heatmap + delta query performance ──────────

CREATE INDEX IF NOT EXISTS idx_newsletter_inbox_competitor_received
  ON public.newsletter_inbox (competitor_id, received_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_meta_ads_competitor_created
  ON public.meta_ads (competitor_id, created_at);
