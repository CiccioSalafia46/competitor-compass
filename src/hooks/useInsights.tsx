import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { getErrorMessage } from "@/lib/errors";
import { isTransientNavigationFetchError } from "@/lib/transient-network";
import type { InsightPriorityLevel } from "@/lib/insight-priority";
import {
  normalizeInsights,
  type NormalizedInsight as Insight,
  type NormalizedInsightEvidence as InsightEvidence,
} from "@/lib/insight-normalization";

interface UseInsightsOptions {
  limit?: number;
}

const INSIGHT_CATEGORIES = [
  "pricing",
  "promotions",
  "email_strategy",
  "paid_ads",
  "product_focus",
  "seasonal_strategy",
  "messaging_positioning",
  "cadence_frequency",
] as const;

export type InsightCategory = typeof INSIGHT_CATEGORIES[number];
export type { Insight, InsightEvidence, InsightPriorityLevel };
export { INSIGHT_CATEGORIES };

export function useInsights(categoryFilter?: string, options: UseInsightsOptions = {}) {
  const { currentWorkspace } = useWorkspace();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const limit = options.limit ?? 24;

  const fetchInsights = useCallback(async () => {
    if (!currentWorkspace) {
      setInsights([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase
      .from("insights")
      .select("id, workspace_id, category, title, campaign_type, main_message, what_is_happening, why_it_matters, strategic_implication, strategic_takeaway, recommended_response, confidence, offer_discount_percentage, offer_coupon_code, offer_urgency, cta_primary, cta_analysis, product_categories, positioning_angle, supporting_evidence, affected_competitors, source_type, priority_level, impact_area, created_at")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (categoryFilter) {
      query = query.eq("category", categoryFilter);
    }

    const { data, error } = await query;
    if (error) {
      if (isTransientNavigationFetchError(error)) {
        setLoading(false);
        return;
      }
      console.error("Insights fetch error:", error);
      toast.error(getErrorMessage(error, "Failed to load insights."));
      setInsights([]);
      setLoading(false);
      return;
    }

    setInsights(normalizeInsights(data));
    setLoading(false);
  }, [currentWorkspace, categoryFilter, limit]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const generateInsights = async (category?: string) => {
    if (!currentWorkspace) {
      toast.error("No workspace selected.");
      return;
    }

    setGenerating(true);
    try {
      const data = await invokeEdgeFunction<{ error?: string; message?: string; insights?: Insight[] }>(
        "generate-insights",
        {
          body: { workspaceId: currentWorkspace.id, category },
        }
      );

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.message === "Insufficient data") {
        toast.error("Import competitor newsletters or ads before generating insights.");
        return;
      }

      toast.success(`Generated ${data?.insights?.length || 0} insights`);
      await fetchInsights();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  };

  return { insights, loading, generating, generateInsights, refetch: fetchInsights };
}
