import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { getErrorMessage } from "@/lib/errors";
import { getCurrentLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type MetaAd = Database["public"]["Tables"]["meta_ads"]["Row"];
export type MetaAdAnalysis = Database["public"]["Tables"]["meta_ad_analyses"]["Row"];

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
    if (error) {
      console.error("Meta ads fetch error:", error);
      toast.error(getErrorMessage(error, "Failed to load Meta ads."));
      setAds([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setAds((data as MetaAd[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [currentWorkspace, page, filters.competitorId, filters.isActive, filters.search, filters.dateFrom, filters.dateTo]);

  useEffect(() => { void fetchAds(); }, [fetchAds]);

  const fetchFromMeta = async (opts: { competitorId?: string; pageId?: string; searchTerms?: string }) => {
    if (!currentWorkspace) return null;
    setFetching(true);
    try {
      const data = await invokeEdgeFunction("fetch-meta-ads", {
        body: {
          workspaceId: currentWorkspace.id,
          competitorId: opts.competitorId,
          pageId: opts.pageId,
          searchTerms: opts.searchTerms,
        },
      });
      await fetchAds();
      return data;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to fetch Meta ads"));
      return null;
    } finally {
      setFetching(false);
    }
  };

  const analyzeAd = async (metaAdId: string) => {
    try {
      const data = await invokeEdgeFunction("analyze-meta-ad", {
        body: { metaAdId, language: getCurrentLanguage() },
      });
      return data;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to analyze ad"));
      return null;
    }
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
    if (!metaAdId) {
      setAnalysis(null);
      setLoading(false);
      return;
    }
    supabase
      .from("meta_ad_analyses")
      .select("*")
      .eq("meta_ad_id", metaAdId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Meta ad analysis fetch error:", error);
          setAnalysis(null);
        } else {
          setAnalysis(data as MetaAdAnalysis | null);
        }
      })
      .catch((err) => {
        console.error("Meta ad analysis fetch failed:", err);
        setAnalysis(null);
      })
      .finally(() => setLoading(false));
  }, [metaAdId]);

  return { analysis, loading };
}
