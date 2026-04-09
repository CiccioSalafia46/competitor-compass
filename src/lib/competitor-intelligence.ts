import { normalizeImpactArea, type InsightImpactArea, type InsightPriorityLevel } from "./insight-priority.ts";

export type CompetitorDirectoryEntry = {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  domains: string[] | null;
  is_monitored: boolean;
};

export type CompetitorNewsletterSignal = {
  id: string;
  competitorId: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  receivedAt: string | null;
  campaignType: string | null;
  mainMessage: string | null;
  discountPercentage: number | null;
  couponCode: string | null;
  freeShipping: boolean;
  productCategories: string[];
  urgencySignals: string[];
  strategyTakeaways: string[];
  callsToAction: string[];
};

export type CompetitorMetaAdSignal = {
  id: string;
  competitorId: string;
  pageName: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  isActive: boolean | null;
  ctaType: string | null;
  body: string | null;
  headline: string | null;
};

export type CompetitorInsightSignal = {
  id: string;
  title: string;
  campaignType: string | null;
  mainMessage: string | null;
  positioningAngle: string | null;
  strategicTakeaway: string | null;
  priorityLevel: string | null;
  impactArea: string | null;
  productCategories: string[];
  createdAt: string | null;
  affectedCompetitors: string[];
};

export type CompetitorTimelineEvent = {
  id: string;
  source: "newsletter" | "meta_ad" | "insight";
  title: string;
  summary: string;
  happenedAt: string | null;
  campaignType: string | null;
};

export type CompetitorMessagingEvolution = {
  shiftSummary: string;
  currentThemes: string[];
  previousThemes: string[];
  emergingAngles: string[];
  currentAngles: string[];
};

export type CompetitorPromoBehavior = {
  promoRate: number;
  averageDiscount: number;
  maxDiscount: number;
  couponUsageRate: number;
  urgencyRate: number;
  freeShippingRate: number;
  profile: "aggressive" | "balanced" | "light";
};

export type CompetitorCategoryFocus = {
  category: string;
  count: number;
  share: number;
};

export type CompetitorStrategicSignal = {
  title: string;
  takeaway: string;
  priority: InsightPriorityLevel;
  impact: InsightImpactArea;
};

export type CompetitorActivitySummary = {
  newsletters: number;
  ads: number;
  insights: number;
  totalSignals: number;
  shareOfVoice: number;
  lastActivityAt: string | null;
  activeAds: number;
};

/** Campaign-type breakdown — powers the campaign clusters bar chart. */
export type CompetitorCampaignCluster = {
  type: string;
  count: number;
  share: number;
};

/** Monthly activity counts — powers the behavior trends area chart. */
export type CompetitorMonthlyActivity = {
  /** Human-readable label, e.g. "Mar 25". */
  month: string;
  newsletters: number;
  ads: number;
  insights: number;
};

export type CompetitorIntelligenceSnapshot = {
  competitorId: string;
  competitorName: string;
  website: string | null;
  description: string | null;
  domains: string[];
  activity: CompetitorActivitySummary;
  campaignTimeline: CompetitorTimelineEvent[];
  messagingEvolution: CompetitorMessagingEvolution;
  promoBehavior: CompetitorPromoBehavior;
  categoryFocus: CompetitorCategoryFocus[];
  /** Derived narrative combining channel mix, pricing posture and positioning angles. */
  positioningStrategy: string;
  /** Detected behavioral patterns (cadence, mechanics, launch patterns). */
  recurringPatterns: string[];
  /** Distribution of campaign types across all signals. */
  campaignClusters: CompetitorCampaignCluster[];
  /** Monthly activity over the last 6 months for trend visualization. */
  activityByMonth: CompetitorMonthlyActivity[];
  strengths: string[];
  weaknesses: string[];
  strategicGaps: string[];
  opportunities: string[];
  topSignals: CompetitorStrategicSignal[];
};

export type CompetitorIntelligenceResponse = {
  workspaceId: string;
  generatedAt: string;
  competitors: CompetitorIntelligenceSnapshot[];
};

type BuildCompetitorIntelligenceParams = {
  competitors: CompetitorDirectoryEntry[];
  newsletters: CompetitorNewsletterSignal[];
  metaAds: CompetitorMetaAdSignal[];
  insights: CompetitorInsightSignal[];
};

function formatLabel(value: string | null | undefined, fallback: string) {
  if (!value || !value.trim()) {
    return fallback;
  }

  return value.replaceAll("_", " ").trim();
}

function normalizeCompetitorLabel(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function uniqueStrings(values: Array<string | null | undefined>, limit = Infinity) {
  const unique = values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .filter((value, index, array) => array.indexOf(value) === index);

  return unique.slice(0, limit);
}

function getTime(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareByDateDesc<T extends { happenedAt?: string | null; createdAt?: string | null; receivedAt?: string | null; lastSeenAt?: string | null; firstSeenAt?: string | null }>(
  left: T,
  right: T,
) {
  const leftTime =
    getTime(left.happenedAt) ||
    getTime(left.createdAt) ||
    getTime(left.receivedAt) ||
    getTime(left.lastSeenAt) ||
    getTime(left.firstSeenAt);
  const rightTime =
    getTime(right.happenedAt) ||
    getTime(right.createdAt) ||
    getTime(right.receivedAt) ||
    getTime(right.lastSeenAt) ||
    getTime(right.firstSeenAt);

  return rightTime - leftTime;
}

function countValues(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function topEntries(map: Map<string, number>, limit = 5) {
  return [...map.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit);
}

function classifyPromoProfile(promoRate: number, averageDiscount: number) {
  if (promoRate >= 0.65 || averageDiscount >= 30) {
    return "aggressive" as const;
  }

  if (promoRate >= 0.3 || averageDiscount >= 15) {
    return "balanced" as const;
  }

  return "light" as const;
}

function toPriority(value: string | null | undefined): InsightPriorityLevel {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  if (value === "critical") {
    return "high";
  }

  return "low";
}

function toImpact(value: string | null | undefined): InsightImpactArea {
  return normalizeImpactArea(value) ?? "branding";
}

function buildCategoryFocus(
  newsletters: CompetitorNewsletterSignal[],
  insights: CompetitorInsightSignal[],
) {
  const categoryCounts = countValues(
    newsletters.flatMap((item) => item.productCategories).concat(insights.flatMap((item) => item.productCategories)),
  );
  const total = [...categoryCounts.values()].reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return [] as CompetitorCategoryFocus[];
  }

  return topEntries(categoryCounts, 5).map(([category, count]) => ({
    category,
    count,
    share: count / total,
  }));
}

function buildMessagingEvolution(
  competitorName: string,
  newsletters: CompetitorNewsletterSignal[],
  insights: CompetitorInsightSignal[],
) {
  const recentMessages = [...newsletters]
    .sort(compareByDateDesc)
    .map((item) => item.mainMessage)
    .filter((value): value is string => Boolean(value && value.trim()))
    .slice(0, 3);
  const previousMessages = [...newsletters]
    .sort(compareByDateDesc)
    .map((item) => item.mainMessage)
    .filter((value): value is string => Boolean(value && value.trim()))
    .slice(3, 6);
  const currentAngles = uniqueStrings(
    insights
      .sort(compareByDateDesc)
      .map((item) => item.positioningAngle)
      .slice(0, 3),
    3,
  );
  const previousAngles = uniqueStrings(
    insights
      .sort(compareByDateDesc)
      .map((item) => item.positioningAngle)
      .slice(3, 6),
    3,
  );
  const emergingAngles = currentAngles.filter((angle) => !previousAngles.includes(angle));

  let shiftSummary = `${competitorName} is still building a detectable messaging history.`;
  if (recentMessages.length > 0 && previousMessages.length > 0) {
    shiftSummary = `${competitorName} has shifted from "${previousMessages[0]}" toward "${recentMessages[0]}".`;
  } else if (recentMessages.length > 0) {
    shiftSummary = `${competitorName} is currently leading with "${recentMessages[0]}".`;
  }

  if (emergingAngles.length > 0) {
    shiftSummary += ` A newer positioning angle is emerging around ${emergingAngles.join(", ")}.`;
  } else if (currentAngles.length > 0) {
    shiftSummary += ` Current positioning remains anchored in ${currentAngles.join(", ")}.`;
  }

  return {
    shiftSummary,
    currentThemes: uniqueStrings(recentMessages, 3),
    previousThemes: uniqueStrings(previousMessages, 3),
    emergingAngles,
    currentAngles,
  } satisfies CompetitorMessagingEvolution;
}

function buildPromoBehavior(newsletters: CompetitorNewsletterSignal[]) {
  if (newsletters.length === 0) {
    return {
      promoRate: 0,
      averageDiscount: 0,
      maxDiscount: 0,
      couponUsageRate: 0,
      urgencyRate: 0,
      freeShippingRate: 0,
      profile: "light",
    } satisfies CompetitorPromoBehavior;
  }

  const discountValues = newsletters
    .map((item) => item.discountPercentage)
    .filter((value): value is number => typeof value === "number");
  const campaignsWithPromo = newsletters.filter(
    (item) =>
      typeof item.discountPercentage === "number" ||
      Boolean(item.couponCode) ||
      item.freeShipping ||
      item.urgencySignals.length > 0,
  ).length;
  const couponUsageCount = newsletters.filter((item) => Boolean(item.couponCode)).length;
  const urgencyCount = newsletters.filter((item) => item.urgencySignals.length > 0).length;
  const freeShippingCount = newsletters.filter((item) => item.freeShipping).length;
  const averageDiscount =
    discountValues.length > 0
      ? discountValues.reduce((sum, value) => sum + value, 0) / discountValues.length
      : 0;
  const maxDiscount = discountValues.length > 0 ? Math.max(...discountValues) : 0;
  const promoRate = campaignsWithPromo / newsletters.length;

  return {
    promoRate,
    averageDiscount,
    maxDiscount,
    couponUsageRate: couponUsageCount / newsletters.length,
    urgencyRate: urgencyCount / newsletters.length,
    freeShippingRate: freeShippingCount / newsletters.length,
    profile: classifyPromoProfile(promoRate, averageDiscount),
  } satisfies CompetitorPromoBehavior;
}

function buildTimeline(
  newsletters: CompetitorNewsletterSignal[],
  metaAds: CompetitorMetaAdSignal[],
  insights: CompetitorInsightSignal[],
) {
  const newsletterEvents: CompetitorTimelineEvent[] = newsletters.map((item) => ({
    id: `newsletter-${item.id}`,
    source: "newsletter",
    title: item.subject?.trim() || `${formatLabel(item.campaignType, "Email campaign")} sent`,
    summary:
      item.mainMessage?.trim() ||
      `${item.fromName || item.fromEmail || "Unknown sender"} pushed a ${formatLabel(item.campaignType, "campaign")} message.`,
    happenedAt: item.receivedAt,
    campaignType: item.campaignType,
  }));

  const adEvents: CompetitorTimelineEvent[] = metaAds.map((item) => ({
    id: `meta-ad-${item.id}`,
    source: "meta_ad",
    title: item.headline?.trim() || item.pageName?.trim() || "Meta ad observed",
    summary:
      item.body?.trim() ||
      `${item.pageName || "This competitor"} is supporting demand with ${formatLabel(item.ctaType, "paid social")} creative.`,
    happenedAt: item.lastSeenAt || item.firstSeenAt,
    campaignType: item.ctaType,
  }));

  const insightEvents: CompetitorTimelineEvent[] = insights.map((item) => ({
    id: `insight-${item.id}`,
    source: "insight",
    title: item.title,
    summary: item.strategicTakeaway?.trim() || item.mainMessage?.trim() || "Strategic signal detected.",
    happenedAt: item.createdAt,
    campaignType: item.campaignType,
  }));

  return [...newsletterEvents, ...adEvents, ...insightEvents].sort(compareByDateDesc).slice(0, 10);
}

function buildStrategicAssessment(params: {
  competitorName: string;
  newsletters: CompetitorNewsletterSignal[];
  metaAds: CompetitorMetaAdSignal[];
  insights: CompetitorInsightSignal[];
  categoryFocus: CompetitorCategoryFocus[];
  promoBehavior: CompetitorPromoBehavior;
  marketCategories: string[];
  maxTotalSignals: number;
  totalSignals: number;
}) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const strategicGaps: string[] = [];
  const opportunities: string[] = [];

  if (params.totalSignals > 0 && params.totalSignals >= Math.max(4, params.maxTotalSignals * 0.65)) {
    strengths.push(`${params.competitorName} has one of the strongest observed activity footprints in the workspace.`);
  }

  if (params.newsletters.length >= 5) {
    strengths.push(`${params.competitorName} sustains a consistent campaign cadence across owned channels.`);
  }

  if (params.metaAds.length >= 2 && params.newsletters.length >= 2) {
    strengths.push(`${params.competitorName} reinforces email activity with paid distribution instead of relying on a single channel.`);
  }

  if (params.categoryFocus[0] && params.categoryFocus[0].share >= 0.35) {
    strengths.push(`${params.competitorName} owns a clear category narrative around ${params.categoryFocus[0].category}.`);
  }

  if (params.promoBehavior.profile === "aggressive") {
    weaknesses.push(`${params.competitorName} leans heavily on promotional mechanics, which can erode pricing power over time.`);
    opportunities.push(`Counter ${params.competitorName}'s discount pressure with stronger value framing instead of matching their promo depth.`);
  } else if (params.promoBehavior.profile === "light") {
    opportunities.push(`${params.competitorName} is not especially promotion-led, leaving room to win short-term demand with sharper offer mechanics.`);
  }

  if (params.metaAds.length === 0 && params.newsletters.length >= 4) {
    weaknesses.push(`${params.competitorName} shows little evidence of paid amplification behind its owned-channel campaigns.`);
    opportunities.push(`Use paid media to capture demand while ${params.competitorName} stays mostly email-led.`);
  }

  if (params.categoryFocus.length <= 1 && params.newsletters.length >= 3) {
    weaknesses.push(`${params.competitorName} appears concentrated in a narrow set of categories.`);
  }

  const missingMarketCategories = params.marketCategories.filter(
    (category) => !params.categoryFocus.some((entry) => entry.category === category),
  );
  if (missingMarketCategories.length > 0) {
    strategicGaps.push(`${params.competitorName} has limited visible coverage in ${missingMarketCategories.slice(0, 2).join(" and ")} despite those categories appearing elsewhere in the market feed.`);
    opportunities.push(`Explore whitespace around ${missingMarketCategories.slice(0, 2).join(" and ")} before ${params.competitorName} expands into those areas.`);
  }

  const messagingAngles = uniqueStrings(params.insights.map((item) => item.positioningAngle), 4);
  if (messagingAngles.length === 0) {
    strategicGaps.push(`${params.competitorName} has no strong positioning angle captured yet beyond executional campaigns.`);
  } else if (messagingAngles.length === 1) {
    strategicGaps.push(`${params.competitorName} is repeating a narrow positioning angle (${messagingAngles[0]}), which can make its narrative easier to flank.`);
    opportunities.push(`Challenge ${params.competitorName}'s current angle with a differentiated story before they diversify their message.`);
  }

  if (params.newsletters.length === 0 && params.metaAds.length === 0) {
    weaknesses.push(`${params.competitorName} has no recent competitor signals in the current analysis window.`);
  }

  return {
    strengths: uniqueStrings(strengths, 4),
    weaknesses: uniqueStrings(weaknesses, 4),
    strategicGaps: uniqueStrings(strategicGaps, 4),
    opportunities: uniqueStrings(opportunities, 4),
  };
}

function buildCampaignClusters(
  newsletters: CompetitorNewsletterSignal[],
  metaAds: CompetitorMetaAdSignal[],
  insights: CompetitorInsightSignal[],
): CompetitorCampaignCluster[] {
  const typeCounts = new Map<string, number>();

  for (const item of newsletters) {
    const type = item.campaignType?.trim() || "email";
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }
  for (const item of metaAds) {
    const type = item.ctaType?.trim() || "paid_social";
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }
  for (const item of insights) {
    const type = item.campaignType?.trim() || "insight";
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  const total = [...typeCounts.values()].reduce((sum, value) => sum + value, 0) || 1;

  return topEntries(typeCounts, 7).map(([type, count]) => ({
    type,
    count,
    share: count / total,
  }));
}

function buildActivityByMonth(
  newsletters: CompetitorNewsletterSignal[],
  metaAds: CompetitorMetaAdSignal[],
  insights: CompetitorInsightSignal[],
): CompetitorMonthlyActivity[] {
  // Build a bucket for each of the last 6 calendar months.
  const buckets = new Map<string, { newsletters: number; ads: number; insights: number }>();

  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - offset);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { newsletters: 0, ads: 0, insights: 0 });
  }

  function toMonthKey(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  for (const item of newsletters) {
    const key = toMonthKey(item.receivedAt);
    const bucket = key ? buckets.get(key) : null;
    if (bucket) bucket.newsletters++;
  }
  for (const item of metaAds) {
    const key = toMonthKey(item.lastSeenAt ?? item.firstSeenAt);
    const bucket = key ? buckets.get(key) : null;
    if (bucket) bucket.ads++;
  }
  for (const item of insights) {
    const key = toMonthKey(item.createdAt);
    const bucket = key ? buckets.get(key) : null;
    if (bucket) bucket.insights++;
  }

  return [...buckets.entries()].map(([key, counts]) => {
    const [yearStr, monthStr] = key.split("-");
    const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    return {
      month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      ...counts,
    };
  });
}

function buildPositioningStrategy(params: {
  competitorName: string;
  newsletters: CompetitorNewsletterSignal[];
  metaAds: CompetitorMetaAdSignal[];
  insights: CompetitorInsightSignal[];
  categoryFocus: CompetitorCategoryFocus[];
  promoBehavior: CompetitorPromoBehavior;
}): string {
  const angles = uniqueStrings(
    [...params.insights].sort(compareByDateDesc).map((item) => item.positioningAngle),
    3,
  );
  const topCategory = params.categoryFocus[0];
  const { profile, averageDiscount } = params.promoBehavior;
  const parts: string[] = [];

  // Core narrative angle
  if (angles.length >= 2) {
    parts.push(
      `${params.competitorName} is positioning around ${angles[0]} and ${angles[1]}.`,
    );
  } else if (angles.length === 1) {
    parts.push(`${params.competitorName} is anchoring its narrative around ${angles[0]}.`);
  } else if (topCategory) {
    parts.push(
      `${params.competitorName} is focused primarily on the ${topCategory.category} category with no strong positioning angle yet detected.`,
    );
  } else {
    parts.push(
      `${params.competitorName} does not yet have a detectable positioning angle in the current signal window.`,
    );
  }

  // Channel mix
  const hasEmail = params.newsletters.length > 0;
  const hasPaid = params.metaAds.length > 0;
  if (hasEmail && hasPaid) {
    parts.push(
      "It maintains an integrated presence — owned email reinforced by paid Meta distribution.",
    );
  } else if (hasEmail) {
    parts.push("Its visible reach relies primarily on owned email channels.");
  } else if (hasPaid) {
    parts.push("It is predominantly visible through paid social rather than owned email.");
  }

  // Pricing posture
  if (profile === "aggressive") {
    parts.push(
      `Its pricing posture is discount-led, with observed offers averaging ${Math.round(averageDiscount)}% off — a strategy that drives volume but risks margin erosion.`,
    );
  } else if (profile === "balanced") {
    parts.push(
      `Promotional mechanics are used selectively, with offers at an average depth of ${Math.round(averageDiscount)}% — a balanced approach that preserves pricing power.`,
    );
  } else {
    parts.push(
      "It rarely competes on price, suggesting a premium, brand-led, or relationship-first positioning strategy.",
    );
  }

  return parts.join(" ");
}

function buildRecurringPatterns(params: {
  competitorName: string;
  newsletters: CompetitorNewsletterSignal[];
  metaAds: CompetitorMetaAdSignal[];
  insights: CompetitorInsightSignal[];
  promoBehavior: CompetitorPromoBehavior;
  activityByMonth: CompetitorMonthlyActivity[];
}): string[] {
  const patterns: string[] = [];
  const { promoRate, urgencyRate, couponUsageRate, freeShippingRate } = params.promoBehavior;

  if (promoRate >= 0.6) {
    patterns.push(
      `Runs promotional offers in ${Math.round(promoRate * 100)}% of observed campaigns — a dominant promotional playbook.`,
    );
  }

  if (urgencyRate >= 0.5) {
    patterns.push(
      "Consistently applies urgency mechanics (limited time, countdown) in the majority of campaigns.",
    );
  }

  if (couponUsageRate >= 0.4) {
    patterns.push(
      "Regularly distributes coupon codes, indicating a coupon-led acquisition or retention strategy.",
    );
  }

  if (freeShippingRate >= 0.5) {
    patterns.push(
      "Frequently uses free shipping as a primary conversion lever rather than direct discounts.",
    );
  }

  if (params.newsletters.length >= 3 && params.metaAds.length >= 2) {
    patterns.push(
      "Consistently coordinates email campaigns with Meta Ads — a deliberate multi-channel launch pattern.",
    );
  }

  const activeMonths = params.activityByMonth.filter((m) => m.newsletters > 0);
  if (activeMonths.length >= 3) {
    const avg = activeMonths.reduce((sum, m) => sum + m.newsletters, 0) / activeMonths.length;
    if (avg >= 4) {
      patterns.push(
        `Maintains a high email cadence — approximately ${Math.round(avg)} newsletters per active month.`,
      );
    } else if (avg >= 2) {
      patterns.push(
        `Sends at a moderate cadence (~${Math.round(avg)} newsletters/month), suggesting deliberate campaign timing.`,
      );
    }
  }

  const highPriorityInsights = params.insights.filter(
    (item) => item.priorityLevel === "high" || item.priorityLevel === "critical",
  ).length;
  if (highPriorityInsights >= 2) {
    patterns.push(
      `Repeatedly generates high-priority strategic signals — this competitor applies consistent competitive pressure.`,
    );
  }

  return uniqueStrings(patterns, 5);
}

export function buildCompetitorIntelligenceSnapshots({
  competitors,
  newsletters,
  metaAds,
  insights,
}: BuildCompetitorIntelligenceParams): CompetitorIntelligenceSnapshot[] {
  const totalSignalsByCompetitor = new Map<string, number>();
  const normalizedInsightCompetitors = insights.map((item) => ({
    ...item,
    normalizedAffectedCompetitors: (item.affectedCompetitors ?? []).map((entry) => normalizeCompetitorLabel(entry)),
  }));
  const marketCategoryCounts = countValues(
    newsletters.flatMap((item) => item.productCategories).concat(insights.flatMap((item) => item.productCategories)),
  );
  const marketCategories = topEntries(marketCategoryCounts, 3).map(([category]) => category);

  for (const competitor of competitors) {
    const newsletterCount = newsletters.filter((item) => item.competitorId === competitor.id).length;
    const adCount = metaAds.filter((item) => item.competitorId === competitor.id).length;
    const normalizedName = normalizeCompetitorLabel(competitor.name);
    const insightCount = normalizedInsightCompetitors.filter((item) =>
      item.normalizedAffectedCompetitors.includes(normalizedName),
    ).length;
    totalSignalsByCompetitor.set(competitor.id, newsletterCount + adCount + insightCount);
  }

  const maxTotalSignals = Math.max(...totalSignalsByCompetitor.values(), 1);
  const totalWorkspaceSignals = [...totalSignalsByCompetitor.values()].reduce((sum, value) => sum + value, 0) || 1;

  return competitors
    .map((competitor) => {
      const competitorNewsletters = newsletters.filter((item) => item.competitorId === competitor.id);
      const competitorAds = metaAds.filter((item) => item.competitorId === competitor.id);
      const normalizedName = normalizeCompetitorLabel(competitor.name);
      const competitorInsights = normalizedInsightCompetitors.filter((item) =>
        item.normalizedAffectedCompetitors.includes(normalizedName),
      );
      const totalSignals = totalSignalsByCompetitor.get(competitor.id) ?? 0;
      const lastActivityAt = [...competitorNewsletters, ...competitorAds, ...competitorInsights]
        .sort(compareByDateDesc)[0];
      const promoBehavior = buildPromoBehavior(competitorNewsletters);
      const categoryFocus = buildCategoryFocus(competitorNewsletters, competitorInsights);
      const activityByMonth = buildActivityByMonth(competitorNewsletters, competitorAds, competitorInsights);
      const campaignClusters = buildCampaignClusters(competitorNewsletters, competitorAds, competitorInsights);
      const positioningStrategy = buildPositioningStrategy({
        competitorName: competitor.name,
        newsletters: competitorNewsletters,
        metaAds: competitorAds,
        insights: competitorInsights,
        categoryFocus,
        promoBehavior,
      });
      const recurringPatterns = buildRecurringPatterns({
        competitorName: competitor.name,
        newsletters: competitorNewsletters,
        metaAds: competitorAds,
        insights: competitorInsights,
        promoBehavior,
        activityByMonth,
      });
      const topSignals = competitorInsights
        .sort(compareByDateDesc)
        .slice(0, 3)
        .map((item) => ({
          title: item.title,
          takeaway: item.strategicTakeaway?.trim() || item.mainMessage?.trim() || "Strategic signal detected.",
          priority: toPriority(item.priorityLevel),
          impact: toImpact(item.impactArea),
        }));
      const strategicAssessment = buildStrategicAssessment({
        competitorName: competitor.name,
        newsletters: competitorNewsletters,
        metaAds: competitorAds,
        insights: competitorInsights,
        categoryFocus,
        promoBehavior,
        marketCategories,
        maxTotalSignals,
        totalSignals,
      });

      return {
        competitorId: competitor.id,
        competitorName: competitor.name,
        website: competitor.website,
        description: competitor.description,
        domains: competitor.domains ?? [],
        activity: {
          newsletters: competitorNewsletters.length,
          ads: competitorAds.length,
          insights: competitorInsights.length,
          totalSignals,
          shareOfVoice: totalSignals / totalWorkspaceSignals,
          lastActivityAt:
            (lastActivityAt && ("receivedAt" in lastActivityAt
              ? lastActivityAt.receivedAt
              : "lastSeenAt" in lastActivityAt
                ? lastActivityAt.lastSeenAt || lastActivityAt.firstSeenAt
                : lastActivityAt.createdAt)) ?? null,
          activeAds: competitorAds.filter((item) => item.isActive).length,
        },
        campaignTimeline: buildTimeline(competitorNewsletters, competitorAds, competitorInsights),
        messagingEvolution: buildMessagingEvolution(competitor.name, competitorNewsletters, competitorInsights),
        promoBehavior,
        categoryFocus,
        positioningStrategy,
        recurringPatterns,
        campaignClusters,
        activityByMonth,
        strengths: strategicAssessment.strengths,
        weaknesses: strategicAssessment.weaknesses,
        strategicGaps: strategicAssessment.strategicGaps,
        opportunities: strategicAssessment.opportunities,
        topSignals,
      } satisfies CompetitorIntelligenceSnapshot;
    })
    .sort((left, right) => right.activity.totalSignals - left.activity.totalSignals || left.competitorName.localeCompare(right.competitorName));
}
