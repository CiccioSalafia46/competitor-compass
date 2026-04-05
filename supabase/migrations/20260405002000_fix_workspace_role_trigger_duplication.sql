DROP TRIGGER IF EXISTS on_workspace_created_role ON public.workspaces;

CREATE OR REPLACE FUNCTION public.handle_new_workspace_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, workspace_id, role)
  VALUES (NEW.owner_id, NEW.id, 'admin')
  ON CONFLICT (user_id, workspace_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
