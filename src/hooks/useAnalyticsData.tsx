import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

export interface AnalyticsData {
  newslettersByWeek: { week: string; count: number }[];
  promotionFrequency: { competitor: string; promos: number; total: number }[];
  ctaDistribution: { cta: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
  urgencyFrequency: { type: string; count: number }[];
  campaignTypes: { type: string; count: number }[];
  competitorActivity: { competitor: string; newsletters: number; ads: number }[];
  adsByWeek: { week: string; count: number }[];
}

export function useAnalyticsData() {
  const { currentWorkspace } = useWorkspace();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentWorkspace) { setData(null); setLoading(false); return; }
    setLoading(true);

    try {
      const { data: result, error } = await supabase.rpc("get_workspace_analytics", {
        _workspace_id: currentWorkspace.id,
      });

      if (error) throw error;

      const r = result as any;
      setData({
        newslettersByWeek: r.newslettersByWeek || [],
        adsByWeek: r.adsByWeek || [],
        promotionFrequency: r.promotionFrequency || [],
        ctaDistribution: r.ctaDistribution || [],
        categoryDistribution: r.categoryDistribution || [],
        urgencyFrequency: r.urgencyFrequency || [],
        campaignTypes: r.campaignTypes || [],
        competitorActivity: r.competitorActivity || [],
      });
    } catch (e) {
      console.error("Analytics RPC error:", e);
      setData(null);
    }

    setLoading(false);
  }, [currentWorkspace]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
