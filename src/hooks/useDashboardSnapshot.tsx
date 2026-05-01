import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import {
  type DashboardDecisionModel,
  type DashboardLimits,
  type DashboardStats,
  type DashboardUsageSummary,
} from "@/lib/dashboard-decision-engine";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

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

  const { data: snapshot = null, isLoading, error } = useQuery({
    queryKey: dashboardSnapshotQueryKey(workspaceId),
    queryFn: () => fetchDashboardSnapshot(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: dashboardSnapshotQueryKey(workspaceId) });

  return {
    snapshot,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to load dashboard snapshot.") : null,
    refetch,
  };
}
