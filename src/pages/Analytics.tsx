import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import {
  buildAnalyticsActionQueue,
  buildAnalyticsAnomalies,
  buildAnalyticsHealthAudit,
  type AnalyticsHealthItem,
} from "@/lib/analytics-audit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  Inbox,
  Lightbulb,
  MailSearch,
  Megaphone,
  Radar,
  RefreshCcw,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(200 70% 48%)",
  "hsl(145 58% 42%)",
  "hsl(38 90% 52%)",
];

const chartTooltipStyle = {
  fontSize: 12,
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  boxShadow: "0 8px 28px rgba(0,0,0,0.11)",
  padding: "10px 14px",
};

const chartAxisStyle = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatGrowth(value: number) {
  const direction = value >= 0 ? "+" : "";
  return `${direction}${value.toFixed(1)}%`;
}

function formatDateTime(value: string | null, noActivityLabel = "No recent activity") {
  if (!value) return noActivityLabel;
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRangeLabel(days: number, label: string) {
  return label.replace("{{days}}", String(days));
}

function getHealthBadgeClass(status: AnalyticsHealthItem["status"]) {
  if (status === "good") return "border-primary/20 bg-primary/10 text-primary";
  if (status === "watch") return "border-warning/30 bg-warning/10 text-warning";
  return "border-destructive/20 bg-destructive/10 text-destructive";
}

function getHealthDotClass(status: AnalyticsHealthItem["status"]) {
  if (status === "good") return "bg-primary";
  if (status === "watch") return "bg-warning";
  return "bg-destructive";
}

function getPriorityBadgeClass(priority: "high" | "medium" | "low") {
  if (priority === "high") return "border-destructive/20 bg-destructive/10 text-destructive";
  if (priority === "medium") return "border-warning/30 bg-warning/10 text-warning";
  return "border-primary/20 bg-primary/10 text-primary";
}

function getPriorityBorderClass(priority: "high" | "medium" | "low") {
  if (priority === "high") return "border-l-destructive";
  if (priority === "medium") return "border-l-warning";
  return "border-l-primary";
}

function getSignalBadgeClass(sourceType: "newsletter" | "meta_ad" | "insight") {
  if (sourceType === "newsletter") return "border-primary/20 bg-primary/10 text-primary";
  if (sourceType === "meta_ad") return "border-warning/20 bg-warning/10 text-warning";
  return "border-border bg-muted text-muted-foreground";
}

function getCoverageBarClass(rate: number) {
  if (rate >= 75) return "bg-primary/60";
  if (rate >= 40) return "bg-warning/60";
  return "bg-destructive/60";
}

// ── Empty block ────────────────────────────────────────────────────────────────

function EmptyBlock({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-10 text-center">
      <Icon className="mx-auto mb-3 h-6 w-6 text-muted-foreground/25" />
      <p className="text-xs font-medium text-muted-foreground/60">{text}</p>
    </div>
  );
}

// ── Section divider ────────────────────────────────────────────────────────────

function SectionDivider({
  label,
  icon: Icon,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary/60" />
      ) : (
        <span className="h-4 w-[3px] shrink-0 rounded-full bg-primary/50" />
      )}
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 shrink-0">
        {label}
      </p>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

// ── Chart card ─────────────────────────────────────────────────────────────────

function ChartCard({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border shadow-sm overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b bg-muted/20 px-5 py-4">
        <div className="space-y-1 min-w-0">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="h-4 w-[3px] shrink-0 rounded-full bg-primary/60" />
            {title}
          </CardTitle>
          {description && (
            <p className="pl-[13px] text-xs leading-5 text-muted-foreground/80">{description}</p>
          )}
        </div>
        {action && <div className="mt-0.5 shrink-0 text-muted-foreground">{action}</div>}
      </CardHeader>
      <CardContent className="p-5 pt-4">{children}</CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { t } = useTranslation("analytics");
  const [rangeDays, setRangeDays] = useState("30");
  const selectedRangeDays = Number(rangeDays);
  const { data, loading, error, refetch } = useAnalyticsData(selectedRangeDays);

  const attributionDonut = useMemo(() => {
    const matched = data?.summary.attributedNewslettersInRange ?? 0;
    const unmatched = data?.summary.unattributedNewslettersInRange ?? 0;
    return [
      { label: "Matched", value: matched },
      { label: "Unassigned", value: unmatched },
    ];
  }, [data]);

  const actionQueue = useMemo(() => (data ? buildAnalyticsActionQueue(data) : []), [data]);
  const anomalies = useMemo(() => (data ? buildAnalyticsAnomalies(data) : []), [data]);
  const healthAudit = useMemo(() => (data ? buildAnalyticsHealthAudit(data) : []), [data]);

  if (loading) {
    return (
      <div className="max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="page-header">
          <div>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="rounded-xl border bg-card px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
            <TrendingUp className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t("unavailable")}</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {error || t("unavailableDesc")}
          </p>
        </div>
      </div>
    );
  }

  const { summary } = data;
  const totalAttributedBase =
    summary.attributedNewslettersInRange + summary.unattributedNewslettersInRange;
  const attributionRate =
    totalAttributedBase > 0
      ? (summary.attributedNewslettersInRange / totalAttributedBase) * 100
      : 0;
  const hasSignals =
    summary.totalNewslettersInRange > 0 ||
    summary.totalAdsInRange > 0 ||
    summary.totalInsightsInRange > 0 ||
    data.recentSignals.length > 0;

  return (
    <div className="max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-description">
            {t("description")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex items-center gap-1.5">
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="h-8 w-[148px] bg-background text-xs font-medium">
                <SelectValue placeholder={t("timeRange")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">{t("last30Days")}</SelectItem>
                <SelectItem value="90">{t("last90Days")}</SelectItem>
                <SelectItem value="180">{t("last180Days")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={() => void refetch()}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              {t("refresh")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] text-muted-foreground/70">
            <span>
              {t("newslettersSynced")}{" "}
              <span className="font-medium text-foreground/80">
                {formatDateTime(summary.lastInboxActivity, t("noRecentActivity"))}
              </span>
            </span>
            <span className="text-border">·</span>
            <span>
              {t("adsSynced")}{" "}
              <span className="font-medium text-foreground/80">
                {formatDateTime(summary.lastAdActivity, t("noRecentActivity"))}
              </span>
            </span>
            <span className="text-border">·</span>
            <span className="font-medium text-foreground/60">
              {formatRangeLabel(summary.rangeDays, t("lastDays"))} {t("window")}
            </span>
          </div>
        </div>
      </div>

      {!hasSignals && (
        <div className="rounded-xl border bg-card px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
            <TrendingUp className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t("notEnoughData")}</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {t("notEnoughDataDesc")}
          </p>
        </div>
      )}

      {/* ── KPI summary ── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label={t("newsletters")}
          value={String(summary.totalNewslettersInRange)}
          subtitle={`${t("inRange", { range: formatRangeLabel(summary.rangeDays, t("lastDays")).toLowerCase(), last: formatDateTime(summary.lastInboxActivity, t("noRecentActivity")) })}`}
          icon={Inbox}
          trend={summary.newsletterGrowthRate}
        />
        <StatCard
          label={t("metaAds")}
          value={String(summary.totalAdsInRange)}
          subtitle={`${t("inRange", { range: formatRangeLabel(summary.rangeDays, t("lastDays")).toLowerCase(), last: formatDateTime(summary.lastAdActivity, t("noRecentActivity")) })}`}
          icon={Megaphone}
          trend={summary.adGrowthRate}
        />
        <StatCard
          label={t("competitorsActive")}
          value={`${summary.activeCompetitorsInRange}/${summary.totalCompetitors}`}
          subtitle={t("competitorsActiveSub", { range: formatRangeLabel(summary.rangeDays, t("lastDays")).toLowerCase() })}
          icon={Users}
          tone="positive"
        />
        <StatCard
          label={t("attributionCoverage")}
          value={formatPercent(attributionRate)}
          subtitle={t("attributionCoverageSub", { matched: summary.attributedNewslettersInRange, backlog: summary.unattributedBacklog })}
          icon={MailSearch}
          tone={summary.unattributedBacklog > 0 ? "warning" : "positive"}
        />
        <StatCard
          label={t("promoPressure")}
          value={formatPercent(summary.promotionRate)}
          subtitle={t("promoPressureSub", { avg: summary.averageDiscount.toFixed(1), max: summary.maxDiscount.toFixed(0) })}
          icon={Activity}
        />
        <StatCard
          label={t("aiInsights")}
          value={String(summary.totalInsightsInRange)}
          subtitle={t("aiInsightsSub", { pct: formatPercent(summary.urgencyRate) })}
          icon={Lightbulb}
        />
      </div>

      {/* ── Operational priorities ── */}
      <SectionDivider label={t("operationalPriorities")} icon={Activity} />

      <div className="grid gap-4 xl:grid-cols-[1.25fr,1fr]">
        {/* Action queue */}
        <ChartCard
          title={t("actionQueue")}
          description={t("actionQueueDesc")}
        >
          <div className="space-y-2">
            {actionQueue.length === 0 ? (
              <EmptyBlock
                icon={CircleAlert}
                text={t("noUrgentActions")}
              />
            ) : (
              actionQueue.map((action) => (
                <div
                  key={action.title}
                  className={cn(
                    "rounded-xl border border-l-[3px] bg-background px-4 py-3.5 transition-all duration-200 hover:bg-accent/20 hover:shadow-sm",
                    getPriorityBorderClass(action.priority),
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold leading-snug text-foreground">
                          {action.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium capitalize",
                            getPriorityBadgeClass(action.priority),
                          )}
                        >
                          {action.priority}
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {action.detail}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 gap-1.5 text-xs font-medium"
                    >
                      <Link to={action.path}>
                        {action.cta}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>

        {/* Data health */}
        <ChartCard
          title={t("dataHealthAudit")}
          description={t("dataHealthAuditDesc")}
          action={<ShieldAlert className="h-4 w-4" />}
        >
          <div className="space-y-2.5">
            {healthAudit.map((item) => (
              <div key={item.label} className="rounded-xl border bg-background px-4 py-3 transition-all duration-150 hover:bg-accent/20">
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        getHealthDotClass(item.status),
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px] font-semibold uppercase tracking-wide",
                      getHealthBadgeClass(item.status),
                    )}
                  >
                    {item.value}
                  </Badge>
                </div>
                <div className="pl-4">
                  <Progress value={item.progress} className="h-1" />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Market pressure ── */}
      <SectionDivider label={t("marketPressure")} icon={TrendingUp} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr,1fr]">
        {/* Share of voice */}
        <ChartCard
          title={t("shareOfMonitoredActivity")}
          description={t("shareOfMonitoredActivityDesc")}
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.shareOfVoice} layout="vertical" barSize={18}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={chartAxisStyle}
                  tickFormatter={(v) => `${v}%`}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="competitor"
                  tick={chartAxisStyle}
                  width={128}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, t("signalShare")]}
                />
                <Bar dataKey="signalShare" fill="hsl(var(--chart-2))" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Anomalies */}
        <ChartCard
          title={t("detectedAnomalies")}
          description={t("detectedAnomaliesDesc")}
          action={<Radar className="h-4 w-4" />}
        >
          <div className="space-y-2.5">
            {anomalies.length === 0 ? (
              <EmptyBlock
                icon={Radar}
                text={t("noAnomalies")}
              />
            ) : (
              anomalies.map((anomaly) => (
                <div
                  key={anomaly.title}
                  className={cn(
                    "rounded-xl border border-l-[3px] bg-background px-4 py-3",
                    getPriorityBorderClass(anomaly.severity),
                  )}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{anomaly.title}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium capitalize",
                        getPriorityBadgeClass(anomaly.severity),
                      )}
                    >
                      {anomaly.severity}
                    </Badge>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{anomaly.detail}</p>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      {/* Promo frequency per competitor */}
      {data.promotionFrequency.some((d) => d.total > 0) && (
        <ChartCard
          title={t("promoFrequencyByCompetitor")}
          description={t("promoFrequencyByCompetitorDesc")}
        >
          <div className="h-[272px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.promotionFrequency.filter((d) => d.total > 0).slice(0, 8)}
                layout="vertical"
                barSize={15}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="competitor"
                  tick={chartAxisStyle}
                  width={128}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconType="circle" iconSize={8} />
                <Bar dataKey="total" name={t("totalSignals")} fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="promos" name={t("promos")} fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.8fr,1fr]">
        {/* Weekly activity */}
        <ChartCard
          title={t("competitiveActivityByWeek")}
          description={t("competitiveActivityByWeekDesc")}
        >
          <div className="h-[356px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.weeklyActivity}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tick={chartAxisStyle}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={chartAxisStyle}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 14 }} iconType="circle" iconSize={8} />
                <Bar
                  dataKey="newsletters"
                  name={t("newsletters")}
                  fill="hsl(var(--chart-1))"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="ads"
                  name={t("ads")}
                  fill="hsl(var(--chart-2))"
                  radius={[5, 5, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="insights"
                  name={t("insights")}
                  stroke="hsl(var(--chart-5))"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, strokeWidth: 0, fill: "hsl(var(--chart-5))" }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Attribution health */}
        <ChartCard
          title={t("attributionHealth")}
          description={t("attributionHealthDesc")}
        >
          <div className="flex flex-col gap-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attributionDonut}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {attributionDonut.map((item, index) => (
                      <Cell
                        key={item.label}
                        fill={
                          index === 0
                            ? "hsl(var(--chart-1))"
                            : "hsl(var(--chart-4))"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border bg-card px-4 py-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("matched")}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                  {summary.attributedNewslettersInRange}
                </p>
              </div>
              <div className="rounded-xl border bg-card px-4 py-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("needsReview")}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                  {summary.unattributedNewslettersInRange}
                </p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Competitive pressure ── */}
      <SectionDivider label={t("competitivePressure")} />

      <div className="grid gap-4 xl:grid-cols-[1.35fr,1fr]">
        {/* Pressure ranking */}
        <ChartCard
          title={t("competitorPressureRanking")}
          description={t("competitorPressureRankingDesc")}
        >
          <div className="space-y-2.5">
            {data.competitorPressure.length === 0 ? (
              <EmptyBlock icon={Users} text={t("noCompetitorPressure")} />
            ) : (
              data.competitorPressure.map((item, index) => {
                const maxPressure = data.competitorPressure[0]?.pressureScore || 1;
                const pct = Math.max((item.pressureScore / maxPressure) * 100, 8);
                return (
                  <div key={item.competitorId} className="rounded-xl border bg-card px-4 py-3.5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                          index === 0
                            ? "bg-destructive/10 text-destructive"
                            : index === 1
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {item.competitor}
                            </p>
                            <Badge variant="outline" className="shrink-0 text-[10px] font-medium">
                              {item.pressureScore.toFixed(1)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground shrink-0">
                            <span className="flex items-center gap-0.5">
                              <Inbox className="h-2.5 w-2.5" />
                              {item.newsletters}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Megaphone className="h-2.5 w-2.5" />
                              {item.ads}
                            </span>
                            <span>{item.promos} promos</span>
                          </div>
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                          {t("lastActivity", { time: formatDateTime(item.latestActivityAt, t("noRecentActivity")) })}
                        </p>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted/70">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              index === 0
                                ? "bg-destructive/50"
                                : index === 1
                                ? "bg-warning/50"
                                : "bg-primary/50",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ChartCard>

        {/* Recent signals */}
        <ChartCard
          title={t("recentSignals")}
          description={t("recentSignalsDesc")}
        >
          <div className="space-y-2.5">
            {data.recentSignals.length === 0 ? (
              <EmptyBlock icon={Radar} text={t("noRecentSignals")} />
            ) : (
              data.recentSignals.map((signal, index) => (
                <div
                  key={`${signal.sourceType}-${signal.happenedAt}-${index}`}
                  className="rounded-xl border bg-background px-4 py-3 transition-all duration-150 hover:bg-accent/20 hover:shadow-sm"
                >
                  <div className="mb-1.5 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-medium",
                          getSignalBadgeClass(signal.sourceType),
                        )}
                      >
                        {signal.sourceType === "newsletter" ? t("newsletter") : signal.sourceType === "meta_ad" ? t("metaAd") : t("insight")}
                      </Badge>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                        {signal.competitor}
                      </span>
                    </div>
                    <p className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground/60">
                      {formatDateTime(signal.happenedAt, t("noRecentActivity"))}
                    </p>
                  </div>
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    {signal.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.summary}</p>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      {/* ── Coverage & quality ── */}
      <SectionDivider label={t("coverageQuality")} icon={ShieldAlert} />

      {/* Intelligence quality — metrics not surfaced in the KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: t("newsletterExtraction"),
            value: `${summary.extractedNewslettersInRange} / ${summary.totalNewslettersInRange}`,
            rate: summary.extractionCoverageRate,
            detail: t("newsletterExtractionDetail", { pct: summary.extractionCoverageRate.toFixed(1) }),
          },
          {
            label: t("adAnalysisCoverage"),
            value: `${summary.analyzedAdsInRange} / ${summary.totalAdsInRange}`,
            rate: summary.adAnalysisCoverageRate,
            detail: t("adAnalysisCoverageDetail", { pct: summary.adAnalysisCoverageRate.toFixed(1) }),
          },
          {
            label: t("domainsConfigured"),
            value: `${summary.competitorsWithDomains} / ${summary.totalCompetitors}`,
            rate: summary.totalCompetitors > 0
              ? (summary.competitorsWithDomains / summary.totalCompetitors) * 100
              : 100,
            detail: summary.competitorsMissingDomains > 0
              ? t("domainsConfiguredDetail", { count: summary.competitorsMissingDomains })
              : t("allCompetitorsConfigured"),
          },
          {
            label: t("activeInRange"),
            value: `${summary.activeCompetitorsInRange} / ${summary.totalCompetitors}`,
            rate: summary.totalCompetitors > 0
              ? (summary.activeCompetitorsInRange / summary.totalCompetitors) * 100
              : 100,
            detail: summary.inactiveCompetitorsInRange > 0
              ? t("activeInRangeDetail", { count: summary.inactiveCompetitorsInRange })
              : t("allCompetitorsSending"),
          },
        ].map((m) => {
          const isGood = m.rate >= 80;
          const isWarn = m.rate >= 40 && m.rate < 80;
          return (
            <div key={m.label} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                  {m.label}
                </p>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isGood ? "bg-emerald-500" : isWarn ? "bg-amber-400" : "bg-destructive",
                  )}
                />
              </div>
              <p className="text-xl font-bold tabular-nums text-foreground">{m.value}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{m.detail}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted/50">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isGood ? "bg-emerald-500/60" : isWarn ? "bg-amber-400/60" : "bg-destructive/60",
                  )}
                  style={{ width: `${Math.min(100, m.rate)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr,1fr]">
        {/* Top sender domains */}
        <ChartCard
          title={t("topSenderDomains")}
          description={t("topSenderDomainsDesc")}
        >
          <div className="h-[308px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topSenderDomains} layout="vertical" barSize={15}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={chartAxisStyle}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="domain"
                  tick={chartAxisStyle}
                  width={140}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Coverage audit */}
        <ChartCard
          title={t("competitorCoverageAudit")}
          description={t("competitorCoverageAuditDesc")}
        >
          <div className="space-y-2.5">
            {data.competitorCoverage.length === 0 ? (
              <EmptyBlock icon={ShieldAlert} text={t("noMonitoredCompetitors")} />
            ) : (
              data.competitorCoverage.map((item) => (
                <div key={item.competitorId} className="rounded-xl border bg-background px-4 py-3 transition-all duration-150 hover:bg-accent/20 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.competitor}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium",
                            item.hasDomains
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : "border-destructive/20 bg-destructive/10 text-destructive",
                          )}
                        >
                          {item.hasDomains ? t("domainsReady") : t("domainsMissing")}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60">
                        Last: {formatDateTime(item.latestActivityAt, t("noRecentActivity"))}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-[10px] text-muted-foreground">
                      <p>{item.newsletters} {t("newsletters").toLowerCase()}</p>
                      <p>{item.ads} {t("ads").toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{t("extractionCoverage")}</span>
                      <span className="font-semibold text-foreground/70">
                        {item.extractionCoverageRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/70">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          getCoverageBarClass(item.extractionCoverageRate),
                        )}
                        style={{ width: `${item.extractionCoverageRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      {/* ── Signal intelligence ── */}
      <SectionDivider label={t("signalIntelligence")} icon={Radar} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
        {/* Discount posture */}
        <ChartCard
          title={t("discountPosture")}
          description={t("discountPostureDesc")}
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: t("avgDiscount"), value: `${summary.averageDiscount.toFixed(1)}%` },
                { label: t("maxDiscount"), value: `${summary.maxDiscount.toFixed(0)}%` },
                { label: t("freeShipping"), value: `${summary.freeShippingRate.toFixed(1)}%` },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border bg-card px-4 py-4 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {m.label}
                  </p>
                  <p className="mt-2.5 text-2xl font-bold tabular-nums text-foreground">{m.value}</p>
                </div>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.discountDistribution} barSize={24}>
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="band"
                    tick={chartAxisStyle}
                    stroke="hsl(var(--muted-foreground))"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={chartAxisStyle}
                    stroke="hsl(var(--muted-foreground))"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>

        {/* Weekday cadence */}
        <ChartCard
          title={t("newsletterCadenceByWeekday")}
          description={t("newsletterCadenceByWeekdayDesc")}
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weekdayCadence} barSize={26}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={chartAxisStyle}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={chartAxisStyle}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Insight mix · product categories · urgency */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title={t("insightCategoryMix")}
          description={t("insightCategoryMixDesc")}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.insightCategoryDistribution.slice(0, 7)}
                layout="vertical"
                barSize={14}
              >
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ ...chartAxisStyle, fontSize: 10 }}
                  width={96}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                  {data.insightCategoryDistribution.slice(0, 7).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("productCategories")}
          description={t("productCategoriesDesc")}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryDistribution.slice(0, 6)} barSize={20}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="category"
                  tick={{ ...chartAxisStyle, fontSize: 10 }}
                  angle={-22}
                  textAnchor="end"
                  height={48}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={chartAxisStyle}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--chart-5))" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t("urgencyTactics")}
          description={t("urgencyTacticsDesc")}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.urgencyFrequency.slice(0, 6)} layout="vertical" barSize={14}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={chartAxisStyle}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="type"
                  tick={chartAxisStyle}
                  width={120}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Campaign types & CTA distribution */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Campaign types"
          description="How competitors categorize their newsletter campaigns — seasonal pushes, product launches, retention flows, and more."
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.campaignTypes.slice(0, 8)} layout="vertical" barSize={15}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="type"
                  tick={chartAxisStyle}
                  width={132}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Call-to-action distribution"
          description="CTA types extracted from competitor newsletters — reveals their primary conversion strategy and where they push customers hardest."
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ctaDistribution.slice(0, 8)} layout="vertical" barSize={15}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="cta"
                  tick={chartAxisStyle}
                  width={132}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Attribution backlog notice */}
      {summary.unattributedBacklog > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Unattributed newsletters in your inbox
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {summary.unattributedBacklog} newsletters are not yet mapped to a tracked
                  competitor. Use Inbox suggestions to create the missing competitor or re-run
                  attribution after updating domains.
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="h-fit shrink-0 border-warning/30 bg-background text-[11px] font-medium text-warning"
            >
              Inbox cleanup needed
            </Badge>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
        Analytics are generated from imported workspace data. No external estimates are injected.
      </p>
    </div>
  );
}
