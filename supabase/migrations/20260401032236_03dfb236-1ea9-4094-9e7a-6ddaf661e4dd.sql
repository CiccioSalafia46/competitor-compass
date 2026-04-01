
-- Fix the self-referencing bug in workspace_members INSERT policy
DROP POLICY IF EXISTS "Owners/admins can manage members" ON public.workspace_members;
CREATE POLICY "Owners/admins can manage members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
    OR auth.uid() = user_id
  );

-- Fix the same bug in DELETE policy
DROP POLICY IF EXISTS "Owners/admins can remove members" ON public.workspace_members;
CREATE POLICY "Owners/admins can remove members" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );
