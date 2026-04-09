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
