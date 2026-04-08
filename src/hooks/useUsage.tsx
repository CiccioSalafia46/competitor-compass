import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { Database, Json } from "@/integrations/supabase/types";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plan-limits";

export { PLAN_LIMITS };

export interface UsageSummary {
  competitors: number;
  newsletters_this_month: number;
  analyses_this_month: number;
  seats_used: number;
}

export function useUsage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const userId = user?.id ?? null;
  const workspaceId = currentWorkspace?.id ?? null;
  const [usage, setUsage] = useState<UsageSummary>({
    competitors: 0,
    newsletters_this_month: 0,
    analyses_this_month: 0,
    seats_used: 0,
  });
  const [loading, setLoading] = useState(true);
  // Derive from actual subscription state — imported lazily to avoid circular deps
  const [currentPlan, setCurrentPlan] = useState<PlanTier>("free");

  // Sync plan from subscription tier stored in sessionStorage by SubscriptionProvider
  useEffect(() => {
    const sync = () => {
      if (!workspaceId) return;
      try {
        const stored = sessionStorage.getItem(`subscription_tier:${workspaceId}`);
        if (stored && (stored === "free" || stored === "starter" || stored === "premium")) {
          setCurrentPlan(stored as PlanTier);
        }
      } catch {
        // Ignore storage read failures in restricted browser contexts.
      }
    };
    sync();
    // Listen for storage events from SubscriptionProvider
    const handler = () => sync();
    window.addEventListener("storage", handler);
    // Also re-sync when component mounts and on a reasonable interval (30s not 2s)
    const interval = setInterval(sync, 30_000);
    return () => {
      window.removeEventListener("storage", handler);
      clearInterval(interval);
    };
  }, [workspaceId]);

  const fetchUsage = useCallback(async () => {
    if (!userId || !workspaceId) {
      setLoading(false);
      return;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [competitorsRes, newslettersRes, analysesRes, membersRes] = await Promise.all([
      supabase
        .from("competitors")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("newsletter_entries")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
    ]);

    setUsage({
      competitors: competitorsRes.count || 0,
      newsletters_this_month: newslettersRes.count || 0,
      analyses_this_month: analysesRes.count || 0,
      seats_used: membersRes.count || 0,
    });
    setLoading(false);
  }, [userId, workspaceId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const limits = PLAN_LIMITS[currentPlan];

  const isAtLimit = (metric: keyof UsageSummary) => {
    const limit = {
      competitors: limits.competitors,
      newsletters_this_month: limits.newsletters_per_month,
      analyses_this_month: limits.analyses_per_month,
      seats_used: limits.seats,
    }[metric];
    if (limit === -1) return false; // unlimited
    return usage[metric] >= limit;
  };

  const getUsagePercent = (metric: keyof UsageSummary) => {
    const limit = {
      competitors: limits.competitors,
      newsletters_this_month: limits.newsletters_per_month,
      analyses_this_month: limits.analyses_per_month,
      seats_used: limits.seats,
    }[metric];
    if (limit === -1) return 0;
    return Math.min(100, Math.round((usage[metric] / limit) * 100));
  };

  // Log a usage event
  const trackUsage = async (eventType: string, quantity: number = 1, metadata: Json = {}) => {
    if (!workspaceId) return;
    const payload: Database["public"]["Tables"]["usage_events"]["Insert"] = {
      workspace_id: workspaceId,
      event_type: eventType,
      quantity,
      metadata,
    };
    await supabase.from("usage_events").insert(payload);
  };

  return {
    usage,
    loading,
    currentPlan,
    limits,
    isAtLimit,
    getUsagePercent,
    trackUsage,
    refetch: fetchUsage,
  };
}
