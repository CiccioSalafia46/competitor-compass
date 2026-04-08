import { useState, useCallback } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

export interface WeeklyBriefingSignal {
  competitor: string;
  signal: string;
  category: string;
}

export interface WeeklyBriefingInsight {
  title: string;
  priority: string;
  category: string;
  takeaway: string;
}

export interface WeeklyBriefingAction {
  action: string;
  urgency: "high" | "medium" | "low";
}

export interface WeeklyBriefingSpotlight {
  name: string | null;
  headline: string;
  details: string;
}

export interface WeeklyBriefingMetrics {
  newsletters_this_week: number;
  active_ads: number;
  tracked_competitors: number;
  alerts_this_week: number;
  unread_alerts: number;
  high_priority_insights: number;
}

export interface WeeklyBriefing {
  id: string;
  workspace_id: string;
  week_start: string;
  week_end: string;
  generated_at: string;
  status: "pending" | "generating" | "ready" | "failed";
  error_message: string | null;
  executive_summary: string | null;
  key_signals: WeeklyBriefingSignal[];
  top_insights: WeeklyBriefingInsight[];
  action_items: WeeklyBriefingAction[];
  competitor_spotlight: WeeklyBriefingSpotlight | null;
  metrics_snapshot: WeeklyBriefingMetrics | null;
}

export function useWeeklyBriefing() {
  const { currentWorkspace } = useWorkspace();
  const [briefing, setBriefing] = useState<WeeklyBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (forceRegenerate = false) => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const result = await invokeEdgeFunction<{ briefing: WeeklyBriefing; cached: boolean }>(
        "generate-weekly-briefing",
        { body: { workspaceId: currentWorkspace.id, forceRegenerate } },
      );
      setBriefing(result.briefing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate briefing.");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  return { briefing, loading, error, generate };
}
