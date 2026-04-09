CREATE OR REPLACE FUNCTION public.normalize_domain(_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  parts text[];
BEGIN
  IF _value IS NULL OR btrim(_value) = '' THEN
    RETURN NULL;
  END IF;

  cleaned := lower(btrim(_value));
  cleaned := regexp_replace(cleaned, '^[a-z]+://', '');

  IF position('@' in cleaned) > 0 THEN
    parts := string_to_array(cleaned, '@');
    cleaned := parts[array_length(parts, 1)];
  END IF;

  cleaned := split_part(cleaned, '/', 1);
  cleaned := split_part(cleaned, '?', 1);
  cleaned := split_part(cleaned, '#', 1);
  cleaned := split_part(cleaned, ':', 1);
  cleaned := regexp_replace(cleaned, '^www\.', '');
  cleaned := regexp_replace(cleaned, '\.$', '');

  IF cleaned = '' THEN
    RETURN NULL;
  END IF;

  RETURN cleaned;
END;
$$;

CREATE OR REPLACE FUNCTION public.collect_competitor_domains(_website text, _domains text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(array_agg(DISTINCT domain), ARRAY[]::text[])
  FROM (
    SELECT public.normalize_domain(_website) AS domain
    UNION ALL
    SELECT public.normalize_domain(domain)
    FROM unnest(COALESCE(_domains, ARRAY[]::text[])) AS domain
  ) normalized
  WHERE domain IS NOT NULL AND domain <> '';
$$;

CREATE OR REPLACE FUNCTION public.domain_matches_competitor(_sender_domain text, _candidate_domain text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.normalize_domain(_sender_domain) IS NULL OR public.normalize_domain(_candidate_domain) IS NULL THEN false
    ELSE
      public.normalize_domain(_sender_domain) = public.normalize_domain(_candidate_domain)
      OR public.normalize_domain(_sender_domain) LIKE '%.' || public.normalize_domain(_candidate_domain)
  END;
$$;

CREATE INDEX IF NOT EXISTS idx_newsletter_inbox_sender_domain
  ON public.newsletter_inbox (workspace_id, public.normalize_domain(from_email))
  WHERE is_newsletter = true AND is_demo = false;

CREATE OR REPLACE FUNCTION public.sync_competitor_newsletter_attribution(_competitor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  competitor_row public.competitors%ROWTYPE;
  normalized_domains text[];
  matched_count integer := 0;
BEGIN
  SELECT *
  INTO competitor_row
  FROM public.competitors
  WHERE id = _competitor_id;

  IF competitor_row.id IS NULL THEN
    RAISE EXCEPTION 'Competitor not found';
  END IF;

  IF NOT public.can_manage_competitive_data(auth.uid(), competitor_row.workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  normalized_domains := public.collect_competitor_domains(competitor_row.website, competitor_row.domains);

  UPDATE public.competitors
  SET domains = normalized_domains
  WHERE id = competitor_row.id
    AND COALESCE(domains, ARRAY[]::text[]) IS DISTINCT FROM normalized_domains;

  IF COALESCE(array_length(normalized_domains, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'matched', 0,
      'domains', normalized_domains
    );
  END IF;

  UPDATE public.newsletter_inbox AS inbox
  SET competitor_id = competitor_row.id
  WHERE inbox.workspace_id = competitor_row.workspace_id
    AND inbox.is_newsletter = true
    AND inbox.is_demo = false
    AND EXISTS (
      SELECT 1
      FROM unnest(normalized_domains) AS candidate_domain
      WHERE public.domain_matches_competitor(inbox.from_email, candidate_domain)
    )
    AND (inbox.competitor_id IS NULL OR inbox.competitor_id = competitor_row.id);

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'matched', matched_count,
    'domains', normalized_domains
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_workspace_newsletter_attribution(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_count integer := 0;
  competitors_processed integer := 0;
BEGIN
  IF NOT public.can_manage_competitive_data(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH competitor_domains AS (
    SELECT
      competitor.id AS competitor_id,
      domain
    FROM public.competitors AS competitor,
    LATERAL unnest(public.collect_competitor_domains(competitor.website, competitor.domains)) AS domain
    WHERE competitor.workspace_id = _workspace_id
      AND competitor.is_monitored = true
  ),
  candidate_matches AS (
    SELECT
      inbox.id AS inbox_id,
      competitor_domains.competitor_id
    FROM public.newsletter_inbox AS inbox
    JOIN competitor_domains
      ON public.domain_matches_competitor(inbox.from_email, competitor_domains.domain)
    WHERE inbox.workspace_id = _workspace_id
      AND inbox.is_newsletter = true
      AND inbox.is_demo = false
      AND inbox.competitor_id IS NULL
  ),
  unique_matches AS (
    SELECT
      inbox_id,
      (array_agg(DISTINCT competitor_id))[1] AS competitor_id
    FROM candidate_matches
    GROUP BY inbox_id
    HAVING count(DISTINCT competitor_id) = 1
  ),
  rows_to_update AS (
    SELECT inbox_id AS id, competitor_id
    FROM unique_matches
  )
  UPDATE public.newsletter_inbox AS inbox
  SET competitor_id = rows_to_update.competitor_id
  FROM rows_to_update
  WHERE inbox.id = rows_to_update.id;

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  SELECT count(*)
  INTO competitors_processed
  FROM public.competitors
  WHERE workspace_id = _workspace_id
    AND is_monitored = true;

  RETURN jsonb_build_object(
    'matched', matched_count,
    'competitorsProcessed', competitors_processed
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_newsletter_competitor_suggestions(_workspace_id uuid)
RETURNS TABLE (
  sender_domain text,
  sender_name text,
  sample_from_email text,
  newsletter_count integer,
  latest_received_at timestamptz,
  suggested_name text,
  suggested_website text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH unmatched AS (
    SELECT
      public.normalize_domain(from_email) AS sender_domain,
      NULLIF(trim(from_name), '') AS sender_name,
      from_email,
      received_at
    FROM public.newsletter_inbox
    WHERE workspace_id = _workspace_id
      AND is_newsletter = true
      AND is_demo = false
      AND competitor_id IS NULL
      AND public.normalize_domain(from_email) IS NOT NULL
  ),
  grouped AS (
    SELECT
      sender_domain,
      max(sender_name) AS sender_name,
      min(from_email) AS sample_from_email,
      count(*)::int AS newsletter_count,
      max(received_at) AS latest_received_at
    FROM unmatched
    GROUP BY sender_domain
  )
  SELECT
    grouped.sender_domain,
    grouped.sender_name,
    grouped.sample_from_email,
    grouped.newsletter_count,
    grouped.latest_received_at,
    initcap(replace(split_part(grouped.sender_domain, '.', GREATEST(array_length(string_to_array(grouped.sender_domain, '.'), 1) - 1, 1)), '-', ' ')) AS suggested_name,
    'https://' || grouped.sender_domain AS suggested_website
  FROM grouped
  WHERE public.can_manage_competitive_data(auth.uid(), _workspace_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.competitors AS competitor,
      LATERAL unnest(public.collect_competitor_domains(competitor.website, competitor.domains)) AS candidate_domain
      WHERE competitor.workspace_id = _workspace_id
        AND public.domain_matches_competitor(grouped.sender_domain, candidate_domain)
    )
  ORDER BY grouped.newsletter_count DESC, grouped.latest_received_at DESC
  LIMIT 12;
$$;

GRANT EXECUTE ON FUNCTION public.sync_competitor_newsletter_attribution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_workspace_newsletter_attribution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_newsletter_competitor_suggestions(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_workspace_analytics(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _summary jsonb;
  _nl_by_week jsonb;
  _ads_by_week jsonb;
  _weekly_activity jsonb;
  _promo_freq jsonb;
  _cta_dist jsonb;
  _cat_dist jsonb;
  _urg_freq jsonb;
  _camp_types jsonb;
  _comp_activity jsonb;
  _top_domains jsonb;
  _weekday_cadence jsonb;
  _recent_signals jsonb;
  _competitor_pressure jsonb;
BEGIN
  IF NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'totalNewsletters30d', COALESCE((
      SELECT count(*)::int
      FROM public.newsletter_inbox
      WHERE workspace_id = _workspace_id
        AND is_newsletter = true
        AND is_demo = false
        AND received_at >= now() - interval '30 days'
    ), 0),
    'totalAds30d', COALESCE((
      SELECT count(*)::int
      FROM public.meta_ads
      WHERE workspace_id = _workspace_id
        AND COALESCE(ad_delivery_start_time, created_at) >= now() - interval '30 days'
    ), 0),
    'activeCompetitors30d', COALESCE((
      SELECT count(DISTINCT competitor_id)::int
      FROM (
        SELECT competitor_id
        FROM public.newsletter_inbox
        WHERE workspace_id = _workspace_id
          AND is_newsletter = true
          AND is_demo = false
          AND competitor_id IS NOT NULL
          AND received_at >= now() - interval '30 days'
        UNION ALL
        SELECT competitor_id
        FROM public.meta_ads
        WHERE workspace_id = _workspace_id
          AND competitor_id IS NOT NULL
          AND COALESCE(ad_delivery_start_time, created_at) >= now() - interval '30 days'
      ) activity
    ), 0),
    'totalCompetitors', COALESCE((
      SELECT count(*)::int
      FROM public.competitors
      WHERE workspace_id = _workspace_id
        AND is_monitored = true
    ), 0),
    'attributedNewsletters', COALESCE((
      SELECT count(*)::int
      FROM public.newsletter_inbox
      WHERE workspace_id = _workspace_id
        AND is_newsletter = true
        AND is_demo = false
        AND competitor_id IS NOT NULL
    ), 0),
    'unattributedNewsletters', COALESCE((
      SELECT count(*)::int
      FROM public.newsletter_inbox
      WHERE workspace_id = _workspace_id
        AND is_newsletter = true
        AND is_demo = false
        AND competitor_id IS NULL
    ), 0),
    'promotionRate', COALESCE((
      SELECT round(
        (100.0 * count(*) FILTER (
          WHERE discount_percentage IS NOT NULL
             OR free_shipping = true
             OR campaign_type ILIKE '%promo%'
             OR campaign_type ILIKE '%sale%'
        ) / NULLIF(count(*), 0))::numeric,
        1
      )
      FROM public.newsletter_extractions
      WHERE workspace_id = _workspace_id
    ), 0),
    'urgencyRate', COALESCE((
      SELECT round(
        (100.0 * count(*) FILTER (
          WHERE jsonb_array_length(COALESCE(urgency_signals, '[]'::jsonb)) > 0
        ) / NULLIF(count(*), 0))::numeric,
        1
      )
      FROM public.newsletter_extractions
      WHERE workspace_id = _workspace_id
    ), 0),
    'totalInsights30d', COALESCE((
      SELECT count(*)::int
      FROM public.insights
      WHERE workspace_id = _workspace_id
        AND created_at >= now() - interval '30 days'
    ), 0),
    'newsletterGrowthRate', COALESCE((
      WITH periods AS (
        SELECT
          count(*) FILTER (
            WHERE received_at >= now() - interval '30 days'
          )::numeric AS current_period,
          count(*) FILTER (
            WHERE received_at >= now() - interval '60 days'
              AND received_at < now() - interval '30 days'
          )::numeric AS previous_period
        FROM public.newsletter_inbox
        WHERE workspace_id = _workspace_id
          AND is_newsletter = true
          AND is_demo = false
      )
      SELECT round(
        CASE
          WHEN previous_period = 0 AND current_period > 0 THEN 100
          WHEN previous_period = 0 THEN 0
          ELSE ((current_period - previous_period) / previous_period) * 100
        END,
        1
      )
      FROM periods
    ), 0),
    'adGrowthRate', COALESCE((
      WITH periods AS (
        SELECT
          count(*) FILTER (
            WHERE COALESCE(ad_delivery_start_time, created_at) >= now() - interval '30 days'
          )::numeric AS current_period,
          count(*) FILTER (
            WHERE COALESCE(ad_delivery_start_time, created_at) >= now() - interval '60 days'
              AND COALESCE(ad_delivery_start_time, created_at) < now() - interval '30 days'
          )::numeric AS previous_period
        FROM public.meta_ads
        WHERE workspace_id = _workspace_id
      )
      SELECT round(
        CASE
          WHEN previous_period = 0 AND current_period > 0 THEN 100
          WHEN previous_period = 0 THEN 0
          ELSE ((current_period - previous_period) / previous_period) * 100
        END,
        1
      )
      FROM periods
    ), 0),
    'lastInboxActivity', (
      SELECT max(received_at)
      FROM public.newsletter_inbox
      WHERE workspace_id = _workspace_id
        AND is_newsletter = true
        AND is_demo = false
    ),
    'lastAdActivity', (
      SELECT max(COALESCE(ad_delivery_start_time, created_at))
      FROM public.meta_ads
      WHERE workspace_id = _workspace_id
    ),
    'lastGmailSyncAt', (
      SELECT max(last_sync_at)
      FROM public.gmail_connections
      WHERE workspace_id = _workspace_id
    )
  )
  INTO _summary;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.week_sort), '[]'::jsonb)
  INTO _nl_by_week
  FROM (
    SELECT
      date_trunc('week', received_at) AS week_sort,
      to_char(date_trunc('week', received_at), 'Mon DD') AS week,
      count(*)::int AS count
    FROM public.newsletter_inbox
    WHERE workspace_id = _workspace_id
      AND is_newsletter = true
      AND is_demo = false
      AND received_at IS NOT NULL
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 12
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.week_sort), '[]'::jsonb)
  INTO _ads_by_week
  FROM (
    SELECT
      date_trunc('week', COALESCE(ad_delivery_start_time, created_at)) AS week_sort,
      to_char(date_trunc('week', COALESCE(ad_delivery_start_time, created_at)), 'Mon DD') AS week,
      count(*)::int AS count
    FROM public.meta_ads
    WHERE workspace_id = _workspace_id
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 12
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.week_start), '[]'::jsonb)
  INTO _weekly_activity
  FROM (
    WITH weeks AS (
      SELECT generate_series(
        date_trunc('week', now()) - interval '11 weeks',
        date_trunc('week', now()),
        interval '1 week'
      ) AS week_start
    ),
    newsletter_counts AS (
      SELECT date_trunc('week', received_at) AS week_start, count(*)::int AS newsletters
      FROM public.newsletter_inbox
      WHERE workspace_id = _workspace_id
        AND is_newsletter = true
        AND is_demo = false
        AND received_at IS NOT NULL
      GROUP BY 1
    ),
    ad_counts AS (
      SELECT date_trunc('week', COALESCE(ad_delivery_start_time, created_at)) AS week_start, count(*)::int AS ads
      FROM public.meta_ads
      WHERE workspace_id = _workspace_id
      GROUP BY 1
    ),
    insight_counts AS (
      SELECT date_trunc('week', created_at) AS week_start, count(*)::int AS insights
      FROM public.insights
      WHERE workspace_id = _workspace_id
      GROUP BY 1
    )
    SELECT
      weeks.week_start,
      to_char(weeks.week_start, 'Mon DD') AS week,
      COALESCE(newsletter_counts.newsletters, 0) AS newsletters,
      COALESCE(ad_counts.ads, 0) AS ads,
      COALESCE(insight_counts.insights, 0) AS insights
    FROM weeks
    LEFT JOIN newsletter_counts ON newsletter_counts.week_start = weeks.week_start
    LEFT JOIN ad_counts ON ad_counts.week_start = weeks.week_start
    LEFT JOIN insight_counts ON insight_counts.week_start = weeks.week_start
    ORDER BY weeks.week_start
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.total DESC), '[]'::jsonb)
  INTO _comp_activity
  FROM (
    SELECT
      competitor.id AS "competitorId",
      competitor.name AS competitor,
      COALESCE(newsletter_stats.newsletters, 0)::int AS newsletters,
      COALESCE(ad_stats.ads, 0)::int AS ads,
      (COALESCE(newsletter_stats.newsletters, 0) + COALESCE(ad_stats.ads, 0))::int AS total
    FROM public.competitors AS competitor
    LEFT JOIN (
      SELECT competitor_id, count(*)::int AS newsletters
      FROM public.newsletter_inbox
      WHERE workspace_id = _workspace_id
        AND is_newsletter = true
        AND is_demo = false
        AND competitor_id IS NOT NULL
      GROUP BY competitor_id
    ) AS newsletter_stats ON newsletter_stats.competitor_id = competitor.id
    LEFT JOIN (
      SELECT competitor_id, count(*)::int AS ads
      FROM public.meta_ads
      WHERE workspace_id = _workspace_id
        AND competitor_id IS NOT NULL
      GROUP BY competitor_id
    ) AS ad_stats ON ad_stats.competitor_id = competitor.id
    WHERE competitor.workspace_id = _workspace_id
      AND (COALESCE(newsletter_stats.newsletters, 0) > 0 OR COALESCE(ad_stats.ads, 0) > 0)
    ORDER BY total DESC, competitor.name
    LIMIT 12
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point."pressureScore" DESC, point.competitor), '[]'::jsonb)
  INTO _competitor_pressure
  FROM (
    SELECT
      competitor.id AS "competitorId",
      competitor.name AS competitor,
      COALESCE(newsletter_stats.newsletters, 0)::int AS newsletters,
      COALESCE(ad_stats.ads, 0)::int AS ads,
      COALESCE(promo_stats.promos, 0)::int AS promos,
      round(
        (
          COALESCE(newsletter_stats.newsletters, 0) * 1.0 +
          COALESCE(ad_stats.ads, 0) * 1.5 +
          COALESCE(promo_stats.promos, 0) * 0.8
        )::numeric,
        1
      ) AS "pressureScore",
      GREATEST(
        COALESCE(newsletter_stats.last_newsletter_at, 'epoch'::timestamptz),
        COALESCE(ad_stats.last_ad_at, 'epoch'::timestamptz)
      ) AS "latestActivityAt"
    FROM public.competitors AS competitor
    LEFT JOIN (
      SELECT competitor_id, count(*)::int AS newsletters, max(received_at) AS last_newsletter_at
      FROM public.newsletter_inbox
      WHERE workspace_id = _workspace_id
        AND is_newsletter = true
        AND is_demo = false
        AND competitor_id IS NOT NULL
      GROUP BY competitor_id
    ) AS newsletter_stats ON newsletter_stats.competitor_id = competitor.id
    LEFT JOIN (
      SELECT competitor_id, count(*)::int AS ads, max(COALESCE(ad_delivery_start_time, created_at)) AS last_ad_at
      FROM public.meta_ads
      WHERE workspace_id = _workspace_id
        AND competitor_id IS NOT NULL
      GROUP BY competitor_id
    ) AS ad_stats ON ad_stats.competitor_id = competitor.id
    LEFT JOIN (
      SELECT inbox.competitor_id, count(*)::int AS promos
      FROM public.newsletter_extractions AS extraction
      JOIN public.newsletter_inbox AS inbox ON inbox.id = extraction.newsletter_inbox_id
      WHERE extraction.workspace_id = _workspace_id
        AND inbox.competitor_id IS NOT NULL
        AND (
          extraction.discount_percentage IS NOT NULL
          OR extraction.free_shipping = true
          OR extraction.campaign_type ILIKE '%promo%'
          OR extraction.campaign_type ILIKE '%sale%'
        )
      GROUP BY inbox.competitor_id
    ) AS promo_stats ON promo_stats.competitor_id = competitor.id
    WHERE competitor.workspace_id = _workspace_id
      AND (
        COALESCE(newsletter_stats.newsletters, 0) > 0
        OR COALESCE(ad_stats.ads, 0) > 0
        OR COALESCE(promo_stats.promos, 0) > 0
      )
    ORDER BY "pressureScore" DESC, competitor.name
    LIMIT 8
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.count DESC), '[]'::jsonb)
  INTO _top_domains
  FROM (
    SELECT
      public.normalize_domain(from_email) AS domain,
      count(*)::int AS count
    FROM public.newsletter_inbox
    WHERE workspace_id = _workspace_id
      AND is_newsletter = true
      AND is_demo = false
      AND public.normalize_domain(from_email) IS NOT NULL
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 8
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.sort_order), '[]'::jsonb)
  INTO _weekday_cadence
  FROM (
    SELECT
      extract(dow FROM received_at)::int AS sort_order,
      trim(to_char(received_at, 'Dy')) AS day,
      count(*)::int AS count
    FROM public.newsletter_inbox
    WHERE workspace_id = _workspace_id
      AND is_newsletter = true
      AND is_demo = false
      AND received_at >= now() - interval '90 days'
    GROUP BY 1, 2
    ORDER BY 1
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.count DESC), '[]'::jsonb)
  INTO _cta_dist
  FROM (
    SELECT COALESCE(cta_type, 'None') AS cta, count(*)::int AS count
    FROM public.meta_ads
    WHERE workspace_id = _workspace_id
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.count DESC), '[]'::jsonb)
  INTO _cat_dist
  FROM (
    SELECT category, count(*)::int AS count
    FROM (
      SELECT unnest(product_categories) AS category
      FROM public.newsletter_extractions
      WHERE workspace_id = _workspace_id
    ) categories
    GROUP BY category
    ORDER BY count DESC
    LIMIT 10
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.count DESC), '[]'::jsonb)
  INTO _camp_types
  FROM (
    SELECT COALESCE(campaign_type, 'Unknown') AS type, count(*)::int AS count
    FROM public.newsletter_extractions
    WHERE workspace_id = _workspace_id
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.count DESC), '[]'::jsonb)
  INTO _promo_freq
  FROM (
    SELECT
      COALESCE(competitor.name, 'Unattributed') AS competitor,
      count(*) FILTER (
        WHERE extraction.discount_percentage IS NOT NULL
          OR extraction.free_shipping = true
          OR extraction.campaign_type ILIKE '%promo%'
          OR extraction.campaign_type ILIKE '%sale%'
      )::int AS promos,
      count(*)::int AS total
    FROM public.newsletter_extractions AS extraction
    JOIN public.newsletter_inbox AS inbox ON inbox.id = extraction.newsletter_inbox_id
    LEFT JOIN public.competitors AS competitor ON competitor.id = inbox.competitor_id
    WHERE extraction.workspace_id = _workspace_id
    GROUP BY competitor.name
    ORDER BY total DESC
    LIMIT 12
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point.count DESC), '[]'::jsonb)
  INTO _urg_freq
  FROM (
    SELECT
      CASE
        WHEN jsonb_typeof(signal) = 'string' THEN trim(both '"' FROM signal::text)
        ELSE COALESCE(signal->>'type', 'unknown')
      END AS type,
      count(*)::int AS count
    FROM public.newsletter_extractions AS extraction,
    LATERAL jsonb_array_elements(COALESCE(extraction.urgency_signals, '[]'::jsonb)) AS signal
    WHERE extraction.workspace_id = _workspace_id
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  ) point;

  SELECT COALESCE(jsonb_agg(to_jsonb(point) ORDER BY point."happenedAt" DESC), '[]'::jsonb)
  INTO _recent_signals
  FROM (
    SELECT *
    FROM (
      SELECT
        inbox.received_at AS "happenedAt",
        COALESCE(competitor.name, 'Unassigned') AS competitor,
        'newsletter'::text AS "sourceType",
        COALESCE(extraction.campaign_type, inbox.subject, 'Newsletter signal') AS title,
        left(COALESCE(extraction.main_message, inbox.subject, 'Newsletter imported'), 180) AS summary
      FROM public.newsletter_extractions AS extraction
      JOIN public.newsletter_inbox AS inbox ON inbox.id = extraction.newsletter_inbox_id
      LEFT JOIN public.competitors AS competitor ON competitor.id = inbox.competitor_id
      WHERE extraction.workspace_id = _workspace_id
        AND inbox.received_at IS NOT NULL

      UNION ALL

      SELECT
        COALESCE(meta_ad.ad_delivery_start_time, meta_ad.created_at) AS "happenedAt",
        COALESCE(competitor.name, meta_ad.page_name, 'Unassigned') AS competitor,
        'meta_ad'::text AS "sourceType",
        COALESCE(meta_ad.cta_type, 'Meta ad signal') AS title,
        left(
          COALESCE(meta_ad.ad_creative_link_titles[1], meta_ad.ad_creative_bodies[1], 'Meta ad imported'),
          180
        ) AS summary
      FROM public.meta_ads AS meta_ad
      LEFT JOIN public.competitors AS competitor ON competitor.id = meta_ad.competitor_id
      WHERE meta_ad.workspace_id = _workspace_id

      UNION ALL

      SELECT
        insight.created_at AS "happenedAt",
        COALESCE(insight.affected_competitors[1], 'Multiple competitors') AS competitor,
        'insight'::text AS "sourceType",
        insight.title,
        left(COALESCE(insight.what_is_happening, insight.why_it_matters, insight.recommended_response), 180) AS summary
      FROM public.insights AS insight
      WHERE insight.workspace_id = _workspace_id
    ) feed
    ORDER BY "happenedAt" DESC
    LIMIT 8
  ) point;

  _result := jsonb_build_object(
    'summary', _summary,
    'newslettersByWeek', _nl_by_week,
    'adsByWeek', _ads_by_week,
    'weeklyActivity', _weekly_activity,
    'promotionFrequency', _promo_freq,
    'ctaDistribution', _cta_dist,
    'categoryDistribution', _cat_dist,
    'urgencyFrequency', _urg_freq,
    'campaignTypes', _camp_types,
    'competitorActivity', _comp_activity,
    'competitorPressure', _competitor_pressure,
    'topSenderDomains', _top_domains,
    'weekdayCadence', _weekday_cadence,
    'recentSignals', _recent_signals
  );

  RETURN _result;
END;
$$;
