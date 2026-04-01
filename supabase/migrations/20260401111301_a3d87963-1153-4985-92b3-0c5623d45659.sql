
-- 1. Attach handle_new_user trigger to auth.users for automatic profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Attach handle_new_workspace trigger for auto workspace member creation
CREATE OR REPLACE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- 3. Attach handle_new_workspace_role trigger for auto admin role assignment
CREATE OR REPLACE TRIGGER on_workspace_created_role
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace_role();

-- 4. Secure gmail_tokens: deny all client access, service role only
CREATE POLICY "Deny all select on gmail_tokens"
  ON public.gmail_tokens FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "Deny all insert on gmail_tokens"
  ON public.gmail_tokens FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny all update on gmail_tokens"
  ON public.gmail_tokens FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Deny all delete on gmail_tokens"
  ON public.gmail_tokens FOR DELETE
  TO authenticated
  USING (false);

-- 5. Add updated_at triggers for tables that need them
CREATE OR REPLACE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_meta_ads_updated_at
  BEFORE UPDATE ON public.meta_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create server-side analytics RPC to avoid heavy client-side processing
CREATE OR REPLACE FUNCTION public.get_workspace_analytics(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _nl_by_week jsonb;
  _ads_by_week jsonb;
  _promo_freq jsonb;
  _cta_dist jsonb;
  _cat_dist jsonb;
  _urg_freq jsonb;
  _camp_types jsonb;
  _comp_activity jsonb;
BEGIN
  -- Verify membership
  IF NOT is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Newsletters by week (last 12 weeks)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _nl_by_week
  FROM (
    SELECT to_char(date_trunc('week', received_at), 'IYYY-"W"IW') as week, count(*)::int as count
    FROM newsletter_inbox
    WHERE workspace_id = _workspace_id AND is_newsletter = true AND received_at IS NOT NULL
    GROUP BY 1 ORDER BY 1 DESC LIMIT 12
  ) t;

  -- Ads by week
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _ads_by_week
  FROM (
    SELECT to_char(date_trunc('week', COALESCE(ad_delivery_start_time, created_at)), 'IYYY-"W"IW') as week, count(*)::int as count
    FROM meta_ads
    WHERE workspace_id = _workspace_id
    GROUP BY 1 ORDER BY 1 DESC LIMIT 12
  ) t;

  -- CTA distribution from ads
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _cta_dist
  FROM (
    SELECT COALESCE(cta_type, 'None') as cta, count(*)::int as count
    FROM meta_ads WHERE workspace_id = _workspace_id
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ) t;

  -- Category distribution from extractions
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _cat_dist
  FROM (
    SELECT cat as category, count(*)::int as count
    FROM newsletter_extractions, unnest(product_categories) as cat
    WHERE workspace_id = _workspace_id
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ) t;

  -- Campaign types
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _camp_types
  FROM (
    SELECT COALESCE(campaign_type, 'Unknown') as type, count(*)::int as count
    FROM newsletter_extractions WHERE workspace_id = _workspace_id
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ) t;

  -- Competitor activity
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _comp_activity
  FROM (
    SELECT
      COALESCE(c.name, 'Unattributed') as competitor,
      count(DISTINCT ni.id)::int as newsletters,
      count(DISTINCT ma.id)::int as ads
    FROM competitors c
    LEFT JOIN newsletter_inbox ni ON ni.competitor_id = c.id AND ni.workspace_id = _workspace_id AND ni.is_newsletter = true
    LEFT JOIN meta_ads ma ON ma.competitor_id = c.id AND ma.workspace_id = _workspace_id
    WHERE c.workspace_id = _workspace_id
    GROUP BY c.name ORDER BY 2 DESC LIMIT 20
  ) t;

  -- Promotion frequency
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _promo_freq
  FROM (
    SELECT
      COALESCE(c.name, 'Unattributed') as competitor,
      count(*) FILTER (WHERE ne.discount_percentage IS NOT NULL OR ne.campaign_type ILIKE '%promo%')::int as promos,
      count(*)::int as total
    FROM newsletter_extractions ne
    JOIN newsletter_inbox ni ON ni.id = ne.newsletter_inbox_id
    LEFT JOIN competitors c ON c.id = ni.competitor_id
    WHERE ne.workspace_id = _workspace_id
    GROUP BY c.name ORDER BY 3 DESC LIMIT 20
  ) t;

  -- Urgency signals (flatten JSON array)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _urg_freq
  FROM (
    SELECT
      CASE WHEN jsonb_typeof(sig) = 'string' THEN sig::text
           ELSE COALESCE(sig->>'type', 'unknown') END as type,
      count(*)::int as count
    FROM newsletter_extractions ne, jsonb_array_elements(ne.urgency_signals) as sig
    WHERE ne.workspace_id = _workspace_id
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  ) t;

  _result := jsonb_build_object(
    'newslettersByWeek', _nl_by_week,
    'adsByWeek', _ads_by_week,
    'promotionFrequency', _promo_freq,
    'ctaDistribution', _cta_dist,
    'categoryDistribution', _cat_dist,
    'urgencyFrequency', _urg_freq,
    'campaignTypes', _camp_types,
    'competitorActivity', _comp_activity
  );

  RETURN _result;
END;
$$;
