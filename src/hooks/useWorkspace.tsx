import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  loading: boolean;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
      initializedRef.current = false;
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching workspaces:", error);
      setLoading(false);
      return;
    }

    const fetchedWorkspaces = data || [];
    setWorkspaces(fetchedWorkspaces);

    // Only auto-select on first load, not on refetches
    if (!initializedRef.current && fetchedWorkspaces.length > 0) {
      const saved = localStorage.getItem("current_workspace_id");
      const found = saved ? fetchedWorkspaces.find((w) => w.id === saved) : null;
      setCurrentWorkspace(found || fetchedWorkspaces[0]);
      initializedRef.current = true;
    } else if (fetchedWorkspaces.length === 0) {
      setCurrentWorkspace(null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem("current_workspace_id", currentWorkspace.id);
    }
  }, [currentWorkspace]);

  const createWorkspace = async (name: string): Promise<Workspace> => {
    if (!user) throw new Error("Not authenticated");
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name, slug: `${slug}-${Date.now()}`, owner_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setWorkspaces((prev) => [...prev, data]);
    setCurrentWorkspace(data);
    initializedRef.current = true;
    return data;
  };

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace, loading, refetch: fetchWorkspaces }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
