import { useMemo, useState } from "react";
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

function formatDateTime(value: string | null) {
  if (!value) return "No recent activity";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function signalLabel(sourceType: "newsletter" | "meta_ad" | "insight") {
  if (sourceType === "newsletter") return "Newsletter";
  if (sourceType === "meta_ad") return "Meta ad";
  return "Insight";
}

function formatRangeLabel(days: number) {
  return `Last ${days} days`;
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

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="h-4 w-[3px] shrink-0 rounded-full bg-primary/50" />
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
          <p className="text-sm font-semibold text-foreground">Analytics unavailable</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {error || "Select a workspace and import some signals to unlock analytics."}
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
          <h1 className="page-title">Analytics</h1>
          <p className="page-description">
            Competitive pressure, data quality, coverage gaps, and operational priorities — all from your imported signals.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex items-center gap-1.5">
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="h-8 w-[148px] bg-background text-xs font-medium">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 180 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={() => void refetch()}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/70 sm:text-right">
            Synced{" "}
            <span className="font-medium text-foreground/80">
              {formatDateTime(summary.lastGmailSyncAt)}
            </span>
            {" · "}
            {formatRangeLabel(summary.rangeDays)} window
          </p>
        </div>
      </div>

      {!hasSignals && (
        <div className="rounded-xl border bg-card px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
            <TrendingUp className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-foreground">Not enough data yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Import competitor newsletters or ads first. Once signals are flowing, this page will
            surface pressure, coverage gaps, attribution issues, and operational priorities.
          </p>
        </div>
      )}

      {/* ── KPI summary ── */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Newsletters"
          value={String(summary.totalNewslettersInRange)}
          subtitle={`In ${formatRangeLabel(summary.rangeDays).toLowerCase()} · Last: ${formatDateTime(summary.lastInboxActivity)}`}
          icon={Inbox}
          trend={summary.newsletterGrowthRate}
        />
        <StatCard
          label="Meta ads"
          value={String(summary.totalAdsInRange)}
          subtitle={`In ${formatRangeLabel(summary.rangeDays).toLowerCase()} · Last: ${formatDateTime(summary.lastAdActivity)}`}
          icon={Megaphone}
          trend={summary.adGrowthRate}
        />
        <StatCard
          label="Competitors active"
          value={`${summary.activeCompetitorsInRange}/${summary.totalCompetitors}`}
          subtitle={`With newsletter or ad activity in ${formatRangeLabel(summary.rangeDays).toLowerCase()}`}
          icon={Users}
          tone="positive"
        />
        <StatCard
          label="Attribution coverage"
          value={formatPercent(attributionRate)}
          subtitle={`${summary.attributedNewslettersInRange} matched · ${summary.unattributedBacklog} in backlog`}
          icon={MailSearch}
          tone={summary.unattributedBacklog > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Promo pressure"
          value={formatPercent(summary.promotionRate)}
          subtitle={`Avg discount ${summary.averageDiscount.toFixed(1)}% · Max ${summary.maxDiscount.toFixed(0)}%`}
          icon={Activity}
        />
        <StatCard
          label="AI insights"
          value={String(summary.totalInsightsInRange)}
          subtitle={`${formatPercent(summary.urgencyRate)} of campaigns used urgency tactics`}
          icon={Lightbulb}
        />
      </div>

      {/* ── Operational priorities ── */}
      <SectionDivider label="Operational priorities" />

      <div className="grid gap-4 xl:grid-cols-[1.25fr,1fr]">
        {/* Action queue */}
        <ChartCard
          title="Action queue"
          description="High-value next steps from data freshness, coverage gaps, competitor pressure, and promo intensity."
        >
          <div className="space-y-2">
            {actionQueue.length === 0 ? (
              <EmptyBlock
                icon={CircleAlert}
                text="No urgent actions detected. Keep importing signals to maintain visibility."
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
          title="Data health audit"
          description="Whether the analytics layer is trustworthy enough for decisions or still needs cleanup."
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
      <SectionDivider label="Market pressure" />

      <div className="grid gap-4 xl:grid-cols-[1.15fr,1fr]">
        {/* Share of voice */}
        <ChartCard
          title="Share of monitored activity"
          description="Which competitors own the largest share of observed newsletter and ad signals."
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
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Signal share"]}
                />
                <Bar dataKey="signalShare" fill="hsl(var(--chart-2))" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Anomalies */}
        <ChartCard
          title="Detected anomalies"
          description="Behavior that materially departs from the recent baseline and deserves immediate review."
          action={<Radar className="h-4 w-4" />}
        >
          <div className="space-y-2.5">
            {anomalies.length === 0 ? (
              <EmptyBlock
                icon={Radar}
                text="No sharp anomalies detected in the current window."
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

      <div className="grid gap-4 xl:grid-cols-[1.8fr,1fr]">
        {/* Weekly activity */}
        <ChartCard
          title="Competitive activity by week"
          description="Spot bursts in competitor campaigns, ad pushes, and insight generation over the last 12 weeks."
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
                  name="Newsletters"
                  fill="hsl(var(--chart-1))"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="ads"
                  name="Ads"
                  fill="hsl(var(--chart-2))"
                  radius={[5, 5, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="insights"
                  name="Insights"
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
          title="Attribution health"
          description="Inbox coverage quality. Unassigned newsletters indicate a missing or incomplete competitor record."
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
                  Matched
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                  {summary.attributedNewslettersInRange}
                </p>
              </div>
              <div className="rounded-xl border bg-card px-4 py-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Needs review
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
      <SectionDivider label="Competitive pressure" />

      <div className="grid gap-4 xl:grid-cols-[1.35fr,1fr]">
        {/* Pressure ranking */}
        <ChartCard
          title="Competitor pressure ranking"
          description="Weighted by newsletter volume, ad activity, and promotions. High scores signal where the market is pushing hardest."
        >
          <div className="space-y-2.5">
            {data.competitorPressure.length === 0 ? (
              <EmptyBlock icon={Users} text="No competitor pressure data yet." />
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
                          Last activity {formatDateTime(item.latestActivityAt)}
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
          title="Recent signals"
          description="Latest newsletter, ad, and insight events that should shape today's decisions."
        >
          <div className="space-y-2.5">
            {data.recentSignals.length === 0 ? (
              <EmptyBlock icon={Radar} text="No recent signals yet." />
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
                        {signalLabel(signal.sourceType)}
                      </Badge>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                        {signal.competitor}
                      </span>
                    </div>
                    <p className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground/60">
                      {formatDateTime(signal.happenedAt)}
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
      <SectionDivider label="Coverage & quality" />

      <div className="grid gap-4 xl:grid-cols-[1.05fr,1fr]">
        {/* Top sender domains */}
        <ChartCard
          title="Top sender domains"
          description="Domains carrying the most newsletter volume — the fastest way to spot attribution cleanup opportunities."
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
          title="Competitor coverage audit"
          description="Competitors that still need domain setup, fresh signals, or more AI extraction depth."
        >
          <div className="space-y-2.5">
            {data.competitorCoverage.length === 0 ? (
              <EmptyBlock icon={ShieldAlert} text="No monitored competitors yet." />
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
                          {item.hasDomains ? "Domains ready" : "Domains missing"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60">
                        Last: {formatDateTime(item.latestActivityAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-[10px] text-muted-foreground">
                      <p>{item.newsletters} newsletters</p>
                      <p>{item.ads} ads</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Extraction coverage</span>
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
      <SectionDivider label="Signal intelligence" />

      <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
        {/* Discount posture */}
        <ChartCard
          title="Discount posture"
          description="How aggressive the observed offer mechanics are, and how they distribute across recent campaigns."
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Avg discount", value: `${summary.averageDiscount.toFixed(1)}%` },
                { label: "Max discount", value: `${summary.maxDiscount.toFixed(0)}%` },
                { label: "Free shipping", value: `${summary.freeShippingRate.toFixed(1)}%` },
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
          title="Newsletter cadence by weekday"
          description="Cadence concentration reveals competitor campaign send rhythm and likely planning windows."
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

      {/* Bottom three */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Insight category mix"
          description="Which strategic themes the AI layer is surfacing most often."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.insightCategoryDistribution}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="44%"
                  innerRadius={38}
                  outerRadius={68}
                  paddingAngle={2}
                >
                  {data.insightCategoryDistribution.map((item, index) => (
                    <Cell key={item.category} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} iconType="circle" iconSize={7} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Product categories"
          description="Categories most often mentioned across competitor newsletter analysis."
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
          title="Urgency tactics"
          description="Which urgency signals appear most often in extracted newsletter campaigns."
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
