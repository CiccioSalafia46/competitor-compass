import { lazy, memo, Suspense, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow, format, subDays, type Locale } from "date-fns";
import { de, enUS, es, fr, it } from "date-fns/locale";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import {
  useDashboardSnapshot,
  type DashboardCompetitorPreview,
  type DashboardInboxPreview,
  type HeatmapRow,
  type WeeklyDelta,
} from "@/hooks/useDashboardSnapshot";
import {
  buildDashboardAiSummary,
  type DashboardAISummary,
  type DashboardAnomaly,
  type DashboardHighlight,
  type DashboardInsight,
  type DashboardRecommendedAction,
  type DashboardCompetitorSummary,
  type DashboardStats,
} from "@/lib/dashboard-decision-engine";
import type { InsightPriorityLevel } from "@/lib/insight-priority";
import { cn } from "@/lib/utils";
import CompetitorLogo from "@/components/CompetitorLogo";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardLoadingSkeleton } from "@/components/dashboard/DashboardSkeletons";
import { MiniSparkline } from "@/components/dashboard/MiniSparkline";
import {
  PRIORITY_STYLES,
  SIGNAL_CATEGORIES,
  SIGNAL_CATEGORY_STYLES,
  getActionIconName,
  type SignalCategory,
} from "@/components/dashboard/dashboardConstants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const LazySystemHealthPanel = lazy(() =>
  import("@/components/SystemHealthPanel").then((module) => ({ default: module.SystemHealthPanel })),
);

const LazyActivityHeatmap = lazy(() =>
  import("@/components/dashboard/ActivityHeatmap").then((module) => ({ default: module.ActivityHeatmap })),
);

const PERIOD_OPTIONS = ["today", "7d", "30d", "custom"] as const;
type DashboardPeriod = (typeof PERIOD_OPTIONS)[number];

type FreshnessTone = "healthy" | "warning" | "error" | "idle";

interface FreshnessState {
  tone: FreshnessTone;
  labelKey: string;
  tooltipKey: string;
  hoursSinceSync: number | null;
}

interface TodayBriefItem {
  id: string;
  headline: string;
  why: string;
  action: string;
  href: string;
  competitor: string | null;
  category: string | null;
  priority: InsightPriorityLevel;
  confidence: number | null;
  createdAt: string | null;
  sourceType: string | null;
}

interface SignalItem {
  id: string;
  title: string;
  detail: string;
  category: SignalCategory;
  timestamp: string;
  href: string;
  competitor?: string | null;
  priority?: InsightPriorityLevel;
}

interface CompetitorPulseItem {
  id: string;
  name: string;
  website: string | null;
  totalSignals: number;
  trend: "up" | "down" | "flat";
  sparkline: number[];
}

const DATE_FNS_LOCALES = { de, en: enUS, es, fr, it };
const PRIORITY_LABEL_KEYS: Record<InsightPriorityLevel, string> = {
  high: "priorityHigh",
  medium: "priorityMedium",
  low: "priorityLow",
};

const ACTION_ICONS = { target: Target, "alert-triangle": AlertTriangle, eye: Eye, zap: Zap } as const;

function getDateFnsLocale(language: string) {
  const lang = language.split("-")[0] as keyof typeof DATE_FNS_LOCALES;
  return DATE_FNS_LOCALES[lang] ?? enUS;
}

function normalizeDashboardPriority(priority: string | null | undefined): InsightPriorityLevel {
  if (priority === "high" || priority === "medium" || priority === "low") return priority;
  if (priority === "critical") return "high";
  return "low";
}

function formatPlain(value: string | null | undefined, fallback = "") {
  return value?.trim() ? value.replaceAll("_", " ") : fallback;
}

function getFreshnessState(lastSyncAt: string | null, connected: boolean): FreshnessState {
  if (!connected) {
    return { tone: "warning", labelKey: "statusSourceDisconnected", tooltipKey: "statusSourceDisconnectedTip", hoursSinceSync: null };
  }

  if (!lastSyncAt) {
    return { tone: "idle", labelKey: "statusAwaitingFirstSync", tooltipKey: "statusAwaitingFirstSyncTip", hoursSinceSync: null };
  }

  const hoursSinceSync = Math.max(0, (Date.now() - new Date(lastSyncAt).getTime()) / 36e5);
  if (hoursSinceSync > 24 * 7) {
    return { tone: "error", labelKey: "statusSyncCritical", tooltipKey: "statusSyncCriticalTip", hoursSinceSync };
  }
  if (hoursSinceSync > 24) {
    return { tone: "warning", labelKey: "statusSyncStale", tooltipKey: "statusSyncStaleTip", hoursSinceSync };
  }
  return { tone: "healthy", labelKey: "statusOperational", tooltipKey: "statusOperationalTip", hoursSinceSync };
}

function newestInboxDate(items: DashboardInboxPreview[]) {
  return items
    .map((item) => item.received_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

function getPeriodStart(period: DashboardPeriod): Date | null {
  const now = new Date();
  if (period === "today") {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (period === "7d") {
    now.setDate(now.getDate() - 7);
    return now;
  }
  if (period === "30d") {
    now.setDate(now.getDate() - 30);
    return now;
  }
  return null;
}

function isInsidePeriod(timestamp: string | null | undefined, start: Date | null) {
  if (!start || !timestamp) return true;
  return new Date(timestamp).getTime() >= start.getTime();
}

// FIXME: tune AI prompt in edge function to produce: title=specific fact (Subject+Verb+Object, max 8 words),
// why=causal explanation starting with "Because...", action=imperative+specific with timeline.
function buildTodayBriefs(params: {
  insights: DashboardInsight[];
  highlights: DashboardHighlight[];
  actions: DashboardRecommendedAction[];
  aiSummary: DashboardAISummary;
}): TodayBriefItem[] {
  const fromInsights = params.insights.slice(0, 3).map((insight) => {
    const topAction = params.actions.find((action) =>
      action.competitors?.some((competitor) => insight.affected_competitors.includes(competitor)),
    ) ?? params.actions[0];

    return {
      id: insight.id,
      headline: insight.title,
      why: insight.why_it_matters || insight.strategic_takeaway || params.aiSummary.whatMattersMost,
      action: insight.recommended_response || topAction?.detail || params.aiSummary.whatMattersMost,
      href: "/insights",
      competitor: insight.affected_competitors[0] ?? null,
      category: formatPlain(insight.campaign_type || insight.category, null),
      priority: normalizeDashboardPriority(insight.priority_level),
      confidence: insight.confidence,
      createdAt: insight.created_at,
      sourceType: insight.source_type,
    };
  });

  if (fromInsights.length > 0) return fromInsights;

  const highlight = params.highlights[0];
  if (!highlight) return [];

  return [{
    id: `${highlight.kind}-${highlight.title}`,
    headline: highlight.title,
    why: highlight.detail,
    action: params.actions[0]?.detail || params.aiSummary.whatMattersMost,
    href: params.actions[0]?.path || "/insights",
    competitor: highlight.competitors?.[0] ?? null,
    category: highlight.kind === "promotion" ? "promotion" : highlight.kind === "campaign" ? "campaign" : "competitor move",
    priority: highlight.tone === "warning" ? "medium" : "low",
    confidence: null,
    createdAt: null,
    sourceType: null,
  }];
}

function getSignalCategoryFromInsight(insight: DashboardInsight): SignalCategory {
  const haystack = `${insight.category} ${insight.campaign_type} ${insight.title}`.toLowerCase();
  if (haystack.includes("pricing") || haystack.includes("discount") || haystack.includes("promo")) return "pricing";
  if (haystack.includes("hiring") || haystack.includes("job")) return "hiring";
  if (haystack.includes("content") || haystack.includes("newsletter")) return "content";
  return "campaign";
}

function buildSignalStream(params: {
  highlights: DashboardHighlight[];
  anomalies: DashboardAnomaly[];
  inbox: DashboardInboxPreview[];
  insights: DashboardInsight[];
  competitorNameById: Map<string, string>;
  locale: Locale;
  labels: {
    today: string;
    live: string;
    noSubject: string;
    unknownSender: string;
    noDate: string;
    insight: string;
  };
}) {
  const highlightSignals: SignalItem[] = params.highlights.map((highlight) => ({
    id: `highlight-${highlight.kind}-${highlight.title}`,
    title: highlight.title,
    detail: highlight.detail,
    category: highlight.kind === "promotion" ? "pricing" : highlight.kind === "campaign" ? "campaign" : "content",
    timestamp: params.labels.today,
    href: "/analytics",
    competitor: highlight.competitors?.[0] ?? null,
    priority: highlight.tone === "warning" ? "medium" : "low",
  }));

  const anomalySignals: SignalItem[] = params.anomalies.map((anomaly) => ({
    id: `anomaly-${anomaly.title}`,
    title: anomaly.title,
    detail: anomaly.detail,
    category: "campaign",
    timestamp: params.labels.live,
    href: anomaly.path,
    competitor: anomaly.competitors?.[0] ?? null,
    priority: anomaly.severity,
  }));

  const inboxSignals: SignalItem[] = params.inbox.map((item) => ({
    id: `inbox-${item.id}`,
    title: item.subject || params.labels.noSubject,
    detail: item.from_name || item.from_email || params.labels.unknownSender,
    category: "inbox",
    timestamp: item.received_at
      ? formatDistanceToNow(new Date(item.received_at), { addSuffix: true, locale: params.locale })
      : params.labels.noDate,
    href: `/inbox/${item.id}`,
    competitor: item.competitor_id ? params.competitorNameById.get(item.competitor_id) ?? null : null,
    priority: item.is_read ? "low" : "medium",
  }));

  const insightSignals: SignalItem[] = params.insights.slice(0, 2).map((insight) => ({
    id: `insight-${insight.id}`,
    title: insight.title,
    detail: insight.strategic_takeaway || insight.what_is_happening,
    category: getSignalCategoryFromInsight(insight),
    timestamp: insight.created_at
      ? formatDistanceToNow(new Date(insight.created_at), { addSuffix: true, locale: params.locale })
      : params.labels.insight,
    href: "/insights",
    competitor: insight.affected_competitors[0] ?? null,
    priority: normalizeDashboardPriority(insight.priority_level),
  }));

  return [...anomalySignals, ...highlightSignals, ...inboxSignals, ...insightSignals].slice(0, 8);
}

function buildSparkline(totalSignals: number, name: string) {
  const seed = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const base = Math.max(totalSignals, 1);
  return Array.from({ length: 8 }, (_, index) => {
    if (totalSignals === 0) return 0;
    const wave = ((seed + index * 7) % 5) - 2;
    return Math.max(1, Math.round((base / 8) * (index + 1) + wave));
  });
}

function buildCompetitorPulse(params: {
  competitors: DashboardCompetitorPreview[];
  summary: DashboardCompetitorSummary[];
}): CompetitorPulseItem[] {
  const summaryByName = new Map(params.summary.map((entry) => [entry.competitor, entry]));
  const listed = params.competitors.map((competitor) => {
    const summary = summaryByName.get(competitor.name);
    const totalSignals = (summary?.newsletters ?? 0) + (summary?.ads ?? 0);
    // TODO: replace this distribution with per-day competitor activity once the dashboard endpoint exposes it.
    const sparkline = buildSparkline(totalSignals, competitor.name);
    const last = sparkline[sparkline.length - 1] ?? 0;
    const previous = sparkline[sparkline.length - 2] ?? last;

    return {
      id: competitor.id,
      name: competitor.name,
      website: competitor.website,
      totalSignals,
      trend: last > previous ? "up" : last < previous ? "down" : "flat",
      sparkline,
    } satisfies CompetitorPulseItem;
  });

  return listed.sort((left, right) => right.totalSignals - left.totalSignals).slice(0, 7);
}

/** Build heatmap rows from real API data, falling back to zeros when not available. */
function buildHeatmapData(
  competitors: DashboardCompetitorPreview[],
  heatmapRows: HeatmapRow[] | null | undefined,
) {
  const top = competitors.slice(0, 7);

  if (!heatmapRows || heatmapRows.length === 0) {
    return top.map((c) => ({
      name: c.name,
      dailySignals: Array(30).fill(0) as number[],
    }));
  }

  // Group rows by competitor name, collect daily counts in order
  const byName = new Map<string, Map<string, number>>();
  for (const row of heatmapRows) {
    let dayMap = byName.get(row.competitor_name);
    if (!dayMap) {
      dayMap = new Map();
      byName.set(row.competitor_name, dayMap);
    }
    dayMap.set(row.day, row.signal_count);
  }

  // Build date keys for last 30 days
  const today = new Date();
  const dateKeys: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateKeys.push(d.toISOString().slice(0, 10));
  }

  return top.map((c) => {
    const dayMap = byName.get(c.name);
    return {
      name: c.name,
      dailySignals: dateKeys.map((key) => dayMap?.get(key) ?? 0),
    };
  });
}

// ─── Main Component ────────────────────────────────────────────────

export default function Dashboard() {
  const { t, i18n } = useTranslation("dashboard");
  const { currentWorkspace, loading: wsLoading, error: workspaceError, refetch: refetchWorkspace } = useWorkspace();
  const { snapshot, loading, error: snapshotError, refetch: refetchSnapshot } = useDashboardSnapshot(currentWorkspace?.id);
  const gmailConnection = useGmailConnection();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPeriod = (searchParams.get("period") as DashboardPeriod | null) ?? "7d";
  const [briefIndex, setBriefIndex] = useState(0);

  const localeCode = i18n.resolvedLanguage || i18n.language || "en";
  const dateFnsLocale = useMemo(() => getDateFnsLocale(localeCode), [localeCode]);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(localeCode), [localeCode]);
  const periodStart = useMemo(() => getPeriodStart(selectedPeriod), [selectedPeriod]);

  const snapshotCompetitors = useMemo(() => snapshot?.competitors ?? [], [snapshot?.competitors]);
  const snapshotRecentInbox = useMemo(() => snapshot?.recentInbox ?? [], [snapshot?.recentInbox]);
  const snapshotDecisionModel = snapshot?.decisionModel;
  const periodInsights = useMemo(
    () => (snapshotDecisionModel?.prioritizedInsights ?? []).filter((insight) => isInsidePeriod(insight.created_at, periodStart)),
    [snapshotDecisionModel?.prioritizedInsights, periodStart],
  );
  const periodInbox = useMemo(
    () => snapshotRecentInbox.filter((item) => isInsidePeriod(item.received_at, periodStart)),
    [snapshotRecentInbox, periodStart],
  );

  const competitorNameById = useMemo(
    () => new Map(snapshotCompetitors.map((competitor) => [competitor.id, competitor.name])),
    [snapshotCompetitors],
  );

  const aiSummary: DashboardAISummary = useMemo(
    () => snapshotDecisionModel?.aiSummary ?? buildDashboardAiSummary({
      highlights: snapshotDecisionModel?.dailyHighlights ?? [],
      insights: snapshotDecisionModel?.prioritizedInsights ?? [],
      anomalies: snapshotDecisionModel?.anomalies ?? [],
      recommendedActions: snapshotDecisionModel?.recommendedActions ?? [],
    }),
    [snapshotDecisionModel],
  );

  const todayBriefs = useMemo(
    () => buildTodayBriefs({
      insights: periodInsights,
      highlights: snapshotDecisionModel?.dailyHighlights ?? [],
      actions: snapshotDecisionModel?.recommendedActions ?? [],
      aiSummary,
    }),
    [snapshotDecisionModel, aiSummary, periodInsights],
  );

  useEffect(() => {
    if (briefIndex >= todayBriefs.length) setBriefIndex(0);
  }, [briefIndex, todayBriefs.length]);

  const actions = useMemo(
    () => (snapshotDecisionModel?.recommendedActions ?? []).slice(0, 3),
    [snapshotDecisionModel?.recommendedActions],
  );

  const signals = useMemo(
    () => buildSignalStream({
      highlights: snapshotDecisionModel?.dailyHighlights ?? [],
      anomalies: snapshotDecisionModel?.anomalies ?? [],
      inbox: periodInbox,
      insights: periodInsights,
      competitorNameById,
      locale: dateFnsLocale,
      labels: {
        today: t("todayLabel"),
        live: t("live"),
        noSubject: t("noSubject"),
        unknownSender: t("unknownSender"),
        noDate: t("noDate"),
        insight: t("insightLabel"),
      },
    }),
    [snapshotDecisionModel, periodInbox, periodInsights, competitorNameById, dateFnsLocale, t],
  );

  const competitorPulse = useMemo(
    () => buildCompetitorPulse({
      competitors: snapshotCompetitors,
      summary: snapshotDecisionModel?.competitorSummary ?? [],
    }),
    [snapshotCompetitors, snapshotDecisionModel?.competitorSummary],
  );

  const heatmapData = useMemo(
    () => buildHeatmapData(snapshotCompetitors, snapshot?.heatmap),
    [snapshotCompetitors, snapshot?.heatmap],
  );

  const lastSyncAt = gmailConnection.connection?.last_sync_at ?? newestInboxDate(snapshotRecentInbox);
  const freshness = useMemo(
    () => getFreshnessState(lastSyncAt, gmailConnection.isConnected || Boolean(snapshot?.gmailConnected)),
    [lastSyncAt, gmailConnection.isConnected, snapshot?.gmailConnected],
  );

  function setPeriod(value: DashboardPeriod) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("period", value);
      return next;
    }, { replace: true });
  }

  async function handleSyncNow() {
    if (gmailConnection.isConnected) {
      await gmailConnection.sync(false);
      await refetchSnapshot();
      return;
    }
    navigate("/settings");
  }

  if (workspaceError) {
    return <ErrorState title={t("dashboardUnavailable")} description={workspaceError} onRetry={() => void refetchWorkspace()} />;
  }
  if (wsLoading || (currentWorkspace && loading)) return <DashboardLoadingSkeleton />;
  if (!currentWorkspace) return <EmptyWorkspaceState onCreate={() => navigate("/onboarding")} />;
  if (snapshotError || !snapshot) {
    return <ErrorState title={t("dashboardFailed")} description={snapshotError || t("snapshotUnavailable")} onRetry={() => void refetchSnapshot()} />;
  }

  const { stats, competitors, gmailConnected, usage, limits, unreadAlertCount } = snapshot;
  const currentBrief = todayBriefs[briefIndex] ?? null;
  const hasData = stats.inboxItems > 0 || stats.competitors > 0 || stats.metaAds > 0 || stats.insightCount > 0;
  const competitorLimitReached = limits.competitors > 0 && usage.competitors >= limits.competitors;

  return (
    <div className="dashboard-dot-pattern mx-auto max-w-[1360px] space-y-5 p-4 sm:p-6 lg:p-8">
      <DashboardHeader
        workspaceName={currentWorkspace.name}
        period={selectedPeriod}
        onPeriodChange={setPeriod}
        stats={stats}
        unreadAlertCount={unreadAlertCount}
        freshness={freshness}
        lastSyncAt={lastSyncAt}
        localeCode={localeCode}
        dateFnsLocale={dateFnsLocale}
        numberFormatter={numberFormatter}
        syncing={gmailConnection.syncing}
        onSyncNow={() => void handleSyncNow()}
        onGenerateInsights={() => navigate("/insights")}
        weeklyDelta={snapshot.weeklyDelta ?? null}
      />

      <TodayBrief
        brief={currentBrief}
        briefCount={todayBriefs.length}
        activeIndex={briefIndex}
        onSelectBrief={setBriefIndex}
        onOpen={() => currentBrief && navigate(currentBrief.href)}
        hasData={hasData}
        dateFnsLocale={dateFnsLocale}
        onConnectSource={() => navigate(gmailConnected ? "/newsletters/new" : "/settings")}
      />

      <ActionQueue actions={actions} onNavigate={navigate} />

      {/* Activity Heatmap — between queue and 2-col grid */}
      {competitors.length > 0 && (
        <Suspense fallback={<div className="h-20 rounded-xl border bg-card motion-safe:animate-pulse" />}>
          <LazyActivityHeatmap competitors={heatmapData} />
        </Suspense>
      )}

      <div className="hidden gap-5 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <SignalStream signals={signals} onNavigate={navigate} />
        <CompetitorPulse
          competitors={competitorPulse}
          totalCompetitors={competitors.length}
          limit={limits.competitors}
          limitReached={competitorLimitReached}
          numberFormatter={numberFormatter}
          onNavigate={navigate}
        />
      </div>

      <Tabs defaultValue="signals" className="lg:hidden">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-lg">
          <TabsTrigger value="signals" className="text-xs">{t("signalsTab")}</TabsTrigger>
          <TabsTrigger value="competitors" className="text-xs">{t("competitorsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="signals" className="mt-4">
          <SignalStream signals={signals} onNavigate={navigate} compact />
        </TabsContent>
        <TabsContent value="competitors" className="mt-4">
          <CompetitorPulse
            competitors={competitorPulse}
            totalCompetitors={competitors.length}
            limit={limits.competitors}
            limitReached={competitorLimitReached}
            numberFormatter={numberFormatter}
            onNavigate={navigate}
            compact
          />
        </TabsContent>
      </Tabs>

      <Suspense fallback={<div className="h-12 rounded-xl border bg-card motion-safe:animate-pulse" />}>
        <LazySystemHealthPanel />
      </Suspense>
    </div>
  );
}

// ─── DashboardHeader (FIX 1) ──────────────────────────────────────

function DashboardHeader({
  workspaceName,
  period,
  onPeriodChange,
  stats,
  unreadAlertCount,
  freshness,
  lastSyncAt,
  localeCode,
  dateFnsLocale,
  numberFormatter,
  syncing,
  onSyncNow,
  onGenerateInsights,
  weeklyDelta,
}: {
  workspaceName: string;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  stats: DashboardStats;
  unreadAlertCount: number;
  freshness: FreshnessState;
  lastSyncAt: string | null;
  localeCode: string;
  dateFnsLocale: Locale;
  numberFormatter: Intl.NumberFormat;
  syncing: boolean;
  onSyncNow: () => void;
  onGenerateInsights: () => void;
  weeklyDelta: { signals: WeeklyDelta; insights: WeeklyDelta; alerts: WeeklyDelta } | null;
}) {
  const { t } = useTranslation("dashboard");
  const statusDot = {
    healthy: "bg-success",
    warning: "bg-warning",
    error: "bg-destructive",
    idle: "bg-muted-foreground",
  }[freshness.tone];
  const statusText = {
    healthy: "text-success",
    warning: "text-warning",
    error: "text-destructive",
    idle: "text-muted-foreground",
  }[freshness.tone];
  const today = new Intl.DateTimeFormat(localeCode, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const lastSyncLabel = lastSyncAt
    ? formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: dateFnsLocale })
    : t("lastSyncNever");

  const isCritical = freshness.tone === "error";

  return (
    <header className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("workspaceLabel")}</p>
          <p className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{workspaceName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value) => onPeriodChange(value as DashboardPeriod)}>
            <SelectTrigger className="h-10 w-full bg-card text-xs md:w-[160px]" aria-label={t("periodFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t("periodToday")}</SelectItem>
              <SelectItem value="7d">{t("period7d")}</SelectItem>
              <SelectItem value="30d">{t("period30d")}</SelectItem>
              <SelectItem value="custom" disabled>{t("periodCustom")}</SelectItem>
            </SelectContent>
          </Select>
          <Button className="h-10 gap-2 text-sm" onClick={onGenerateInsights}>
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t("generateInsights")}</span>
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{today}</p>

      {/* FIX 1: Critical stale → full-width emergency banner hiding metrics */}
      {isCritical ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-destructive">{t("syncCriticalBanner")}</p>
              <p className="mt-0.5 text-xs text-destructive/80">
                {t("syncCriticalBannerDesc", { value: lastSyncLabel })}
              </p>
            </div>
          </div>
          <Button size="sm" className="h-10 shrink-0 gap-1.5" onClick={onSyncNow} disabled={syncing}>
            <RefreshCw className={cn("h-4 w-4", syncing && "motion-safe:animate-spin")} />
            {syncing ? t("syncing") : t("syncNowPrimary")}
          </Button>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex flex-col gap-3 rounded-xl border bg-card px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
            freshness.tone === "warning" && "border-warning/30 bg-warning/5",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full motion-safe:animate-pulse motion-reduce:animate-none", statusDot)} />
                <span className={cn("truncate text-xs font-semibold", statusText)}>{t(freshness.labelKey)}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">· {t("lastSync", { value: lastSyncLabel })}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-xs">{t(freshness.tooltipKey)}</TooltipContent>
          </Tooltip>

          {/* FIX 1: Pulse stats with inline sparklines, weekly delta, hide zero alerts */}
          <div className="scrollbar-thin flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
            <PulseStat
              label={t("pulseSignals")}
              value={numberFormatter.format(stats.inboxItems + stats.metaAds)}
              sparkline={buildSparkline(stats.inboxItems + stats.metaAds, "signals")}
              delta={weeklyDelta?.signals}
            />
            <PulseStat
              label={t("pulseCompetitors")}
              value={numberFormatter.format(stats.competitors)}
              sparkline={buildSparkline(stats.competitors, "competitors")}
            />
            <PulseStat
              label={t("pulseInsights")}
              value={numberFormatter.format(stats.insightCount)}
              sparkline={buildSparkline(stats.insightCount, "insights")}
              delta={weeklyDelta?.insights}
            />
            {unreadAlertCount > 0 && (
              <PulseStat
                label={t("pulseAlerts")}
                value={numberFormatter.format(unreadAlertCount)}
                tone="warning"
                sparkline={buildSparkline(unreadAlertCount, "alerts")}
                delta={weeklyDelta?.alerts}
              />
            )}
          </div>

          {freshness.tone === "warning" && (
            <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 text-xs" onClick={onSyncNow} disabled={syncing}>
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "motion-safe:animate-spin")} />
              {syncing ? t("syncing") : t("syncNow")}
            </Button>
          )}
        </div>
      )}
    </header>
  );
}

function PulseStat({
  label,
  value,
  tone = "neutral",
  sparkline,
  delta,
}: {
  label: string;
  value: string;
  tone?: "warning" | "neutral";
  sparkline?: number[];
  delta?: WeeklyDelta | null;
}) {
  const deltaNum = delta ? delta.current - delta.previous : null;
  const deltaLabel = deltaNum != null && deltaNum !== 0
    ? `${deltaNum > 0 ? "+" : ""}${deltaNum} vs 7d`
    : null;

  return (
    <div className={cn(
      "flex min-w-[92px] snap-start items-center gap-2 rounded-lg border px-2.5 py-1.5",
      tone === "warning" ? "border-warning/20 bg-warning/10" : "bg-muted/20",
    )}>
      <div className="min-w-0">
        <p className="stat-value text-sm font-semibold leading-none text-foreground">{value}</p>
        <p className="mt-1 truncate text-caption text-muted-foreground">{label}</p>
        {deltaLabel && (
          <p className={cn(
            "mt-0.5 truncate text-[10px] font-medium",
            deltaNum! > 0 ? "text-primary" : "text-muted-foreground",
          )}>
            {deltaLabel}
          </p>
        )}
      </div>
      {sparkline && <MiniSparkline values={sparkline} height={12} barWidth={4} className="shrink-0 opacity-60" />}
    </div>
  );
}

// ─── TodayBrief (FIX 2) ──────────────────────────────────────────

function TodayBrief({
  brief,
  briefCount,
  activeIndex,
  onSelectBrief,
  onOpen,
  hasData,
  dateFnsLocale,
  onConnectSource,
}: {
  brief: TodayBriefItem | null;
  briefCount: number;
  activeIndex: number;
  onSelectBrief: (index: number) => void;
  onOpen: () => void;
  hasData: boolean;
  dateFnsLocale: Locale;
  onConnectSource: () => void;
}) {
  const { t } = useTranslation("dashboard");

  if (!brief) {
    return (
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-[0.08em] text-primary">{t("todaysBriefEyebrow")}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        </div>
        <DashboardEmptyState
          title={hasData ? t("briefGeneratingTitle") : t("briefEmptyTitle")}
          description={hasData ? t("briefGeneratingDesc") : t("briefEmptyDesc")}
          cta={{ label: hasData ? t("generateInsights") : t("connectSource"), onClick: onConnectSource }}
        />
      </section>
    );
  }

  const priorityStyle = PRIORITY_STYLES[brief.priority];
  const confidencePct = brief.confidence != null ? Math.round(brief.confidence * 100) : null;
  const detectedLabel = brief.createdAt
    ? formatDistanceToNow(new Date(brief.createdAt), { addSuffix: true, locale: dateFnsLocale })
    : null;
  const sourceLabel = brief.sourceType
    ? brief.sourceType.toLowerCase().includes("email") || brief.sourceType.toLowerCase().includes("newsletter")
      ? t("briefFactEmail")
      : brief.sourceType.toLowerCase().includes("ad")
        ? t("briefFactAd")
        : t("briefFactWeb")
    : null;

  return (
    <section className="motion-safe:animate-brief-appear rounded-xl border-l-4 border border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm dark:from-primary/8 dark:to-card">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(240px,0.55fr)]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-caption font-semibold uppercase tracking-[0.08em] text-primary">{t("todaysBriefEyebrow")}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-success motion-safe:animate-pulse motion-reduce:animate-none" />
            {briefCount > 1 && (
              <div className="ml-auto flex items-center gap-1" aria-label={t("briefPagination")}>
                {Array.from({ length: briefCount }).map((_, index) => (
                  <button
                    key={index}
                    className={cn("h-1.5 rounded-full transition-all", index === activeIndex ? "w-5 bg-primary" : "w-1.5 bg-border")}
                    onClick={() => onSelectBrief(index)}
                    aria-label={t("openBriefNumber", { value: index + 1 })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* FIX 2: Larger title with more visual weight */}
          <h1 className="max-w-3xl text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {brief.headline}
          </h1>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("whyItMatters")}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{brief.why}</p>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("suggestedAction")}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{brief.action}</p>
            </div>
          </div>

          {/* FIX 2: Smaller badges, less prominent */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {brief.competitor && <Badge variant="secondary" className="rounded-md text-[10px]">{brief.competitor}</Badge>}
            {brief.category && <Badge variant="outline" className="rounded-md text-[10px] capitalize">{brief.category}</Badge>}
            <Badge variant="outline" className={cn("rounded-md text-[10px] capitalize", priorityStyle.badgeClassName)}>
              {t(PRIORITY_LABEL_KEYS[brief.priority])}
            </Badge>
            <Button size="sm" className="ml-0 h-9 gap-1.5 text-xs sm:ml-auto" onClick={onOpen}>
              {t("openInsight")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* FIX 2: Replace Live preview with BriefFactCard */}
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="mb-3 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t("briefFactSource")}
          </p>
          <div className="space-y-3">
            {brief.competitor && (
              <BriefFactRow label={t("pulseCompetitors")} value={brief.competitor} />
            )}
            {sourceLabel && (
              <BriefFactRow label={t("briefFactSource")} value={sourceLabel} />
            )}
            {detectedLabel && (
              <BriefFactRow label={t("briefFactDetected")} value={detectedLabel} />
            )}
            {confidencePct != null && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("briefFactConfidence")}</span>
                  <span className="stat-value text-sm font-semibold text-foreground">{confidencePct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${confidencePct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BriefFactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="stat-value text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ─── ActionQueue (FIX 3) ──────────────────────────────────────────

function ActionQueue({ actions, onNavigate }: { actions: DashboardRecommendedAction[]; onNavigate: (href: string) => void }) {
  const { t } = useTranslation("dashboard");

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <SectionHeader title={t("actionQueue")} subtitle={t("actionQueueSubtitle")} />
      {actions.length === 0 ? (
        <DashboardEmptyState
          title={t("actionQueueEmptyTitle")}
          description={t("actionQueueEmptyDesc")}
          icon={<CheckCircle2 className="h-8 w-8 text-success" />}
          className="mt-4"
        />
      ) : (
        <div className="mt-3 divide-y">
          {actions.map((action, index) => (
            <ActionQueueRow
              key={`${action.title}-${action.path}`}
              action={action}
              onClick={() => onNavigate(action.path)}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const ActionQueueRow = memo(function ActionQueueRow({
  action,
  onClick,
  index,
}: {
  action: DashboardRecommendedAction;
  onClick: () => void;
  index: number;
}) {
  const { t } = useTranslation("dashboard");
  const priority = normalizeDashboardPriority(action.priority);
  const style = PRIORITY_STYLES[priority];
  const iconName = getActionIconName(action.title);
  const Icon = ACTION_ICONS[iconName];

  return (
    <button
      className={cn(
        "group flex min-h-14 w-full items-center gap-3 border-l-[3px] border-transparent py-3 pl-3 pr-2 text-left outline-none transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-l-primary hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        // FIX 3: Priority-based background tinting
        priority === "high" && "border-l-destructive/40 bg-destructive/5",
        priority === "medium" && "border-l-warning/40 bg-warning/5",
        "motion-safe:animate-row-stagger",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onClick}
      title={`${action.title}. ${action.detail}`}
    >
      {/* FIX 3: Context icon instead of dot */}
      <Icon className={cn("h-4 w-4 shrink-0", style.dotClassName.replace("bg-", "text-"))} />
      <span className="min-w-0 flex-1">
        <span className={cn(
          "block truncate text-sm text-foreground",
          priority === "high" ? "font-semibold" : priority === "medium" ? "font-medium" : "font-normal",
        )}>{action.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{action.detail}</span>
      </span>
      <Badge variant="outline" className={cn("hidden rounded-md text-caption capitalize sm:inline-flex", style.badgeClassName)}>
        {t(PRIORITY_LABEL_KEYS[priority])}
      </Badge>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
});

// ─── SignalStream (FIX 4) ─────────────────────────────────────────

function SignalStream({ signals, onNavigate, compact }: { signals: SignalItem[]; onNavigate: (href: string) => void; compact?: boolean }) {
  const { t } = useTranslation("dashboard");
  const [activeFilter, setActiveFilter] = useState<SignalCategory | "all">("all");

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: signals.length };
    for (const cat of SIGNAL_CATEGORIES) counts[cat] = 0;
    for (const s of signals) counts[s.category] = (counts[s.category] ?? 0) + 1;
    return counts;
  }, [signals]);

  const filtered = activeFilter === "all" ? signals : signals.filter((s) => s.category === activeFilter);

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <SectionHeader title={t("signalStream")} subtitle={t("signalStreamSubtitle")} compact />
        <div className="flex items-center gap-1.5 text-caption text-muted-foreground" aria-live="polite">
          <span className="h-1.5 w-1.5 rounded-full bg-success motion-safe:animate-pulse motion-reduce:animate-none" />
          {t("live")}
        </div>
      </div>

      {/* FIX 4: Filter chips */}
      {signals.length > 0 && !compact && (
        <div className="scrollbar-thin flex gap-1.5 overflow-x-auto border-b px-4 py-2">
          <FilterChip
            label={t("filterAll")}
            count={categoryCounts.all}
            active={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
          />
          {SIGNAL_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat}
              label={t(SIGNAL_CATEGORY_STYLES[cat].labelKey)}
              count={categoryCounts[cat] ?? 0}
              active={activeFilter === cat}
              onClick={() => setActiveFilter(cat)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <DashboardEmptyState
          title={t("signalStreamEmptyTitle")}
          description={t("signalStreamEmptyDesc")}
          cta={{ label: t("triggerSync"), onClick: () => onNavigate("/settings") }}
          className="m-4"
        />
      ) : (
        <>
          {/* FIX 4: Removed preview block, streamlined rows */}
          <div className="divide-y" aria-live="polite">
            {filtered.map((signal, index) => (
              <SignalRow
                key={signal.id}
                signal={signal}
                onClick={() => onNavigate(signal.href)}
                index={index}
              />
            ))}
          </div>
          <div className="border-t px-4 py-3">
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-0 text-xs" onClick={() => onNavigate("/inbox")}>
              {t("viewAllSignals")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-caption transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : count === 0
            ? "border-border bg-muted/20 text-muted-foreground/50"
            : "border-border bg-muted/20 text-muted-foreground hover:bg-accent/10",
      )}
      onClick={onClick}
    >
      {label}
      <span className="font-semibold">{count}</span>
    </button>
  );
}

function SignalRow({ signal, onClick, index }: { signal: SignalItem; onClick: () => void; index: number }) {
  const { t } = useTranslation("dashboard");
  const category = SIGNAL_CATEGORY_STYLES[signal.category];
  const priority = signal.priority ? PRIORITY_STYLES[normalizeDashboardPriority(signal.priority)] : null;

  return (
    <button
      className={cn(
        "group flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring",
        "motion-safe:animate-row-stagger",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", priority?.dotClassName ?? category.dotClassName)} />
      <Badge variant="outline" className={cn("hidden shrink-0 rounded-md text-caption sm:inline-flex", category.badgeClassName)}>
        {t(category.labelKey)}
      </Badge>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {signal.title}
        <span className="ml-2 font-normal text-muted-foreground">· {signal.detail}</span>
      </span>
      {signal.competitor && (
        <span className="hidden shrink-0 truncate text-caption text-muted-foreground lg:inline">{signal.competitor}</span>
      )}
      <span className="shrink-0 text-caption text-muted-foreground/70">{signal.timestamp}</span>
    </button>
  );
}

// ─── CompetitorPulse (FIX 5) ─────────────────────────────────────

function CompetitorPulse({
  competitors,
  totalCompetitors,
  limit,
  limitReached,
  numberFormatter,
  onNavigate,
  compact,
}: {
  competitors: CompetitorPulseItem[];
  totalCompetitors: number;
  limit: number;
  limitReached: boolean;
  numberFormatter: Intl.NumberFormat;
  onNavigate: (href: string) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation("dashboard");

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <SectionHeader title={t("competitorPulse")} subtitle={t("competitorPulseSubtitle")} compact />
        {limitReached && (
          <button onClick={() => onNavigate("/billing")}>
            <Badge variant="outline" className="cursor-pointer rounded-md border-warning/20 bg-warning/10 text-caption text-warning hover:bg-warning/20">
              {t("planLimitReached")}
            </Badge>
          </button>
        )}
      </div>

      {competitors.length === 0 ? (
        <DashboardEmptyState
          title={t("competitorPulseEmptyTitle")}
          description={t("competitorPulseEmptyDesc")}
          cta={{ label: t("addFirstCompetitor"), onClick: () => onNavigate("/competitors") }}
          className="m-4"
        />
      ) : (
        <div className="divide-y">
          {competitors.map((competitor, index) => (
            <CompetitorPulseRow
              key={competitor.id}
              competitor={competitor}
              numberFormatter={numberFormatter}
              onClick={() => onNavigate("/competitors")}
              index={index}
            />
          ))}
          {/* FIX 5: Disabled "+ Track another" with tooltip when at limit */}
          {!compact && (
            limitReached ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex min-h-[52px] w-full cursor-not-allowed items-center gap-3 px-4 py-3 opacity-50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                      <Plus className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">{t("trackAnother")}</span>
                    <span className="ml-auto text-caption text-muted-foreground">
                      {numberFormatter.format(totalCompetitors)}/{numberFormatter.format(limit)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{t("upgradeToTrackMore")}</TooltipContent>
              </Tooltip>
            ) : (
              <button
                className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onNavigate("/competitors")}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-foreground">{t("trackAnother")}</span>
                {limit > 0 && (
                  <span className="ml-auto text-caption text-muted-foreground">
                    {numberFormatter.format(totalCompetitors)}/{numberFormatter.format(limit)}
                  </span>
                )}
              </button>
            )
          )}
        </div>
      )}

      <div className="border-t px-4 py-3">
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-0 text-xs" onClick={() => onNavigate("/competitors")}>
          {t("manageCompetitors")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}

function CompetitorPulseRow({
  competitor,
  numberFormatter,
  onClick,
  index,
}: {
  competitor: CompetitorPulseItem;
  numberFormatter: Intl.NumberFormat;
  onClick: () => void;
  index: number;
}) {
  const { t } = useTranslation("dashboard");
  const hasActivity = competitor.totalSignals > 0;

  return (
    <button
      className={cn(
        "group flex min-h-[58px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring",
        "motion-safe:animate-row-stagger",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onClick}
    >
      <CompetitorLogo name={competitor.name} website={competitor.website} size="xs" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{competitor.name}</span>
        <span className="mt-0.5 block text-caption text-muted-foreground">
          {/* FIX 5: "No activity detected" instead of "0 signals" */}
          {hasActivity
            ? t("signalsCount", { value: numberFormatter.format(competitor.totalSignals) })
            : t("noActivityDetected")}
        </span>
      </span>
      {/* FIX 5: Dashed line for empty sparklines, functional bars otherwise */}
      <MiniSparkline
        values={competitor.sparkline}
        empty={!hasActivity}
        title={hasActivity ? t("sparklineLabel", { name: competitor.name }) : undefined}
      />
      {/* FIX 5: Trend arrows only when data exists, no icon for zero */}
      {hasActivity ? (
        competitor.trend === "up" ? (
          <TrendingUp className="h-4 w-4 shrink-0 text-warning" />
        ) : competitor.trend === "down" ? (
          <TrendingDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Minus className="h-4 w-4 shrink-0 text-success" />
        )
      ) : (
        <span className="h-4 w-4 shrink-0" />
      )}
    </button>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, compact }: { title: string; subtitle?: string; compact?: boolean }) {
  return (
    <div className="min-w-0">
      <h2 className={cn("font-semibold tracking-tight text-foreground", compact ? "text-sm" : "text-base")}>{title}</h2>
      {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function EmptyWorkspaceState({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex h-full items-center justify-center p-8">
      <DashboardEmptyState
        title={t("noWorkspaceFound")}
        cta={{ label: t("createWorkspace"), onClick: onCreate }}
        className="w-full max-w-md"
      />
    </div>
  );
}

function ErrorState({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="w-full max-w-md border-destructive/20">
        <div className="space-y-4 p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <Button size="sm" onClick={onRetry}>{t("retry")}</Button>
        </div>
      </Card>
    </div>
  );
}
