import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import {
  type DashboardDecisionModel,
  type DashboardLimits,
  type DashboardStats,
  type DashboardUsageSummary,
} from "@/lib/dashboard-decision-engine";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

export type DashboardCompetitorPreview = Pick<
  Database["public"]["Tables"]["competitors"]["Row"],
  "id" | "name" | "website" | "is_monitored"
>;

export type DashboardInboxPreview = Pick<
  Database["public"]["Tables"]["newsletter_inbox"]["Row"],
  "id" | "subject" | "from_name" | "from_email" | "received_at" | "is_read" | "competitor_id"
>;

export interface WeeklyDelta {
  current: number;
  previous: number;
}

export interface HeatmapRow {
  competitor_id: string;
  competitor_name: string;
  day: string;
  signal_count: number;
}

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
  /** Weekly delta (current 7d vs previous 7d). Null if backend hasn't deployed yet. */
  weeklyDelta?: {
    signals: WeeklyDelta;
    insights: WeeklyDelta;
    alerts: WeeklyDelta;
  } | null;
  /** Raw heatmap rows (per-competitor per-day). Null if backend hasn't deployed yet. */
  heatmap?: HeatmapRow[] | null;
}

export const dashboardSnapshotQueryKey = (workspaceId: string | null | undefined) =>
  ["dashboard-snapshot", workspaceId] as const;

async function fetchDashboardSnapshot(workspaceId: string): Promise<DashboardSnapshot> {
  const response = await invokeEdgeFunction<DashboardSnapshot | { error?: string }>(
    "dashboard-snapshot",
    { body: { workspaceId } },
  );
  if ("error" in response && response.error) {
    throw new Error(response.error);
  }
  return response as DashboardSnapshot;
}

export function useDashboardSnapshot(workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  const [realtimeFailed, setRealtimeFailed] = useState(false);

  // Realtime subscription: invalidate snapshot when new inbox items arrive (from gmail-sync).
  // Falls back to polling if the realtime channel errors out.
  useRealtimeTable({
    channelName: `inbox-live:${workspaceId ?? "none"}`,
    table: "newsletter_inbox",
    filter: workspaceId ? `workspace_id=eq.${workspaceId}` : undefined,
    enabled: !!workspaceId,
    onEvent: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardSnapshotQueryKey(workspaceId) });
    },
    onError: () => setRealtimeFailed(true),
  });

  // When realtime is active, reduce polling to 5 min (safety net).
  // When realtime fails, keep the 60s polling.
  const refetchInterval = realtimeFailed ? 60_000 : 300_000;

  const { data: snapshot = null, isLoading, error } = useQuery({
    queryKey: dashboardSnapshotQueryKey(workspaceId),
    queryFn: () => fetchDashboardSnapshot(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchInterval,
  });

  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: dashboardSnapshotQueryKey(workspaceId) }),
    [queryClient, workspaceId],
  );

  return {
    snapshot,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to load dashboard snapshot.") : null,
    refetch,
  };
}
