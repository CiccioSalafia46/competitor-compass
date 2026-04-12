-- ============================================================
-- Workspace invitation system.
--
-- Supports two flows:
--   a) Invitee already has an account → added to workspace
--      directly by the edge function (no table entry needed).
--   b) Invitee is new → pending invite stored here; a trigger
--      on auth.users processes it automatically on sign-up.
--
-- The edge function invite-member handles the routing logic.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_role  text NOT NULL DEFAULT 'viewer'
                  CHECK (invited_role IN ('admin', 'analyst', 'viewer')),
  invited_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token         text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at   timestamptz,
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, invited_email)
);

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Only workspace admins can see and manage invitations for their workspace.
CREATE POLICY "Admins can manage invitations"
  ON public.workspace_invitations FOR ALL TO authenticated
  USING (public.is_workspace_admin_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin_member(auth.uid(), workspace_id));

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email
  ON public.workspace_invitations (invited_email)
  WHERE accepted_at IS NULL AND expires_at > now();

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace
  ON public.workspace_invitations (workspace_id, created_at DESC);

-- ─── Trigger: process pending invites when a new user signs up ───────────���───
-- After a new auth.users row is created, look for any pending (non-expired,
-- non-accepted) invitations matching the new user's email and add them to
-- the workspace automatically.

CREATE OR REPLACE FUNCTION public.process_pending_invitations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  membership_role text;
BEGIN
  FOR inv IN
    SELECT *
    FROM public.workspace_invitations
    WHERE invited_email = lower(NEW.email)
      AND accepted_at IS NULL
      AND expires_at > now()
  LOOP
    -- Map app role to membership role
    membership_role := CASE
      WHEN inv.invited_role = 'admin' THEN 'admin'
      ELSE 'member'
    END;

    -- Add to workspace_members (ignore if already a member)
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (inv.workspace_id, NEW.id, membership_role)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    -- Assign app role
    INSERT INTO public.user_roles (workspace_id, user_id, role)
    VALUES (inv.workspace_id, NEW.id, inv.invited_role::public.app_role)
    ON CONFLICT DO NOTHING;

    -- Mark invitation as accepted
    UPDATE public.workspace_invitations
    SET accepted_at = now()
    WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Drop and recreate to avoid duplicate trigger errors on re-runs.
DROP TRIGGER IF EXISTS on_user_invite_accepted ON auth.users;
CREATE TRIGGER on_user_invite_accepted
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.process_pending_invitations();
