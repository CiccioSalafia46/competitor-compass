import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  type CompetitorIntelligenceResponse,
  type CompetitorIntelligenceSnapshot,
} from "@/lib/competitor-intelligence";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

type CompetitorIntelligenceHookResult = {
  snapshots: CompetitorIntelligenceSnapshot[];
  generatedAt: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

type CompetitorIntelligenceResponsePayload = CompetitorIntelligenceResponse | { error?: string };

export function useCompetitorIntelligence(
  workspaceId: string | null | undefined,
  windowDays = 180,
): CompetitorIntelligenceHookResult {
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [snapshots, setSnapshots] = useState<CompetitorIntelligenceSnapshot[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    if (!workspaceId) {
      setSnapshots([]);
      setGeneratedAt(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (authLoading || !accessToken) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await invokeEdgeFunction<CompetitorIntelligenceResponsePayload>(
        "competitor-intelligence",
        {
          body: { workspaceId, windowDays },
        },
      );

      if ("error" in response && response.error) {
        throw new Error(response.error);
      }

      setSnapshots(response.competitors ?? []);
      setGeneratedAt(response.generatedAt ?? null);
    } catch (fetchError) {
      setSnapshots([]);
      setGeneratedAt(null);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load competitor intelligence.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authLoading, windowDays, workspaceId]);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  return {
    snapshots,
    generatedAt,
    loading,
    error,
    refetch: fetchSnapshot,
  };
}
