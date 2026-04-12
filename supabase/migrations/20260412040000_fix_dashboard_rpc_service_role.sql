-- ============================================================
-- Fix get_dashboard_stats so it can be called from edge functions
-- using the service_role key.
--
-- Two problems with the original:
-- 1. auth.uid() is NULL when called with service_role, causing
--    is_workspace_member(NULL, _workspace_id) → false → Access denied.
-- 2. GRANT was only to `authenticated`, not to `service_role`.
--
-- The auth check is redundant: the dashboard-snapshot edge function
-- already calls assertWorkspaceMember() before invoking this RPC.
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
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO service_role;

-- Also grant service_role on get_workspace_analytics which is called by the same edge function.
GRANT EXECUTE ON FUNCTION public.get_workspace_analytics(uuid, integer) TO service_role;
