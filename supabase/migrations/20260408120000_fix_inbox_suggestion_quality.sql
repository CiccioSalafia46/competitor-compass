-- Fix inbox suggestion quality:
-- 1. Filter out known ESP/newsletter platform domains from competitor suggestions
-- 2. Use root domain for suggested_website (not the sending subdomain)
-- 3. Use most-recent sender_name instead of alphabetically-max

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
      -- Most-recent non-null sender_name for this domain (was: max() = alphabetically last)
      (array_agg(sender_name ORDER BY received_at DESC) FILTER (WHERE sender_name IS NOT NULL))[1] AS sender_name,
      min(from_email) AS sample_from_email,
      count(*)::int AS newsletter_count,
      max(received_at) AS latest_received_at
    FROM unmatched
    GROUP BY sender_domain
  ),
  -- Root domain = last two parts of sender_domain (strips ESP subdomains like mail., em., sg.)
  with_root AS (
    SELECT
      grouped.*,
      array_to_string(
        (string_to_array(grouped.sender_domain, '.'))[
          GREATEST(array_length(string_to_array(grouped.sender_domain, '.'), 1) - 1, 1):
        ],
        '.'
      ) AS root_domain
    FROM grouped
  )
  SELECT
    with_root.sender_domain,
    with_root.sender_name,
    with_root.sample_from_email,
    with_root.newsletter_count,
    with_root.latest_received_at,
    initcap(replace(split_part(with_root.sender_domain, '.', GREATEST(array_length(string_to_array(with_root.sender_domain, '.'), 1) - 1, 1)), '-', ' ')) AS suggested_name,
    -- Use root domain for website URL, not the sending subdomain
    'https://' || with_root.root_domain AS suggested_website
  FROM with_root
  WHERE public.can_manage_competitive_data(auth.uid(), _workspace_id)
    -- Exclude ESP / transactional email platform domains
    AND with_root.root_domain NOT IN (
      'mailchimp.com', 'list-manage.com', 'constantcontact.com',
      'sendinblue.com', 'brevo.com', 'sendgrid.net', 'convertkit.com',
      'substack.com', 'beehiiv.com', 'hubspot.com', 'mailerlite.com',
      'campaignmonitor.com', 'aweber.com', 'drip.com', 'activecampaign.com',
      'klaviyo.com', 'getresponse.com', 'moosend.com', 'omnisend.com',
      'flodesk.com', 'buttondown.email', 'ghost.io', 'revue.email',
      'tinyletter.com', 'benchmark.email', 'emailoctopus.com',
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
      'icloud.com', 'protonmail.com', 'live.com'
    )
    -- Exclude if already covered by an existing competitor
    AND NOT EXISTS (
      SELECT 1
      FROM public.competitors AS competitor,
      LATERAL unnest(public.collect_competitor_domains(competitor.website, competitor.domains)) AS candidate_domain
      WHERE competitor.workspace_id = _workspace_id
        AND public.domain_matches_competitor(with_root.sender_domain, candidate_domain)
    )
  ORDER BY with_root.newsletter_count DESC, with_root.latest_received_at DESC
  LIMIT 12;
$$;
