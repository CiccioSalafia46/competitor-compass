-- ============================================================
-- Internationalization support
--
-- 1. Add preferred_language to profiles (user-level preference)
-- 2. Add language column to analyses (tracks generation language)
-- 3. Add language column to newsletter_extractions (same)
--
-- Supported values: en (default), it, de, fr, es
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) NOT NULL DEFAULT 'en'
  CONSTRAINT profiles_preferred_language_check
    CHECK (preferred_language IN ('en', 'it', 'de', 'fr', 'es'));

-- Track which language AI-generated analysis content was produced in.
-- Defaults to 'en' for all existing rows (pre-i18n data was generated in English).
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en'
  CONSTRAINT analyses_language_check
    CHECK (language IN ('en', 'it', 'de', 'fr', 'es'));

ALTER TABLE public.newsletter_extractions
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en'
  CONSTRAINT newsletter_extractions_language_check
    CHECK (language IN ('en', 'it', 'de', 'fr', 'es'));

-- Insights are also AI-generated; track their generation language.
ALTER TABLE public.insights
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en'
  CONSTRAINT insights_language_check
    CHECK (language IN ('en', 'it', 'de', 'fr', 'es'));

-- Index for filtering content by language (future multi-language analytics queries).
CREATE INDEX IF NOT EXISTS idx_insights_language
  ON public.insights (workspace_id, language);

CREATE INDEX IF NOT EXISTS idx_analyses_language
  ON public.analyses (workspace_id, language);

COMMENT ON COLUMN public.profiles.preferred_language IS 'User-selected UI and AI-generation language. Synced from the frontend on language change.';
COMMENT ON COLUMN public.analyses.language IS 'Language used when this analysis was AI-generated. Allows filtering by language and future re-generation requests.';
COMMENT ON COLUMN public.newsletter_extractions.language IS 'Language used when this extraction was AI-generated.';
COMMENT ON COLUMN public.insights.language IS 'Language used when this insight was AI-generated.';
