-- ============================================================
-- Enforce soft-delete in RLS SELECT policies + fix RLS gaps.
--
-- Problems fixed:
--
-- 1. Soft-delete not enforced in SELECT policies.
--    Migration 20260408140000 added deleted_at to:
--      newsletter_inbox, insights, alert_rules, competitors
--    But the SELECT RLS policies were never updated to filter
--    deleted_at IS NULL.  Result: soft-deleted records are
--    returned to authenticated clients via the SDK, and show up
--    in dashboard counts / lists.
--
-- 2. profiles SELECT policy uses USING (true) — any authenticated
--    user can read every user's profile across all workspaces.
--    Scoped to own record + shared workspace members.
--
-- 3. stripe_webhook_events has RLS enabled but no SELECT policy.
--    Workspace admins cannot inspect their own billing events
--    through the authenticated SDK client.
--
-- All DROP ... IF EXISTS guards make this safely re-runnable.
-- ============================================================

-- ─── 1. competitors — exclude soft-deleted rows from SELECT ──────────────────

DROP POLICY IF EXISTS "Members can view competitors" ON public.competitors;
CREATE POLICY "Members can view competitors"
  ON public.competitors FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND deleted_at IS NULL
  );

-- ─── 2. newsletter_inbox — exclude soft-deleted rows from SELECT ─────────────

DROP POLICY IF EXISTS "Members can view inbox" ON public.newsletter_inbox;
CREATE POLICY "Members can view inbox"
  ON public.newsletter_inbox FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND deleted_at IS NULL
  );

-- ─── 3. insights — exclude soft-deleted rows from SELECT ─────────────────────

DROP POLICY IF EXISTS "Members can view insights" ON public.insights;
CREATE POLICY "Members can view insights"
  ON public.insights FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND deleted_at IS NULL
  );

-- ─── 4. alert_rules — exclude soft-deleted rows from SELECT ──────────────────
-- The policy was replaced in 20260406193000; drop whichever name is current.

DROP POLICY IF EXISTS "Members can view alert rules" ON public.alert_rules;
CREATE POLICY "Members can view alert rules"
  ON public.alert_rules FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(auth.uid(), workspace_id)
    AND deleted_at IS NULL
  );

-- ─── 5. profiles — scope SELECT to own record + shared workspace members ─────
-- Previous policy: USING (true) — exposed every user's display_name/avatar
-- to every authenticated user, regardless of workspace membership.

DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by workspace members"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    -- Own profile always visible
    auth.uid() = user_id
    OR
    -- Profiles of users who share at least one workspace with the viewer
    EXISTS (
      SELECT 1
      FROM public.workspace_members AS viewer_m
      JOIN public.workspace_members AS target_m
        ON target_m.workspace_id = viewer_m.workspace_id
      WHERE viewer_m.user_id = auth.uid()
        AND target_m.user_id = profiles.user_id
    )
  );

-- ─── 6. stripe_webhook_events — add SELECT policy for workspace admins ────────
-- Allows workspace owners/admins to inspect their own billing audit trail
-- via the authenticated SDK client (e.g. admin panel billing page).

DROP POLICY IF EXISTS "Admins can view own workspace webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Admins can view own workspace webhook events"
  ON public.stripe_webhook_events FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.is_workspace_admin_member(auth.uid(), workspace_id)
  );
