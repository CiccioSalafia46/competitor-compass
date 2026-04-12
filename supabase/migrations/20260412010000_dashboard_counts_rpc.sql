-- ============================================================
-- get_dashboard_stats(_workspace_id uuid)
--
-- Returns all scalar dashboard counts in a single round-trip,
-- replacing the 8 individual COUNT queries fired by the
-- dashboard-snapshot edge function.
--
-- Filters soft-deleted rows (deleted_at IS NULL) on every
-- table that supports it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '10s'
AS $$
DECLARE
  v_newsletter_sources   bigint;
  v_competitors          bigint;
  v_analyses_completed   bigint;
  v_meta_ads_total       bigint;
  v_meta_ads_active      bigint;
  v_inbox_newsletters    bigint;
  v_insights             bigint;
  v_alerts_unread        bigint;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT count(*) INTO v_newsletter_sources
  FROM public.newsletter_entries
  WHERE workspace_id = _workspace_id;

  SELECT count(*) INTO v_competitors
  FROM public.competitors
  WHERE workspace_id = _workspace_id
    AND deleted_at IS NULL;

  SELECT count(*) INTO v_analyses_completed
  FROM public.analyses
  WHERE workspace_id = _workspace_id
    AND status = 'completed';

  SELECT count(*) INTO v_meta_ads_total
  FROM public.meta_ads
  WHERE workspace_id = _workspace_id;

  SELECT count(*) INTO v_meta_ads_active
  FROM public.meta_ads
  WHERE workspace_id = _workspace_id
    AND is_active = true;

  SELECT count(*) INTO v_inbox_newsletters
  FROM public.newsletter_inbox
  WHERE workspace_id = _workspace_id
    AND is_newsletter = true
    AND deleted_at IS NULL;

  SELECT count(*) INTO v_insights
  FROM public.insights
  WHERE workspace_id = _workspace_id
    AND deleted_at IS NULL;

  SELECT count(*) INTO v_alerts_unread
  FROM public.alerts
  WHERE workspace_id = _workspace_id
    AND is_read = false
    AND is_dismissed = false;

  RETURN jsonb_build_object(
    'newsletter_sources',  v_newsletter_sources,
    'competitors',         v_competitors,
    'analyses_completed',  v_analyses_completed,
    'meta_ads_total',      v_meta_ads_total,
    'meta_ads_active',     v_meta_ads_active,
    'inbox_newsletters',   v_inbox_newsletters,
    'insights',            v_insights,
    'alerts_unread',       v_alerts_unread
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;
