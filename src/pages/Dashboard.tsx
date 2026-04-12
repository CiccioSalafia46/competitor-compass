import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Filter,
  Lightbulb,
  Mail,
  Megaphone,
  Newspaper,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
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
} from "@/lib/dashboard-decision-engine";
import {
  INSIGHT_PRIORITY_LABELS,
  type InsightPriorityLevel,
} from "@/lib/insight-priority";
import { cn } from "@/lib/utils";
import UpgradePrompt from "@/components/UpgradePrompt";
import CompetitorLogo from "@/components/CompetitorLogo";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { SystemHealthPanel } from "@/components/SystemHealthPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const ALL_COMPETITORS = "__all_competitors__";
const ALL_CAMPAIGNS = "__all_campaigns__";

// ─── Priority styling helpers ─────────────────────────────────────────────────

function normalizeDashboardPriority(priority: string | null | undefined): InsightPriorityLevel {
  if (priority === "high" || priority === "medium" || priority === "low") return priority;
  if (priority === "critical") return "high";
  return "low";
}

const PRIORITY_BORDER: Record<InsightPriorityLevel, string> = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-primary",
};

const PRIORITY_BADGE: Record<InsightPriorityLevel, string> = {
  high: "border-destructive/20 bg-destructive/10 text-destructive",
  medium: "border-warning/20 bg-warning/10 text-warning",
  low: "border-primary/20 bg-primary/10 text-primary",
};

const PRIORITY_DOT: Record<InsightPriorityLevel, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-primary",
};

function fmt(value: string | null | undefined, fallback = "") {
  return value?.trim() ? value.replaceAll("_", " ") : fallback;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { t } = useTranslation("dashboard");
  const { currentWorkspace, loading: wsLoading, error: workspaceError, refetch: refetchWorkspace } = useWorkspace();
  const { snapshot, loading, error: snapshotError, refetch: refetchSnapshot } = useDashboardSnapshot(currentWorkspace?.id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCompetitor = searchParams.get("competitor") ?? "";
  const selectedCampaignType = searchParams.get("campaign") ?? "";

  function setSelectedCompetitor(value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("competitor", value); else next.delete("competitor");
      return next;
    }, { replace: true });
  }

  function setSelectedCampaignType(value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("campaign", value); else next.delete("campaign");
      return next;
    }, { replace: true });
  }

  function clearFilters() {
    setSelectedCompetitor("");
    setSelectedCampaignType("");
  }

  // ── All derived memos must come before early returns (Rules of Hooks) ─────────

  const snapshotCompetitors = useMemo(() => snapshot?.competitors ?? [], [snapshot?.competitors]);
  const snapshotRecentInbox = useMemo(() => snapshot?.recentInbox ?? [], [snapshot?.recentInbox]);
  const snapshotDecisionModel = snapshot?.decisionModel;

  const competitorNameById = useMemo(
    () => new Map(snapshotCompetitors.map((c) => [c.id, c.name])),
    [snapshotCompetitors],
  );

  const competitorWebsiteByName = useMemo(
    () => new Map(snapshotCompetitors.map((c) => [c.name, c.website])),
    [snapshotCompetitors],
  );

  const competitorOptions = useMemo(
    () => Array.from(new Set([
      ...snapshotCompetitors.map((c) => c.name),
      ...(snapshotDecisionModel?.prioritizedInsights ?? []).flatMap((i) => i.affected_competitors ?? []),
    ].filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [snapshotCompetitors, snapshotDecisionModel?.prioritizedInsights],
  );

  const campaignTypeOptions = useMemo(
    () => Array.from(new Set(
      (snapshotDecisionModel?.prioritizedInsights ?? []).map((i) => i.campaign_type).filter((v) => typeof v === "string" && v.trim()),
    )).sort((a, b) => a.localeCompare(b)),
    [snapshotDecisionModel?.prioritizedInsights],
  );

  const matchesMeta = (list: string[] | undefined, sel: string) =>
    !sel || !list || list.length === 0 || list.includes(sel);

  const filteredHighlights = useMemo(
    () => (snapshotDecisionModel?.dailyHighlights ?? []).filter(
      (h) => matchesMeta(h.competitors, selectedCompetitor) && matchesMeta(h.campaignTypes, selectedCampaignType),
    ),
    [snapshotDecisionModel?.dailyHighlights, selectedCompetitor, selectedCampaignType],
  );
  const filteredInsights = useMemo(
    () => (snapshotDecisionModel?.prioritizedInsights ?? []).filter((i) => {
      const competitorMatch = selectedCompetitor ? (i.affected_competitors ?? []).includes(selectedCompetitor) : true;
      const campaignMatch = selectedCampaignType ? i.campaign_type === selectedCampaignType : true;
      return competitorMatch && campaignMatch;
    }),
    [snapshotDecisionModel?.prioritizedInsights, selectedCompetitor, selectedCampaignType],
  );
  const filteredActions = useMemo(
    () => (snapshotDecisionModel?.recommendedActions ?? []).filter(
      (a) => matchesMeta(a.competitors, selectedCompetitor) && matchesMeta(a.campaignTypes, selectedCampaignType),
    ),
    [snapshotDecisionModel?.recommendedActions, selectedCompetitor, selectedCampaignType],
  );
  const filteredAnomalies = useMemo(
    () => (snapshotDecisionModel?.anomalies ?? []).filter(
      (a) => matchesMeta(a.competitors, selectedCompetitor) && matchesMeta(a.campaignTypes, selectedCampaignType),
    ),
    [snapshotDecisionModel?.anomalies, selectedCompetitor, selectedCampaignType],
  );
  const filteredCompetitorSummary = useMemo(
    () => selectedCompetitor
      ? (snapshotDecisionModel?.competitorSummary ?? []).filter((e) => e.competitor === selectedCompetitor)
      : (snapshotDecisionModel?.competitorSummary ?? []),
    [snapshotDecisionModel?.competitorSummary, selectedCompetitor],
  );
  const filteredRecentInbox = useMemo(
    () => snapshotRecentInbox.filter((item) => {
      if (!selectedCompetitor) return true;
      const name = item.competitor_id ? competitorNameById.get(item.competitor_id) : null;
      return name === selectedCompetitor;
    }),
    [snapshotRecentInbox, selectedCompetitor, competitorNameById],
  );

  const aiSummary: DashboardAISummary = useMemo(
    () => {
      if (!snapshotDecisionModel) return buildDashboardAiSummary({ highlights: [], insights: [], anomalies: [], recommendedActions: [] });
      return selectedCompetitor || selectedCampaignType
        ? buildDashboardAiSummary({
            highlights: filteredHighlights,
            insights: filteredInsights,
            anomalies: filteredAnomalies,
            recommendedActions: filteredActions,
            focus: { competitor: selectedCompetitor || null, campaignType: selectedCampaignType || null },
          })
        : snapshotDecisionModel.aiSummary ?? buildDashboardAiSummary({
            highlights: snapshotDecisionModel.dailyHighlights,
            insights: snapshotDecisionModel.prioritizedInsights,
            anomalies: snapshotDecisionModel.anomalies,
            recommendedActions: snapshotDecisionModel.recommendedActions,
          });
    },
    [selectedCompetitor, selectedCampaignType, filteredHighlights, filteredInsights, filteredAnomalies, filteredActions, snapshotDecisionModel],
  );

  const urgentSignals: { label: string; count: number; href: string; tone: "red" | "amber" | "blue" }[] = useMemo(
    () => {
      const unreadAlertCount = snapshot?.unreadAlertCount ?? 0;
      return [
        ...(unreadAlertCount > 0 ? [{ label: t("unreadAlerts"), count: unreadAlertCount, href: "/alerts", tone: "red" as const }] : []),
        ...(filteredAnomalies.filter((a) => a.severity === "high").length > 0
          ? [{ label: t("criticalAnomalies"), count: filteredAnomalies.filter((a) => a.severity === "high").length, href: "/analytics", tone: "amber" as const }]
          : []),
        ...(filteredInsights.filter((i) => normalizeDashboardPriority(i.priority_level) === "high").length > 0
          ? [{ label: t("highPriorityInsights"), count: filteredInsights.filter((i) => normalizeDashboardPriority(i.priority_level) === "high").length, href: "/insights", tone: "blue" as const }]
          : []),
      ];
    },
    [snapshot?.unreadAlertCount, filteredAnomalies, filteredInsights, t],
  );

  // ── Early returns after all hooks ────────────────────────────────────────────

  if (workspaceError) return <ErrorState title={t("title") + " unavailable"} description={workspaceError} onRetry={() => void refetchWorkspace()} />;
  if (wsLoading || (currentWorkspace && loading)) return <LoadingState />;
  if (!currentWorkspace) return <EmptyWorkspaceState onCreate={() => navigate("/onboarding")} />;
  if (snapshotError || !snapshot) return <ErrorState title={t("title") + " failed to load"} description={snapshotError || "Snapshot unavailable."} onRetry={() => void refetchSnapshot()} />;

  const { stats, competitors, decisionModel, gmailConnected, usage, limits, unreadAlertCount } = snapshot;

  const activeFilterCount = Number(Boolean(selectedCompetitor)) + Number(Boolean(selectedCampaignType));
  const hasData = stats.inboxItems > 0 || stats.competitors > 0 || stats.metaAds > 0;

  const isAtLimit = (metric: keyof typeof usage) => {
    const limit = { competitors: limits.competitors, newsletters_this_month: limits.newsletters_per_month, analyses_this_month: limits.analyses_per_month, seats_used: -1 }[metric];
    if (limit === -1) return false;
    return usage[metric] >= limit;
  };

  return (
    <div className="max-w-[1360px] space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">

      {/* ── Zone 1: Command Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{currentWorkspace.name}</h1>
            {urgentSignals.map((s) => (
              <button
                key={s.label}
                onClick={() => navigate(s.href)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all hover:opacity-90 hover:shadow-sm",
                  s.tone === "red" && "border-destructive/25 bg-destructive/10 text-destructive",
                  s.tone === "amber" && "border-warning/25 bg-warning/10 text-warning",
                  s.tone === "blue" && "border-primary/25 bg-primary/10 text-primary",
                )}
              >
                <span className={cn("h-1.5 w-1.5 animate-pulse rounded-full", s.tone === "red" && "bg-destructive", s.tone === "amber" && "bg-warning", s.tone === "blue" && "bg-primary")} />
                {s.count} {s.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · {t("intelligenceFeed")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium" onClick={() => navigate("/newsletters/new")}>
            <Plus className="h-3.5 w-3.5" />
            {t("importData")}
          </Button>
          <Button size="sm" className="h-9 gap-1.5 text-xs font-medium" onClick={() => navigate("/insights")}>
            <Sparkles className="h-3.5 w-3.5" />
            {t("generateInsights")}
          </Button>
        </div>
      </div>

      <OnboardingChecklist />

      {hasData && (
        /* ── Zone 3: Intelligence Brief (hero position) ────────────────────── */
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 border-b bg-muted/40 px-5 py-3.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground/70">{t("intelligenceBrief")}</p>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-[10px] font-medium">
                {t("filteredActive", { count: activeFilterCount })}
              </Badge>
            )}
          </div>
          <div className="grid gap-0 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
            <BriefColumn
              icon={Activity}
              label={t("whatHappened")}
              text={aiSummary.whatChangedToday}
            />
            <BriefColumn
              icon={Target}
              label={t("whatMatters")}
              text={aiSummary.whatMattersMost}
              accent
            />
            <BriefColumn
              icon={Zap}
              label={t("whatToDoNow")}
              text={filteredActions[0]
                ? `${filteredActions[0].title}. ${filteredActions[0].detail}`
                : t("noImmediateAction")}
              cta={filteredActions[0] ? { label: filteredActions[0].cta, href: filteredActions[0].path } : undefined}
              onNavigate={navigate}
            />
          </div>
        </div>
      )}

      {/* ── Zone 2: KPI Strip ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="grid grid-cols-3 sm:grid-cols-6">
          <KpiStrip label={t("kpiInbox")} value={stats.inboxItems} href="/inbox" />
          <KpiStrip label={t("kpiCompetitors")} value={stats.competitors} href="/competitors" />
          <KpiStrip label={t("kpiAnalyses")} value={stats.completedAnalyses} href="/analytics" />
          <KpiStrip label={t("kpiMetaAds")} value={stats.metaAds} href="/meta-ads" />
          <KpiStrip label={t("kpiInsights")} value={stats.insightCount} href="/insights" />
          <KpiStrip label={t("kpiAlerts")} value={unreadAlertCount} href="/alerts" accent={unreadAlertCount > 0} />
        </div>
      </div>

      {!hasData && (
        <EmptyDecisionState gmailConnected={gmailConnected} competitorCount={stats.competitors} onNavigate={navigate} />
      )}

      {hasData && (
        <>
          {/* ── Filter Strip (only if filters are meaningful) ───────────────── */}
          {(competitorOptions.length > 0 || campaignTypeOptions.length > 0) && (
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:py-2">
              <div className="flex items-center justify-between sm:justify-start">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Filter className="h-3 w-3" />
                  <span>{t("filter")}</span>
                </div>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground sm:hidden">
                    <X className="h-3 w-3" />
                    {t("clearFilters")}
                  </button>
                )}
              </div>
              <Separator orientation="vertical" className="hidden sm:block h-4" />
              {competitorOptions.length > 0 && (
                <Select value={selectedCompetitor || ALL_COMPETITORS} onValueChange={(v) => setSelectedCompetitor(v === ALL_COMPETITORS ? "" : v)}>
                  <SelectTrigger className="h-9 w-full text-xs bg-background sm:w-auto sm:min-w-[140px]">
                    <SelectValue placeholder={t("allCompetitors")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_COMPETITORS}>{t("allCompetitors")}</SelectItem>
                    {competitorOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {campaignTypeOptions.length > 0 && (
                <Select value={selectedCampaignType || ALL_CAMPAIGNS} onValueChange={(v) => setSelectedCampaignType(v === ALL_CAMPAIGNS ? "" : v)}>
                  <SelectTrigger className="h-9 w-full text-xs bg-background sm:w-auto sm:min-w-[140px]">
                    <SelectValue placeholder={t("allCampaigns")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CAMPAIGNS}>{t("allCampaigns")}</SelectItem>
                    {campaignTypeOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="hidden sm:ml-auto sm:flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground min-h-[36px]">
                  <X className="h-3 w-3" />
                  {t("clearFilters")}
                </button>
              )}
            </div>
          )}

          {/* ── Zone 4: Priority Action Queue ──────────────────────────────── */}
          {filteredActions.length > 0 && (
            <section className="space-y-2">
              <SectionHeader
                label={t("actionQueue")}
                sub={filteredActions.length !== 1 ? t("actionQueueSubPlural", { count: filteredActions.length }) : t("actionQueueSub", { count: filteredActions.length })}
                variant="primary"
              />
              <div className="space-y-2">
                {filteredActions.map((action, index) => (
                  <ActionCard key={action.title} action={action} rank={index + 1} onNavigate={() => navigate(action.path)} />
                ))}
              </div>
            </section>
          )}

          {/* ── Zone 5: Top Insights + Competitor Pressure ─────────────────── */}
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1.6fr_1fr]">

            {/* Top insights: featured #1 + compact list */}
            <section className="min-w-0 space-y-2">
              <SectionHeader
                label={t("topInsights")}
                sub={t("topInsightsSub", { count: filteredInsights.length })}
                action={filteredInsights.length > 3 ? { label: `${t("viewInsights")} (${filteredInsights.length})`, onClick: () => navigate("/insights") } : undefined}
              />
              {filteredInsights.length === 0 ? (
                <EmptyZone icon={Lightbulb} title={t("noInsightsInScope")} desc={t("noInsightsInScopeDesc")} action={{ label: t("generateInsights"), onClick: () => navigate("/insights") }} />
              ) : (
                <div className="space-y-2">
                  {/* Featured insight */}
                  <FeaturedInsightCard insight={filteredInsights[0]} onClick={() => navigate("/insights")} />
                  {/* Compact remaining */}
                  {filteredInsights.slice(1, 4).map((insight) => (
                    <CompactInsightRow key={insight.id} insight={insight} onClick={() => navigate("/insights")} />
                  ))}
                </div>
              )}
            </section>

            {/* Competitor pressure */}
            <section className="min-w-0 space-y-2">
              <SectionHeader
                label={t("competitorPressure")}
                sub={t("competitorPressureSub")}
                action={{ label: t("compare"), onClick: () => navigate("/analytics") }}
              />
              {filteredCompetitorSummary.length === 0 ? (
                <EmptyZone icon={Users} title={t("noCompetitorData")} desc={t("noCompetitorDataDesc")} />
              ) : (
                <Card className="border shadow-sm divide-y">
                  {filteredCompetitorSummary.map((entry) => (
                    <CompetitorPressureRow key={entry.competitor} entry={entry} maxSignals={filteredCompetitorSummary[0].newsletters + filteredCompetitorSummary[0].ads} website={competitorWebsiteByName.get(entry.competitor) ?? null} onClick={() => navigate("/competitors")} />
                  ))}
                </Card>
              )}
            </section>
          </div>

          {/* ── Zone 6: Highlights | Anomalies | Inbox ─────────────────────── */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            {/* Daily highlights */}
            <section className="min-w-0 space-y-2">
              <SectionHeader
                label={t("dailyHighlights")}
                sub={t("dailyHighlightsSub")}
                action={{ label: t("analytics"), onClick: () => navigate("/analytics") }}
              />
              {filteredHighlights.length === 0 ? (
                <EmptyZone icon={Sparkles} title={t("noHighlights")} desc={t("noHighlightsDesc")} />
              ) : (
                <div className="space-y-1.5">
                  {filteredHighlights.map((h) => <HighlightCompactRow key={`${h.kind}-${h.title}`} highlight={h} />)}
                </div>
              )}
            </section>

            {/* Anomaly radar */}
            <section className="min-w-0 space-y-2">
              <SectionHeader
                label={t("anomalyRadar")}
                sub={t("anomalyRadarSub")}
              />
              {filteredAnomalies.length === 0 ? (
                <EmptyZone icon={Activity} title={t("noAnomalies")} desc={t("noAnomaliesDesc")} />
              ) : (
                <div className="space-y-1.5">
                  {filteredAnomalies.map((a) => <AnomalyCompactRow key={a.title} anomaly={a} onNavigate={() => navigate(a.path)} />)}
                </div>
              )}
            </section>

            {/* Recent inbox */}
            <section className="min-w-0 space-y-2">
              <SectionHeader
                label={t("recentCompetitorActivity")}
                sub={t("recentCompetitorActivitySub")}
                action={{ label: t("openInbox"), onClick: () => navigate("/inbox") }}
              />
              {filteredRecentInbox.length === 0 ? (
                <EmptyZone
                  icon={Newspaper}
                  title={t("noRecentActivity")}
                  desc={gmailConnected ? t("widenFiltersOrWait") : t("connectGmail")}
                  action={!gmailConnected ? { label: t("connectGmailAction"), onClick: () => navigate("/settings") } : undefined}
                />
              ) : (
                <div className="space-y-1.5">
                  {filteredRecentInbox.slice(0, 6).map((item) => (
                    <InboxCompactRow
                      key={item.id}
                      item={item}
                      competitorName={item.competitor_id ? (competitorNameById.get(item.competitor_id) ?? null) : null}
                      onClick={() => navigate(`/inbox/${item.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── Zone 7: Tracked competitors grid ───────────────────────────── */}
          {competitors.length > 0 && (
            <section className="space-y-2">
              <SectionHeader
                label={t("trackedCompanies")}
                sub={competitors.length !== 1 ? t("trackedCompaniesSubPlural", { count: competitors.length }) : t("trackedCompaniesSub", { count: competitors.length })}
                action={{ label: t("manage"), onClick: () => navigate("/competitors") }}
              />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {competitors.map((c) => (
                  <CompetitorPreviewCard key={c.id} competitor={c} onClick={() => navigate("/competitors")} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Upgrade prompt ─────────────────────────────────────────────────── */}
      {(isAtLimit("competitors") || isAtLimit("newsletters_this_month") || isAtLimit("analyses_this_month")) && (
        <UpgradePrompt
          reason={isAtLimit("competitors") ? "competitor_limit" : isAtLimit("newsletters_this_month") ? "newsletter_limit" : "analysis_limit"}
          variant="inline"
        />
      )}

      <SystemHealthPanel />

      {/* ── Quick nav ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-gradient-to-br from-background to-muted/30 p-1">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { icon: Newspaper, label: t("quickNavImportData"), desc: t("quickNavImportDataDesc"), path: "/newsletters/new" },
            { icon: Users, label: t("quickNavCompetitors"), desc: t("quickNavCompetitorsDesc"), path: "/competitors" },
            { icon: TrendingUp, label: t("quickNavAnalytics"), desc: t("quickNavAnalyticsDesc"), path: "/analytics" },
            { icon: Megaphone, label: t("quickNavMetaAds"), desc: t("quickNavMetaAdsDesc"), path: "/meta-ads" },
          ].map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="group flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-background hover:shadow-sm"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 text-primary shadow-sm">
                <a.icon className="h-3.5 w-3.5 group-hover:scale-105 transition-transform" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{a.label}</p>
                <p className="text-[10px] text-muted-foreground/70">{a.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function SectionHeader({ label, sub, action, variant = "default" }: {
  label: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
  variant?: "primary" | "default";
}) {
  return (
    <div className="flex items-center justify-between gap-3 pb-2">
      <div className="flex items-center gap-2.5">
        <span className={cn("h-4 w-[3px] rounded-full shrink-0", variant === "primary" ? "bg-primary" : "bg-primary/50")} />
        <p className={cn("tracking-tight", variant === "primary" ? "text-sm font-bold text-foreground" : "text-sm font-semibold text-foreground")}>{label}</p>
        {sub && (
          <p className="text-[11px] text-muted-foreground/70 hidden sm:block">{sub}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          {action.label}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function EmptyZone({ icon: Icon, title, desc, action }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/10 py-7 text-center">
      <Icon className="mx-auto mb-2 h-5 w-5 text-muted-foreground/30" />
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mx-auto mt-0.5 max-w-[200px] text-[11px] text-muted-foreground/60">{desc}</p>
      {action && (
        <Button variant="outline" size="sm" className="mt-3 h-8 gap-1 text-xs" onClick={action.onClick}>
          {action.label}
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ─── State components ─────────────────────────────────────────────────────────

function LoadingState() {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground">{t("loading")}</p>
      </div>
    </div>
  );
}

function EmptyWorkspaceState({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <p className="mb-3 text-sm text-muted-foreground">{t("noWorkspaceFound")}</p>
        <Button onClick={onCreate}>{t("createWorkspace")}</Button>
      </div>
    </div>
  );
}

function ErrorState({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="w-full max-w-md border-destructive/20">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <Button size="sm" onClick={onRetry}>{t("retry")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyDecisionState({ gmailConnected, competitorCount, onNavigate }: {
  gmailConnected: boolean;
  competitorCount: number;
  onNavigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useTranslation("dashboard");
  return (
    <Card className="border-2 border-dashed bg-accent/20">
      <CardContent className="p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mb-1 text-base font-semibold">{t("buildDecisionFeed")}</h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
          {t("buildDecisionFeedDesc")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!gmailConnected && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onNavigate("/settings")}>
              <Mail className="h-3.5 w-3.5" />{t("connectGmailBtn")}
            </Button>
          )}
          {competitorCount === 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onNavigate("/competitors")}>
              <Users className="h-3.5 w-3.5" />{t("addCompetitors")}
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => onNavigate("/newsletters/new")}>
            <Newspaper className="h-3.5 w-3.5" />{t("importCompetitorData")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

const KpiStrip = memo(function KpiStrip({ label, value, href, accent }: {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className={cn(
        "group flex flex-col gap-0.5 border-b border-r px-4 py-3.5 text-left transition-colors hover:bg-muted/40",
        accent && "bg-destructive/[0.03] hover:bg-destructive/[0.06]",
      )}
    >
      <p className={cn(
        "text-xl font-bold leading-tight tracking-tight tabular-nums",
        accent ? "text-destructive" : "text-foreground",
      )}>
        {value}
      </p>
      <p className="truncate text-[11px] font-medium text-foreground/60">{label}</p>
    </button>
  );
});

// ─── Intelligence Brief columns ───────────────────────────────────────────────

function BriefColumn({ icon: Icon, label, text, accent, cta, onNavigate }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  text: string;
  accent?: boolean;
  cta?: { label: string; href: string };
  onNavigate?: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className={cn("flex flex-col gap-3.5 p-5", accent && "bg-gradient-to-b from-primary/[0.04] to-transparent")}>
      <div className="flex items-center gap-2">
        <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", accent ? "text-primary/70" : "text-muted-foreground")}>{label}</p>
      </div>
      <p className="text-sm leading-[1.65] text-foreground">{text}</p>
      {cta && onNavigate && (
        <div className="mt-auto pt-1">
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => onNavigate(cta.href)}>
            {cta.label}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Action Queue ─────────────────────────────────────────────────────────────

function ActionCard({ action, rank, onNavigate }: {
  action: DashboardRecommendedAction;
  rank: number;
  onNavigate: () => void;
}) {
  const priority = normalizeDashboardPriority(action.priority);
  return (
    <div className={cn("rounded-xl border border-l-[3px] bg-background p-4 transition-all duration-200 hover:bg-accent/20 hover:shadow-md hover:-translate-y-0.5", PRIORITY_BORDER[priority])}>
      <div className="flex items-start gap-3.5">
        <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white shadow-sm", priority === "high" ? "bg-destructive" : priority === "medium" ? "bg-warning" : "bg-primary")}>
          {rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{action.title}</p>
            <Badge variant="outline" className={cn("text-[10px] capitalize", PRIORITY_BADGE[priority])}>
              {INSIGHT_PRIORITY_LABELS[priority]}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{action.detail}</p>
          {(action.competitors?.length || action.campaignTypes?.length) ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {action.competitors?.slice(0, 2).map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
              ))}
              {action.campaignTypes?.slice(0, 1).map((ct) => (
                <Badge key={ct} variant="outline" className="text-[10px] capitalize">{fmt(ct, "campaign")}</Badge>
              ))}
            </div>
          ) : null}
        </div>
        <Button size="sm" className="hidden h-8 shrink-0 gap-1 text-xs sm:inline-flex" onClick={onNavigate}>
          {action.cta}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      <Button size="sm" className="mt-3 h-9 w-full gap-1.5 text-xs sm:hidden" onClick={onNavigate}>
        {action.cta}
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ─── Insight Cards ────────────────────────────────────────────────────────────

function FeaturedInsightCard({ insight, onClick }: { insight: DashboardInsight; onClick: () => void }) {
  const { t } = useTranslation("dashboard");
  const priority = normalizeDashboardPriority(insight.priority_level);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-5 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-accent/15",
        priority === "high" && "bg-gradient-to-br from-destructive/[0.04] to-transparent",
        priority === "medium" && "bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/10 dark:to-transparent",
        priority === "low" && "bg-card",
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("text-[10px] capitalize", PRIORITY_BADGE[priority])}>
            {INSIGHT_PRIORITY_LABELS[priority]}
          </Badge>
        </div>
        <p className="text-sm font-semibold leading-snug [overflow-wrap:anywhere]">{insight.title}</p>
        <p className="text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">{insight.strategic_takeaway || insight.what_is_happening}</p>
        {insight.why_it_matters && (
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("whyItMatters")}</p>
            <p className="mt-1 text-xs leading-5 text-foreground/80 [overflow-wrap:anywhere]">{insight.why_it_matters}</p>
          </div>
        )}
        {(insight.affected_competitors ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(insight.affected_competitors ?? []).slice(0, 2).map((c) => (
              <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function CompactInsightRow({ insight, onClick }: { insight: DashboardInsight; onClick: () => void }) {
  const priority = normalizeDashboardPriority(insight.priority_level);
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-all hover:bg-accent/20 hover:shadow-md"
    >
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", PRIORITY_DOT[priority])} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{insight.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{insight.strategic_takeaway}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {(insight.affected_competitors ?? []).slice(0, 1).map((c) => (
            <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
          ))}
        </div>
      </div>
      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
    </button>
  );
}

// ─── Competitor Pressure ──────────────────────────────────────────────────────

function CompetitorPressureRow({ entry, maxSignals, website, onClick }: {
  entry: DashboardCompetitorSummary;
  maxSignals: number;
  website: string | null;
  onClick: () => void;
}) {
  const { t } = useTranslation("dashboard");
  const total = entry.newsletters + entry.ads;
  const pct = maxSignals > 0 ? Math.round((total / maxSignals) * 100) : 0;
  return (
    <button onClick={onClick} className="flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors hover:bg-accent/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <CompetitorLogo name={entry.competitor} website={website} size="xs" />
          <p className="truncate text-sm font-medium">{entry.competitor}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {entry.newsletters > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Newspaper className="h-2.5 w-2.5" />{entry.newsletters}
            </span>
          )}
          {entry.ads > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Megaphone className="h-2.5 w-2.5" />{entry.ads}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct > 60 ? "bg-destructive/70" : pct > 30 ? "bg-amber-400/80" : "bg-primary/70",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {typeof entry.promoRate === "number" && entry.promoRate > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {t("promoIntensity", { value: Math.round(entry.promoRate * 100) })}
        </p>
      )}
    </button>
  );
}

// ─── Highlights (compact) ─────────────────────────────────────────────────────

function HighlightCompactRow({ highlight }: { highlight: DashboardHighlight }) {
  const { t } = useTranslation("dashboard");
  const toneBg: Record<DashboardHighlight["tone"], string> = {
    positive: "bg-primary/[0.025]",
    warning: "bg-warning/[0.025]",
    neutral: "bg-card",
  };
  const kindDot: Record<DashboardHighlight["kind"], string> = {
    competitor_action: "bg-muted-foreground",
    promotion: "bg-warning",
    campaign: "bg-primary",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 shadow-sm", toneBg[highlight.tone])}>
      <div className="flex items-start gap-2.5">
        <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", kindDot[highlight.kind])} />
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{highlight.title}</p>
          <p className="mt-0.5 text-[11px] leading-[1.5] text-muted-foreground [overflow-wrap:anywhere]">{highlight.detail}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {highlight.competitors?.slice(0, 1).map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
            ))}
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground/50">
              {highlight.kind === "competitor_action" ? t("highlightKindMove") : highlight.kind === "promotion" ? t("highlightKindPromo") : t("highlightKindCampaign")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Anomaly (compact) ────────────────────────────────────────────────────────

function AnomalyCompactRow({ anomaly, onNavigate }: { anomaly: DashboardAnomaly; onNavigate: () => void }) {
  const priority = normalizeDashboardPriority(anomaly.severity);
  return (
    <button
      onClick={onNavigate}
      className="w-full rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-all hover:bg-accent/20 hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        {(() => {
          const AnomalyIcon = priority === "high" ? AlertCircle : priority === "medium" ? Activity : CheckCircle;
          return (
            <div className={cn("mt-0.5 shrink-0", priority === "high" ? "text-destructive" : priority === "medium" ? "text-warning" : "text-muted-foreground")}>
              <AnomalyIcon className="h-3.5 w-3.5" />
            </div>
          );
        })()}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground [overflow-wrap:anywhere]">{anomaly.title}</p>
          <p className="mt-0.5 text-[11px] leading-[1.5] text-muted-foreground [overflow-wrap:anywhere]">{anomaly.detail}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Inbox (compact) ─────────────────────────────────────────────────────────

function InboxCompactRow({ item, competitorName, onClick }: {
  item: DashboardInboxPreview;
  competitorName: string | null;
  onClick: () => void;
}) {
  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left shadow-sm transition-all hover:bg-accent/20 hover:shadow-md"
    >
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold",
        item.is_read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary ring-1 ring-primary/20 shadow-sm",
      )}>
        {(item.from_name || item.from_email || "?").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={cn("truncate text-xs font-medium", !item.is_read && "font-semibold text-foreground")}>{item.subject || t("noSubject")}</p>
          {!item.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="truncate text-[10px] text-muted-foreground">{item.from_name || item.from_email || tCommon("unknown")}</p>
          {competitorName && <Badge variant="outline" className="text-[9px]">{competitorName}</Badge>}
        </div>
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground/60 whitespace-nowrap">
        {item.received_at ? formatDistanceToNow(new Date(item.received_at), { addSuffix: true }) : "—"}
      </span>
    </button>
  );
}

// ─── Competitor preview card ──────────────────────────────────────────────────

function CompetitorPreviewCard({ competitor, onClick }: { competitor: DashboardCompetitorPreview; onClick: () => void }) {
  const { t } = useTranslation("dashboard");
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
      <CompetitorLogo name={competitor.name} website={competitor.website} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{competitor.name}</p>
        {competitor.website && (
          <p className="truncate text-[11px] text-muted-foreground">{competitor.website.replace(/^https?:\/\//, "")}</p>
        )}
        {!competitor.is_monitored && (
          <span className="text-[10px] text-muted-foreground/50">{t("notMonitored")}</span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary/50" />
    </button>
  );
}
