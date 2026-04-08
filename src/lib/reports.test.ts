import { describe, expect, it } from "vitest";
import {
  buildReportPayload,
  getNextScheduledRun,
  type ReportBuilderContext,
  type ReportScheduleInput,
} from "./reports";

const baseSchedule: ReportScheduleInput = {
  name: "Weekly pulse",
  templateKey: "weekly_competitor_pulse",
  frequency: "weekly",
  dayOfWeek: 1,
  hourOfDay: 9,
  minuteOfHour: 0,
  timezone: "UTC",
  rangeDays: 7,
  isActive: true,
};

const baseContext: ReportBuilderContext = {
  workspaceId: "workspace-1",
  workspaceName: "Acme Ops",
  generatedAt: "2026-04-06T09:00:00.000Z",
  rangeDays: 30,
  analytics: {
    summary: {
      rangeDays: 30,
      totalNewslettersInRange: 24,
      totalAdsInRange: 8,
      totalInsightsInRange: 5,
      activeCompetitorsInRange: 3,
      totalCompetitors: 4,
      attributedNewslettersInRange: 20,
      unattributedNewslettersInRange: 4,
      promotionRate: 52,
      urgencyRate: 38,
      newsletterGrowthRate: 12,
      adGrowthRate: 18,
      averageDiscount: 24,
      maxDiscount: 40,
      freeShippingRate: 18,
      lastInboxActivity: "2026-04-05T09:00:00.000Z",
      lastAdActivity: "2026-04-05T08:00:00.000Z",
    },
    weeklyActivity: [
      { week: "W14", newsletters: 8, ads: 2, insights: 1 },
      { week: "W15", newsletters: 10, ads: 3, insights: 2 },
    ],
    promotionFrequency: [
      { competitor: "Rival A", promos: 4, total: 6 },
      { competitor: "Rival B", promos: 2, total: 5 },
    ],
    ctaDistribution: [
      { cta: "Shop now", count: 8 },
      { cta: "Learn more", count: 3 },
    ],
    categoryDistribution: [
      { category: "Sneakers", count: 6 },
      { category: "Accessories", count: 3 },
    ],
    urgencyFrequency: [
      { type: "limited time", count: 5 },
      { type: "ends tonight", count: 3 },
    ],
    campaignTypes: [
      { type: "promotion", count: 8 },
      { type: "product_launch", count: 4 },
    ],
    shareOfVoice: [
      { competitor: "Rival A", signalShare: 44.2, newsletters: 10, ads: 3 },
      { competitor: "Rival B", signalShare: 31.4, newsletters: 7, ads: 2 },
    ],
    discountDistribution: [
      { band: "0-9%", count: 2 },
      { band: "10-19%", count: 4 },
      { band: "20-29%", count: 5 },
    ],
  },
  insights: [
    {
      id: "insight-1",
      workspace_id: "workspace-1",
      category: "pricing",
      title: "Discount pressure increased",
      campaign_type: "promotion",
      main_message: "Buy now and save 30%",
      what_is_happening: "Rival A pushed deeper discounts.",
      why_it_matters: "Conversion pressure is rising.",
      strategic_implication: "The market is getting more price-sensitive.",
      strategic_takeaway: "Audit your current promotional floor before the next campaign.",
      recommended_response: "Review hero offer positioning.",
      confidence: 0.91,
      offer_discount_percentage: 30,
      offer_coupon_code: "SAVE30",
      offer_urgency: ["limited time"],
      cta_primary: "Shop now",
      cta_analysis: "The CTA is overtly conversion-led.",
      product_categories: ["Sneakers"],
      positioning_angle: "Premium value",
      supporting_evidence: [{ label: "Discount depth", detail: "30% off" }],
      affected_competitors: ["Rival A"],
      source_type: "newsletter",
      priority_level: "high",
      impact_area: "conversion",
      created_at: "2026-04-05T10:00:00.000Z",
    },
    {
      id: "insight-2",
      workspace_id: "workspace-1",
      category: "messaging",
      title: "Messaging shifted toward performance",
      campaign_type: "product_launch",
      main_message: "Train smarter with lighter shoes",
      what_is_happening: "Rival B reframed around performance gains.",
      why_it_matters: "The narrative competes on outcomes, not just price.",
      strategic_implication: "Branding competition is intensifying.",
      strategic_takeaway: "Clarify your own performance narrative and proof points.",
      recommended_response: "Update hero positioning.",
      confidence: 0.82,
      offer_discount_percentage: null,
      offer_coupon_code: null,
      offer_urgency: [],
      cta_primary: "Learn more",
      cta_analysis: "The CTA supports upper-funnel education.",
      product_categories: ["Sneakers"],
      positioning_angle: "Performance outcomes",
      supporting_evidence: [{ label: "Theme", detail: "Performance-led copy" }],
      affected_competitors: ["Rival B"],
      source_type: "insight",
      priority_level: "medium",
      impact_area: "branding",
      created_at: "2026-04-04T10:00:00.000Z",
    },
  ],
  competitorSnapshots: [
    {
      competitorId: "competitor-1",
      competitorName: "Rival A",
      website: "https://rival-a.com",
      description: null,
      domains: ["rival-a.com"],
      activity: {
        newsletters: 10,
        ads: 3,
        insights: 2,
        totalSignals: 15,
        shareOfVoice: 0.44,
        lastActivityAt: "2026-04-05T10:00:00.000Z",
        activeAds: 2,
      },
      campaignTimeline: [
        {
          id: "event-1",
          source: "newsletter",
          title: "Spring drop",
          summary: "Rival A launched a spring promo burst.",
          happenedAt: "2026-04-05T10:00:00.000Z",
          campaignType: "promotion",
        },
      ],
      messagingEvolution: {
        shiftSummary: "Rival A shifted toward premium value.",
        currentThemes: ["Premium value"],
        previousThemes: ["Style-first"],
        emergingAngles: ["Premium value"],
        currentAngles: ["Premium value"],
      },
      promoBehavior: {
        promoRate: 0.66,
        averageDiscount: 28,
        maxDiscount: 40,
        couponUsageRate: 0.4,
        urgencyRate: 0.5,
        freeShippingRate: 0.1,
        profile: "aggressive",
      },
      categoryFocus: [{ category: "Sneakers", count: 6, share: 0.6 }],
      strengths: ["Strong promo cadence"],
      weaknesses: ["Heavy discounting"],
      strategicGaps: ["Weak accessories story"],
      opportunities: ["Differentiate on bundling instead of discounts."],
      topSignals: [
        {
          title: "Discount pressure increased",
          takeaway: "Audit your promotional floor.",
          priority: "high",
          impact: "conversion",
        },
      ],
    },
    {
      competitorId: "competitor-2",
      competitorName: "Rival B",
      website: "https://rival-b.com",
      description: null,
      domains: ["rival-b.com"],
      activity: {
        newsletters: 7,
        ads: 2,
        insights: 1,
        totalSignals: 10,
        shareOfVoice: 0.31,
        lastActivityAt: "2026-04-04T10:00:00.000Z",
        activeAds: 1,
      },
      campaignTimeline: [
        {
          id: "event-2",
          source: "insight",
          title: "Performance narrative shift",
          summary: "Rival B reframed around speed and training efficiency.",
          happenedAt: "2026-04-04T10:00:00.000Z",
          campaignType: "product_launch",
        },
      ],
      messagingEvolution: {
        shiftSummary: "Rival B reframed around performance outcomes.",
        currentThemes: ["Performance"],
        previousThemes: ["General product"],
        emergingAngles: ["Performance"],
        currentAngles: ["Performance"],
      },
      promoBehavior: {
        promoRate: 0.2,
        averageDiscount: 10,
        maxDiscount: 15,
        couponUsageRate: 0.1,
        urgencyRate: 0.1,
        freeShippingRate: 0,
        profile: "light",
      },
      categoryFocus: [{ category: "Sneakers", count: 4, share: 0.5 }],
      strengths: ["Clear positioning"],
      weaknesses: ["Low offer pressure"],
      strategicGaps: ["Limited accessories angle"],
      opportunities: ["Challenge the performance story with social proof."],
      topSignals: [
        {
          title: "Messaging shifted toward performance",
          takeaway: "Clarify your own proof points.",
          priority: "medium",
          impact: "branding",
        },
      ],
    },
  ],
};

describe("getNextScheduledRun", () => {
  it("computes the next weekly run in UTC", () => {
    const nextRun = getNextScheduledRun(baseSchedule, new Date("2026-04-06T08:30:00.000Z"));
    expect(nextRun).toBe("2026-04-06T09:00:00.000Z");
  });

  it("computes the next daily run when the current slot has passed", () => {
    const nextRun = getNextScheduledRun(
      { ...baseSchedule, frequency: "daily", dayOfWeek: null, hourOfDay: 9, minuteOfHour: 15 },
      new Date("2026-04-06T10:00:00.000Z"),
    );
    expect(nextRun).toBe("2026-04-07T09:15:00.000Z");
  });
});

describe("buildReportPayload", () => {
  it("builds a weekly competitor pulse with charts and actions", () => {
    const report = buildReportPayload(baseContext, "weekly_competitor_pulse");

    expect(report.templateKey).toBe("weekly_competitor_pulse");
    expect(report.charts).toHaveLength(2);
    expect(report.actions.length).toBeGreaterThan(0);
    expect(report.summary.whatChanged).toContain("Rival A");
  });

  it("builds a promo digest with competitor promo sections", () => {
    const report = buildReportPayload(baseContext, "promo_digest");

    expect(report.templateKey).toBe("promo_digest");
    expect(report.sections.some((section) => section.id === "competitor-promo-matrix")).toBe(true);
    expect(report.insights[0]?.title).toBe("Discount pressure increased");
  });

  it("builds a messaging analysis with messaging-focused sections", () => {
    const report = buildReportPayload(baseContext, "messaging_analysis");

    expect(report.templateKey).toBe("messaging_analysis");
    expect(report.sections.some((section) => section.id === "messaging-brief")).toBe(true);
    expect(report.sections.some((section) => section.id === "strategic-opportunities")).toBe(true);
  });
});
