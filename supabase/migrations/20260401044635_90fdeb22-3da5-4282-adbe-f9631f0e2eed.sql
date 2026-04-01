
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

  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (_name, _slug, _user_id)
  RETURNING * INTO _workspace;

  RETURN _workspace;
END;
$$;
