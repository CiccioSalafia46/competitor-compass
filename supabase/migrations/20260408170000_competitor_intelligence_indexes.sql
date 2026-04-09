-- Competitor Intelligence: persistent profile cache + performance indexes
--
-- 1. competitor_profiles — persists computed strategic narrative per competitor
--    so positioning_strategy and recurring_patterns survive across page reloads
--    without re-running the full analysis on every visit.
--
-- 2. Performance indexes — accelerate the time-range queries that power
--    competitor intelligence snapshots.

-- ─── 1. competitor_profiles table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitor_profiles (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id        uuid        NOT NULL REFERENCES public.workspaces(id)  ON DELETE CASCADE,
  competitor_id       uuid        NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,

  -- Derived strategic narrative (computed by the analysis engine)
  positioning_strategy text,
  recurring_patterns   text[]     DEFAULT '{}',

  -- Bookkeeping
  signal_window_days   int        DEFAULT 180 NOT NULL,
  signal_count         int        DEFAULT 0   NOT NULL,
  computed_at          timestamptz DEFAULT now() NOT NULL,
  created_at           timestamptz DEFAULT now() NOT NULL,
  updated_at           timestamptz DEFAULT now() NOT NULL,

  UNIQUE (workspace_id, competitor_id)
);

-- ─── 2. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.competitor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_read_competitor_profiles"
  ON public.competitor_profiles
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Only admins/owners can write (profiles are upserted by the backend)
CREATE POLICY "admins_can_upsert_competitor_profiles"
  ON public.competitor_profiles
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ─── 3. updated_at trigger ───────────────────────────────────────────────────

-- Reuse set_updated_at() if it already exists (defined elsewhere); otherwise create it.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER competitor_profiles_updated_at
  BEFORE UPDATE ON public.competitor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. Performance indexes ───────────────────────────────────────────────────
-- These accelerate the two hottest queries in the competitor-intelligence
-- edge function: inbox events and Meta Ads filtered by competitor + time.

-- newsletter_inbox: filter by competitor_id in a time window (deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_newsletter_inbox_competitor_received
  ON public.newsletter_inbox (competitor_id, received_at DESC)
  WHERE competitor_id IS NOT NULL
    AND deleted_at IS NULL;

-- meta_ads: filter by competitor_id ordered by last activity
CREATE INDEX IF NOT EXISTS idx_meta_ads_competitor_last_seen
  ON public.meta_ads (competitor_id, last_seen_at DESC)
  WHERE competitor_id IS NOT NULL;

-- ─── 5. GRANT to service role for background upsert ──────────────────────────

GRANT INSERT, UPDATE ON public.competitor_profiles TO service_role;
