import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = "admin" | "analyst" | "viewer";

export interface UserRole {
  id: string;
  user_id: string;
  workspace_id: string;
  role: AppRole;
  created_at: string;
}

// ─── Query keys ────────────────────────────────────────────────────────────────
// Exported so mutations in useWorkspaceRoles can invalidate useRoles caches.
export const rolesQueryKey = (userId: string | null, workspaceId: string | null) =>
  ["roles", userId, workspaceId] as const;

export const workspaceRolesQueryKey = (workspaceId: string | null) =>
  ["workspace-roles", workspaceId] as const;

// ─── Query functions (module-level, stable references) ─────────────────────────

interface RolesQueryData {
  userRoles: UserRole[];
  membershipRole: string | null;
}

async function fetchRolesForUser(userId: string, workspaceId: string): Promise<RolesQueryData> {
  const [{ data: userRoles, error: rolesError }, { data: membership, error: memberError }] =
    await Promise.all([
      supabase
        .from("user_roles")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId),
      supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (rolesError) {
    console.error("Failed to fetch user roles:", rolesError);
  }
  if (memberError) {
    console.error("Failed to fetch workspace membership:", memberError);
  }

  return {
    userRoles: (userRoles as UserRole[]) ?? [],
    membershipRole: (membership as { role?: string } | null)?.role ?? null,
  };
}

async function fetchAllWorkspaceRoles(workspaceId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("Failed to fetch workspace roles:", error);
    throw error;
  }

  return (data as UserRole[]) ?? [];
}

// ─── useRoles ─────────────────────────────────────────────────────────────────
// Returns RBAC booleans and capability flags for the current user in the
// current workspace. React Query deduplicates concurrent calls from sibling
// components (AppSidebar, RouteGuard, page components) into a single fetch.

export function useRoles() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const userId = user?.id ?? null;
  const workspaceId = currentWorkspace?.id ?? null;
  const workspaceOwnerId = currentWorkspace?.owner_id ?? null;

  const { data, isLoading, refetch } = useQuery({
    queryKey: rolesQueryKey(userId, workspaceId),
    queryFn: () => fetchRolesForUser(userId!, workspaceId!),
    enabled: !!userId && !!workspaceId,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  const userRoles = data?.userRoles ?? [];
  const membershipRole = data?.membershipRole ?? null;

  const myRoles = userRoles.map((r) => r.role);
  const isWorkspaceOwner = workspaceOwnerId === userId;
  const isWorkspaceAdmin =
    isWorkspaceOwner || membershipRole === "owner" || membershipRole === "admin";
  const isViewerByMembership =
    membershipRole === "owner" || membershipRole === "admin" || membershipRole === "member";
  const isAdmin = myRoles.includes("admin") || isWorkspaceAdmin;
  const isAnalyst = myRoles.includes("analyst") || isAdmin;
  const isViewer = myRoles.includes("viewer") || isAnalyst || isViewerByMembership;

  const hasRole = (role: AppRole): boolean => {
    if (role === "viewer") return isViewer;
    if (role === "analyst") return isAnalyst;
    if (role === "admin") return isAdmin;
    return false;
  };

  return {
    roles: myRoles,
    loading: isLoading,
    isAdmin,
    isAnalyst,
    isViewer,
    hasRole,
    canManageWorkspace: isAdmin,
    canManageBilling: isAdmin,
    canManageMembers: isAdmin,
    canManageCompetitors: isAnalyst,
    canAnalyze: isAnalyst,
    canCreateReports: isAnalyst,
    canViewData: isViewer,
    refetch,
  };
}

// ─── useWorkspaceRoles ────────────────────────────────────────────────────────
// Returns all user_roles rows for the current workspace — used by TeamManagement.
// Mutations (assignRole, removeRole) invalidate both this query and the current
// user's useRoles cache so UI updates immediately after role changes.

export function useWorkspaceRoles() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? null;
  const queryClient = useQueryClient();

  const { data: memberRoles = [], isLoading, refetch } = useQuery({
    queryKey: workspaceRolesQueryKey(workspaceId),
    queryFn: () => fetchAllWorkspaceRoles(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  // Invalidate both lists so the current user's own role cache stays fresh too.
  const invalidateAfterMutation = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: workspaceRolesQueryKey(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: ["roles"] }),
    ]);

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      const payload: Database["public"]["Tables"]["user_roles"]["Insert"] = {
        user_id: userId,
        workspace_id: workspaceId,
        role,
      };
      const { error } = await supabase
        .from("user_roles")
        .upsert(payload, { onConflict: "user_id,workspace_id,role" });
      if (error) throw error;
    },
    onSuccess: () => { void invalidateAfterMutation(); },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => { void invalidateAfterMutation(); },
  });

  // Expose as async functions matching the previous API shape so call sites
  // (TeamManagement) can still await them and catch thrown errors.
  const assignRole = (userId: string, role: AppRole) =>
    assignRoleMutation.mutateAsync({ userId, role });

  const removeRole = (roleId: string) =>
    removeRoleMutation.mutateAsync(roleId);

  return {
    memberRoles,
    loading: isLoading,
    assignRole,
    removeRole,
    refetch,
  };
}
