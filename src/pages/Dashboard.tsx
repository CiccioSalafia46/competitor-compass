import { lazy, memo, Suspense, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow, type Locale } from "date-fns";
import { de, enUS, es, fr, it } from "date-fns/locale";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import {
  useDashboardSnapshot,
  type DashboardCompetitorPreview,
  type DashboardInboxPreview,
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
  SIGNAL_CATEGORY_STYLES,
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
    <div className="mx-auto max-w-[1360px] space-y-5 p-4 sm:p-6 lg:p-8">
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
      />

      <TodayBrief
        brief={currentBrief}
        briefCount={todayBriefs.length}
        activeIndex={briefIndex}
        onSelectBrief={setBriefIndex}
        onOpen={() => currentBrief && navigate(currentBrief.href)}
        stats={stats}
        numberFormatter={numberFormatter}
        hasData={hasData}
        onConnectSource={() => navigate(gmailConnected ? "/newsletters/new" : "/settings")}
      />

      <ActionQueue actions={actions} onNavigate={navigate} />

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

  return (
    <header className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("workspaceLabel")}</p>
          <p className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{workspaceName}</p>
        </div>
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
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{today}</p>
        <Button className="h-10 gap-2 text-sm" onClick={onGenerateInsights}>
          <Sparkles className="h-4 w-4" />
          {t("generateInsights")}
        </Button>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex flex-col gap-3 rounded-xl border bg-card px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
          freshness.tone === "error" && "border-destructive/30 bg-destructive/5",
          freshness.tone === "warning" && "border-warning/30 bg-warning/5",
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex min-w-0 items-center gap-2">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full motion-safe:animate-pulse motion-reduce:animate-none", statusDot)} />
              <span className={cn("truncate text-xs font-semibold", statusText)}>{t(freshness.labelKey)}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">- {t("lastSync", { value: lastSyncLabel })}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-64 text-xs">{t(freshness.tooltipKey)}</TooltipContent>
        </Tooltip>

        <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
          <PulseStat label={t("pulseSignals")} value={numberFormatter.format(stats.inboxItems + stats.metaAds)} />
          <PulseStat label={t("pulseCompetitors")} value={numberFormatter.format(stats.competitors)} />
          <PulseStat label={t("pulseInsights")} value={numberFormatter.format(stats.insightCount)} />
          <PulseStat label={t("pulseAlerts")} value={numberFormatter.format(unreadAlertCount)} tone={unreadAlertCount > 0 ? "warning" : "neutral"} />
        </div>

        {(freshness.tone === "warning" || freshness.tone === "error") && (
          <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 text-xs" onClick={onSyncNow} disabled={syncing}>
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "motion-safe:animate-spin")} />
            {syncing ? t("syncing") : t("syncNow")}
          </Button>
        )}
      </div>
    </header>
  );
}

function PulseStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "warning" | "neutral" }) {
  return (
    <div className={cn("min-w-[92px] rounded-lg border px-2.5 py-1.5", tone === "warning" ? "border-warning/20 bg-warning/10" : "bg-muted/20")}>
      <p className="stat-value text-sm font-semibold leading-none text-foreground">{value}</p>
      <p className="mt-1 truncate text-caption text-muted-foreground">{label}</p>
    </div>
  );
}

function TodayBrief({
  brief,
  briefCount,
  activeIndex,
  onSelectBrief,
  onOpen,
  stats,
  numberFormatter,
  hasData,
  onConnectSource,
}: {
  brief: TodayBriefItem | null;
  briefCount: number;
  activeIndex: number;
  onSelectBrief: (index: number) => void;
  onOpen: () => void;
  stats: DashboardStats;
  numberFormatter: Intl.NumberFormat;
  hasData: boolean;
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

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
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

          <h1 className="max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
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

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {brief.competitor && <Badge variant="secondary" className="rounded-md">{brief.competitor}</Badge>}
            {brief.category && <Badge variant="outline" className="rounded-md capitalize">{brief.category}</Badge>}
            <Badge variant="outline" className={cn("rounded-md capitalize", priorityStyle.badgeClassName)}>
              {t(PRIORITY_LABEL_KEYS[brief.priority])}
            </Badge>
            <Button size="sm" className="ml-0 h-9 gap-1.5 text-xs sm:ml-auto" onClick={onOpen}>
              {t("openInsight")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-3 flex items-center gap-1.5 border-b pb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            <span className="ml-2 text-caption font-medium text-muted-foreground">{t("briefPreview")}</span>
          </div>
          <div className="space-y-3">
            <PreviewMetric label={t("pulseSignals")} value={numberFormatter.format(stats.inboxItems + stats.metaAds)} />
            <PreviewMetric label={t("pulseCompetitors")} value={numberFormatter.format(stats.competitors)} />
            <PreviewMetric label={t("pulseInsights")} value={numberFormatter.format(stats.insightCount)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="stat-value text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function ActionQueue({ actions, onNavigate }: { actions: DashboardRecommendedAction[]; onNavigate: (href: string) => void }) {
  const { t } = useTranslation("dashboard");

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <SectionHeader title={t("actionQueue")} subtitle={t("actionQueueSubtitle")} />
      {actions.length === 0 ? (
        <DashboardEmptyState title={t("actionQueueEmptyTitle")} description={t("actionQueueEmptyDesc")} className="mt-4" />
      ) : (
        <div className="mt-3 divide-y">
          {actions.map((action) => (
            <ActionQueueRow key={`${action.title}-${action.path}`} action={action} onClick={() => onNavigate(action.path)} />
          ))}
        </div>
      )}
    </section>
  );
}

const ActionQueueRow = memo(function ActionQueueRow({ action, onClick }: { action: DashboardRecommendedAction; onClick: () => void }) {
  const { t } = useTranslation("dashboard");
  const priority = normalizeDashboardPriority(action.priority);
  const style = PRIORITY_STYLES[priority];

  return (
    <button
      className="group flex min-h-14 w-full items-center gap-3 py-3 text-left outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      onClick={onClick}
      title={`${action.title}. ${action.detail}`}
    >
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", style.dotClassName)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{action.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{action.detail}</span>
      </span>
      <Badge variant="outline" className={cn("hidden rounded-md text-caption capitalize sm:inline-flex", style.badgeClassName)}>
        {t(PRIORITY_LABEL_KEYS[priority])}
      </Badge>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
});

function SignalStream({ signals, onNavigate, compact }: { signals: SignalItem[]; onNavigate: (href: string) => void; compact?: boolean }) {
  const { t } = useTranslation("dashboard");
  const [activeSignalId, setActiveSignalId] = useState<string | null>(signals[0]?.id ?? null);

  useEffect(() => {
    if (!signals.some((signal) => signal.id === activeSignalId)) {
      setActiveSignalId(signals[0]?.id ?? null);
    }
  }, [signals, activeSignalId]);

  const activeSignal = signals.find((signal) => signal.id === activeSignalId) ?? signals[0] ?? null;

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <SectionHeader title={t("signalStream")} subtitle={t("signalStreamSubtitle")} compact />
        <div className="flex items-center gap-1.5 text-caption text-muted-foreground" aria-live="polite">
          <span className="h-1.5 w-1.5 rounded-full bg-success motion-safe:animate-pulse motion-reduce:animate-none" />
          {t("live")}
        </div>
      </div>

      {signals.length === 0 ? (
        <DashboardEmptyState
          title={t("signalStreamEmptyTitle")}
          description={t("signalStreamEmptyDesc")}
          cta={{ label: t("triggerSync"), onClick: () => onNavigate("/settings") }}
          className="m-4"
        />
      ) : (
        <>
          <div className="divide-y" aria-live="polite">
            {signals.map((signal) => (
              <SignalRow
                key={signal.id}
                signal={signal}
                onClick={() => onNavigate(signal.href)}
                onActive={() => setActiveSignalId(signal.id)}
              />
            ))}
          </div>
          {!compact && activeSignal && (
            <div className="hidden border-t bg-muted/20 p-4 lg:block">
              <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("signalPreview")}</p>
              <p className="mt-2 text-sm font-medium text-foreground">{activeSignal.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeSignal.detail}</p>
            </div>
          )}
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

function SignalRow({ signal, onClick, onActive }: { signal: SignalItem; onClick: () => void; onActive: () => void }) {
  const { t } = useTranslation("dashboard");
  const category = SIGNAL_CATEGORY_STYLES[signal.category];
  const priority = signal.priority ? PRIORITY_STYLES[normalizeDashboardPriority(signal.priority)] : null;

  return (
    <button
      className="group flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      onFocus={onActive}
      onMouseEnter={onActive}
    >
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", priority?.dotClassName ?? category.dotClassName)} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{signal.title}</span>
          <Badge variant="outline" className={cn("hidden rounded-md text-caption sm:inline-flex", category.badgeClassName)}>
            {t(category.labelKey)}
          </Badge>
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {signal.competitor && <span className="truncate">{signal.competitor}</span>}
          {signal.competitor && <span className="h-1 w-1 rounded-full bg-border" />}
          <span className="truncate">{signal.detail}</span>
        </span>
      </span>
      <span className="shrink-0 text-caption text-muted-foreground/70">{signal.timestamp}</span>
    </button>
  );
}

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
          <Badge variant="outline" className="rounded-md border-warning/20 bg-warning/10 text-caption text-warning">
            {t("planLimitReached")}
          </Badge>
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
          {competitors.map((competitor) => (
            <CompetitorPulseRow
              key={competitor.id}
              competitor={competitor}
              numberFormatter={numberFormatter}
              onClick={() => onNavigate("/competitors")}
            />
          ))}
          {!compact && !limitReached && (
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
}: {
  competitor: CompetitorPulseItem;
  numberFormatter: Intl.NumberFormat;
  onClick: () => void;
}) {
  const { t } = useTranslation("dashboard");
  const TrendIcon = competitor.trend === "up" ? TrendingUp : competitor.trend === "down" ? TrendingDown : CheckCircle2;
  const trendClass = competitor.trend === "up" ? "text-warning" : competitor.trend === "down" ? "text-muted-foreground" : "text-success";

  return (
    <button
      className="group flex min-h-[58px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
    >
      <CompetitorLogo name={competitor.name} website={competitor.website} size="xs" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{competitor.name}</span>
        <span className="mt-0.5 block text-caption text-muted-foreground">
          {t("signalsCount", { value: numberFormatter.format(competitor.totalSignals) })}
        </span>
      </span>
      <MiniSparkline values={competitor.sparkline} title={t("sparklineLabel", { name: competitor.name })} />
      <TrendIcon className={cn("h-4 w-4 shrink-0", trendClass)} />
    </button>
  );
}

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
