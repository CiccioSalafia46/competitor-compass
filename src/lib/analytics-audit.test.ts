import { describe, expect, it } from "vitest";
import {
  buildAnalyticsActionQueue,
  buildAnalyticsAnomalies,
  buildAnalyticsHealthAudit,
  type AnalyticsHealthItem,
} from "@/lib/analytics-audit";
import type { AnalyticsData } from "@/hooks/useAnalyticsData";

function makeAnalyticsData(overrides: Partial<AnalyticsData> = {}): AnalyticsData {
  return {
    summary: {
      rangeDays: 30,
      totalNewslettersInRange: 18,
      totalAdsInRange: 9,
      totalInsightsInRange: 4,
      activeCompetitorsInRange: 3,
      totalCompetitors: 5,
      attributedNewslettersInRange: 10,
      unattributedNewslettersInRange: 8,
      unattributedBacklog: 12,
      promotionRate: 64,
      urgencyRate: 41,
      newsletterGrowthRate: 22,
      adGrowthRate: 15,
      extractedNewslettersInRange: 7,
      extractionCoverageRate: 38.9,
      analyzedAdsInRange: 2,
      adAnalysisCoverageRate: 22.2,
      averageDiscount: 24,
      maxDiscount: 35,
      freeShippingRate: 33,
      competitorsWithDomains: 2,
      competitorsMissingDomains: 3,
      inactiveCompetitorsInRange: 2,
      lastInboxActivity: "2026-04-06T09:00:00.000Z",
      lastAdActivity: "2026-04-05T14:00:00.000Z",
      lastGmailSyncAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    newslettersByWeek: [],
    promotionFrequency: [],
    ctaDistribution: [],
    categoryDistribution: [],
    urgencyFrequency: [],
    campaignTypes: [],
    competitorActivity: [],
    adsByWeek: [],
    weeklyActivity: [
      { week: "Mar 03", newsletters: 4, ads: 1, insights: 1 },
      { week: "Mar 10", newsletters: 5, ads: 1, insights: 0 },
      { week: "Mar 17", newsletters: 4, ads: 2, insights: 1 },
      { week: "Mar 24", newsletters: 5, ads: 1, insights: 1 },
      { week: "Mar 31", newsletters: 12, ads: 5, insights: 2 },
    ],
    competitorPressure: [],
    topSenderDomains: [],
    weekdayCadence: [],
    recentSignals: [],
    shareOfVoice: [
      {
        competitorId: "comp-1",
        competitor: "Acme",
        newsletters: 8,
        ads: 4,
        totalSignals: 12,
        signalShare: 58,
        latestActivityAt: "2026-04-06T09:00:00.000Z",
      },
    ],
    discountDistribution: [],
    insightCategoryDistribution: [],
    competitorCoverage: [],
    ...overrides,
  };
}

function getHealthItem(items: AnalyticsHealthItem[], label: string) {
  return items.find((item) => item.label === label);
}

describe("analytics audit helpers", () => {
  it("builds an action queue from the highest-signal operational gaps", () => {
    const actions = buildAnalyticsActionQueue(makeAnalyticsData());

    expect(actions.map((action) => action.title)).toEqual(
      expect.arrayContaining([
        "Refresh inbox ingestion",
        "Fix unmatched newsletter backlog",
        "Add sender domains to competitors",
        "Increase newsletter extraction coverage",
      ]),
    );
  });

  it("detects anomalies from weekly spikes and dominant competitors", () => {
    const anomalies = buildAnalyticsAnomalies(makeAnalyticsData());

    expect(anomalies.map((anomaly) => anomaly.title)).toEqual(
      expect.arrayContaining([
        "Newsletter activity spike",
        "Paid activity acceleration",
        "One competitor is dominating share of signal",
      ]),
    );
  });

  it("produces health items with meaningful statuses", () => {
    const items = buildAnalyticsHealthAudit(makeAnalyticsData());

    expect(getHealthItem(items, "Gmail freshness")?.status).toBe("risk");
    expect(getHealthItem(items, "Competitor domain readiness")?.status).toBe("risk");
    expect(getHealthItem(items, "Inbox attribution")?.progress).toBeLessThan(60);
  });
});
