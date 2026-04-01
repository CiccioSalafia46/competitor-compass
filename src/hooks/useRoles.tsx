import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

export type AppRole = "admin" | "analyst" | "viewer";

interface UserRole {
  id: string;
  user_id: string;
  workspace_id: string;
  role: AppRole;
  created_at: string;
}

export function useRoles() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!user || !currentWorkspace) {
      setRoles([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .eq("user_id", user.id);
    setRoles((data as UserRole[]) || []);
    setLoading(false);
  }, [user, currentWorkspace]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const myRoles = roles.map((r) => r.role);
  const isAdmin = myRoles.includes("admin");
  const isAnalyst = myRoles.includes("analyst") || isAdmin;
  const isViewer = myRoles.includes("viewer") || isAnalyst;

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
  const [memberRoles, setMemberRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!currentWorkspace) {
      setMemberRoles([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("*")
      .eq("workspace_id", currentWorkspace.id);
    setMemberRoles((data as UserRole[]) || []);
    setLoading(false);
  }, [currentWorkspace]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const assignRole = async (userId: string, role: AppRole) => {
    if (!currentWorkspace) return;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, workspace_id: currentWorkspace.id, role } as any);
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
