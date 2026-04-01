import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { GmailConnection } from "@/types/gmail";

export function useGmailConnection() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [connection, setConnection] = useState<GmailConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchConnection = useCallback(async () => {
    if (!currentWorkspace) {
      setConnection(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("gmail_connections")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .limit(1)
      .maybeSingle();
    setConnection(data as GmailConnection | null);
    setLoading(false);
  }, [currentWorkspace]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Check URL params for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      fetchConnection();
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("gmail_error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchConnection]);

  const connect = async () => {
    if (!currentWorkspace) return;
    const { data, error } = await supabase.functions.invoke("gmail-auth", {
      body: {
        action: "initiate",
        workspaceId: currentWorkspace.id,
        redirectUrl: window.location.origin + "/settings",
      },
    });
    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const disconnect = async () => {
    if (!connection || !currentWorkspace) return;
    await supabase.functions.invoke("gmail-auth", {
      body: {
        action: "disconnect",
        connectionId: connection.id,
        workspaceId: currentWorkspace.id,
      },
    });
    setConnection(null);
  };

  const sync = async (fullSync = false) => {
    if (!connection) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmail-sync", {
        body: { connectionId: connection.id, fullSync },
      });
      if (error) throw error;
      await fetchConnection();
      return data;
    } finally {
      setSyncing(false);
    }
  };

  return {
    connection,
    loading,
    syncing,
    connect,
    disconnect,
    sync,
    refetch: fetchConnection,
    isConnected: !!connection,
  };
}
