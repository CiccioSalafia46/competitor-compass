ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS queued_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts >= 1 AND max_attempts <= 10),
  ADD COLUMN IF NOT EXISTS source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_errors jsonb;

UPDATE public.analyses AS analysis
SET
  requested_by = entry.created_by,
  queued_at = COALESCE(analysis.queued_at, analysis.created_at),
  attempt_count = CASE
    WHEN analysis.status IN ('processing', 'completed', 'failed') AND analysis.attempt_count = 0 THEN 1
    ELSE analysis.attempt_count
  END,
  source_snapshot = CASE
    WHEN analysis.source_snapshot = '{}'::jsonb OR analysis.source_snapshot IS NULL THEN jsonb_build_object(
      'subject', entry.subject,
      'content', entry.content,
      'sender_email', entry.sender_email,
      'received_at', entry.received_at,
      'source', entry.source,
      'competitor_id', entry.competitor_id
    )
    ELSE analysis.source_snapshot
  END
FROM public.newsletter_entries AS entry
WHERE analysis.newsletter_entry_id = entry.id
  AND (
    analysis.requested_by IS NULL
    OR analysis.source_snapshot = '{}'::jsonb
    OR analysis.source_snapshot IS NULL
    OR analysis.queued_at IS NULL
    OR analysis.attempt_count = 0
  );

CREATE INDEX IF NOT EXISTS idx_analyses_status_queued_at
  ON public.analyses (status, queued_at DESC);

CREATE INDEX IF NOT EXISTS idx_analyses_workspace_status
  ON public.analyses (workspace_id, status, created_at DESC);
