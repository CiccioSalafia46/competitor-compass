import {
  compareInsightPriority,
  getInsightPriorityLevel,
  normalizeImpactArea,
  type InsightImpactArea,
  INSIGHT_PRIORITY_ORDER,
  INSIGHT_PRIORITY_LABELS,
  type InsightPriorityLevel,
} from "./insight-priority.ts";

export type DashboardStats = {
  newsletters: number;
  competitors: number;
  completedAnalyses: number;
  metaAds: number;
  activeAds: number;
  inboxItems: number;
  insightCount: number;
};

export type DashboardLimits = {
  competitors: number;
  newsletters_per_month: number;
  analyses_per_month: number;
};

export type DashboardUsageSummary = {
  competitors: number;
  newsletters_this_month: number;
  analyses_this_month: number;
  seats_used: number;
};

export type DashboardAnalytics = {
  newslettersByWeek: { week: string; count: number }[];
  promotionFrequency: { competitor: string; promos: number; total: number }[];
  ctaDistribution: { cta: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
  urgencyFrequency: { type: string; count: number }[];
  campaignTypes: { type: string; count: number }[];
  competitorActivity: { competitor: string; newsletters: number; ads: number }[];
  adsByWeek: { week: string; count: number }[];
};

export type DashboardAlert = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  severity: string;
  category: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  competitor_id: string | null;
  alert_rule_id: string | null;
  metadata?: unknown;
};

export type DashboardInsightEvidence = {
  label: string;
  detail: string;
  metric?: string;
  source?: string;
  competitor?: string;
  timeframe?: string;
};

export type DashboardInsight = {
  id: string;
  workspace_id: string;
  category: string;
  title: string;
  campaign_type: string;
  main_message: string;
  what_is_happening: string;
  why_it_matters: string;
  strategic_implication: string;
  strategic_takeaway: string;
  recommended_response: string;
  confidence: number | null;
  offer_discount_percentage: number | null;
  offer_coupon_code: string | null;
  offer_urgency: string[];
  cta_primary: string | null;
  cta_analysis: string;
  product_categories: string[];
  positioning_angle: string;
  supporting_evidence: DashboardInsightEvidence[];
  affected_competitors: string[];
  source_type: string;
  priority_level: InsightPriorityLevel;
  impact_area: "traffic" | "conversion" | "branding";
  created_at: string;
};

type WeeklyPoint = {
  week: string;
  count: number;
};

export type DashboardHighlight = {
  kind: "competitor_action" | "promotion" | "campaign";
  title: string;
  detail: string;
  tone: "positive" | "warning" | "neutral";
  competitors?: string[];
  campaignTypes?: string[];
};

export type DashboardAnomaly = {
  title: string;
  detail: string;
  severity: InsightPriorityLevel;
  path: string;
  competitors?: string[];
  campaignTypes?: string[];
};

export type DashboardCompetitorSummary = {
  competitor: string;
  newsletters: number;
  ads: number;
  promoRate?: number;
};

export type DashboardRecommendedAction = {
  title: string;
  detail: string;
  path: string;
  priority: InsightPriorityLevel;
  cta: string;
  competitors?: string[];
  campaignTypes?: string[];
};

export type DashboardAISummary = {
  whatChangedToday: string;
  whatMattersMost: string;
};

export type DashboardDecisionModel = {
  aiSummary: DashboardAISummary;
  dailyHighlights: DashboardHighlight[];
  prioritizedInsights: DashboardInsight[];
  anomalies: DashboardAnomaly[];
  competitorSummary: DashboardCompetitorSummary[];
  recommendedActions: DashboardRecommendedAction[];
};

function getWeeklyDelta(points: WeeklyPoint[] | undefined) {
  if (!points || points.length < 2) {
    return null;
  }

  const [latest, previous] = points;
  if (!latest || !previous) return null;

  return {
    latest: latest.count,
    previous: previous.count,
    change: latest.count - previous.count,
    ratio: previous.count > 0 ? latest.count / previous.count : null,
  };
}

function limitRatio(used: number, limit: number) {
  if (limit <= 0) return 0;
  return used / limit;
}

function compareCreatedAtDescending(left: string | null | undefined, right: string | null | undefined) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
}

function getImpactOrder(value: string | null | undefined) {
  const impact = normalizeImpactArea(value);
  const order: InsightImpactArea[] = ["conversion", "traffic", "branding"];
  const index = impact ? order.indexOf(impact) : -1;
  return index === -1 ? order.length : index;
}

export function compareDashboardInsights(left: DashboardInsight, right: DashboardInsight) {
  const leftPriority = getInsightPriorityLevel(left);
  const rightPriority = getInsightPriorityLevel(right);

  const priorityDelta =
    INSIGHT_PRIORITY_ORDER.indexOf(leftPriority) - INSIGHT_PRIORITY_ORDER.indexOf(rightPriority);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const impactDelta = getImpactOrder(left.impact_area) - getImpactOrder(right.impact_area);
  if (impactDelta !== 0) {
    return impactDelta;
  }

  const priorityFallback = compareInsightPriority(left, right);
  if (priorityFallback !== 0) {
    return priorityFallback;
  }

  return compareCreatedAtDescending(left.created_at, right.created_at);
}

function formatCampaignType(value: string | null | undefined) {
  if (!value) return "campaign";
  return value.replaceAll("_", " ").trim();
}

function pushUniqueHighlight(target: DashboardHighlight[], next: DashboardHighlight) {
  if (target.some((item) => item.title === next.title)) {
    return;
  }

  target.push(next);
}

function buildHighlights(params: {
  stats: DashboardStats;
  analytics: DashboardAnalytics | null;
  alerts: DashboardAlert[];
  insights: DashboardInsight[];
}) {
  const highlights: DashboardHighlight[] = [];
  const newsletterDelta = getWeeklyDelta(params.analytics?.newslettersByWeek);
  const adsDelta = getWeeklyDelta(params.analytics?.adsByWeek);
  const prioritizedInsights = [...params.insights].sort(compareDashboardInsights);
  const topInsight = prioritizedInsights[0];
  const topCompetitor = buildCompetitorSummary(params.analytics)[0];
  const promotionInsight =
    prioritizedInsights.find(
      (insight) =>
        typeof insight.offer_discount_percentage === "number" ||
        Boolean(insight.offer_coupon_code) ||
        insight.offer_urgency.length > 0,
    ) ?? null;
  const newestCampaignInsight =
    [...params.insights]
      .sort((left, right) => compareCreatedAtDescending(left.created_at, right.created_at))
      .find((insight) => Boolean(insight.campaign_type?.trim())) ?? null;

  if (topCompetitor) {
    const totalSignals = topCompetitor.newsletters + topCompetitor.ads;
    pushUniqueHighlight(highlights, {
      kind: "competitor_action",
      title: `${topCompetitor.competitor} is setting today's pace`,
      detail: `${topCompetitor.competitor} leads the tracked feed with ${totalSignals} signals (${topCompetitor.newsletters} newsletters, ${topCompetitor.ads} ads).`,
      tone: totalSignals >= 6 ? "warning" : "neutral",
      competitors: [topCompetitor.competitor],
    });
  }

  if (newsletterDelta && newsletterDelta.change > 0) {
    pushUniqueHighlight(highlights, {
      kind: "competitor_action",
      title: "Competitor activity accelerated",
      detail: `${newsletterDelta.latest} newsletter events this week, up ${newsletterDelta.change} vs the previous week.`,
      tone: newsletterDelta.ratio && newsletterDelta.ratio >= 1.5 ? "warning" : "positive",
    });
  }

  if (adsDelta && adsDelta.change > 0) {
    pushUniqueHighlight(highlights, {
      kind: "competitor_action",
      title: "Paid activity is rising",
      detail: `${adsDelta.latest} tracked ads this week, with ${params.stats.activeAds} still active right now.`,
      tone: adsDelta.ratio && adsDelta.ratio >= 1.5 ? "warning" : "neutral",
    });
  }

  if (promotionInsight) {
    const primaryCompetitor = promotionInsight.affected_competitors[0] ?? "A competitor";
    const offerSignal =
      typeof promotionInsight.offer_discount_percentage === "number"
        ? `${Math.round(promotionInsight.offer_discount_percentage)}% off`
        : promotionInsight.offer_coupon_code
          ? `coupon ${promotionInsight.offer_coupon_code}`
          : promotionInsight.offer_urgency[0] ?? "a promotion-led offer";

    pushUniqueHighlight(highlights, {
      kind: "promotion",
      title: "Major promotion detected",
      detail: `${primaryCompetitor} is pushing ${offerSignal} inside ${formatCampaignType(promotionInsight.campaign_type)}, increasing conversion pressure.`,
      tone:
        typeof promotionInsight.offer_discount_percentage === "number" &&
        promotionInsight.offer_discount_percentage >= 30
          ? "warning"
          : "positive",
      competitors: promotionInsight.affected_competitors,
      campaignTypes: [promotionInsight.campaign_type],
    });
  }

  if (newestCampaignInsight) {
    const primaryCompetitor = newestCampaignInsight.affected_competitors[0] ?? "A competitor";
    pushUniqueHighlight(highlights, {
      kind: "campaign",
      title: "New campaign signal",
      detail: `${primaryCompetitor} is testing ${formatCampaignType(newestCampaignInsight.campaign_type)} with the message "${newestCampaignInsight.main_message}".`,
      tone: getInsightPriorityLevel(newestCampaignInsight) === "high" ? "warning" : "neutral",
      competitors: newestCampaignInsight.affected_competitors,
      campaignTypes: [newestCampaignInsight.campaign_type],
    });
  }

  if (params.alerts.length > 0) {
    pushUniqueHighlight(highlights, {
      kind: "competitor_action",
      title: "Unreviewed alerts need attention",
      detail: `${params.alerts.length} unread alert${params.alerts.length === 1 ? "" : "s"} may require action.`,
      tone: params.alerts.length >= 3 ? "warning" : "neutral",
    });
  }

  if (topInsight) {
    const priority = getInsightPriorityLevel(topInsight);
    pushUniqueHighlight(highlights, {
      kind: "campaign",
      title: `${INSIGHT_PRIORITY_LABELS[priority]} insight ready`,
      detail: topInsight.title,
      tone: priority === "high" ? "warning" : priority === "medium" ? "neutral" : "positive",
      competitors: topInsight.affected_competitors,
      campaignTypes: [topInsight.campaign_type],
    });
  }

  if (highlights.length === 0) {
    highlights.push({
      kind: "competitor_action",
      title: "No urgent shifts detected",
      detail: "The current dataset is stable. Continue importing data to keep the decision feed current.",
      tone: "neutral",
    });
  }

  return highlights.slice(0, 4);
}

function buildAnomalies(params: {
  stats: DashboardStats;
  analytics: DashboardAnalytics | null;
  alerts: DashboardAlert[];
  insights: DashboardInsight[];
}) {
  const anomalies: DashboardAnomaly[] = [];
  const newsletterDelta = getWeeklyDelta(params.analytics?.newslettersByWeek);
  const adsDelta = getWeeklyDelta(params.analytics?.adsByWeek);
  const aggressivePromo = (params.analytics?.promotionFrequency ?? []).find(
    (entry) => entry.total >= 4 && entry.promos / entry.total >= 0.75,
  );

  if (newsletterDelta && newsletterDelta.change >= 4 && (newsletterDelta.ratio ?? 0) >= 1.5) {
    anomalies.push({
      title: "Newsletter spike",
      detail: `Tracked campaign volume jumped ${newsletterDelta.change} week over week.`,
      severity: "high",
      path: "/analytics",
    });
  }

  if (adsDelta && adsDelta.change >= 3 && (adsDelta.ratio ?? 0) >= 1.5) {
    anomalies.push({
      title: "Paid ads spike",
      detail: `Meta ad activity increased from ${adsDelta.previous} to ${adsDelta.latest} this week.`,
      severity: "high",
      path: "/meta-ads",
    });
  }

  if (aggressivePromo) {
    anomalies.push({
      title: "Promotion-heavy competitor",
      detail: `${aggressivePromo.competitor} is running promotions in ${aggressivePromo.promos}/${aggressivePromo.total} tracked campaigns.`,
      severity: aggressivePromo.promos >= 6 ? "high" : "medium",
      path: "/analytics",
      competitors: [aggressivePromo.competitor],
      campaignTypes: ["promotion"],
    });
  }

  if (params.stats.insightCount === 0 && (params.stats.inboxItems > 0 || params.stats.metaAds > 0)) {
    anomalies.push({
      title: "Decision gap",
      detail: "You have source data but no AI insight layer yet. Generate insights before making channel decisions.",
      severity: "medium",
      path: "/insights",
    });
  }

  if (params.alerts.length >= 5) {
    anomalies.push({
      title: "Alert backlog",
      detail: `${params.alerts.length} unread alerts suggest a triage backlog or noisy ruleset.`,
      severity: "medium",
      path: "/alerts",
    });
  }

  return anomalies.slice(0, 4);
}

function buildCompetitorSummary(analytics: DashboardAnalytics | null) {
  const promoMap = new Map(
    (analytics?.promotionFrequency ?? []).map((entry) => [
      entry.competitor,
      entry.total > 0 ? entry.promos / entry.total : 0,
    ]),
  );

  return (analytics?.competitorActivity ?? [])
    .map((entry) => ({
      competitor: entry.competitor,
      newsletters: entry.newsletters,
      ads: entry.ads,
      promoRate: promoMap.get(entry.competitor),
    }))
    .sort((left, right) => right.newsletters + right.ads - (left.newsletters + left.ads))
    .slice(0, 5);
}

function buildRecommendedActions(params: {
  stats: DashboardStats;
  insights: DashboardInsight[];
  analytics: DashboardAnalytics | null;
  gmailConnected: boolean;
  usage: DashboardUsageSummary;
  limits: DashboardLimits;
  alerts: DashboardAlert[];
}) {
  const actions: DashboardRecommendedAction[] = [];
  const topInsight = [...params.insights].sort(compareDashboardInsights)[0];
  const topCompetitor = buildCompetitorSummary(params.analytics)[0];

  if (!params.gmailConnected) {
    actions.push({
      title: "Connect Gmail ingestion",
      detail: "Automatic inbox sync is still off. Re-enable it to keep the intelligence feed fresh without manual imports.",
      path: "/settings",
      priority: "high",
      cta: "Connect Gmail",
    });
  }

  if (params.stats.competitors === 0) {
    actions.push({
      title: "Add tracked competitors",
      detail: "The workspace has no monitored competitors yet, so downstream analytics and alerts will stay thin.",
      path: "/competitors",
      priority: "high",
      cta: "Add competitors",
    });
  }

  if (params.stats.inboxItems === 0) {
    actions.push({
      title: "Import source data",
      detail: "The decision engine needs newsletters or ads to produce useful recommendations.",
      path: "/newsletters/new",
      priority: "high",
      cta: "Import data",
    });
  }

  if (topInsight) {
    const priority = getInsightPriorityLevel(topInsight);
    if (priority === "high" || priority === "medium") {
      actions.push({
      title: `Act on: ${topInsight.title}`,
      detail: topInsight.strategic_takeaway,
      path: "/insights",
      priority,
      cta: "Open insight",
      competitors: topInsight.affected_competitors,
      campaignTypes: [topInsight.campaign_type],
    });
  }
  }

  if (params.alerts.length > 0) {
    actions.push({
      title: "Triage unread alerts",
      detail: `${params.alerts.length} unread alert${params.alerts.length === 1 ? "" : "s"} may indicate competitor moves or noisy rules.`,
      path: "/alerts",
      priority: params.alerts.length >= 3 ? "high" : "medium",
      cta: "Review alerts",
    });
  }

  if (topCompetitor && topCompetitor.newsletters + topCompetitor.ads >= 6) {
    actions.push({
      title: `Benchmark ${topCompetitor.competitor}`,
      detail: `${topCompetitor.competitor} currently leads tracked activity with ${topCompetitor.newsletters} newsletter events and ${topCompetitor.ads} ads.`,
      path: "/analytics",
      priority: "medium",
      cta: "Compare activity",
      competitors: [topCompetitor.competitor],
    });
  }

  if (limitRatio(params.usage.competitors, params.limits.competitors) >= 0.8 && params.limits.competitors > 0) {
    actions.push({
      title: "Competitor capacity is almost full",
      detail: `You are using ${params.usage.competitors}/${params.limits.competitors} tracked competitor slots.`,
      path: "/settings/billing",
      priority: "medium",
      cta: "Review plan",
    });
  }

  if (
    limitRatio(params.usage.analyses_this_month, params.limits.analyses_per_month) >= 0.8 &&
    params.limits.analyses_per_month > 0
  ) {
    actions.push({
      title: "AI analysis capacity is tight",
      detail: `You have used ${params.usage.analyses_this_month}/${params.limits.analyses_per_month} AI analyses this month.`,
      path: "/settings/usage",
      priority: "medium",
      cta: "Check usage",
    });
  }

  return actions
    .sort((left, right) => {
      const priorityDelta =
        INSIGHT_PRIORITY_ORDER.indexOf(left.priority) - INSIGHT_PRIORITY_ORDER.indexOf(right.priority);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, 5);
}

export function buildDashboardAiSummary(params: {
  highlights: DashboardHighlight[];
  insights: DashboardInsight[];
  anomalies: DashboardAnomaly[];
  recommendedActions: DashboardRecommendedAction[];
  focus?: {
    competitor?: string | null;
    campaignType?: string | null;
  };
}): DashboardAISummary {
  const focusBits = [params.focus?.competitor, params.focus?.campaignType]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .map((value) => formatCampaignType(value));
  const focusPrefix = focusBits.length > 0 ? `For ${focusBits.join(" / ")}, ` : "";
  const topHighlight = params.highlights[0];
  const secondHighlight = params.highlights[1];
  const topInsight = params.insights[0];
  const topAction = params.recommendedActions[0];
  const topAnomaly = params.anomalies[0];

  const whatChangedToday = topHighlight
    ? `${focusPrefix}${topHighlight.detail}${secondHighlight ? ` ${secondHighlight.detail}` : ""}`
    : `${focusPrefix}no meaningful competitor shifts have been detected in the current feed yet.`;

  if (topInsight) {
    const topInsightTakeaway =
      topInsight.strategic_takeaway ||
      topInsight.strategic_implication ||
      topInsight.why_it_matters ||
      "Act on the strongest observed signal.";

    return {
      whatChangedToday,
      whatMattersMost: `${topInsight.title} is the top ${formatCampaignType(topInsight.impact_area)} priority. ${topInsightTakeaway}${topAction ? ` Next move: ${topAction.title}.` : ""}`,
    };
  }

  if (topAnomaly) {
    return {
      whatChangedToday,
      whatMattersMost: `${topAnomaly.title}: ${topAnomaly.detail}${topAction ? ` Next move: ${topAction.title}.` : ""}`,
    };
  }

  if (topAction) {
    return {
      whatChangedToday,
      whatMattersMost: `${topAction.title}. ${topAction.detail}`,
    };
  }

  return {
    whatChangedToday,
    whatMattersMost: `${focusPrefix}keep the feed warm by importing data, reviewing alerts, and generating fresh insights.`,
  };
}

export function buildDashboardDecisionModel(params: {
  stats: DashboardStats;
  alerts: DashboardAlert[];
  insights: DashboardInsight[];
  analytics: DashboardAnalytics | null;
  gmailConnected: boolean;
  usage: DashboardUsageSummary;
  limits: DashboardLimits;
}): DashboardDecisionModel {
  const prioritizedInsights = [...params.insights].sort(compareDashboardInsights).slice(0, 6);
  const dailyHighlights = buildHighlights(params);
  const anomalies = buildAnomalies(params);
  const recommendedActions = buildRecommendedActions(params);

  return {
    aiSummary: buildDashboardAiSummary({
      highlights: dailyHighlights,
      insights: prioritizedInsights,
      anomalies,
      recommendedActions,
    }),
    dailyHighlights,
    prioritizedInsights,
    anomalies,
    competitorSummary: buildCompetitorSummary(params.analytics),
    recommendedActions,
  };
}
