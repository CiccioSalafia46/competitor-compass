import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getErrorMessage } from "@/lib/errors";

export interface AnalyticsSummary {
  rangeDays: number;
  totalNewslettersInRange: number;
  totalAdsInRange: number;
  totalInsightsInRange: number;
  activeCompetitorsInRange: number;
  totalCompetitors: number;
  attributedNewslettersInRange: number;
  unattributedNewslettersInRange: number;
  unattributedBacklog: number;
  promotionRate: number;
  urgencyRate: number;
  newsletterGrowthRate: number;
  adGrowthRate: number;
  extractedNewslettersInRange: number;
  extractionCoverageRate: number;
  analyzedAdsInRange: number;
  adAnalysisCoverageRate: number;
  averageDiscount: number;
  maxDiscount: number;
  freeShippingRate: number;
  competitorsWithDomains: number;
  competitorsMissingDomains: number;
  inactiveCompetitorsInRange: number;
  lastInboxActivity: string | null;
  lastAdActivity: string | null;
  lastGmailSyncAt: string | null;
}

export interface WeeklyActivityPoint {
  week: string;
  newsletters: number;
  ads: number;
  insights: number;
}

interface CompetitorPressurePoint {
  competitorId: string;
  competitor: string;
  newsletters: number;
  ads: number;
  promos: number;
  pressureScore: number;
  latestActivityAt: string | null;
}

interface SenderDomainPoint {
  domain: string;
  count: number;
}

interface RecentSignalPoint {
  competitor: string;
  sourceType: "newsletter" | "meta_ad" | "insight";
  title: string;
  summary: string;
  happenedAt: string | null;
}

export interface ShareOfVoicePoint {
  competitorId: string;
  competitor: string;
  newsletters: number;
  ads: number;
  totalSignals: number;
  signalShare: number;
  latestActivityAt: string | null;
}

export interface DiscountDistributionPoint {
  band: string;
  count: number;
}

export interface InsightCategoryPoint {
  category: string;
  count: number;
}

export interface CompetitorCoveragePoint {
  competitorId: string;
  competitor: string;
  hasDomains: boolean;
  newsletters: number;
  ads: number;
  extractedNewsletters: number;
  extractionCoverageRate: number;
  latestActivityAt: string | null;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  newslettersByWeek: { week: string; count: number }[];
  promotionFrequency: { competitor: string; promos: number; total: number }[];
  ctaDistribution: { cta: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
  urgencyFrequency: { type: string; count: number }[];
  campaignTypes: { type: string; count: number }[];
  competitorActivity: { competitorId?: string; competitor: string; newsletters: number; ads: number; total?: number }[];
  adsByWeek: { week: string; count: number }[];
  weeklyActivity: WeeklyActivityPoint[];
  competitorPressure: CompetitorPressurePoint[];
  topSenderDomains: SenderDomainPoint[];
  weekdayCadence: { day: string; count: number }[];
  recentSignals: RecentSignalPoint[];
  shareOfVoice: ShareOfVoicePoint[];
  discountDistribution: DiscountDistributionPoint[];
  insightCategoryDistribution: InsightCategoryPoint[];
  competitorCoverage: CompetitorCoveragePoint[];
}

type AnalyticsRpcResult = Partial<AnalyticsData> | null;

const EMPTY_SUMMARY: AnalyticsSummary = {
  rangeDays: 30,
  totalNewslettersInRange: 0,
  totalAdsInRange: 0,
  totalInsightsInRange: 0,
  activeCompetitorsInRange: 0,
  totalCompetitors: 0,
  attributedNewslettersInRange: 0,
  unattributedNewslettersInRange: 0,
  unattributedBacklog: 0,
  promotionRate: 0,
  urgencyRate: 0,
  newsletterGrowthRate: 0,
  adGrowthRate: 0,
  extractedNewslettersInRange: 0,
  extractionCoverageRate: 0,
  analyzedAdsInRange: 0,
  adAnalysisCoverageRate: 0,
  averageDiscount: 0,
  maxDiscount: 0,
  freeShippingRate: 0,
  competitorsWithDomains: 0,
  competitorsMissingDomains: 0,
  inactiveCompetitorsInRange: 0,
  lastInboxActivity: null,
  lastAdActivity: null,
  lastGmailSyncAt: null,
};

export function useAnalyticsData(rangeDays = 30) {
  const { currentWorkspace } = useWorkspace();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentWorkspace) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data: result, error } = await supabase.rpc("get_workspace_analytics", {
        _workspace_id: currentWorkspace.id,
        _range_days: rangeDays,
      });

      if (error) throw error;

      const r = (result as AnalyticsRpcResult) ?? {};
      setData({
        summary: { ...EMPTY_SUMMARY, ...r.summary, rangeDays },
        newslettersByWeek: r.newslettersByWeek || [],
        adsByWeek: r.adsByWeek || [],
        weeklyActivity: r.weeklyActivity || [],
        promotionFrequency: r.promotionFrequency || [],
        ctaDistribution: r.ctaDistribution || [],
        categoryDistribution: r.categoryDistribution || [],
        urgencyFrequency: r.urgencyFrequency || [],
        campaignTypes: r.campaignTypes || [],
        competitorActivity: r.competitorActivity || [],
        competitorPressure: r.competitorPressure || [],
        topSenderDomains: r.topSenderDomains || [],
        weekdayCadence: r.weekdayCadence || [],
        recentSignals: r.recentSignals || [],
        shareOfVoice: r.shareOfVoice || [],
        discountDistribution: r.discountDistribution || [],
        insightCategoryDistribution: r.insightCategoryDistribution || [],
        competitorCoverage: r.competitorCoverage || [],
      });
    } catch (e) {
      console.error("Analytics RPC error:", e);
      setData(null);
      setError(getErrorMessage(e, "Failed to load analytics."));
    }

    setLoading(false);
  }, [currentWorkspace, rangeDays]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
