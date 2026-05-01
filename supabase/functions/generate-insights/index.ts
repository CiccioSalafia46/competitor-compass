import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  HttpError,
  assertVerifiedUser,
  assertWorkspaceAnalyst,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import { assertActiveSubscription } from "../_shared/billing.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";
import { createOpenAiChatCompletion } from "../_shared/openai.ts";

const INSIGHT_CATEGORIES = [
  "pricing",
  "promotions",
  "email_strategy",
  "paid_ads",
  "product_focus",
  "seasonal_strategy",
  "messaging_positioning",
  "cadence_frequency",
] as const;

type InsightCategory = typeof INSIGHT_CATEGORIES[number];
type SourceType = "newsletter" | "meta_ad" | "cross_channel";
type InsightPriorityLevel = "low" | "medium" | "high";
type InsightImpactArea = "traffic" | "conversion" | "branding";

type InsightEvidence = {
  label: string;
  detail: string;
  metric?: string;
  source?: string;
  competitor?: string;
  timeframe?: string;
};

type GeneratedInsight = {
  category: InsightCategory;
  title: string;
  campaign_type: string;
  main_message: string;
  what_is_happening: string;
  why_it_matters: string;
  strategic_implication: string;
  strategic_takeaway: string;
  recommended_response: string;
  confidence: number;
  offer_discount_percentage: number | null;
  offer_coupon_code: string | null;
  offer_urgency: string[];
  cta_primary: string | null;
  cta_analysis: string;
  product_categories: string[];
  positioning_angle: string;
  supporting_evidence: InsightEvidence[];
  affected_competitors: string[];
  source_type: SourceType;
  priority_level: InsightPriorityLevel;
  impact_area: InsightImpactArea;
};

type DistributionEntry = {
  value: string;
  count: number;
};

type CompetitorSnapshot = {
  name: string;
  newsletters: number;
  recentNewsletters30d: number;
  ads: number;
  activeAds: number;
  extractions: number;
  adAnalyses: number;
  averageDiscount: number | null;
  topCampaignTypes: DistributionEntry[];
  topProductCategories: DistributionEntry[];
  topCtas: DistributionEntry[];
  topMessageAngles: DistributionEntry[];
};

type WorkspaceSummary = {
  workspaceId: string;
  workspaceName: string | null;
  timeframeLabel: string;
  competitorCount: number;
  newsletterCount: number;
  extractionCount: number;
  adCount: number;
  adAnalysisCount: number;
  recentNewsletterCount30d: number;
  recentAdCount30d: number;
  activeAdsCount: number;
  averageDiscount: number | null;
  maxDiscount: number | null;
  couponUsageCount: number;
  freeShippingCount: number;
  overlapCompetitors: string[];
  topCampaignTypes: DistributionEntry[];
  topProductCategories: DistributionEntry[];
  topCtas: DistributionEntry[];
  topUrgencySignals: DistributionEntry[];
  topPlatforms: DistributionEntry[];
  topMessageAngles: DistributionEntry[];
  topOfferAngles: DistributionEntry[];
  topFunnelIntents: DistributionEntry[];
  topCreativePatterns: DistributionEntry[];
  topAudienceClues: DistributionEntry[];
  topTags: DistributionEntry[];
  topSeasonalSignals: DistributionEntry[];
  competitorSnapshots: CompetitorSnapshot[];
  newsletterSubjectSamples: Array<{ competitor: string; subject: string; receivedAt: string | null }>;
  newsletterMessageSamples: Array<{ competitor: string; message: string }>;
  adCopySamples: Array<{ competitor: string; body: string; cta: string | null }>;
  takeaways: string[];
};

const log = (step: string, details?: unknown) => {
  console.log(`[GENERATE-INSIGHTS] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function incrementCount(map: Map<string, number>, rawValue: unknown, amount = 1) {
  const value = normalizeString(rawValue);
  if (!value) return;
  map.set(value, (map.get(value) ?? 0) + amount);
}

function topEntries(map: Map<string, number>, limit = 8): DistributionEntry[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function clampConfidence(value: unknown, fallback = 0.68) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(0.99, Math.max(0.3, Number(numberValue.toFixed(2))));
}

function abbreviate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function normalizeArrayOfStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return [item.trim()];
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        return [
          record.label,
          record.name,
          record.value,
          record.type,
          record.cta,
          record.text,
          record.signal,
          record.title,
        ]
          .map((entry) => normalizeString(entry))
          .filter(Boolean)
          .slice(0, 1);
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.values(record)
      .map((entry) => normalizeString(entry))
      .filter(Boolean);
  }

  return [];
}

function normalizePriorityLevel(value: unknown): InsightPriorityLevel | null {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  if (value === "critical") return "high";
  if (value === "monitor") return "low";

  return null;
}

function normalizeImpactArea(value: unknown): InsightImpactArea | null {
  if (value === "traffic" || value === "conversion" || value === "branding") {
    return value;
  }

  return null;
}

function clampPercent(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.min(100, Math.max(0, Number(numberValue.toFixed(1))));
}

function uniqueTrimmed(values: string[], limit = 6) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}

function isGenericNarrative(value: string) {
  const normalized = value.toLowerCase();
  return [
    "monitor closely",
    "keep monitoring",
    "stay ahead",
    "optimize messaging",
    "improve conversion",
    "watch this trend",
    "keep an eye on",
    "continue to monitor",
    "evaluate opportunities",
  ].some((snippet) => normalized.includes(snippet));
}

function extractSeasonalSignals(values: string[]) {
  const seasonalMap = new Map<string, number>();
  const seasonalTerms = [
    "spring",
    "summer",
    "autumn",
    "fall",
    "winter",
    "back to school",
    "black friday",
    "cyber monday",
    "easter",
    "christmas",
    "holiday",
    "new year",
    "launch",
    "anniversary",
    "sale",
  ];

  for (const value of values) {
    const normalized = value.toLowerCase();
    for (const term of seasonalTerms) {
      if (normalized.includes(term)) {
        incrementCount(seasonalMap, term);
      }
    }
  }

  return topEntries(seasonalMap, 8).map((entry) => ({
    ...entry,
    value: titleCase(entry.value),
  }));
}

function formatTopItems(entries: DistributionEntry[], limit = 3) {
  if (entries.length === 0) return "none detected";
  return entries
    .slice(0, limit)
    .map((entry) => `${entry.value} (${entry.count})`)
    .join(", ");
}

function buildRecommendedResponse(immediate: string, next30Days: string, measure: string) {
  return `Immediate: ${immediate}\nNext 30 days: ${next30Days}\nMeasure: ${measure}`;
}

type BaseFallbackInsight = Omit<
  GeneratedInsight,
  | "campaign_type"
  | "main_message"
  | "offer_discount_percentage"
  | "offer_coupon_code"
  | "offer_urgency"
  | "cta_primary"
  | "cta_analysis"
  | "product_categories"
  | "positioning_angle"
  | "strategic_takeaway"
  | "priority_level"
  | "impact_area"
>;

function inferImpactArea(category: InsightCategory): InsightImpactArea {
  if (category === "pricing" || category === "promotions" || category === "paid_ads") {
    return "conversion";
  }

  if (category === "email_strategy" || category === "cadence_frequency") {
    return "traffic";
  }

  return "branding";
}

function inferFallbackPriority(
  category: InsightCategory,
  confidence: number,
  evidenceCount: number,
): InsightPriorityLevel {
  const impact = inferImpactArea(category);
  let score = confidence * 100 + evidenceCount * 5;

  if (impact === "conversion") score += 8;
  if (category === "pricing" || category === "promotions" || category === "paid_ads") score += 6;

  if (score >= 90) return "high";
  if (score >= 66) return "medium";
  return "low";
}

function fallbackCampaignType(category: InsightCategory, summary: WorkspaceSummary) {
  return (
    summary.topCampaignTypes[0]?.value ||
    {
      pricing: "Pricing defense",
      promotions: "Promotion push",
      email_strategy: "Email sequence",
      paid_ads: "Paid acquisition",
      product_focus: "Category spotlight",
      seasonal_strategy: "Seasonal push",
      messaging_positioning: "Positioning refresh",
      cadence_frequency: "Cadence optimization",
    }[category]
  );
}

function deriveFallbackStructuredInsight(
  summary: WorkspaceSummary,
  insight: BaseFallbackInsight,
): GeneratedInsight {
  const priorityLevel = inferFallbackPriority(
    insight.category,
    insight.confidence ?? 0.7,
    insight.supporting_evidence.length,
  );
  const impactArea = inferImpactArea(insight.category);
  const productCategories = uniqueTrimmed(
    [
      ...summary.topProductCategories.map((entry) => entry.value),
      ...summary.competitorSnapshots.flatMap((entry) => entry.topProductCategories.map((item) => item.value)),
      ...summary.topTags.map((entry) => entry.value),
    ],
    4,
  );
  const offerUrgency = uniqueTrimmed(summary.topUrgencySignals.map((entry) => entry.value), 4);
  const ctaPrimary = summary.topCtas[0]?.value ?? null;
  const messageAngle = summary.topMessageAngles[0]?.value || summary.topOfferAngles[0]?.value || "Value-led positioning";
  const strategicTakeaway =
    insight.strategic_implication.split(".")[0]?.trim() || insight.why_it_matters.split(".")[0]?.trim() || insight.title;

  return {
    ...insight,
    campaign_type: fallbackCampaignType(insight.category, summary),
    main_message: abbreviate(insight.title, 160),
    offer_discount_percentage:
      insight.category === "pricing" || insight.category === "promotions"
        ? summary.averageDiscount
        : null,
    offer_coupon_code: null,
    offer_urgency: offerUrgency,
    cta_primary: ctaPrimary,
    cta_analysis: ctaPrimary
      ? `Primary calls to action cluster around ${ctaPrimary}, which suggests competitors are optimizing for ${impactArea} moves rather than passive awareness.`
      : `CTA evidence is thin in the current payload, so the stronger signal is how the offer and message framing are driving ${impactArea} behavior.`,
    product_categories:
      productCategories.length > 0
        ? productCategories
        : [titleCase(insight.category.replaceAll("_", " "))],
    positioning_angle: `${messageAngle} is the clearest recurring positioning pattern linked to this insight.`,
    strategic_takeaway: abbreviate(strategicTakeaway, 260),
    priority_level: priorityLevel,
    impact_area: impactArea,
  };
}

function parseJsonObjectFromContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    candidates.push(objectMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeEvidence(rawEvidence: unknown): InsightEvidence[] {
  if (!Array.isArray(rawEvidence)) return [];

  return rawEvidence
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const label = abbreviate(normalizeString(record.label), 120);
      const detail = abbreviate(normalizeString(record.detail), 400);

      if (!label || !detail) return null;

      return {
        label,
        detail,
        metric: abbreviate(normalizeString(record.metric), 80) || undefined,
        source: normalizeString(record.source) || undefined,
        competitor: abbreviate(normalizeString(record.competitor), 120) || undefined,
        timeframe: abbreviate(normalizeString(record.timeframe), 120) || undefined,
      };
    })
    .filter((item): item is InsightEvidence => Boolean(item));
}

function normalizeInsight(
  rawInsight: unknown,
  fallbackCategory: InsightCategory,
): GeneratedInsight | null {
  if (!rawInsight || typeof rawInsight !== "object") return null;

  const record = rawInsight as Record<string, unknown>;
  const category = INSIGHT_CATEGORIES.includes(record.category as InsightCategory)
    ? (record.category as InsightCategory)
    : fallbackCategory;
  const title = abbreviate(normalizeString(record.title), 220);
  const campaignType = abbreviate(normalizeString(record.campaign_type), 120);
  const mainMessage = abbreviate(normalizeString(record.main_message), 420);
  const whatIsHappening = abbreviate(normalizeString(record.what_is_happening), 1600);
  const whyItMatters = abbreviate(normalizeString(record.why_it_matters), 1400);
  const strategicImplication = abbreviate(normalizeString(record.strategic_implication), 1400);
  const strategicTakeaway = abbreviate(normalizeString(record.strategic_takeaway), 700);
  const recommendedResponse = abbreviate(normalizeString(record.recommended_response), 1400);
  const ctaAnalysis = abbreviate(normalizeString(record.cta_analysis), 700);
  const positioningAngle = abbreviate(normalizeString(record.positioning_angle), 420);
  const ctaPrimary = abbreviate(normalizeString(record.cta_primary), 120) || null;
  const sourceType = ["newsletter", "meta_ad", "cross_channel"].includes(normalizeString(record.source_type))
    ? (normalizeString(record.source_type) as SourceType)
    : "cross_channel";
  const affectedCompetitors = Array.isArray(record.affected_competitors)
    ? dedupeStrings(record.affected_competitors.map((item) => normalizeString(item)).filter(Boolean)).slice(0, 8)
    : [];
  const supportingEvidence = normalizeEvidence(record.supporting_evidence).slice(0, 6);
  const offerUrgency = uniqueTrimmed(normalizeArrayOfStrings(record.offer_urgency), 4);
  const productCategories = uniqueTrimmed(normalizeArrayOfStrings(record.product_categories), 4);
  const impactArea = normalizeImpactArea(record.impact_area);
  const priorityLevel = normalizePriorityLevel(record.priority_level);
  const offerCouponCode = abbreviate(normalizeString(record.offer_coupon_code), 80) || null;
  const offerDiscount = clampPercent(record.offer_discount_percentage);

  if (
    !title ||
    !campaignType ||
    !mainMessage ||
    !whatIsHappening ||
    !whyItMatters ||
    !strategicImplication ||
    !strategicTakeaway ||
    !recommendedResponse ||
    !ctaAnalysis ||
    !positioningAngle ||
    !impactArea ||
    !priorityLevel ||
    productCategories.length === 0 ||
    supportingEvidence.length < 3
  ) {
    return null;
  }

  if (
    [
      title,
      mainMessage,
      whyItMatters,
      strategicImplication,
      strategicTakeaway,
      ctaAnalysis,
      positioningAngle,
    ].some(isGenericNarrative)
  ) {
    return null;
  }

  // Reject insights where title and why_it_matters overlap too heavily.
  // Content words = words longer than 3 chars (skip "the", "and", "is", etc.).
  const contentWords = (text: string) =>
    new Set(text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter((w) => w.length > 3));
  const titleWords = contentWords(title);
  const whyWords = contentWords(whyItMatters);
  const overlapCount = [...titleWords].filter((w) => whyWords.has(w)).length;
  if (titleWords.size > 0 && overlapCount > Math.min(titleWords.size, whyWords.size) * 0.5) {
    return null;
  }

  return {
    category,
    title,
    campaign_type: campaignType,
    main_message: mainMessage,
    what_is_happening: whatIsHappening,
    why_it_matters: whyItMatters,
    strategic_implication: strategicImplication,
    strategic_takeaway: strategicTakeaway,
    recommended_response: recommendedResponse,
    confidence: clampConfidence(record.confidence, 0.72),
    offer_discount_percentage: offerDiscount,
    offer_coupon_code: offerCouponCode,
    offer_urgency: offerUrgency,
    cta_primary: ctaPrimary,
    cta_analysis: ctaAnalysis,
    product_categories: productCategories,
    positioning_angle: positioningAngle,
    supporting_evidence: supportingEvidence,
    affected_competitors: affectedCompetitors,
    source_type: sourceType,
    priority_level: priorityLevel,
    impact_area: impactArea,
  };
}

function mergeInsights(primary: GeneratedInsight[], fallback: GeneratedInsight[], minimumCount: number) {
  const merged: GeneratedInsight[] = [];
  const seen = new Set<string>();

  for (const insight of [...primary, ...fallback]) {
    const key = `${insight.category}:${insight.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(insight);
  }

  merged.sort((left, right) => {
    const rightScore = (right.confidence ?? 0) * 100 + right.supporting_evidence.length * 2;
    const leftScore = (left.confidence ?? 0) * 100 + left.supporting_evidence.length * 2;
    return rightScore - leftScore;
  });

  if (merged.length >= minimumCount) {
    return merged;
  }

  return merged;
}

function buildFallbackInsights(summary: WorkspaceSummary, category?: InsightCategory): GeneratedInsight[] {
  const insights: BaseFallbackInsight[] = [];
  const categorySet = new Set(category ? [category] : INSIGHT_CATEGORIES);
  const timeframe = summary.timeframeLabel;
  const topCompetitor = summary.competitorSnapshots[0];

  if (
    categorySet.has("pricing") &&
    summary.extractionCount > 0 &&
    (summary.averageDiscount !== null || summary.couponUsageCount > 0 || summary.freeShippingCount > 0)
  ) {
    insights.push({
      category: "pricing",
      title: "Discount pressure is clustering around repeated offer mechanics",
      what_is_happening: `Newsletter promotions show a recurring discount pattern with an average detected discount of ${summary.averageDiscount ?? 0}% and a max observed discount of ${summary.maxDiscount ?? 0}%. Coupon-led offers and shipping incentives are appearing often enough to shape buyer expectations.`,
      why_it_matters: "Repeated price-led campaigns can compress response rates for full-price launches and force your team into reactive discounting if you do not separate value messaging from promotion messaging.",
      strategic_implication: "Competitors are signaling that conversion velocity matters more than margin purity in the current window. This increases the risk of your offers looking weak if they lack either a clear economic upside or a stronger premium justification.",
      recommended_response: buildRecommendedResponse(
        "Audit current live and scheduled offers against the observed discount floor and decide where you will compete on value, bundle design, or price.",
        "Build a two-track offer calendar: one margin-protected offer architecture and one tactical conversion offer for moments when the market becomes more aggressive.",
        "Track offer response rate, discount depth needed to convert, and the share of campaigns using coupons or shipping incentives."
      ),
      confidence: 0.82,
      supporting_evidence: [
        {
          label: "Average discount level",
          detail: `Observed discount intensity averages ${summary.averageDiscount ?? 0}% across extracted promotional newsletters.`,
          metric: `${summary.averageDiscount ?? 0}% avg`,
          source: "newsletter",
          timeframe,
        },
        {
          label: "Coupon prevalence",
          detail: `${summary.couponUsageCount} extracted campaigns included an explicit coupon code.`,
          metric: `${summary.couponUsageCount} coupon offers`,
          source: "newsletter",
          timeframe,
        },
        {
          label: "Shipping incentive usage",
          detail: `${summary.freeShippingCount} campaigns used free shipping as part of the value proposition.`,
          metric: `${summary.freeShippingCount} shipping offers`,
          source: "newsletter",
          timeframe,
        },
        ...(topCompetitor
          ? [
              {
                label: "Most active competitor in pricing signals",
                detail: `${topCompetitor.name} generated the strongest monitored volume, making it the clearest benchmark for promotional aggression.`,
                metric: `${topCompetitor.extractions} extracted campaigns`,
                source: "newsletter",
                competitor: topCompetitor.name,
                timeframe,
              },
            ]
          : []),
      ],
      affected_competitors: summary.competitorSnapshots.slice(0, 4).map((item) => item.name),
      source_type: "newsletter",
    });
  }

  if (categorySet.has("email_strategy") && summary.newsletterCount > 0) {
    insights.push({
      category: "email_strategy",
      title: "Email is being used as a primary campaign coordination layer",
      what_is_happening: `${summary.newsletterCount} competitor newsletters were captured${summary.recentNewsletterCount30d ? `, with ${summary.recentNewsletterCount30d} arriving in the last 30 days` : ""}. Campaign types concentrate around ${formatTopItems(summary.topCampaignTypes)} and the inbox is carrying repeated commercial motions rather than isolated blasts.`,
      why_it_matters: "When competitors use email as a reliable campaign operating system, they can sequence launches, reminders, urgency, and follow-up faster than teams that treat email as a support channel.",
      strategic_implication: "The competitive bar is not just content quality; it is consistency, timing, and the ability to reinforce the same offer narrative over multiple touches.",
      recommended_response: buildRecommendedResponse(
        "Review your current lifecycle and campaign calendar against the observed category mix and identify missing repeatable plays.",
        "Build at least two repeatable email sequences around your highest-value commercial moments so you are competing on cadence, not just one-off sends.",
        "Track sends per competitor, campaign repetition, and click-through or conversion lift by sequence rather than individual blasts."
      ),
      confidence: 0.8,
      supporting_evidence: [
        {
          label: "Tracked inbox volume",
          detail: `${summary.newsletterCount} newsletters are available for analysis across ${summary.competitorCount} competitors.`,
          metric: `${summary.newsletterCount} newsletters`,
          source: "newsletter",
          timeframe,
        },
        {
          label: "Recent activity",
          detail: `${summary.recentNewsletterCount30d} newsletters landed in the last 30 days, confirming ongoing campaign pressure rather than stale history.`,
          metric: `${summary.recentNewsletterCount30d} in 30d`,
          source: "newsletter",
          timeframe: "Last 30 days",
        },
        {
          label: "Dominant campaign types",
          detail: `The most common extracted campaign types are ${formatTopItems(summary.topCampaignTypes)}.`,
          source: "newsletter",
          timeframe,
        },
      ],
      affected_competitors: summary.competitorSnapshots.slice(0, 5).map((item) => item.name),
      source_type: "newsletter",
    });
  }

  if (categorySet.has("cadence_frequency") && summary.newsletterCount > 0) {
    const topCadenceCompetitor = summary.competitorSnapshots.find((item) => item.newsletters > 0);
    insights.push({
      category: "cadence_frequency",
      title: "The inbox cadence favors brands that stay visible between major launches",
      what_is_happening: "Competitor activity is not limited to tentpole moments. The monitored inbox shows steady send volume, with the heaviest senders sustaining presence while others appear episodic.",
      why_it_matters: "Consistency compounds recall. A competitor that shows up repeatedly between launches can own mental availability even if its creative is not best in class.",
      strategic_implication: "Your planning risk is invisible share-of-voice loss: a weaker but more consistent competitor can train the market to expect their offers and messaging first.",
      recommended_response: buildRecommendedResponse(
        "Benchmark your last 30-day send frequency against the most active tracked competitor and identify your biggest dead zones.",
        "Create a minimum viable cadence rule by audience or product line so commercial silence becomes an explicit exception, not the default.",
        "Monitor sends per week, inactive gaps, and the proportion of campaigns supported by follow-up reminders."
      ),
      confidence: 0.75,
      supporting_evidence: [
        {
          label: "Recent cadence signal",
          detail: `${summary.recentNewsletterCount30d} newsletters were detected in the last 30 days.`,
          metric: `${summary.recentNewsletterCount30d} in 30d`,
          source: "newsletter",
          timeframe: "Last 30 days",
        },
        ...(topCadenceCompetitor
          ? [
              {
                label: "Highest observed sender",
                detail: `${topCadenceCompetitor.name} generated the strongest newsletter volume in the current dataset.`,
                metric: `${topCadenceCompetitor.newsletters} newsletters`,
                source: "newsletter",
                competitor: topCadenceCompetitor.name,
                timeframe,
              },
            ]
          : []),
      ],
      affected_competitors: summary.competitorSnapshots.slice(0, 4).map((item) => item.name),
      source_type: "newsletter",
    });
  }

  if (categorySet.has("paid_ads") && summary.adCount > 0) {
    insights.push({
      category: "paid_ads",
      title: "Paid acquisition is concentrated around a few high-frequency creative plays",
      what_is_happening: `${summary.adCount} ads and ${summary.adAnalysisCount} ad analyses point to recurring use of ${formatTopItems(summary.topPlatforms)}, with CTAs centered on ${formatTopItems(summary.topCtas)} and messaging angles around ${formatTopItems(summary.topMessageAngles)}.`,
      why_it_matters: "When channel execution converges around a few strong CTA and angle combinations, those patterns become the real competitive baseline for paid efficiency.",
      strategic_implication: "If your ads are not positioned against those live patterns, you risk being outframed on both message clarity and user expectation at click time.",
      recommended_response: buildRecommendedResponse(
        "Audit your active paid creative against the top CTA and message-angle combinations competitors are using most often.",
        "Launch controlled tests that deliberately challenge the leading pattern with one higher-clarity offer angle and one differentiated promise.",
        "Track click-through rate, landing-page continuation rate, and message-angle win rate by platform."
      ),
      confidence: 0.84,
      supporting_evidence: [
        {
          label: "Tracked ad volume",
          detail: `${summary.adCount} ads are currently available, including ${summary.activeAdsCount} active creatives.`,
          metric: `${summary.activeAdsCount} active ads`,
          source: "meta_ad",
          timeframe,
        },
        {
          label: "Platform concentration",
          detail: `Top platform distribution is ${formatTopItems(summary.topPlatforms)}.`,
          source: "meta_ad",
          timeframe,
        },
        {
          label: "CTA concentration",
          detail: `The most frequent CTAs are ${formatTopItems(summary.topCtas)}.`,
          source: "meta_ad",
          timeframe,
        },
        {
          label: "Message-angle concentration",
          detail: `Leading paid messaging angles are ${formatTopItems(summary.topMessageAngles)}.`,
          source: "meta_ad",
          timeframe,
        },
      ],
      affected_competitors: summary.competitorSnapshots.filter((item) => item.ads > 0).slice(0, 5).map((item) => item.name),
      source_type: "meta_ad",
    });
  }

  if (categorySet.has("product_focus") && summary.topProductCategories.length > 0) {
    insights.push({
      category: "product_focus",
      title: "Product attention is clustering around a narrow set of commercial priorities",
      what_is_happening: `Across newsletters and ad analyses, the most repeated product categories are ${formatTopItems(summary.topProductCategories)}. That indicates where competitors believe the market is most convertible right now.`,
      why_it_matters: "A concentrated category focus can signal where competitors are seeing demand, margin headroom, or strategic urgency to win share.",
      strategic_implication: "If you are underweight in those categories, you may be missing where market attention is currently being trained. If you are already strong there, the risk becomes commoditization and message crowding.",
      recommended_response: buildRecommendedResponse(
        "Review whether your current campaign and merchandising plan matches the product categories competitors are amplifying most.",
        "Decide where to compete directly versus where to defend with differentiated proof, bundles, or adjacent product narratives.",
        "Track category-level share of campaigns, conversion rate by promoted category, and category profitability under competitive pressure."
      ),
      confidence: 0.79,
      supporting_evidence: [
        {
          label: "Category concentration",
          detail: `Top product categories observed: ${formatTopItems(summary.topProductCategories, 5)}.`,
          source: "cross_channel",
          timeframe,
        },
        ...(summary.competitorSnapshots[0]
          ? [
              {
                label: "Leading competitor category focus",
                detail: `${summary.competitorSnapshots[0].name} is most associated with ${formatTopItems(summary.competitorSnapshots[0].topProductCategories, 3)}.`,
                source: "cross_channel",
                competitor: summary.competitorSnapshots[0].name,
                timeframe,
              },
            ]
          : []),
      ],
      affected_competitors: summary.competitorSnapshots.slice(0, 5).map((item) => item.name),
      source_type: "cross_channel",
    });
  }

  if (categorySet.has("messaging_positioning") && (summary.topMessageAngles.length > 0 || summary.newsletterMessageSamples.length > 0)) {
    insights.push({
      category: "messaging_positioning",
      title: "Competitor messaging is converging around a small set of promise frameworks",
      what_is_happening: `The strongest recurring message patterns are ${formatTopItems(summary.topMessageAngles)}${summary.topOfferAngles.length > 0 ? `, supported by offer angles such as ${formatTopItems(summary.topOfferAngles)}` : ""}. This suggests competitors are leaning on repeatable narratives rather than bespoke campaigns each time.`,
      why_it_matters: "Message convergence makes it easier to benchmark which promises are becoming table stakes, but it also creates whitespace for a stronger differentiated claim.",
      strategic_implication: "You should assume buyers are seeing multiple brands frame value in similar ways. Differentiation now depends on proof, specificity, and channel consistency more than on generic positioning language.",
      recommended_response: buildRecommendedResponse(
        "Map your current homepage, email, and ad messaging against the top promise frameworks showing up in competitor activity.",
        "Refine one signature claim that can be repeated consistently across channels while still being backed by evidence your competitors cannot easily copy.",
        "Track claim repetition across channels, landing-page engagement, and assisted conversion rate for differentiated message variants."
      ),
      confidence: 0.81,
      supporting_evidence: [
        {
          label: "Paid message concentration",
          detail: `Top message angles: ${formatTopItems(summary.topMessageAngles, 5)}.`,
          source: "meta_ad",
          timeframe,
        },
        {
          label: "Offer framing concentration",
          detail: `Top offer angles: ${formatTopItems(summary.topOfferAngles, 5)}.`,
          source: "meta_ad",
          timeframe,
        },
        ...(summary.newsletterMessageSamples[0]
          ? [
              {
                label: "Newsletter proof point",
                detail: `${summary.newsletterMessageSamples[0].competitor} recently pushed: "${abbreviate(summary.newsletterMessageSamples[0].message, 180)}".`,
                source: "newsletter",
                competitor: summary.newsletterMessageSamples[0].competitor,
                timeframe,
              },
            ]
          : []),
      ],
      affected_competitors: summary.competitorSnapshots.slice(0, 5).map((item) => item.name),
      source_type: "cross_channel",
    });
  }

  if (categorySet.has("seasonal_strategy") && summary.topSeasonalSignals.length > 0) {
    insights.push({
      category: "seasonal_strategy",
      title: "Seasonal timing cues are already showing up in live competitive activity",
      what_is_happening: `Seasonal markers detected in subject lines, tags, or offer language include ${formatTopItems(summary.topSeasonalSignals)}. Competitors are using timing-specific framing to increase urgency and relevance.`,
      why_it_matters: "Seasonal framing can reshape click-through and conversion expectations even when the offer itself is not exceptional.",
      strategic_implication: "If you wait to react until the seasonal window peaks, competitors may already have established the reference frame buyers associate with that moment.",
      recommended_response: buildRecommendedResponse(
        "Review upcoming commercial moments and ensure your campaign plan includes explicit seasonal framing where it strengthens relevance.",
        "Prepare pre-season and peak-season message variants so you are not forced into reactive launch timing.",
        "Track seasonal campaign launch timing, open or click lift versus evergreen messages, and conversion rate during the seasonal window."
      ),
      confidence: 0.73,
      supporting_evidence: [
        {
          label: "Detected seasonal signals",
          detail: `Observed seasonal markers: ${formatTopItems(summary.topSeasonalSignals, 5)}.`,
          source: "cross_channel",
          timeframe,
        },
        {
          label: "Tag and subject support",
          detail: `Supporting tag and campaign metadata includes ${formatTopItems(summary.topTags, 5)}.`,
          source: "newsletter",
          timeframe,
        },
      ],
      affected_competitors: summary.competitorSnapshots.slice(0, 4).map((item) => item.name),
      source_type: "cross_channel",
    });
  }

  if (categorySet.has("promotions") && summary.topUrgencySignals.length > 0) {
    insights.push({
      category: "promotions",
      title: "Promotion mechanics are being reinforced with urgency rather than simple price cuts alone",
      what_is_happening: `Urgency language clusters around ${formatTopItems(summary.topUrgencySignals)}, while campaign types skew toward ${formatTopItems(summary.topCampaignTypes)}. Competitors are pairing the offer with a conversion trigger, not just the offer itself.`,
      why_it_matters: "Urgency turns an average offer into a decision prompt. If your promotional architecture is missing a strong trigger, you may underperform even with a comparable discount.",
      strategic_implication: "The market is rewarding campaigns that package price, timing, and CTA into one coherent motion. Promotion design quality matters as much as offer depth.",
      recommended_response: buildRecommendedResponse(
        "Audit your live promotion templates for urgency framing, CTA clarity, and consistency between subject line, creative, and landing page.",
        "Standardize a small library of urgency formats that can be tested across product lines without eroding brand tone.",
        "Track conversion lift by urgency mechanic, CTA variant, and discount depth."
      ),
      confidence: 0.78,
      supporting_evidence: [
        {
          label: "Urgency concentration",
          detail: `Top urgency signals: ${formatTopItems(summary.topUrgencySignals, 5)}.`,
          source: "newsletter",
          timeframe,
        },
        {
          label: "Campaign mix",
          detail: `Promotion-oriented campaign types are led by ${formatTopItems(summary.topCampaignTypes, 5)}.`,
          source: "newsletter",
          timeframe,
        },
        {
          label: "CTA support",
          detail: `Top CTAs across channels are ${formatTopItems(summary.topCtas, 5)}.`,
          source: "cross_channel",
          timeframe,
        },
      ],
      affected_competitors: summary.competitorSnapshots.slice(0, 5).map((item) => item.name),
      source_type: "cross_channel",
    });
  }

  const structuredInsights = insights.map((item) => deriveFallbackStructuredInsight(summary, item));
  return category ? structuredInsights.filter((item) => item.category === category) : structuredInsights;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment is not configured.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { user } = await requireAuthenticatedUser(supabaseAdmin, req);
    await assertVerifiedUser(user);

    const requestBody = await req.json().catch(() => ({}));
    const workspaceId = normalizeString(requestBody?.workspaceId);
    const requestedCategory = normalizeString(requestBody?.category) as InsightCategory | "";
    const category = INSIGHT_CATEGORIES.includes(requestedCategory as InsightCategory)
      ? (requestedCategory as InsightCategory)
      : undefined;
    const SUPPORTED_LANGUAGES = ["en", "it", "de", "fr", "es"] as const;
    const requestedLang = normalizeString(requestBody?.language);
    const language = (SUPPORTED_LANGUAGES as readonly string[]).includes(requestedLang) ? requestedLang : "en";
    const LANGUAGE_NAMES: Record<string, string> = {
      en: "English", it: "Italian", de: "German", fr: "French", es: "Spanish",
    };
    const languageName = LANGUAGE_NAMES[language] ?? "English";

    if (!workspaceId) {
      return jsonResponse({ error: "workspaceId required" }, 400);
    }

    await assertWorkspaceAnalyst(supabaseAdmin, user.id, workspaceId);
    await assertActiveSubscription(supabaseAdmin, workspaceId);

    const { data: allowed } = await supabaseAdmin.rpc("check_rate_limit", {
      _user_id: user.id,
      _workspace_id: workspaceId,
      _endpoint: "generate-insights",
      _max_per_hour: 10,
    });

    if (!allowed) {
      return jsonResponse(
        { error: "Rate limit reached. You can generate insights up to 10 times per hour." },
        429,
      );
    }

    const [
      workspaceResult,
      competitorsResult,
      newslettersResult,
      extractionsResult,
      adsResult,
      adAnalysesResult,
    ] = await Promise.all([
      supabaseAdmin.from("workspaces").select("id, name").eq("id", workspaceId).maybeSingle(),
      supabaseAdmin.from("competitors").select("id, name, website, tags").eq("workspace_id", workspaceId),
      supabaseAdmin
        .from("newsletter_inbox")
        .select("id, competitor_id, subject, from_name, from_email, received_at, tags, is_newsletter")
        .eq("workspace_id", workspaceId)
        .eq("is_newsletter", true)
        .order("received_at", { ascending: false })
        .limit(250),
      supabaseAdmin
        .from("newsletter_extractions")
        .select(
          "id, newsletter_inbox_id, campaign_type, main_message, coupon_code, discount_percentage, free_shipping, product_categories, calls_to_action, urgency_signals, overall_confidence, offers, strategy_takeaways, expiry_date, created_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(250),
      supabaseAdmin
        .from("meta_ads")
        .select(
          "id, competitor_id, page_name, cta_type, is_active, ad_delivery_start_time, ad_delivery_stop_time, first_seen_at, last_seen_at, platforms, publisher_platforms, ad_creative_bodies, ad_creative_link_titles, ad_creative_link_descriptions, created_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(250),
      supabaseAdmin
        .from("meta_ad_analyses")
        .select(
          "id, meta_ad_id, message_angle, offer_angle, funnel_intent, creative_pattern, product_category, strategy_takeaways, urgency_style, audience_clues, overall_confidence, promo_language, created_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(250),
    ]);

    if (
      competitorsResult.error ||
      newslettersResult.error ||
      extractionsResult.error ||
      adsResult.error ||
      adAnalysesResult.error
    ) {
      throw new Error(
        [
          competitorsResult.error?.message,
          newslettersResult.error?.message,
          extractionsResult.error?.message,
          adsResult.error?.message,
          adAnalysesResult.error?.message,
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }

    const workspaceName = workspaceResult.data?.name ?? null;
    const competitors = competitorsResult.data ?? [];
    const newsletters = newslettersResult.data ?? [];
    const extractions = extractionsResult.data ?? [];
    const ads = adsResult.data ?? [];
    const adAnalyses = adAnalysesResult.data ?? [];

    if (newsletters.length === 0 && ads.length === 0 && extractions.length === 0 && adAnalyses.length === 0) {
      return jsonResponse({ insights: [], message: "Insufficient data" });
    }

    const competitorNameById = new Map<string, string>();
    const snapshotMap = new Map<string, CompetitorSnapshot>();
    const competitorTagMap = new Map<string, number>();

    const ensureSnapshot = (name: string) => {
      const normalizedName = normalizeString(name) || "Unknown competitor";
      if (!snapshotMap.has(normalizedName)) {
        snapshotMap.set(normalizedName, {
          name: normalizedName,
          newsletters: 0,
          recentNewsletters30d: 0,
          ads: 0,
          activeAds: 0,
          extractions: 0,
          adAnalyses: 0,
          averageDiscount: null,
          topCampaignTypes: [],
          topProductCategories: [],
          topCtas: [],
          topMessageAngles: [],
        });
      }

      return snapshotMap.get(normalizedName)!;
    };

    for (const competitor of competitors) {
      const competitorName = normalizeString(competitor.name);
      if (!competitorName) continue;
      competitorNameById.set(competitor.id, competitorName);
      ensureSnapshot(competitorName);
      for (const tag of normalizeArrayOfStrings(competitor.tags)) {
        incrementCount(competitorTagMap, tag);
      }
    }

    const inboxCompetitorById = new Map<string, string>();
    const adCompetitorById = new Map<string, string>();
    const newsletterCountByCompetitor = new Map<string, number>();
    const extractionCountByCompetitor = new Map<string, number>();
    const adCountByCompetitor = new Map<string, number>();
    const adAnalysisCountByCompetitor = new Map<string, number>();
    const campaignTypeCounts = new Map<string, number>();
    const productCategoryCounts = new Map<string, number>();
    const ctaCounts = new Map<string, number>();
    const urgencyCounts = new Map<string, number>();
    const platformCounts = new Map<string, number>();
    const messageAngleCounts = new Map<string, number>();
    const offerAngleCounts = new Map<string, number>();
    const funnelIntentCounts = new Map<string, number>();
    const creativePatternCounts = new Map<string, number>();
    const audienceClueCounts = new Map<string, number>();
    const topTagCounts = new Map<string, number>();
    const discountValues: number[] = [];
    const discountValuesByCompetitor = new Map<string, number[]>();
    let couponUsageCount = 0;
    let freeShippingCount = 0;
    let activeAdsCount = 0;

    const dateCandidates: number[] = [];
    const last30DaysBoundary = new Date();
    last30DaysBoundary.setDate(last30DaysBoundary.getDate() - 30);
    const last30DaysTime = last30DaysBoundary.getTime();
    let recentNewsletterCount30d = 0;
    let recentAdCount30d = 0;

    const newsletterSubjectSamples: Array<{ competitor: string; subject: string; receivedAt: string | null }> = [];
    const newsletterMessageSamples: Array<{ competitor: string; message: string }> = [];
    const adCopySamples: Array<{ competitor: string; body: string; cta: string | null }> = [];
    const takeaways: string[] = [];

    for (const newsletter of newsletters) {
      const competitorName =
        competitorNameById.get(newsletter.competitor_id ?? "") ||
        normalizeString(newsletter.from_name) ||
        normalizeString(newsletter.from_email) ||
        "Unknown competitor";
      inboxCompetitorById.set(newsletter.id, competitorName);
      incrementCount(newsletterCountByCompetitor, competitorName);
      const snapshot = ensureSnapshot(competitorName);
      snapshot.newsletters += 1;

      const receivedTime = newsletter.received_at ? new Date(newsletter.received_at).getTime() : NaN;
      if (Number.isFinite(receivedTime)) {
        dateCandidates.push(receivedTime);
        if (receivedTime >= last30DaysTime) {
          recentNewsletterCount30d += 1;
          snapshot.recentNewsletters30d += 1;
        }
      }

      if (newsletterSubjectSamples.length < 12 && normalizeString(newsletter.subject)) {
        newsletterSubjectSamples.push({
          competitor: competitorName,
          subject: abbreviate(normalizeString(newsletter.subject), 180),
          receivedAt: newsletter.received_at,
        });
      }

      for (const tag of normalizeArrayOfStrings(newsletter.tags)) {
        incrementCount(topTagCounts, tag);
      }
    }

    for (const extraction of extractions) {
      const competitorName = inboxCompetitorById.get(extraction.newsletter_inbox_id) || "Unknown competitor";
      incrementCount(extractionCountByCompetitor, competitorName);
      const snapshot = ensureSnapshot(competitorName);
      snapshot.extractions += 1;

      incrementCount(campaignTypeCounts, extraction.campaign_type);
      for (const categoryValue of normalizeArrayOfStrings(extraction.product_categories)) {
        incrementCount(productCategoryCounts, categoryValue);
      }
      for (const ctaValue of normalizeArrayOfStrings(extraction.calls_to_action)) {
        incrementCount(ctaCounts, ctaValue);
      }
      for (const urgencyValue of normalizeArrayOfStrings(extraction.urgency_signals)) {
        incrementCount(urgencyCounts, urgencyValue);
      }
      for (const takeaway of normalizeArrayOfStrings(extraction.strategy_takeaways)) {
        if (takeaways.length < 16) {
          takeaways.push(abbreviate(takeaway, 160));
        }
      }

      const discount = typeof extraction.discount_percentage === "number" ? extraction.discount_percentage : null;
      if (discount !== null) {
        discountValues.push(discount);
        if (!discountValuesByCompetitor.has(competitorName)) {
          discountValuesByCompetitor.set(competitorName, []);
        }
        discountValuesByCompetitor.get(competitorName)!.push(discount);
      }
      if (normalizeString(extraction.coupon_code)) {
        couponUsageCount += 1;
      }
      if (extraction.free_shipping) {
        freeShippingCount += 1;
      }
      if (newsletterMessageSamples.length < 12 && normalizeString(extraction.main_message)) {
        newsletterMessageSamples.push({
          competitor: competitorName,
          message: abbreviate(normalizeString(extraction.main_message), 220),
        });
      }

      const extractionTime = extraction.created_at ? new Date(extraction.created_at).getTime() : NaN;
      if (Number.isFinite(extractionTime)) {
        dateCandidates.push(extractionTime);
      }
    }

    for (const ad of ads) {
      const competitorName =
        competitorNameById.get(ad.competitor_id ?? "") || normalizeString(ad.page_name) || "Unknown competitor";
      adCompetitorById.set(ad.id, competitorName);
      incrementCount(adCountByCompetitor, competitorName);
      const snapshot = ensureSnapshot(competitorName);
      snapshot.ads += 1;

      if (ad.is_active) {
        activeAdsCount += 1;
        snapshot.activeAds += 1;
      }

      for (const platform of [...normalizeArrayOfStrings(ad.platforms), ...normalizeArrayOfStrings(ad.publisher_platforms)]) {
        incrementCount(platformCounts, platform);
      }
      incrementCount(ctaCounts, ad.cta_type);

      const adBody =
        normalizeString((ad.ad_creative_bodies ?? [])[0]) ||
        normalizeString((ad.ad_creative_link_titles ?? [])[0]) ||
        normalizeString((ad.ad_creative_link_descriptions ?? [])[0]);
      if (adBody && adCopySamples.length < 12) {
        adCopySamples.push({
          competitor: competitorName,
          body: abbreviate(adBody, 220),
          cta: normalizeString(ad.cta_type) || null,
        });
      }

      const adTimestampValue =
        ad.last_seen_at || ad.first_seen_at || ad.ad_delivery_start_time || ad.created_at || ad.ad_delivery_stop_time;
      const adTimestamp = adTimestampValue ? new Date(adTimestampValue).getTime() : NaN;
      if (Number.isFinite(adTimestamp)) {
        dateCandidates.push(adTimestamp);
        if (adTimestamp >= last30DaysTime) {
          recentAdCount30d += 1;
        }
      }
    }

    for (const analysis of adAnalyses) {
      const competitorName = adCompetitorById.get(analysis.meta_ad_id) || "Unknown competitor";
      incrementCount(adAnalysisCountByCompetitor, competitorName);
      const snapshot = ensureSnapshot(competitorName);
      snapshot.adAnalyses += 1;

      incrementCount(messageAngleCounts, analysis.message_angle);
      incrementCount(offerAngleCounts, analysis.offer_angle);
      incrementCount(funnelIntentCounts, analysis.funnel_intent);
      incrementCount(creativePatternCounts, analysis.creative_pattern);
      incrementCount(productCategoryCounts, analysis.product_category);
      incrementCount(urgencyCounts, analysis.urgency_style);
      incrementCount(messageAngleCounts, analysis.promo_language);

      for (const clue of normalizeArrayOfStrings(analysis.audience_clues)) {
        incrementCount(audienceClueCounts, clue);
      }
      for (const takeaway of normalizeArrayOfStrings(analysis.strategy_takeaways)) {
        if (takeaways.length < 16) {
          takeaways.push(abbreviate(takeaway, 160));
        }
      }

      const analysisTime = analysis.created_at ? new Date(analysis.created_at).getTime() : NaN;
      if (Number.isFinite(analysisTime)) {
        dateCandidates.push(analysisTime);
      }
    }

    for (const [competitorName, snapshot] of snapshotMap.entries()) {
      snapshot.averageDiscount = average(discountValuesByCompetitor.get(competitorName) ?? []);
      snapshot.topCampaignTypes = topEntries(
        new Map(
          extractions
            .filter((item) => (inboxCompetitorById.get(item.newsletter_inbox_id) || "Unknown competitor") === competitorName)
            .reduce((map, item) => {
              incrementCount(map, item.campaign_type);
              return map;
            }, new Map<string, number>()),
        ),
        3,
      );
      snapshot.topProductCategories = topEntries(
        new Map(
          [
            ...extractions
              .filter((item) => (inboxCompetitorById.get(item.newsletter_inbox_id) || "Unknown competitor") === competitorName)
              .flatMap((item) => normalizeArrayOfStrings(item.product_categories)),
            ...adAnalyses
              .filter((item) => (adCompetitorById.get(item.meta_ad_id) || "Unknown competitor") === competitorName)
              .flatMap((item) => normalizeArrayOfStrings(item.product_category)),
          ].reduce((map, item) => {
            incrementCount(map, item);
            return map;
          }, new Map<string, number>()),
        ),
        3,
      );
      snapshot.topCtas = topEntries(
        new Map(
          [
            ...extractions
              .filter((item) => (inboxCompetitorById.get(item.newsletter_inbox_id) || "Unknown competitor") === competitorName)
              .flatMap((item) => normalizeArrayOfStrings(item.calls_to_action)),
            ...ads
              .filter((item) => (adCompetitorById.get(item.id) || "Unknown competitor") === competitorName)
              .flatMap((item) => normalizeArrayOfStrings(item.cta_type)),
          ].reduce((map, item) => {
            incrementCount(map, item);
            return map;
          }, new Map<string, number>()),
        ),
        3,
      );
      snapshot.topMessageAngles = topEntries(
        new Map(
          adAnalyses
            .filter((item) => (adCompetitorById.get(item.meta_ad_id) || "Unknown competitor") === competitorName)
            .reduce((map, item) => {
              incrementCount(map, item.message_angle);
              incrementCount(map, item.offer_angle);
              return map;
            }, new Map<string, number>()),
        ),
        3,
      );
    }

    const allTextForSeasonality = [
      ...newsletters.map((item) => [item.subject, ...(normalizeArrayOfStrings(item.tags) ?? [])].join(" ")),
      ...newsletterMessageSamples.map((item) => item.message),
      ...adCopySamples.map((item) => item.body),
      ...topEntries(topTagCounts, 12).map((item) => item.value),
    ];

    const overlapCompetitors = dedupeStrings(
      [...snapshotMap.values()]
        .filter((snapshot) => snapshot.newsletters > 0 && snapshot.ads > 0)
        .map((snapshot) => snapshot.name),
    );

    const sortedSnapshots = [...snapshotMap.values()].sort((left, right) => {
      const rightScore =
        right.newsletters + right.extractions + right.ads + right.activeAds + right.adAnalyses;
      const leftScore = left.newsletters + left.extractions + left.ads + left.activeAds + left.adAnalyses;
      return rightScore - leftScore;
    });

    const minTimestamp = dateCandidates.length > 0 ? Math.min(...dateCandidates) : Date.now();
    const maxTimestamp = dateCandidates.length > 0 ? Math.max(...dateCandidates) : Date.now();
    const timeframeLabel = `${new Date(minTimestamp).toLocaleDateString("en-US")} to ${new Date(maxTimestamp).toLocaleDateString("en-US")}`;

    const workspaceSummary: WorkspaceSummary = {
      workspaceId,
      workspaceName,
      timeframeLabel,
      competitorCount: competitorNameById.size,
      newsletterCount: newsletters.length,
      extractionCount: extractions.length,
      adCount: ads.length,
      adAnalysisCount: adAnalyses.length,
      recentNewsletterCount30d,
      recentAdCount30d,
      activeAdsCount,
      averageDiscount: average(discountValues),
      maxDiscount: discountValues.length ? Math.max(...discountValues) : null,
      couponUsageCount,
      freeShippingCount,
      overlapCompetitors,
      topCampaignTypes: topEntries(campaignTypeCounts, 8),
      topProductCategories: topEntries(productCategoryCounts, 8),
      topCtas: topEntries(ctaCounts, 8),
      topUrgencySignals: topEntries(urgencyCounts, 8),
      topPlatforms: topEntries(platformCounts, 8),
      topMessageAngles: topEntries(messageAngleCounts, 8),
      topOfferAngles: topEntries(offerAngleCounts, 8),
      topFunnelIntents: topEntries(funnelIntentCounts, 8),
      topCreativePatterns: topEntries(creativePatternCounts, 8),
      topAudienceClues: topEntries(audienceClueCounts, 8),
      topTags: topEntries(new Map([...topTagCounts, ...competitorTagMap]), 8),
      topSeasonalSignals: extractSeasonalSignals(allTextForSeasonality),
      competitorSnapshots: sortedSnapshots.slice(0, 8),
      newsletterSubjectSamples,
      newsletterMessageSamples,
      adCopySamples,
      takeaways: dedupeStrings(takeaways).slice(0, 12),
    };

    const fallbackInsights = buildFallbackInsights(workspaceSummary, category);
    const targetCount = category ? 5 : 10;
    const promptPayload = {
      workspace: {
        id: workspaceSummary.workspaceId,
        name: workspaceSummary.workspaceName,
        timeframe: workspaceSummary.timeframeLabel,
      },
      counts: {
        competitors: workspaceSummary.competitorCount,
        newsletters: workspaceSummary.newsletterCount,
        newsletterExtractions: workspaceSummary.extractionCount,
        ads: workspaceSummary.adCount,
        adAnalyses: workspaceSummary.adAnalysisCount,
        recentNewsletters30d: workspaceSummary.recentNewsletterCount30d,
        recentAds30d: workspaceSummary.recentAdCount30d,
        activeAds: workspaceSummary.activeAdsCount,
      },
      pricing: {
        averageDiscount: workspaceSummary.averageDiscount,
        maxDiscount: workspaceSummary.maxDiscount,
        couponUsageCount: workspaceSummary.couponUsageCount,
        freeShippingCount: workspaceSummary.freeShippingCount,
      },
      topSignals: {
        campaignTypes: workspaceSummary.topCampaignTypes,
        productCategories: workspaceSummary.topProductCategories,
        ctas: workspaceSummary.topCtas,
        urgencySignals: workspaceSummary.topUrgencySignals,
        platforms: workspaceSummary.topPlatforms,
        messageAngles: workspaceSummary.topMessageAngles,
        offerAngles: workspaceSummary.topOfferAngles,
        funnelIntents: workspaceSummary.topFunnelIntents,
        creativePatterns: workspaceSummary.topCreativePatterns,
        audienceClues: workspaceSummary.topAudienceClues,
        seasonalSignals: workspaceSummary.topSeasonalSignals,
      },
      overlapCompetitors: workspaceSummary.overlapCompetitors,
      competitorSnapshots: workspaceSummary.competitorSnapshots,
      newsletterSubjectSamples: workspaceSummary.newsletterSubjectSamples,
      newsletterMessageSamples: workspaceSummary.newsletterMessageSamples,
      adCopySamples: workspaceSummary.adCopySamples,
      extractedTakeaways: workspaceSummary.takeaways,
    };

    let generatedInsights: GeneratedInsight[] = [];
    let usedModel: string | null = null;
    let usedFallback = false;

    const modelCandidates = dedupeStrings([
      Deno.env.get("OPENAI_MODEL_INSIGHTS") || "gpt-4.1",
      "gpt-4.1-mini",
    ]);

    const completion = await createOpenAiChatCompletion({
      modelCandidates,
      temperature: 0.25,
      responseFormat: { type: "json_object" },
      maxCompletionTokens: 6500,
      messages: [
        {
          role: "system",
          content:
            `You are a principal competitive-intelligence analyst and senior marketing strategist. Produce dense, quantified, non-generic insights for a SaaS user monitoring competitor newsletters and paid ads. Each insight must be specific, commercially useful, grounded in the provided data, and written to help a team decide what to do next. Your output must be structurally consistent and analytics-ready. Write all narrative text fields (title, main_message, what_is_happening, why_it_matters, strategic_implication, strategic_takeaway, recommended_response, cta_analysis, positioning_angle, and evidence detail fields) in ${languageName}. JSON keys, competitor names, brand names, URLs, coupon codes, and numeric values must remain unchanged regardless of language.

STRICT FIELD DIFFERENTIATION RULES — these override any default tendencies:
- title: max 8 words. Format: Subject + Verb + Object. NEVER use category labels like "New campaign signal" or "Pricing update detected". Be specific about WHO did WHAT. Good: "Lovable tests email-first campaign coordination". Bad: "New email strategy detected".
- why_it_matters: MUST explain the strategic IMPLICATION, not restate the fact from the title. Reference market patterns, correlations, or downstream effects on demand, conversion, pricing power, or share of voice. Start with a causal framing ("Because...", "This suggests...", "Historically when competitors..."). 1-2 sentences only.
- recommended_response: imperative voice, time-bound, specific. Tell the user what to do THIS WEEK. Reference the competitor or pattern by name. Must contain a concrete action verb (audit, launch, test, increase, reduce, compare), never "monitor", "watch closely", or "stay ahead".
- DEDUPLICATION RULE: title = the FACT, why_it_matters = the CONSEQUENCE, recommended_response = the ACTION. If any two share more than 50% of their meaningful content words, regenerate the overlapping field with stronger distinction. Validate this before returning.`,
        },
        {
          role: "user",
          content: [
            `Generate ${category ? "5 to 7" : "8 to 12"} strategic insights${category ? ` focused only on the "${category}" category` : ""}.`,
            `Allowed categories: ${INSIGHT_CATEGORIES.join(", ")}.`,
            "Return only a JSON object with shape {\"insights\":[...]} and no markdown.",
            "Every insight must include:",
            "- category",
            "- title",
            "- campaign_type",
            "- main_message",
            "- what_is_happening",
            "- why_it_matters",
            "- strategic_implication",
            "- strategic_takeaway",
            "- recommended_response",
            "- confidence (0.30 to 0.99)",
            "- offer_discount_percentage (number or null)",
            "- offer_coupon_code (string or null)",
            "- offer_urgency (array of urgency phrases, empty array if none)",
            "- cta_primary",
            "- cta_analysis",
            "- product_categories (1 to 4 strings)",
            "- positioning_angle",
            "- priority_level: low | medium | high",
            "- impact_area: traffic | conversion | branding",
            "- supporting_evidence: 3 to 6 objects with {label, detail, metric?, source?, competitor?, timeframe?}",
            "- affected_competitors",
            "- source_type: newsletter | meta_ad | cross_channel",
            "Rules:",
            "- Prefer quantified language and explicit counts, percentages, competitor names, channels, or timing windows.",
            "- Avoid generic language such as 'monitor closely', 'stay ahead', 'optimize messaging', or 'keep an eye on'. If an insight cannot be specific, skip it.",
            "- Treat every insight like a decision brief for a senior growth or lifecycle team, not like a descriptive report.",
            "- The main_message must capture the dominant promise or commercial message competitors are putting in market.",
            "- The campaign_type must be a business-friendly label such as Discount drop, Product launch, Lifecycle push, Win-back, Feature proof, Seasonal sale, Brand narrative, etc.",
            "- The cta_analysis must explain how the call to action is trying to move the user and what that implies for the buyer journey.",
            "- The positioning_angle must describe how competitors are framing value, proof, emotion, or differentiation.",
            "- The strategic_takeaway must be a concise executive takeaway that a marketing lead can act on immediately.",
            "- The 'why_it_matters' field must explain the business consequence in terms of demand, conversion, pricing power, margin, positioning, or share of voice.",
            "- The 'strategic_implication' field must explain the downstream risk or opportunity if the team does nothing.",
            "- The recommended_response must be formatted exactly as three lines starting with 'Immediate:', 'Next 30 days:' and 'Measure:'.",
            "- The 'Immediate' line must be a concrete action, not a generic suggestion.",
            "- The 'Measure' line must name at least one metric, signal, or KPI to track after acting.",
            "- Use empty arrays or nulls instead of inventing coupon codes or urgency if the payload does not support them.",
            "- Do not invent evidence that is not supported by the payload.",
            "- If there is not enough data for a category, skip it rather than fabricate.",
            "",
            JSON.stringify(promptPayload),
          ].join("\n"),
        },
      ],
    });

    if (completion.ok) {
      usedModel = completion.model;
      const content = completion.data?.choices?.[0]?.message?.content ?? "";
      const parsed = parseJsonObjectFromContent(typeof content === "string" ? content : "");
      const rawInsights = Array.isArray(parsed?.insights)
        ? parsed.insights
        : Array.isArray(parsed)
          ? parsed
          : [];

      generatedInsights = rawInsights
        .map((item) => normalizeInsight(item, category ?? "messaging_positioning"))
        .filter((item): item is GeneratedInsight => Boolean(item));
    } else {
      usedFallback = true;
      log("openai_failed", {
        status: completion.status,
        model: completion.model,
        requestId: completion.requestId,
        error: abbreviate(completion.errorText, 220),
      });
    }

    if (generatedInsights.length > 0) {
      const averageEvidenceCount =
        generatedInsights.reduce((sum, insight) => sum + insight.supporting_evidence.length, 0) /
        generatedInsights.length;
      const minimumAiCount = category ? 4 : 6;
      if (generatedInsights.length < minimumAiCount || averageEvidenceCount < 2.5) {
        generatedInsights = mergeInsights(generatedInsights, fallbackInsights, targetCount);
      }
    } else {
      usedFallback = true;
      generatedInsights = fallbackInsights;
    }

    const finalInsights = generatedInsights.slice(0, targetCount);

    await (category
      ? supabaseAdmin.from("insights").delete().eq("workspace_id", workspaceId).eq("category", category)
      : supabaseAdmin.from("insights").delete().eq("workspace_id", workspaceId));

    if (finalInsights.length > 0) {
      const rows = finalInsights.map((insight) => ({
        workspace_id: workspaceId,
        category: insight.category,
        title: insight.title,
        campaign_type: insight.campaign_type,
        main_message: insight.main_message,
        what_is_happening: insight.what_is_happening,
        why_it_matters: insight.why_it_matters,
        strategic_implication: insight.strategic_implication,
        strategic_takeaway: insight.strategic_takeaway,
        recommended_response: insight.recommended_response,
        confidence: insight.confidence,
        offer_discount_percentage: insight.offer_discount_percentage,
        offer_coupon_code: insight.offer_coupon_code,
        offer_urgency: insight.offer_urgency,
        cta_primary: insight.cta_primary,
        cta_analysis: insight.cta_analysis,
        product_categories: insight.product_categories,
        positioning_angle: insight.positioning_angle,
        supporting_evidence: insight.supporting_evidence,
        affected_competitors: insight.affected_competitors,
        source_type: insight.source_type,
        priority_level: insight.priority_level,
        impact_area: insight.impact_area,
        language,
      }));

      const { error: insertError } = await supabaseAdmin.from("insights").insert(rows);
      if (insertError) {
        throw new Error(`Insights insert failed: ${insertError.message} [code: ${insertError.code}]`);
      }
    }

    await supabaseAdmin.from("usage_events").insert({
      workspace_id: workspaceId,
      event_type: "insights_generated",
      quantity: finalInsights.length,
      metadata: {
        category: category ?? "all",
        fallback_used: usedFallback,
        model: usedModel,
        counts: {
          newsletters: workspaceSummary.newsletterCount,
          extractions: workspaceSummary.extractionCount,
          ads: workspaceSummary.adCount,
          adAnalyses: workspaceSummary.adAnalysisCount,
        },
      },
    });

    return jsonResponse({
      success: true,
      insights: finalInsights,
      metadata: {
        model: usedModel,
        fallbackUsed: usedFallback,
        workspaceSummary: {
          newsletterCount: workspaceSummary.newsletterCount,
          extractionCount: workspaceSummary.extractionCount,
          adCount: workspaceSummary.adCount,
          adAnalysisCount: workspaceSummary.adAnalysisCount,
          competitorCount: workspaceSummary.competitorCount,
        },
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    log("error", { message });
    if (error instanceof HttpError) {
      return jsonResponse({ error: message }, error.status);
    }
    return jsonResponse({ error: "An internal error occurred while generating insights." }, 500);
  }
});
