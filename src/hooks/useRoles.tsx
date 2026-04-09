import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = "admin" | "analyst" | "viewer";

interface UserRole {
  id: string;
  user_id: string;
  workspace_id: string;
  role: AppRole;
  created_at: string;
}

interface WorkspaceMembership {
  role: string;
}

export function useRoles() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const userId = user?.id ?? null;
  const workspaceId = currentWorkspace?.id ?? null;
  const workspaceOwnerId = currentWorkspace?.owner_id ?? null;
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [membershipRole, setMembershipRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!userId || !workspaceId) {
      setRoles([]);
      setMembershipRole(null);
      setLoading(false);
      return;
    }

    try {
      const [{ data: userRoles, error: rolesError }, { data: membership, error: memberError }] = await Promise.all([
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

      setRoles((userRoles as UserRole[]) || []);
      setMembershipRole((membership as WorkspaceMembership | null)?.role ?? null);
    } catch (error) {
      console.error("Role fetch error:", error);
      setRoles([]);
      setMembershipRole(null);
    } finally {
      setLoading(false);
    }
  }, [userId, workspaceId]);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  const myRoles = roles.map((r) => r.role);
  const isWorkspaceOwner = workspaceOwnerId === userId;
  const isWorkspaceAdmin = isWorkspaceOwner || membershipRole === "owner" || membershipRole === "admin";
  const isViewerByMembership = membershipRole === "owner" || membershipRole === "admin" || membershipRole === "member";
  const isAdmin = myRoles.includes("admin") || isWorkspaceAdmin;
  const isAnalyst = myRoles.includes("analyst") || isAdmin;
  const isViewer = myRoles.includes("viewer") || isAnalyst || isViewerByMembership;

  const hasRole = (role: AppRole) => {
    if (role === "viewer") return isViewer;
    if (role === "analyst") return isAnalyst;
    if (role === "admin") return isAdmin;
    return false;
  };

  // Can perform action based on minimum role
  const canManageWorkspace = isAdmin;
  const canManageBilling = isAdmin;
  const canManageMembers = isAdmin;
  const canManageCompetitors = isAnalyst;
  const canAnalyze = isAnalyst;
  const canCreateReports = isAnalyst;
  const canViewData = isViewer;

  return {
    roles: myRoles,
    loading,
    isAdmin,
    isAnalyst,
    isViewer,
    hasRole,
    canManageWorkspace,
    canManageBilling,
    canManageMembers,
    canManageCompetitors,
    canAnalyze,
    canCreateReports,
    canViewData,
    refetch: fetchRoles,
  };
}

// Hook to get all workspace member roles (for team management)
export function useWorkspaceRoles() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? null;
  const [memberRoles, setMemberRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!workspaceId) {
      setMemberRoles([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("*")
      .eq("workspace_id", workspaceId);
    setMemberRoles((data as UserRole[]) || []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const assignRole = async (userId: string, role: AppRole) => {
    if (!workspaceId) return;
    const payload: Database["public"]["Tables"]["user_roles"]["Insert"] = {
      user_id: userId,
      workspace_id: workspaceId,
      role,
    };
    const { error } = await supabase
      .from("user_roles")
      .upsert(payload, { onConflict: "user_id,workspace_id,role" });
    if (error) throw error;
    await fetchAll();
  };

  const removeRole = async (roleId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", roleId);
    if (error) throw error;
    await fetchAll();
  };

  return { memberRoles, loading, assignRole, removeRole, refetch: fetchAll };
}
