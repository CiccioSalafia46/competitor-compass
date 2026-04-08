import type {
  AnalyticsData,
  AnalyticsSummary,
  ShareOfVoicePoint,
  WeeklyActivityPoint,
} from "@/hooks/useAnalyticsData";
import type { InsightPriorityLevel } from "@/lib/insight-priority";

export type AnalyticsHealthStatus = "good" | "watch" | "risk";

export interface AnalyticsHealthItem {
  label: string;
  value: string;
  detail: string;
  progress: number;
  status: AnalyticsHealthStatus;
}

export interface AnalyticsAction {
  title: string;
  detail: string;
  cta: string;
  path: string;
  priority: InsightPriorityLevel;
}

export interface AnalyticsAnomaly {
  title: string;
  detail: string;
  severity: InsightPriorityLevel;
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function daysSince(timestamp: string | null) {
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

function getSignalShareLeader(points: ShareOfVoicePoint[]) {
  return [...points].sort((left, right) => right.signalShare - left.signalShare)[0] ?? null;
}

function getLatestVsBaseline(points: WeeklyActivityPoint[], key: keyof WeeklyActivityPoint) {
  if (points.length < 5) return null;

  const latest = Number(points[points.length - 1]?.[key] ?? 0);
  const baselinePoints = points.slice(-5, -1);
  const baselineAverage =
    baselinePoints.reduce((total, point) => total + Number(point[key] ?? 0), 0) / baselinePoints.length;

  if (!Number.isFinite(latest) || !Number.isFinite(baselineAverage)) {
    return null;
  }

  return {
    latest,
    baselineAverage,
    lift: baselineAverage > 0 ? latest / baselineAverage : latest > 0 ? Infinity : 0,
  };
}

function summarizeSyncFreshness(summary: AnalyticsSummary): AnalyticsHealthItem {
  const staleDays = daysSince(summary.lastGmailSyncAt);

  if (staleDays === null) {
    return {
      label: "Gmail freshness",
      value: "Not synced",
      detail: "No successful Gmail sync has been recorded yet for this workspace.",
      progress: 0,
      status: "risk",
    };
  }

  if (staleDays >= 7) {
    return {
      label: "Gmail freshness",
      value: `${staleDays}d stale`,
      detail: "Signals may be outdated. Sync Gmail before relying on this page for decisions.",
      progress: 10,
      status: "risk",
    };
  }

  if (staleDays >= 2) {
    return {
      label: "Gmail freshness",
      value: `${staleDays}d old`,
      detail: "Recent enough for monitoring, but not ideal for daily decision-making.",
      progress: 55,
      status: "watch",
    };
  }

  return {
    label: "Gmail freshness",
    value: "Fresh",
    detail: "The inbox has been synced recently enough to support day-to-day decisions.",
    progress: 100,
    status: "good",
  };
}

export function buildAnalyticsHealthAudit(data: AnalyticsData): AnalyticsHealthItem[] {
  const summary = data.summary;
  const competitorsWithConfiguredDomains = summary.totalCompetitors > 0
    ? (summary.competitorsWithDomains / summary.totalCompetitors) * 100
    : 0;
  const activeCompetitorCoverage = summary.totalCompetitors > 0
    ? (summary.activeCompetitorsInRange / summary.totalCompetitors) * 100
    : 0;
  const attributedBase = summary.attributedNewslettersInRange + summary.unattributedNewslettersInRange;
  const attributionCoverage = attributedBase > 0
    ? (summary.attributedNewslettersInRange / attributedBase) * 100
    : 0;

  return [
    summarizeSyncFreshness(summary),
    {
      label: "Inbox attribution",
      value: `${summary.attributedNewslettersInRange}/${attributedBase || 0}`,
      detail: attributedBase === 0
        ? "No newsletters were imported in the selected range."
        : `${summary.unattributedBacklog} newsletters are still unmatched across the full inbox backlog.`,
      progress: clampProgress(attributionCoverage),
      status: attributionCoverage >= 85 ? "good" : attributionCoverage >= 60 ? "watch" : "risk",
    },
    {
      label: "Newsletter extraction",
      value: `${summary.extractionCoverageRate.toFixed(1)}%`,
      detail: `${summary.extractedNewslettersInRange} newsletters have structured AI extraction in the selected window.`,
      progress: clampProgress(summary.extractionCoverageRate),
      status: summary.extractionCoverageRate >= 80 ? "good" : summary.extractionCoverageRate >= 55 ? "watch" : "risk",
    },
    {
      label: "Ad analysis coverage",
      value: `${summary.adAnalysisCoverageRate.toFixed(1)}%`,
      detail: `${summary.analyzedAdsInRange} ads have AI analysis in the selected window.`,
      progress: clampProgress(summary.adAnalysisCoverageRate),
      status: summary.adAnalysisCoverageRate >= 75 ? "good" : summary.adAnalysisCoverageRate >= 50 ? "watch" : "risk",
    },
    {
      label: "Competitor domain readiness",
      value: `${summary.competitorsWithDomains}/${summary.totalCompetitors}`,
      detail: summary.competitorsMissingDomains > 0
        ? `${summary.competitorsMissingDomains} monitored competitors still miss website/domains for inbox matching.`
        : "All monitored competitors have at least one domain signal configured.",
      progress: clampProgress(competitorsWithConfiguredDomains),
      status: competitorsWithConfiguredDomains >= 90 ? "good" : competitorsWithConfiguredDomains >= 65 ? "watch" : "risk",
    },
    {
      label: "Active competitor coverage",
      value: `${summary.activeCompetitorsInRange}/${summary.totalCompetitors}`,
      detail: summary.inactiveCompetitorsInRange > 0
        ? `${summary.inactiveCompetitorsInRange} monitored competitors were silent in the selected window.`
        : "Every monitored competitor produced at least one recent signal.",
      progress: clampProgress(activeCompetitorCoverage),
      status: activeCompetitorCoverage >= 75 ? "good" : activeCompetitorCoverage >= 45 ? "watch" : "risk",
    },
  ];
}

export function buildAnalyticsActionQueue(data: AnalyticsData): AnalyticsAction[] {
  const summary = data.summary;
  const actions: AnalyticsAction[] = [];
  const staleDays = daysSince(summary.lastGmailSyncAt);
  const leader = getSignalShareLeader(data.shareOfVoice);

  if (staleDays === null) {
    actions.push({
      title: "Connect and sync Gmail",
      detail: "Without a recent Gmail sync, the analytics layer is blind to competitor newsletter activity.",
      cta: "Open settings",
      path: "/settings",
      priority: "high",
    });
  } else if (staleDays >= 2) {
    actions.push({
      title: "Refresh inbox ingestion",
      detail: `The latest Gmail sync is ${staleDays} day${staleDays === 1 ? "" : "s"} old. Refresh ingestion before acting on the current readout.`,
      cta: "Go to Inbox",
      path: "/inbox",
      priority: "high",
    });
  }

  if (summary.unattributedBacklog > 0) {
    actions.push({
      title: "Fix unmatched newsletter backlog",
      detail: `${summary.unattributedBacklog} imported newsletters are still not mapped to a competitor, which weakens analytics and alerts.`,
      cta: "Review Inbox",
      path: "/inbox",
      priority: summary.unattributedBacklog >= 10 ? "high" : "medium",
    });
  }

  if (summary.competitorsMissingDomains > 0) {
    actions.push({
      title: "Add sender domains to competitors",
      detail: `${summary.competitorsMissingDomains} monitored competitors cannot be matched reliably because website/domain metadata is incomplete.`,
      cta: "Update competitors",
      path: "/competitors",
      priority: "high",
    });
  }

  if (summary.totalNewslettersInRange >= 5 && summary.extractionCoverageRate < 70) {
    actions.push({
      title: "Increase newsletter extraction coverage",
      detail: `Only ${summary.extractionCoverageRate.toFixed(1)}% of newsletters in the selected window have structured AI extraction.`,
      cta: "Review Inbox",
      path: "/inbox",
      priority: summary.extractionCoverageRate < 40 ? "high" : "medium",
    });
  }

  if (summary.totalAdsInRange >= 5 && summary.adAnalysisCoverageRate < 65) {
    actions.push({
      title: "Analyze more paid ads",
      detail: `Only ${summary.adAnalysisCoverageRate.toFixed(1)}% of tracked ads have AI analysis, which limits messaging and CTA comparisons.`,
      cta: "Open Analytics",
      path: "/analytics",
      priority: summary.adAnalysisCoverageRate < 35 ? "high" : "medium",
    });
  }

  if (leader && leader.signalShare >= 40) {
    actions.push({
      title: `Benchmark ${leader.competitor}`,
      detail: `${leader.competitor} owns ${leader.signalShare.toFixed(1)}% of tracked activity in the selected window and is shaping the competitive frame.`,
      cta: "Inspect pressure",
      path: "/analytics",
      priority: leader.signalShare >= 55 ? "high" : "medium",
    });
  }

  if (summary.averageDiscount >= 20 || summary.maxDiscount >= 30 || summary.freeShippingRate >= 30) {
    actions.push({
      title: "Review current offer posture",
      detail: `Competitors are leaning on discount depth and shipping incentives. The current benchmark averages ${summary.averageDiscount.toFixed(1)}% off with a max observed discount of ${summary.maxDiscount.toFixed(0)}%.`,
      cta: "Review promotion mix",
      path: "/analytics",
      priority: "medium",
    });
  }

  if (summary.inactiveCompetitorsInRange > 0) {
    actions.push({
      title: "Audit the monitored competitor list",
      detail: `${summary.inactiveCompetitorsInRange} monitored competitors produced no signals in the selected range. They may need better domains, better sources, or removal.`,
      cta: "Review competitors",
      path: "/competitors",
      priority: "low",
    });
  }

  return actions.slice(0, 6);
}

export function buildAnalyticsAnomalies(data: AnalyticsData): AnalyticsAnomaly[] {
  const anomalies: AnalyticsAnomaly[] = [];
  const newsletterDelta = getLatestVsBaseline(data.weeklyActivity, "newsletters");
  const adDelta = getLatestVsBaseline(data.weeklyActivity, "ads");
  const leader = getSignalShareLeader(data.shareOfVoice);

  if (newsletterDelta && newsletterDelta.latest >= 4 && newsletterDelta.lift >= 1.6) {
    anomalies.push({
      title: "Newsletter activity spike",
      detail: `The latest week logged ${newsletterDelta.latest} newsletters, versus a recent baseline of ${newsletterDelta.baselineAverage.toFixed(1)}.`,
      severity: "high",
    });
  }

  if (adDelta && adDelta.latest >= 3 && adDelta.lift >= 1.6) {
    anomalies.push({
      title: "Paid activity acceleration",
      detail: `Tracked ads rose to ${adDelta.latest} in the latest week, above a baseline of ${adDelta.baselineAverage.toFixed(1)}.`,
      severity: "high",
    });
  }

  if (leader && leader.signalShare >= 45) {
    anomalies.push({
      title: "One competitor is dominating share of signal",
      detail: `${leader.competitor} represents ${leader.signalShare.toFixed(1)}% of observed newsletter and ad activity.`,
      severity: "high",
    });
  }

  if (data.summary.promotionRate >= 60 && data.summary.freeShippingRate >= 20) {
    anomalies.push({
      title: "Promotion pressure is elevated",
      detail: `${data.summary.promotionRate.toFixed(1)}% of recent newsletter campaigns are promotion-led, and shipping incentives appear in ${data.summary.freeShippingRate.toFixed(1)}% of extractions.`,
      severity: "high",
    });
  }

  if (data.summary.unattributedBacklog >= 10) {
    anomalies.push({
      title: "Attribution blind spot",
      detail: `${data.summary.unattributedBacklog} imported newsletters are outside competitor coverage and are diluting the reliability of the analytics layer.`,
      severity: "medium",
    });
  }

  return anomalies.slice(0, 4);
}
