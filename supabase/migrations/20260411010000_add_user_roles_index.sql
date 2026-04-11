-- Performance: add index to user_roles for the auth hot path.
--
-- has_role() and has_any_role() are SECURITY DEFINER functions called on every
-- RLS policy check that evaluates role-based access (analysts, admins, etc.).
-- Both query user_roles by (user_id, workspace_id), which hits the UNIQUE
-- constraint index but that index is on (user_id, workspace_id, role) — three
-- columns. A two-column covering index on (workspace_id, user_id) is faster
-- for the most common lookup pattern: "does this user have any role in this workspace?"

CREATE INDEX IF NOT EXISTS idx_user_roles_workspace_user
  ON public.user_roles (workspace_id, user_id);
