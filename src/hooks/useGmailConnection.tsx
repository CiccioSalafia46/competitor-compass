import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { GmailConnection, GmailSyncResult } from "@/types/gmail";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

export function useGmailConnection() {
  const { currentWorkspace } = useWorkspace();
  const [connection, setConnection] = useState<GmailConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!currentWorkspace) {
      setConnection(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: connectionError } = await supabase
      .from("gmail_connections")
      .select("id, workspace_id, user_id, email_address, connected_at, last_sync_at, sync_status, sync_error, last_history_id, created_at")
      .eq("workspace_id", currentWorkspace.id)
      .limit(1)
      .maybeSingle();

    if (connectionError) {
      console.error("Gmail connection fetch error:", connectionError);
      setConnection(null);
      setError(connectionError.message || "Failed to load Gmail connection.");
      setLoading(false);
      return;
    }

    setConnection(data as GmailConnection | null);
    setLoading(false);
  }, [currentWorkspace]);

  useEffect(() => {
    void fetchConnection();
  }, [fetchConnection]);

  // Check URL params for OAuth callback result — run only once on mount.
  // fetchConnection is captured via ref to avoid re-running on workspace changes.
  const fetchConnectionRef = useRef(fetchConnection);
  fetchConnectionRef.current = fetchConnection;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      void fetchConnectionRef.current();
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("gmail_error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const connect = async () => {
    if (!currentWorkspace) return;
    const data = await invokeEdgeFunction<{ url?: string }>("gmail-auth", {
      body: {
        action: "initiate",
        workspaceId: currentWorkspace.id,
        redirectUrl: window.location.origin + "/settings",
      },
    });
    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const disconnect = async () => {
    if (!connection || !currentWorkspace) return;
    await invokeEdgeFunction("gmail-auth", {
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
      const data = await invokeEdgeFunction<GmailSyncResult>("gmail-sync", {
        body: { connectionId: connection.id, fullSync },
      });
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
    error,
    connect,
    disconnect,
    sync,
    refetch: fetchConnection,
    isConnected: !!connection,
  };
}
