
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _workspace_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = _role
  )
$$;

-- Helper: check if user has any of the given roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _workspace_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = ANY(_roles)
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Members can view roles in their workspace"
  ON public.user_roles FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), workspace_id, 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), workspace_id, 'admin'));

-- 5. Trigger: auto-assign admin role when workspace is created
CREATE OR REPLACE FUNCTION public.handle_new_workspace_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, workspace_id, role)
  VALUES (NEW.owner_id, NEW.id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created_assign_admin
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace_role();

-- 6. Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Authenticated users can insert audit entries"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

-- 7. Usage events table for metering
CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view usage"
  ON public.usage_events FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert usage events"
  ON public.usage_events FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Index for fast monthly queries
CREATE INDEX idx_usage_events_workspace_month ON public.usage_events (workspace_id, created_at);
CREATE INDEX idx_audit_log_workspace ON public.audit_log (workspace_id, created_at);
