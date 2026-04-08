import type { CompetitorIntelligenceSnapshot } from "./competitor-intelligence.ts";
import { compareDashboardInsights } from "./dashboard-decision-engine.ts";
import type { NormalizedInsight } from "./insight-normalization.ts";

export const REPORT_TEMPLATES = {
  weekly_competitor_pulse: {
    label: "Weekly competitor pulse",
    description: "Executive snapshot of the biggest competitor moves, signals, and recommended responses.",
    defaultRangeDays: 7,
  },
  promo_digest: {
    label: "Promo digest",
    description: "Promotion-focused view of discount behavior, urgency tactics, and offer pressure.",
    defaultRangeDays: 30,
  },
  messaging_analysis: {
    label: "Messaging analysis",
    description: "Narrative, CTA, category, and positioning changes across the tracked competitor set.",
    defaultRangeDays: 30,
  },
} as const;

export type ReportTemplateKey = keyof typeof REPORT_TEMPLATES;
export type ReportFrequency = "daily" | "weekly";
export type ReportStatus = "completed" | "failed";
export type ReportPriority = "high" | "medium" | "low";
export type ReportImpact = "traffic" | "conversion" | "branding";

export type ReportMetric = {
  label: string;
  value: string;
  detail?: string;
};

export type ReportCallout = {
  title: string;
  body: string;
  tone?: "neutral" | "positive" | "warning";
};

export type ReportTable = {
  columns: string[];
  rows: Array<Record<string, string | number>>;
};

export type ReportChart = {
  id: string;
  title: string;
  description?: string;
  kind: "bar" | "line";
  xKey: string;
  data: Array<Record<string, string | number>>;
  series: Array<{
    key: string;
    label: string;
    color: string;
  }>;
};

export type ReportSection = {
  id: string;
  title: string;
  summary: string;
  metrics?: ReportMetric[];
  bullets?: string[];
  callouts?: ReportCallout[];
  table?: ReportTable;
};

export type ReportInsightSummary = {
  id: string;
  title: string;
  takeaway: string;
  competitorNames: string[];
  campaignType: string;
  priorityLevel: ReportPriority;
  impactArea: ReportImpact;
  confidence: number | null;
};

export type ReportAction = {
  title: string;
  detail: string;
  priority: ReportPriority;
};

export type GeneratedReportPayload = {
  templateKey: ReportTemplateKey;
  title: string;
  subtitle: string;
  generatedAt: string;
  rangeDays: number;
  workspaceId: string;
  workspaceName: string;
  summary: {
    whatChanged: string;
    whatMatters: string;
  };
  charts: ReportChart[];
  sections: ReportSection[];
  insights: ReportInsightSummary[];
  actions: ReportAction[];
  metadata: {
    activeCompetitors: number;
    trackedSignals: number;
    structuredInsights: number;
  };
};

export type ReportScheduleRecord = {
  id: string;
  name: string;
  templateKey: ReportTemplateKey;
  frequency: ReportFrequency;
  dayOfWeek: number | null;
  hourOfDay: number;
  minuteOfHour: number;
  timezone: string;
  rangeDays: number;
  isActive: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReportRunRecord = {
  id: string;
  scheduleId: string | null;
  templateKey: ReportTemplateKey;
  title: string;
  status: ReportStatus;
  generatedAt: string;
  createdAt: string;
  errorMessage: string | null;
  payload: GeneratedReportPayload | null;
};

export type ReportScheduleInput = {
  id?: string;
  name: string;
  templateKey: ReportTemplateKey;
  frequency: ReportFrequency;
  dayOfWeek: number | null;
  hourOfDay: number;
  minuteOfHour: number;
  timezone: string;
  rangeDays: number;
  isActive: boolean;
};

export type ReportAnalyticsSummary = {
  rangeDays: number;
  totalNewslettersInRange: number;
  totalAdsInRange: number;
  totalInsightsInRange: number;
  activeCompetitorsInRange: number;
  totalCompetitors: number;
  attributedNewslettersInRange: number;
  unattributedNewslettersInRange: number;
  promotionRate: number;
  urgencyRate: number;
  newsletterGrowthRate: number;
  adGrowthRate: number;
  averageDiscount: number;
  maxDiscount: number;
  freeShippingRate: number;
  lastInboxActivity: string | null;
  lastAdActivity: string | null;
};

export type ReportAnalyticsData = {
  summary: ReportAnalyticsSummary;
  weeklyActivity: { week: string; newsletters: number; ads: number; insights: number }[];
  promotionFrequency: { competitor: string; promos: number; total: number }[];
  ctaDistribution: { cta: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
  urgencyFrequency: { type: string; count: number }[];
  campaignTypes: { type: string; count: number }[];
  shareOfVoice: { competitor: string; signalShare: number; newsletters: number; ads: number }[];
  discountDistribution: { band: string; count: number }[];
};

export type ReportBuilderContext = {
  workspaceId: string;
  workspaceName: string;
  generatedAt: string;
  rangeDays: number;
  analytics: ReportAnalyticsData;
  insights: NormalizedInsight[];
  competitorSnapshots: CompetitorIntelligenceSnapshot[];
};

type TimezoneParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const CHART_COLORS = {
  primary: "hsl(var(--chart-1))",
  secondary: "hsl(var(--chart-2))",
  tertiary: "hsl(var(--chart-3))",
  accent: "hsl(var(--chart-4))",
} as const;

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatChange(value: number) {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function clampRangeDays(value: number) {
  if (!Number.isFinite(value)) {
    return 7;
  }

  return Math.min(Math.max(Math.round(value), 1), 180);
}

function formatCampaignType(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return "campaign";
  }

  return value.replaceAll("_", " ").trim();
}

function formatCompetitorList(values: string[], fallback = "tracked competitors") {
  if (values.length === 0) {
    return fallback;
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, 2).join(", ")} and ${values.length - 2} more`;
}

function startOfMinute(date: Date) {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  return copy;
}

function getTimezoneParts(date: Date, timezone: string): TimezoneParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
    hour: Number(partMap.hour),
    minute: Number(partMap.minute),
    weekday: weekdayMap[partMap.weekday] ?? 0,
  };
}

function matchesSchedule(input: ReportScheduleInput, date: Date) {
  const parts = getTimezoneParts(date, input.timezone);

  if (parts.hour !== input.hourOfDay || parts.minute !== input.minuteOfHour) {
    return false;
  }

  if (input.frequency === "weekly") {
    return parts.weekday === (input.dayOfWeek ?? 1);
  }

  return true;
}

function getTopInsightSummaries(insights: NormalizedInsight[], limit = 5): ReportInsightSummary[] {
  return [...insights]
    .sort(compareDashboardInsights)
    .slice(0, limit)
    .map((insight) => ({
      id: insight.id,
      title: insight.title,
      takeaway: insight.strategic_takeaway || insight.strategic_implication || insight.why_it_matters,
      competitorNames: insight.affected_competitors,
      campaignType: formatCampaignType(insight.campaign_type),
      priorityLevel: insight.priority_level,
      impactArea: insight.impact_area,
      confidence: insight.confidence,
    }));
}

function buildRecommendedActions(
  insights: ReportInsightSummary[],
  competitorSnapshots: CompetitorIntelligenceSnapshot[],
): ReportAction[] {
  const actions: ReportAction[] = [];

  for (const insight of insights.slice(0, 3)) {
    actions.push({
      title: `Respond to ${insight.title}`,
      detail: `${formatCompetitorList(insight.competitorNames)} is signaling ${insight.campaignType}. ${insight.takeaway}`,
      priority: insight.priorityLevel,
    });
  }

  for (const competitor of competitorSnapshots.slice(0, 2)) {
    const opportunity = competitor.opportunities[0];
    if (!opportunity) {
      continue;
    }

    actions.push({
      title: `Exploit whitespace against ${competitor.competitorName}`,
      detail: opportunity,
      priority: competitor.activity.totalSignals >= 6 ? "high" : "medium",
    });
  }

  return actions.slice(0, 5);
}

function buildWhatChanged(context: ReportBuilderContext, insights: ReportInsightSummary[]) {
  const topCompetitor = context.competitorSnapshots[0];
  const topInsight = insights[0];
  const newsletters = context.analytics.summary.totalNewslettersInRange;
  const ads = context.analytics.summary.totalAdsInRange;

  if (topCompetitor && topInsight) {
    return `${topCompetitor.competitorName} generated the strongest recent signal footprint, while ${topInsight.title} emerged as the highest-priority strategic change across ${newsletters} newsletters and ${ads} ads.`;
  }

  if (topCompetitor) {
    return `${topCompetitor.competitorName} leads the current activity window with ${topCompetitor.activity.totalSignals} tracked signals.`;
  }

  return `The current report is based on ${newsletters} newsletters, ${ads} ads, and ${context.analytics.summary.totalInsightsInRange} structured insights in the selected window.`;
}

function buildWhatMatters(context: ReportBuilderContext, insights: ReportInsightSummary[], actions: ReportAction[]) {
  const topInsight = insights[0];
  const topAction = actions[0];

  if (topInsight && topAction) {
    return `${topInsight.title} matters most because it is a ${topInsight.impactArea} issue with ${topInsight.priorityLevel} priority. Recommended next move: ${topAction.title}.`;
  }

  if (topAction) {
    return topAction.detail;
  }

  return "No high-confidence competitor move stands out yet. Keep ingestion active to strengthen the decision layer.";
}

function buildWeeklyPulse(context: ReportBuilderContext): GeneratedReportPayload {
  const insights = getTopInsightSummaries(context.insights, 6);
  const actions = buildRecommendedActions(insights, context.competitorSnapshots);
  const topCompetitors = context.competitorSnapshots.slice(0, 3);
  const topTimelineEvents = context.competitorSnapshots
    .flatMap((snapshot) =>
      snapshot.campaignTimeline.slice(0, 2).map((event) => ({
        competitorName: snapshot.competitorName,
        event,
      })),
    )
    .sort((left, right) => new Date(right.event.happenedAt ?? 0).getTime() - new Date(left.event.happenedAt ?? 0).getTime())
    .slice(0, 5);

  return {
    templateKey: "weekly_competitor_pulse",
    title: `${REPORT_TEMPLATES.weekly_competitor_pulse.label} · ${context.workspaceName}`,
    subtitle: `A concise weekly brief covering the most important competitor moves, pressure points, and recommended responses.`,
    generatedAt: context.generatedAt,
    rangeDays: context.rangeDays,
    workspaceId: context.workspaceId,
    workspaceName: context.workspaceName,
    summary: {
      whatChanged: buildWhatChanged(context, insights),
      whatMatters: buildWhatMatters(context, insights, actions),
    },
    charts: [
      {
        id: "weekly-activity",
        title: "Competitive activity trend",
        description: "Weekly volume across newsletters, ads, and structured insights.",
        kind: "line",
        xKey: "week",
        data: context.analytics.weeklyActivity,
        series: [
          { key: "newsletters", label: "Newsletters", color: CHART_COLORS.primary },
          { key: "ads", label: "Ads", color: CHART_COLORS.secondary },
          { key: "insights", label: "Insights", color: CHART_COLORS.tertiary },
        ],
      },
      {
        id: "share-of-voice",
        title: "Share of monitored activity",
        description: "Which competitors currently dominate the tracked signal set.",
        kind: "bar",
        xKey: "competitor",
        data: context.analytics.shareOfVoice.slice(0, 6).map((item) => ({
          competitor: item.competitor,
          signalShare: Number(item.signalShare.toFixed(1)),
        })),
        series: [{ key: "signalShare", label: "Signal share %", color: CHART_COLORS.accent }],
      },
    ],
    sections: [
      {
        id: "executive-snapshot",
        title: "Executive snapshot",
        summary: "This is the fastest read on signal volume, active competitors, promotion intensity, and current growth direction.",
        metrics: [
          {
            label: "Tracked newsletters",
            value: String(context.analytics.summary.totalNewslettersInRange),
            detail: `${formatChange(context.analytics.summary.newsletterGrowthRate)} vs previous period`,
          },
          {
            label: "Tracked ads",
            value: String(context.analytics.summary.totalAdsInRange),
            detail: `${formatChange(context.analytics.summary.adGrowthRate)} vs previous period`,
          },
          {
            label: "Active competitors",
            value: `${context.analytics.summary.activeCompetitorsInRange}/${context.analytics.summary.totalCompetitors}`,
            detail: "Competitors with at least one recent signal",
          },
          {
            label: "Promotion pressure",
            value: formatPercent(context.analytics.summary.promotionRate),
            detail: `Average discount ${context.analytics.summary.averageDiscount.toFixed(1)}%`,
          },
        ],
      },
      {
        id: "top-competitor-actions",
        title: "Top competitor actions",
        summary: "Most relevant launches and moves observed in the current reporting window.",
        callouts: topTimelineEvents.map(({ competitorName, event }) => ({
          title: `${competitorName} · ${event.title}`,
          body: event.summary,
          tone: event.source === "insight" ? "warning" : "neutral",
        })),
      },
      {
        id: "competitor-focus",
        title: "Competitor focus",
        summary: "The competitors currently setting the pace and the categories where they are concentrating effort.",
        table: {
          columns: ["Competitor", "Signals", "Share of voice", "Top category"],
          rows: topCompetitors.map((competitor) => ({
            Competitor: competitor.competitorName,
            Signals: competitor.activity.totalSignals,
            "Share of voice": formatPercent(competitor.activity.shareOfVoice * 100),
            "Top category": competitor.categoryFocus[0]?.category ?? "No dominant category yet",
          })),
        },
      },
    ],
    insights,
    actions,
    metadata: {
      activeCompetitors: context.analytics.summary.activeCompetitorsInRange,
      trackedSignals: context.competitorSnapshots.reduce((sum, competitor) => sum + competitor.activity.totalSignals, 0),
      structuredInsights: context.analytics.summary.totalInsightsInRange,
    },
  };
}

function buildPromoDigest(context: ReportBuilderContext): GeneratedReportPayload {
  const promoInsights = getTopInsightSummaries(
    context.insights.filter(
      (insight) =>
        typeof insight.offer_discount_percentage === "number" ||
        Boolean(insight.offer_coupon_code) ||
        insight.offer_urgency.length > 0,
    ),
    6,
  );
  const actions = buildRecommendedActions(promoInsights, context.competitorSnapshots);
  const competitorPromoRows = context.competitorSnapshots
    .filter((snapshot) => snapshot.activity.totalSignals > 0)
    .slice(0, 6)
    .map((snapshot) => ({
      Competitor: snapshot.competitorName,
      "Promo rate": formatPercent(snapshot.promoBehavior.promoRate * 100),
      "Avg discount": `${Math.round(snapshot.promoBehavior.averageDiscount)}%`,
      Urgency: formatPercent(snapshot.promoBehavior.urgencyRate * 100),
      Profile: snapshot.promoBehavior.profile,
    }));

  return {
    templateKey: "promo_digest",
    title: `${REPORT_TEMPLATES.promo_digest.label} · ${context.workspaceName}`,
    subtitle: `Offer pressure, discount depth, urgency behavior, and the competitors pushing the market hardest on conversion.`,
    generatedAt: context.generatedAt,
    rangeDays: context.rangeDays,
    workspaceId: context.workspaceId,
    workspaceName: context.workspaceName,
    summary: {
      whatChanged: `Promotional activity hit ${formatPercent(context.analytics.summary.promotionRate)} of tracked campaigns, with discounts peaking at ${context.analytics.summary.maxDiscount.toFixed(0)}% in the selected window.`,
      whatMatters: promoInsights[0]
        ? `${promoInsights[0].title} is the strongest promotion-led signal right now.`
        : "Promotion pressure is moderate, but keeping a close watch on discount depth and urgency still matters for conversion planning.",
    },
    charts: [
      {
        id: "discount-distribution",
        title: "Discount distribution",
        description: "Observed discount bands across the reporting window.",
        kind: "bar",
        xKey: "band",
        data: context.analytics.discountDistribution,
        series: [{ key: "count", label: "Campaigns", color: CHART_COLORS.primary }],
      },
      {
        id: "promotion-frequency",
        title: "Promotion frequency by competitor",
        description: "How often tracked competitors rely on promotions in observed campaigns.",
        kind: "bar",
        xKey: "competitor",
        data: context.analytics.promotionFrequency.slice(0, 6).map((item) => ({
          competitor: item.competitor,
          promos: item.promos,
          total: item.total,
        })),
        series: [
          { key: "promos", label: "Promo campaigns", color: CHART_COLORS.secondary },
          { key: "total", label: "Tracked campaigns", color: CHART_COLORS.tertiary },
        ],
      },
    ],
    sections: [
      {
        id: "offer-pressure",
        title: "Offer pressure snapshot",
        summary: "These metrics summarize how aggressive the market is becoming on discounting and urgency.",
        metrics: [
          {
            label: "Promo rate",
            value: formatPercent(context.analytics.summary.promotionRate),
            detail: "Share of tracked campaigns with discount, coupon, or urgency mechanics",
          },
          {
            label: "Average discount",
            value: `${context.analytics.summary.averageDiscount.toFixed(1)}%`,
            detail: `Max observed ${context.analytics.summary.maxDiscount.toFixed(0)}%`,
          },
          {
            label: "Urgency rate",
            value: formatPercent(context.analytics.summary.urgencyRate),
            detail: "Campaigns using scarcity or deadline cues",
          },
          {
            label: "Free shipping rate",
            value: formatPercent(context.analytics.summary.freeShippingRate),
            detail: "Campaigns using shipping incentives",
          },
        ],
      },
      {
        id: "promo-watchlist",
        title: "Promo watchlist",
        summary: "High-signal promotion moves that should inform pricing, offer design, and conversion strategy.",
        callouts: promoInsights.slice(0, 5).map((insight) => ({
          title: insight.title,
          body: insight.takeaway,
          tone: insight.priorityLevel === "high" ? "warning" : "neutral",
        })),
      },
      {
        id: "competitor-promo-matrix",
        title: "Competitor promo matrix",
        summary: "Benchmark which competitors are leaning hardest into offers and urgency.",
        table: {
          columns: ["Competitor", "Promo rate", "Avg discount", "Urgency", "Profile"],
          rows: competitorPromoRows,
        },
      },
    ],
    insights: promoInsights,
    actions,
    metadata: {
      activeCompetitors: context.analytics.summary.activeCompetitorsInRange,
      trackedSignals: context.competitorSnapshots.reduce((sum, competitor) => sum + competitor.activity.totalSignals, 0),
      structuredInsights: context.analytics.summary.totalInsightsInRange,
    },
  };
}

function buildMessagingAnalysis(context: ReportBuilderContext): GeneratedReportPayload {
  const messagingInsights = getTopInsightSummaries(context.insights, 6);
  const actions = buildRecommendedActions(messagingInsights, context.competitorSnapshots);
  const messagingRows = context.competitorSnapshots.slice(0, 6).map((snapshot) => ({
    Competitor: snapshot.competitorName,
    "Current angle": snapshot.messagingEvolution.currentAngles[0] ?? "No dominant angle yet",
    "Emerging angle": snapshot.messagingEvolution.emergingAngles[0] ?? "No new angle yet",
    "Top category": snapshot.categoryFocus[0]?.category ?? "No category signal yet",
  }));

  return {
    templateKey: "messaging_analysis",
    title: `${REPORT_TEMPLATES.messaging_analysis.label} · ${context.workspaceName}`,
    subtitle: `Narrative, CTA, and category trends that reveal how competitors are positioning themselves in-market.`,
    generatedAt: context.generatedAt,
    rangeDays: context.rangeDays,
    workspaceId: context.workspaceId,
    workspaceName: context.workspaceName,
    summary: {
      whatChanged: messagingInsights[0]
        ? `${messagingInsights[0].title} is the clearest messaging shift detected in the selected window.`
        : "Messaging has remained relatively stable across the current reporting window.",
      whatMatters: messagingInsights[0]
        ? `${messagingInsights[0].takeaway} This matters because positioning and CTA patterns compound over time before they show up in conversion metrics.`
        : "Use this report to validate whether competitors are repeating stale narratives or opening new positioning angles you should respond to.",
    },
    charts: [
      {
        id: "category-distribution",
        title: "Category focus distribution",
        description: "Most common product categories appearing in extracted campaigns and insights.",
        kind: "bar",
        xKey: "category",
        data: context.analytics.categoryDistribution.slice(0, 8),
        series: [{ key: "count", label: "Mentions", color: CHART_COLORS.primary }],
      },
      {
        id: "campaign-type-mix",
        title: "Campaign type mix",
        description: "Observed campaign types and CTA-led behaviors across the tracked window.",
        kind: "bar",
        xKey: "type",
        data: context.analytics.campaignTypes.slice(0, 8),
        series: [{ key: "count", label: "Campaigns", color: CHART_COLORS.accent }],
      },
    ],
    sections: [
      {
        id: "messaging-brief",
        title: "Messaging brief",
        summary: "High-level narrative and positioning direction seen across the tracked competitor set.",
        callouts: context.competitorSnapshots.slice(0, 4).map((snapshot) => ({
          title: snapshot.competitorName,
          body: snapshot.messagingEvolution.shiftSummary,
          tone: snapshot.messagingEvolution.emergingAngles.length > 0 ? "warning" : "neutral",
        })),
      },
      {
        id: "cta-themes",
        title: "CTA and category themes",
        summary: "The strongest repeated CTA patterns and category focus areas being used to move demand.",
        table: {
          columns: ["Competitor", "Current angle", "Emerging angle", "Top category"],
          rows: messagingRows,
        },
      },
      {
        id: "strategic-opportunities",
        title: "Strategic opportunities",
        summary: "Whitespace and narrative gaps surfaced by competitor messaging evolution and insight data.",
        bullets: context.competitorSnapshots
          .flatMap((snapshot) => snapshot.opportunities.slice(0, 1))
          .filter((entry, index, array) => array.indexOf(entry) === index)
          .slice(0, 6),
      },
    ],
    insights: messagingInsights,
    actions,
    metadata: {
      activeCompetitors: context.analytics.summary.activeCompetitorsInRange,
      trackedSignals: context.competitorSnapshots.reduce((sum, competitor) => sum + competitor.activity.totalSignals, 0),
      structuredInsights: context.analytics.summary.totalInsightsInRange,
    },
  };
}

export function isReportTemplateKey(value: string): value is ReportTemplateKey {
  return value in REPORT_TEMPLATES;
}

export function getDefaultRangeDays(templateKey: ReportTemplateKey) {
  return REPORT_TEMPLATES[templateKey].defaultRangeDays;
}

export function getReportTemplateLabel(templateKey: ReportTemplateKey) {
  return REPORT_TEMPLATES[templateKey].label;
}

export function getNextScheduledRun(input: ReportScheduleInput, from = new Date()) {
  const roundedStart = startOfMinute(new Date(from.getTime() + 60_000));
  const limit = input.frequency === "weekly" ? 8 * 24 * 60 : 2 * 24 * 60;
  const safeTimezone = input.timezone?.trim() || "UTC";
  const normalizedInput = {
    ...input,
    timezone: safeTimezone,
    rangeDays: clampRangeDays(input.rangeDays),
    hourOfDay: Math.min(Math.max(Math.floor(input.hourOfDay), 0), 23),
    minuteOfHour: Math.min(Math.max(Math.floor(input.minuteOfHour), 0), 59),
  };

  for (let minuteOffset = 0; minuteOffset <= limit; minuteOffset += 1) {
    const candidate = new Date(roundedStart.getTime() + minuteOffset * 60_000);
    if (matchesSchedule(normalizedInput, candidate)) {
      return candidate.toISOString();
    }
  }

  return null;
}

export function buildReportPayload(context: ReportBuilderContext, templateKey: ReportTemplateKey): GeneratedReportPayload {
  if (templateKey === "promo_digest") {
    return buildPromoDigest(context);
  }

  if (templateKey === "messaging_analysis") {
    return buildMessagingAnalysis(context);
  }

  return buildWeeklyPulse(context);
}
