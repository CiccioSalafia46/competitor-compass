
CREATE OR REPLACE FUNCTION public.create_workspace(_name text, _slug text)
RETURNS public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _workspace workspaces%ROWTYPE;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Create workspace
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (_name, _slug, _user_id)
  RETURNING * INTO _workspace;

  -- 2. Add creator as workspace member (idempotent)
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_workspace.id, _user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- 3. Add creator admin role (idempotent)
  INSERT INTO public.user_roles (user_id, workspace_id, role)
  VALUES (_user_id, _workspace.id, 'admin')
  ON CONFLICT (user_id, workspace_id, role) DO NOTHING;

  RETURN _workspace;
END;
$$;
