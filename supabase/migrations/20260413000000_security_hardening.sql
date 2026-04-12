-- ============================================================
-- Security hardening — April 2026
--
-- 1. find_user_id_by_email — targeted auth lookup for invite-member.
--    Replaces the full auth.admin.listUsers() call with a single
--    row lookup, avoiding loading the entire user table into memory
--    on every workspace invitation.
--
-- 2. user_roles DELETE policy — closes the gap where admins could
--    INSERT roles (migration 20260405170000) but had no DELETE path
--    through the authenticated SDK client.
-- ============================================================

-- ─── 1. find_user_id_by_email ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id
  FROM auth.users
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
  LIMIT 1;
$$;

-- Remove broad access; only service_role (used by edge functions) may call it.
-- Authenticated users cannot enumerate emails via this function.
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO service_role;

-- ─── 2. user_roles DELETE policy ─────────────────────────────────────────────
-- Mirror of the INSERT policy in 20260405170000: workspace admins can remove
-- roles from users who are still workspace members.

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), workspace_id, 'admin')
    AND public.is_workspace_member(user_id, workspace_id)
  );
