
-- Rate limiting table for per-user, per-endpoint tracking
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  workspace_id uuid NOT NULL,
  called_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (user_id, endpoint, called_at DESC);

-- Enable RLS - only service role should access
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No client access - service role only
CREATE POLICY "Deny all client access to rate_limits"
  ON public.rate_limits FOR ALL
  TO authenticated
  USING (false);

-- Helper function to check + record rate limit (service role only)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id uuid,
  _workspace_id uuid,
  _endpoint text,
  _max_per_hour int DEFAULT 20
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count int;
BEGIN
  -- Clean up old entries (older than 2 hours)
  DELETE FROM rate_limits WHERE called_at < now() - interval '2 hours';
  
  -- Count calls in the last hour
  SELECT count(*) INTO _count
  FROM rate_limits
  WHERE user_id = _user_id
    AND endpoint = _endpoint
    AND called_at > now() - interval '1 hour';
  
  IF _count >= _max_per_hour THEN
    RETURN false; -- Rate limited
  END IF;
  
  -- Record this call
  INSERT INTO rate_limits (user_id, endpoint, workspace_id, called_at)
  VALUES (_user_id, _endpoint, _workspace_id, now());
  
  RETURN true; -- Allowed
END;
$$;

-- Dedup function: check if AI processing already exists for a given item
CREATE OR REPLACE FUNCTION public.check_extraction_exists(
  _newsletter_inbox_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM newsletter_extractions
    WHERE newsletter_inbox_id = _newsletter_inbox_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_ad_analysis_exists(
  _meta_ad_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM meta_ad_analyses
    WHERE meta_ad_id = _meta_ad_id
  );
$$;
