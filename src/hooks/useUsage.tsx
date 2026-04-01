import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

export interface UsageSummary {
  competitors: number;
  newsletters_this_month: number;
  analyses_this_month: number;
  seats_used: number;
}

// Plan limits
export const PLAN_LIMITS = {
  free: {
    label: "Free",
    seats: 1,
    competitors: 3,
    newsletters_per_month: 200,
    analyses_per_month: 50,
  },
  starter: {
    label: "Starter",
    seats: 3,
    competitors: 10,
    newsletters_per_month: 2000,
    analyses_per_month: 500,
  },
  premium: {
    label: "Premium",
    seats: 10,
    competitors: -1, // unlimited
    newsletters_per_month: 20000,
    analyses_per_month: 5000,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export function useUsage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [usage, setUsage] = useState<UsageSummary>({
    competitors: 0,
    newsletters_this_month: 0,
    analyses_this_month: 0,
    seats_used: 0,
  });
  const [loading, setLoading] = useState(true);
  // Derive from actual subscription state — imported lazily to avoid circular deps
  const [currentPlan, setCurrentPlan] = useState<PlanTier>("free");

  // Sync plan from subscription tier — poll sessionStorage since it's set by SubscriptionProvider
  useEffect(() => {
    const sync = () => {
      try {
        const stored = sessionStorage.getItem("subscription_tier");
        if (stored && (stored === "free" || stored === "starter" || stored === "premium")) {
          setCurrentPlan(stored as PlanTier);
        }
      } catch {}
    };
    sync();
    // Re-sync periodically to catch updates from SubscriptionProvider
    const interval = setInterval(sync, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsage = useCallback(async () => {
    if (!user || !currentWorkspace) {
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
        .eq("workspace_id", currentWorkspace.id),
      supabase
        .from("newsletter_entries")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id),
    ]);

    setUsage({
      competitors: competitorsRes.count || 0,
      newsletters_this_month: newslettersRes.count || 0,
      analyses_this_month: analysesRes.count || 0,
      seats_used: membersRes.count || 0,
    });
    setLoading(false);
  }, [user, currentWorkspace]);

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
  const trackUsage = async (eventType: string, quantity: number = 1, metadata: Record<string, any> = {}) => {
    if (!currentWorkspace) return;
    await supabase.from("usage_events").insert({
      workspace_id: currentWorkspace.id,
      event_type: eventType,
      quantity,
      metadata,
    } as any);
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
