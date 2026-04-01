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

    const wsId = currentWorkspace.id;

    const [newsletters, extractions, ads, adAnalyses, competitors] = await Promise.all([
      supabase.from("newsletter_inbox").select("id, from_name, from_email, received_at, competitor_id, is_newsletter")
        .eq("workspace_id", wsId).eq("is_newsletter", true).order("received_at", { ascending: true }),
      supabase.from("newsletter_extractions").select("campaign_type, discount_percentage, product_categories, urgency_signals, calls_to_action, newsletter_inbox_id")
        .eq("workspace_id", wsId),
      supabase.from("meta_ads").select("id, page_name, cta_type, is_active, competitor_id, created_at, ad_delivery_start_time")
        .eq("workspace_id", wsId).order("created_at", { ascending: true }),
      supabase.from("meta_ad_analyses").select("product_category, funnel_intent, creative_pattern")
        .eq("workspace_id", wsId),
      supabase.from("competitors").select("id, name").eq("workspace_id", wsId),
    ]);

    const competitorMap = new Map((competitors.data || []).map((c: any) => [c.id, c.name]));

    // Newsletters by week
    const nlByWeek = new Map<string, number>();
    for (const nl of newsletters.data || []) {
      if (!(nl as any).received_at) continue;
      const d = new Date((nl as any).received_at);
      const week = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)).padStart(2, "0")}`;
      nlByWeek.set(week, (nlByWeek.get(week) || 0) + 1);
    }

    // Ads by week
    const adsByWeek = new Map<string, number>();
    for (const ad of ads.data || []) {
      const dateStr = (ad as any).ad_delivery_start_time || (ad as any).created_at;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      const week = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)).padStart(2, "0")}`;
      adsByWeek.set(week, (adsByWeek.get(week) || 0) + 1);
    }

    // Promotion frequency per competitor
    const promoByCompetitor = new Map<string, { promos: number; total: number }>();
    const nlCompetitorMap = new Map<string, string>();
    for (const nl of newsletters.data || []) {
      if ((nl as any).competitor_id) nlCompetitorMap.set(nl.id, (nl as any).competitor_id);
    }
    
    for (const ext of extractions.data || []) {
      const nlId = (ext as any).newsletter_inbox_id;
      const compId = nlCompetitorMap.get(nlId);
      const compName = compId ? competitorMap.get(compId) || "Unknown" : "Unattributed";
      const entry = promoByCompetitor.get(compName) || { promos: 0, total: 0 };
      entry.total++;
      if ((ext as any).discount_percentage || (ext as any).campaign_type?.includes("promo")) entry.promos++;
      promoByCompetitor.set(compName, entry);
    }

    // CTA distribution from ads
    const ctaCounts = new Map<string, number>();
    for (const ad of ads.data || []) {
      const cta = (ad as any).cta_type || "None";
      ctaCounts.set(cta, (ctaCounts.get(cta) || 0) + 1);
    }

    // Category distribution from extractions
    const catCounts = new Map<string, number>();
    for (const ext of extractions.data || []) {
      for (const cat of (ext as any).product_categories || []) {
        catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
      }
    }

    // Urgency frequency
    const urgCounts = new Map<string, number>();
    for (const ext of extractions.data || []) {
      for (const sig of (ext as any).urgency_signals || []) {
        const type = typeof sig === "string" ? sig : (sig as any).type || "unknown";
        urgCounts.set(type, (urgCounts.get(type) || 0) + 1);
      }
    }

    // Campaign types
    const campCounts = new Map<string, number>();
    for (const ext of extractions.data || []) {
      const ct = (ext as any).campaign_type || "Unknown";
      campCounts.set(ct, (campCounts.get(ct) || 0) + 1);
    }

    // Competitor activity (newsletters + ads)
    const compActivity = new Map<string, { newsletters: number; ads: number }>();
    for (const nl of newsletters.data || []) {
      const compId = (nl as any).competitor_id;
      const name = compId ? competitorMap.get(compId) || "Unknown" : "Unattributed";
      const entry = compActivity.get(name) || { newsletters: 0, ads: 0 };
      entry.newsletters++;
      compActivity.set(name, entry);
    }
    for (const ad of ads.data || []) {
      const compId = (ad as any).competitor_id;
      const name = compId ? competitorMap.get(compId) || "Unknown" : "Unattributed";
      const entry = compActivity.get(name) || { newsletters: 0, ads: 0 };
      entry.ads++;
      compActivity.set(name, entry);
    }

    setData({
      newslettersByWeek: [...nlByWeek.entries()].map(([week, count]) => ({ week, count })).slice(-12),
      adsByWeek: [...adsByWeek.entries()].map(([week, count]) => ({ week, count })).slice(-12),
      promotionFrequency: [...promoByCompetitor.entries()].map(([competitor, v]) => ({ competitor, ...v })),
      ctaDistribution: [...ctaCounts.entries()].map(([cta, count]) => ({ cta, count })).sort((a, b) => b.count - a.count),
      categoryDistribution: [...catCounts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      urgencyFrequency: [...urgCounts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      campaignTypes: [...campCounts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      competitorActivity: [...compActivity.entries()].map(([competitor, v]) => ({ competitor, ...v })),
    });

    setLoading(false);
  }, [currentWorkspace]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
