import { describe, expect, it } from "vitest";
import {
  buildCompetitorIntelligenceSnapshots,
  type CompetitorDirectoryEntry,
  type CompetitorInsightSignal,
  type CompetitorMetaAdSignal,
  type CompetitorNewsletterSignal,
} from "@/lib/competitor-intelligence";

const competitors: CompetitorDirectoryEntry[] = [
  {
    id: "comp-1",
    name: "Lovable",
    website: "https://lovable.dev",
    description: "AI builder",
    domains: ["lovable.dev"],
    is_monitored: true,
  },
  {
    id: "comp-2",
    name: "Acme",
    website: "https://acme.com",
    description: null,
    domains: ["acme.com"],
    is_monitored: true,
  },
];

const newsletters: CompetitorNewsletterSignal[] = [
  {
    id: "nl-1",
    competitorId: "comp-1",
    subject: "Launch week offer",
    fromName: "Lovable",
    fromEmail: "news@mail.lovable.dev",
    receivedAt: "2026-04-06T09:00:00.000Z",
    campaignType: "launch",
    mainMessage: "Ship faster with AI",
    discountPercentage: 30,
    couponCode: "LAUNCH30",
    freeShipping: false,
    productCategories: ["AI builder", "Landing pages"],
    urgencySignals: ["Ends Friday"],
    strategyTakeaways: ["Launch urgency"],
    callsToAction: ["Start free"],
  },
  {
    id: "nl-2",
    competitorId: "comp-1",
    subject: "Referral push",
    fromName: "Lovable",
    fromEmail: "team@lovable.dev",
    receivedAt: "2026-04-04T11:00:00.000Z",
    campaignType: "referral",
    mainMessage: "Invite a teammate and earn credits",
    discountPercentage: null,
    couponCode: null,
    freeShipping: false,
    productCategories: ["AI builder"],
    urgencySignals: [],
    strategyTakeaways: ["Referral mechanics"],
    callsToAction: ["Invite team"],
  },
  {
    id: "nl-3",
    competitorId: "comp-2",
    subject: "Feature roundup",
    fromName: "Acme",
    fromEmail: "hi@acme.com",
    receivedAt: "2026-04-01T10:00:00.000Z",
    campaignType: "product",
    mainMessage: "All your workflows in one place",
    discountPercentage: null,
    couponCode: null,
    freeShipping: false,
    productCategories: ["Workflow"],
    urgencySignals: [],
    strategyTakeaways: ["Product breadth"],
    callsToAction: ["See updates"],
  },
];

const metaAds: CompetitorMetaAdSignal[] = [
  {
    id: "ad-1",
    competitorId: "comp-1",
    pageName: "Lovable",
    firstSeenAt: "2026-04-05T08:00:00.000Z",
    lastSeenAt: "2026-04-06T10:00:00.000Z",
    isActive: true,
    ctaType: "learn_more",
    body: "See what teams ship with Lovable",
    headline: "Build product faster",
  },
];

const insights: CompetitorInsightSignal[] = [
  {
    id: "insight-1",
    title: "Lovable is leaning into launch urgency",
    campaignType: "launch",
    mainMessage: "Lovable is pairing credits with urgency-led launch framing.",
    positioningAngle: "AI shipping speed",
    strategicTakeaway: "Expect them to convert existing demand quickly.",
    priorityLevel: "high",
    impactArea: "conversion",
    productCategories: ["AI builder"],
    createdAt: "2026-04-06T12:00:00.000Z",
    affectedCompetitors: ["lovable"],
  },
];

describe("buildCompetitorIntelligenceSnapshots", () => {
  it("builds timeline entries ordered by recent activity", () => {
    const [lovable] = buildCompetitorIntelligenceSnapshots({
      competitors,
      newsletters,
      metaAds,
      insights,
    });

    expect(lovable.competitorName).toBe("Lovable");
    expect(lovable.campaignTimeline[0]?.source).toBe("insight");
    expect(lovable.campaignTimeline[1]?.source).toBe("meta_ad");
  });

  it("derives promo and category focus signals from newsletter history", () => {
    const [lovable] = buildCompetitorIntelligenceSnapshots({
      competitors,
      newsletters,
      metaAds,
      insights,
    });

    expect(lovable.promoBehavior.profile).toBe("aggressive");
    expect(lovable.promoBehavior.averageDiscount).toBe(30);
    expect(lovable.categoryFocus[0]?.category).toBe("AI builder");
  });

  it("surfaces strengths, weaknesses and opportunities from multi-channel behavior", () => {
    const [lovable] = buildCompetitorIntelligenceSnapshots({
      competitors,
      newsletters,
      metaAds,
      insights,
    });

    expect(lovable.strengths.some((item) => item.includes("strongest observed activity footprints"))).toBe(true);
    expect(lovable.opportunities.some((item) => item.includes("value framing"))).toBe(true);
    expect(lovable.topSignals[0]).toMatchObject({
      priority: "high",
      impact: "conversion",
    });
  });
});
