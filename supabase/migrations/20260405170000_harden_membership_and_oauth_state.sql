DROP POLICY IF EXISTS "Owners/admins can manage members" ON public.workspace_members;

CREATE POLICY "Workspace admins can manage members"
  ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
    AND workspace_members.role IN ('admin', 'member', 'viewer')
  );

DROP POLICY IF EXISTS "Owners/admins can remove members" ON public.workspace_members;

CREATE POLICY "Workspace admins can remove non-owner members"
  ON public.workspace_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
    AND workspace_members.role <> 'owner'
  );

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), workspace_id, 'admin')
    AND public.is_workspace_member(user_id, workspace_id)
  );
