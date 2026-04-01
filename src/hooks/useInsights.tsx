import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

export interface Insight {
  id: string;
  workspace_id: string;
  category: string;
  title: string;
  what_is_happening: string;
  why_it_matters: string;
  strategic_implication: string;
  recommended_response: string;
  confidence: number | null;
  supporting_evidence: any[];
  affected_competitors: string[];
  source_type: string;
  created_at: string;
}

const INSIGHT_CATEGORIES = [
  "pricing", "promotions", "email_strategy", "paid_ads",
  "product_focus", "seasonal_strategy", "messaging_positioning", "cadence_frequency",
] as const;

export type InsightCategory = typeof INSIGHT_CATEGORIES[number];
export { INSIGHT_CATEGORIES };

export function useInsights(categoryFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchInsights = useCallback(async () => {
    if (!currentWorkspace) { setInsights([]); setLoading(false); return; }
    setLoading(true);

    let query = supabase
      .from("insights")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (categoryFilter) query = query.eq("category", categoryFilter);

    const { data, error } = await query;
    if (error) console.error("Insights fetch error:", error);
    setInsights((data as unknown as Insight[]) || []);
    setLoading(false);
  }, [currentWorkspace, categoryFilter]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const generateInsights = async (category?: string) => {
    if (!currentWorkspace) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { workspaceId: currentWorkspace.id, category },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) toast.error("Rate limited — try again shortly.");
        else if (data.error.includes("credits")) toast.error("AI credits exhausted. Add funds in Settings.");
        else toast.error(data.error);
        return;
      }
      toast.success(`Generated ${data?.insights?.length || 0} insights`);
      await fetchInsights();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  };

  return { insights, loading, generating, generateInsights, refetch: fetchInsights };
}
