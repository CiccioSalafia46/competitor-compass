
-- 1. Set default owner_id to the authenticated user
ALTER TABLE public.workspaces ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- 2. Fix SELECT policy: owner OR member can view
DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;
CREATE POLICY "Members can view their workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR is_workspace_member(auth.uid(), id)
);

-- 3. Harden the membership trigger with ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;
