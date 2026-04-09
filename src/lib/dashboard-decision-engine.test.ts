import { describe, expect, it } from "vitest";
import {
  buildDashboardDecisionModel,
  type DashboardAlert as Alert,
  type DashboardAnalytics as AnalyticsData,
  type DashboardInsight as Insight,
  type DashboardUsageSummary as UsageSummary,
} from "@/lib/dashboard-decision-engine";

const emptyAnalytics: AnalyticsData = {
  newslettersByWeek: [],
  promotionFrequency: [],
  ctaDistribution: [],
  categoryDistribution: [],
  urgencyFrequency: [],
  campaignTypes: [],
  competitorActivity: [],
  adsByWeek: [],
};

const baseUsage: UsageSummary = {
  competitors: 0,
  newsletters_this_month: 0,
  analyses_this_month: 0,
  seats_used: 1,
};

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: "insight-1",
    workspace_id: "workspace-1",
    category: "pricing",
    title: "Competitor pricing moved",
    campaign_type: "Discount push",
    main_message: "Competitors are pushing a stronger savings message.",
    what_is_happening: "Several rivals are leaning harder into discounting.",
    why_it_matters: "Margin pressure is rising across the category.",
    strategic_implication: "If ignored, conversion and pricing power may erode.",
    strategic_takeaway: "Tighten the value story before discounting becomes the default conversion lever.",
    recommended_response:
      "Immediate: Review current hero pricing\nNext 30 days: Test a stronger value stack\nMeasure: CVR and margin",
    confidence: 0.88,
    offer_discount_percentage: 25,
    offer_coupon_code: null,
    offer_urgency: ["Ends soon"],
    cta_primary: "Shop now",
    cta_analysis: "Competitors are using direct response CTAs to convert existing demand quickly.",
    product_categories: ["Platform"],
    positioning_angle: "Savings-led positioning is framing the market conversation.",
    supporting_evidence: [{ label: "Discount depth", detail: "Average discount reached 25%" }],
    affected_competitors: ["A", "B"],
    source_type: "cross_channel",
    priority_level: "high",
    impact_area: "conversion",
    created_at: "2026-04-05T10:00:00.000Z",
    ...overrides,
  };
}

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert-1",
    workspace_id: "workspace-1",
    alert_rule_id: null,
    title: "Promo spike",
    description: "Competitor campaigns spiked this week.",
    severity: "high",
    category: "activity_spike",
    is_read: false,
    is_dismissed: false,
    metadata: {},
    competitor_id: null,
    created_at: "2026-04-05T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildDashboardDecisionModel", () => {
  it("prioritizes setup actions when the workspace is still empty", () => {
    const model = buildDashboardDecisionModel({
      stats: {
        newsletters: 0,
        competitors: 0,
        completedAnalyses: 0,
        metaAds: 0,
        activeAds: 0,
        inboxItems: 0,
        insightCount: 0,
      },
      alerts: [],
      insights: [],
      analytics: emptyAnalytics,
      gmailConnected: false,
      usage: baseUsage,
      limits: {
        competitors: 3,
        newsletters_per_month: 200,
        analyses_per_month: 50,
      },
    });

    expect(model.recommendedActions.map((action) => action.title)).toEqual(
      expect.arrayContaining(["Connect Gmail ingestion", "Add tracked competitors"]),
    );
  });

  it("detects weekly spikes as anomalies", () => {
    const analytics: AnalyticsData = {
      ...emptyAnalytics,
      newslettersByWeek: [
        { week: "2026-W14", count: 12 },
        { week: "2026-W13", count: 4 },
      ],
      adsByWeek: [
        { week: "2026-W14", count: 6 },
        { week: "2026-W13", count: 2 },
      ],
    };

    const model = buildDashboardDecisionModel({
      stats: {
        newsletters: 30,
        competitors: 4,
        completedAnalyses: 10,
        metaAds: 12,
        activeAds: 5,
        inboxItems: 30,
        insightCount: 4,
      },
      alerts: [makeAlert()],
      insights: [makeInsight()],
      analytics,
      gmailConnected: true,
      usage: { ...baseUsage, competitors: 2, newsletters_this_month: 30, analyses_this_month: 8 },
      limits: {
        competitors: 10,
        newsletters_per_month: 2000,
        analyses_per_month: 500,
      },
    });

    expect(model.anomalies.some((anomaly) => anomaly.title === "Newsletter spike")).toBe(true);
    expect(model.anomalies.some((anomaly) => anomaly.title === "Paid ads spike")).toBe(true);
  });

  it("surfaces high-priority insights ahead of lower-priority ones", () => {
    const highInsight = makeInsight({
      id: "insight-high",
      title: "Aggressive price compression",
      priority_level: "high",
    });
    const lowInsight = makeInsight({
      id: "insight-low",
      title: "Seasonal copy trend",
      priority_level: "low",
    });

    const model = buildDashboardDecisionModel({
      stats: {
        newsletters: 20,
        competitors: 3,
        completedAnalyses: 6,
        metaAds: 8,
        activeAds: 3,
        inboxItems: 20,
        insightCount: 2,
      },
      alerts: [],
      insights: [lowInsight, highInsight],
      analytics: emptyAnalytics,
      gmailConnected: true,
      usage: { ...baseUsage, competitors: 3, newsletters_this_month: 20, analyses_this_month: 4 },
      limits: {
        competitors: 10,
        newsletters_per_month: 2000,
        analyses_per_month: 500,
      },
    });

    expect(model.prioritizedInsights[0]?.id).toBe("insight-high");
  });

  it("orders equally-prioritized insights by impact", () => {
    const brandingInsight = makeInsight({
      id: "insight-branding",
      title: "Brand narrative shift",
      priority_level: "medium",
      impact_area: "branding",
      confidence: 0.91,
    });
    const conversionInsight = makeInsight({
      id: "insight-conversion",
      title: "Checkout discount pressure",
      priority_level: "medium",
      impact_area: "conversion",
      confidence: 0.71,
    });

    const model = buildDashboardDecisionModel({
      stats: {
        newsletters: 18,
        competitors: 3,
        completedAnalyses: 5,
        metaAds: 6,
        activeAds: 2,
        inboxItems: 18,
        insightCount: 2,
      },
      alerts: [],
      insights: [brandingInsight, conversionInsight],
      analytics: emptyAnalytics,
      gmailConnected: true,
      usage: { ...baseUsage, competitors: 3, newsletters_this_month: 18, analyses_this_month: 5 },
      limits: {
        competitors: 10,
        newsletters_per_month: 2000,
        analyses_per_month: 500,
      },
    });

    expect(model.prioritizedInsights[0]?.id).toBe("insight-conversion");
  });

  it("builds an AI summary that explains change and priority", () => {
    const analytics: AnalyticsData = {
      ...emptyAnalytics,
      competitorActivity: [{ competitor: "Lovable", newsletters: 4, ads: 2 }],
      newslettersByWeek: [
        { week: "2026-W14", count: 10 },
        { week: "2026-W13", count: 5 },
      ],
    };

    const model = buildDashboardDecisionModel({
      stats: {
        newsletters: 14,
        competitors: 3,
        completedAnalyses: 6,
        metaAds: 4,
        activeAds: 2,
        inboxItems: 14,
        insightCount: 1,
      },
      alerts: [],
      insights: [makeInsight({ affected_competitors: ["Lovable"] })],
      analytics,
      gmailConnected: true,
      usage: { ...baseUsage, competitors: 3, newsletters_this_month: 14, analyses_this_month: 6 },
      limits: {
        competitors: 10,
        newsletters_per_month: 2000,
        analyses_per_month: 500,
      },
    });

    expect(model.aiSummary.whatChangedToday).toContain("Lovable");
    expect(model.aiSummary.whatMattersMost).toContain("top conversion priority");
  });
});
