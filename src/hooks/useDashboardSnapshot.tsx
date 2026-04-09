import { useCallback, useEffect, useState } from "react";
import type { Database } from "@/integrations/supabase/types";
import {
  type DashboardDecisionModel,
  type DashboardLimits,
  type DashboardStats,
  type DashboardUsageSummary,
} from "@/lib/dashboard-decision-engine";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useAuth } from "@/hooks/useAuth";

export type DashboardCompetitorPreview = Pick<
  Database["public"]["Tables"]["competitors"]["Row"],
  "id" | "name" | "website" | "is_monitored"
>;

export type DashboardInboxPreview = Pick<
  Database["public"]["Tables"]["newsletter_inbox"]["Row"],
  "id" | "subject" | "from_name" | "from_email" | "received_at" | "is_read" | "competitor_id"
>;

export interface DashboardSnapshot {
  workspaceId: string;
  workspaceName: string;
  gmailConnected: boolean;
  unreadAlertCount: number;
  stats: DashboardStats;
  usage: DashboardUsageSummary;
  limits: DashboardLimits;
  recentInbox: DashboardInboxPreview[];
  competitors: DashboardCompetitorPreview[];
  decisionModel: DashboardDecisionModel;
}

type DashboardSnapshotResponse = DashboardSnapshot | { error?: string };

export function useDashboardSnapshot(workspaceId: string | null | undefined) {
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    if (!workspaceId) {
      setSnapshot(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (authLoading || !accessToken) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await invokeEdgeFunction<DashboardSnapshotResponse>("dashboard-snapshot", {
        body: { workspaceId },
      });

      if ("error" in response && response.error) {
        throw new Error(response.error);
      }

      setSnapshot(response as DashboardSnapshot);
    } catch (fetchError) {
      setSnapshot(null);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load dashboard snapshot.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authLoading, workspaceId]);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  return {
    snapshot,
    loading,
    error,
    refetch: fetchSnapshot,
  };
}
