import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

export interface MetaAd {
  id: string;
  workspace_id: string;
  competitor_id: string | null;
  meta_ad_id: string | null;
  page_id: string | null;
  page_name: string | null;
  ad_snapshot_url: string | null;
  ad_creative_bodies: string[];
  ad_creative_link_titles: string[];
  ad_creative_link_descriptions: string[];
  ad_creative_link_captions: string[];
  cta_type: string | null;
  ad_delivery_start_time: string | null;
  ad_delivery_stop_time: string | null;
  is_active: boolean;
  platforms: string[];
  publisher_platforms: string[];
  estimated_audience_size: any;
  spend_range: any;
  impressions_range: any;
  currency: string | null;
  languages: string[];
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAdAnalysis {
  id: string;
  meta_ad_id: string;
  message_angle: string | null;
  offer_angle: string | null;
  promo_language: string | null;
  urgency_style: string | null;
  audience_clues: string[];
  funnel_intent: string | null;
  creative_pattern: string | null;
  product_category: string | null;
  strategy_takeaways: string[];
  confidence_scores: any;
  overall_confidence: number | null;
  model_used: string | null;
  created_at: string;
}

interface MetaAdsFilters {
  competitorId?: string;
  isActive?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

const PAGE_SIZE = 20;

export function useMetaAds(filters: MetaAdsFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const fetchAds = useCallback(async () => {
    if (!currentWorkspace) {
      setAds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let query = supabase
      .from("meta_ads")
      .select("*", { count: "exact" })
      .eq("workspace_id", currentWorkspace.id)
      .order("first_seen_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filters.competitorId) query = query.eq("competitor_id", filters.competitorId);
    if (filters.isActive !== undefined) query = query.eq("is_active", filters.isActive);
    if (filters.search) {
      query = query.or(`page_name.ilike.%${filters.search}%,ad_creative_bodies.cs.{${filters.search}}`);
    }
    if (filters.dateFrom) query = query.gte("first_seen_at", filters.dateFrom);
    if (filters.dateTo) query = query.lte("first_seen_at", filters.dateTo);

    const { data, count, error } = await query;
    if (error) console.error("Meta ads fetch error:", error);

    setAds((data as MetaAd[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [currentWorkspace, page, filters.competitorId, filters.isActive, filters.search, filters.dateFrom, filters.dateTo]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const fetchFromMeta = async (opts: { competitorId?: string; pageId?: string; searchTerms?: string }) => {
    if (!currentWorkspace) return;
    setFetching(true);
    try {
      const res = await supabase.functions.invoke("fetch-meta-ads", {
        body: {
          workspaceId: currentWorkspace.id,
          competitorId: opts.competitorId,
          pageId: opts.pageId,
          searchTerms: opts.searchTerms,
        },
      });
      if (res.error) {
        const body = res.data;
        if (body?.error?.includes("Rate limit")) throw new Error(body.error);
        throw res.error;
      }
      const data = res.data;
      await fetchAds();
      return data;
    } finally {
      setFetching(false);
    }
  };

  const analyzeAd = async (metaAdId: string) => {
    const { data, error } = await supabase.functions.invoke("analyze-meta-ad", {
      body: { metaAdId },
    });
    if (error) throw error;
    return data;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return {
    ads,
    loading,
    fetching,
    page,
    setPage,
    totalCount,
    totalPages,
    fetchFromMeta,
    analyzeAd,
    refetch: fetchAds,
  };
}

export function useMetaAdAnalysis(metaAdId: string | null) {
  const [analysis, setAnalysis] = useState<MetaAdAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!metaAdId) { setAnalysis(null); setLoading(false); return; }
    supabase
      .from("meta_ad_analyses")
      .select("*")
      .eq("meta_ad_id", metaAdId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setAnalysis(data as MetaAdAnalysis | null);
        setLoading(false);
      });
  }, [metaAdId]);

  return { analysis, loading };
}
