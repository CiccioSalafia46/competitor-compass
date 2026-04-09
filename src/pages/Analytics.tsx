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
  fontSize: 11,
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  boxShadow: "var(--shadow-md)",
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

function getPriorityBadgeClass(priority: "high" | "medium" | "low") {
  if (priority === "high") return "border-destructive/20 bg-destructive/10 text-destructive";
  if (priority === "medium") return "border-warning/30 bg-warning/10 text-warning";
  return "border-primary/20 bg-primary/10 text-primary";
}

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
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b bg-muted/20 px-5 py-3.5">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
          {description && (
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0 text-muted-foreground mt-0.5">{action}</div>}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="border">
              <CardContent className="p-4">
                <Skeleton className="h-28 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card className="border">
          <CardContent className="py-16 text-center">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium">Analytics unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error || "Select a workspace and import some signals to unlock analytics."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary } = data;
  const totalAttributedBase = summary.attributedNewslettersInRange + summary.unattributedNewslettersInRange;
  const attributionRate = totalAttributedBase > 0
    ? (summary.attributedNewslettersInRange / totalAttributedBase) * 100
    : 0;
  const hasSignals =
    summary.totalNewslettersInRange > 0 ||
    summary.totalAdsInRange > 0 ||
    summary.totalInsightsInRange > 0 ||
    data.recentSignals.length > 0;

  return (
    <div className="max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="page-header gap-4">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-description">
            Audit competitive pressure, data quality, execution coverage, and the actions your team should take next.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={rangeDays} onValueChange={setRangeDays}>
              <SelectTrigger className="w-[148px] bg-background">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 180 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void refetch()} className="gap-2">
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3 text-right shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Latest ingestion</p>
            <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(summary.lastGmailSyncAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Window: {formatRangeLabel(summary.rangeDays)}. Based on the most recent Gmail sync for this workspace.
            </p>
          </div>
        </div>
      </div>

      {!hasSignals && (
        <Card className="border">
          <CardContent className="py-16 text-center">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium">Not enough data yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Import competitor newsletters or ads first. Once signals are flowing, this page will surface pressure, coverage gaps, attribution issues, and operational priorities.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Newsletters"
          value={String(summary.totalNewslettersInRange)}
          subtitle={`Tracked in ${formatRangeLabel(summary.rangeDays).toLowerCase()}. Last inbox activity: ${formatDateTime(summary.lastInboxActivity)}`}
          icon={Inbox}
          trend={summary.newsletterGrowthRate}
        />
        <StatCard
          label="Meta ads"
          value={String(summary.totalAdsInRange)}
          subtitle={`Tracked in ${formatRangeLabel(summary.rangeDays).toLowerCase()}. Last ad activity: ${formatDateTime(summary.lastAdActivity)}`}
          icon={Megaphone}
          trend={summary.adGrowthRate}
        />
        <StatCard
          label="Competitors active"
          value={`${summary.activeCompetitorsInRange}/${summary.totalCompetitors}`}
          subtitle={`Tracked competitors with newsletter or ad activity in ${formatRangeLabel(summary.rangeDays).toLowerCase()}.`}
          icon={Users}
          tone="positive"
        />
        <StatCard
          label="Attribution coverage"
          value={formatPercent(attributionRate)}
          subtitle={`${summary.attributedNewslettersInRange} matched newsletters in-range. Backlog still open: ${summary.unattributedBacklog}.`}
          icon={MailSearch}
          tone={summary.unattributedBacklog > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Promo pressure"
          value={formatPercent(summary.promotionRate)}
          subtitle={`Average detected discount ${summary.averageDiscount.toFixed(1)}%, max observed ${summary.maxDiscount.toFixed(0)}%.`}
          icon={Activity}
        />
        <StatCard
          label="AI insights"
          value={String(summary.totalInsightsInRange)}
          subtitle={`${formatPercent(summary.urgencyRate)} of extracted newsletter campaigns used urgency tactics.`}
          icon={Lightbulb}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr,1fr]">
        <ChartCard
          title="Action queue"
          description="High-value next steps derived from data freshness, coverage gaps, competitor pressure, and promo intensity."
          action={<CircleAlert className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="space-y-3">
            {actionQueue.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No urgent actions detected. Keep importing signals to maintain visibility.
              </div>
            ) : (
              <div className="space-y-2">
                {actionQueue.map((action) => (
                  <div
                    key={action.title}
                    className="rounded-lg border bg-card px-4 py-3 transition-shadow hover:shadow-sm"
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
                      <Button asChild size="sm" variant="outline" className="shrink-0 text-xs h-7">
                        <Link to={action.path}>{action.cta}</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Data health audit"
          description="This tells you whether the analytics layer is trustworthy enough for decisions or still needs cleanup."
          action={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="space-y-2.5">
            {healthAudit.map((item) => (
              <div key={item.label} className="space-y-2 rounded-lg border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-snug text-foreground">{item.label}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wide", getHealthBadgeClass(item.status))}
                  >
                    {item.value}
                  </Badge>
                </div>
                <Progress value={item.progress} className="h-1.5" />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,1fr]">
        <ChartCard
          title="Share of monitored activity"
          description="Which competitors currently own the largest share of observed newsletter and ad activity."
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.shareOfVoice} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="competitor"
                  tick={{ fontSize: 10 }}
                  width={132}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Share of signal"]}
                />
                <Bar dataKey="signalShare" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Detected anomalies"
          description="Behavior that materially departs from the recent baseline and deserves immediate review."
          action={<Radar className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="space-y-3">
            {anomalies.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No sharp anomalies detected in the current window.
              </div>
            ) : (
              anomalies.map((anomaly) => (
                <div key={anomaly.title} className="rounded-xl border px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{anomaly.title}</p>
                    <Badge variant="outline" className={cn("text-[10px] font-medium capitalize", getPriorityBadgeClass(anomaly.severity))}>
                      {anomaly.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{anomaly.detail}</p>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.8fr,1fr]">
        <ChartCard
          title="Competitive activity by week"
          description="Use this to spot bursts in competitor campaigns, ad pushes, and insight generation over the last 12 weeks."
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="newsletters" name="Newsletters" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ads" name="Ads" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="insights" name="Insights" stroke="hsl(var(--chart-5))" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Attribution health"
          description="Inbox coverage quality. Unassigned newsletters usually indicate a missing or incomplete competitor record."
        >
          <div className="flex h-80 flex-col justify-between gap-4">
            <div className="h-48">
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
                        fill={index === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-4))"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Matched</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{summary.attributedNewslettersInRange}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Needs review</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{summary.unattributedNewslettersInRange}</p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr,1fr]">
        <ChartCard
          title="Competitor pressure ranking"
          description="Weighted view of newsletter volume, ad activity, and promotions. High scores are where the market is pushing hardest."
        >
          <div className="space-y-3">
            {data.competitorPressure.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No competitor pressure data yet.
              </div>
            ) : (
              data.competitorPressure.map((item) => {
                const maxPressure = data.competitorPressure[0]?.pressureScore || 1;
                const width = `${Math.max((item.pressureScore / maxPressure) * 100, 8)}%`;
                return (
                  <div key={item.competitorId} className="rounded-xl border bg-card px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{item.competitor}</p>
                          <Badge variant="outline" className="text-[10px] font-medium">
                            Score {item.pressureScore.toFixed(1)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last activity {formatDateTime(item.latestActivityAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{item.newsletters} newsletters</span>
                        <span>{item.ads} ads</span>
                        <span>{item.promos} promos</span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Recent signals"
          description="Most recent newsletter, ad, and insight events that should shape today's decisions."
          action={<Radar className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="space-y-3">
            {data.recentSignals.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No recent signals yet.
              </div>
            ) : (
              data.recentSignals.map((signal, index) => (
                <div key={`${signal.sourceType}-${signal.happenedAt}-${index}`} className="rounded-xl border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {signalLabel(signal.sourceType)}
                        </Badge>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{signal.competitor}</p>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">{signal.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.summary}</p>
                    </div>
                    <p className="shrink-0 text-[11px] text-muted-foreground">{formatDateTime(signal.happenedAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr,1fr]">
        <ChartCard
          title="Top sender domains"
          description="The sender domains carrying the most newsletter volume. This is the fastest way to spot attribution cleanup opportunities."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topSenderDomains} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="domain" tick={{ fontSize: 10 }} width={140} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Competitor coverage audit"
          description="Monitored competitors that still need domain setup, fresh signals, or more AI extraction depth."
        >
          <div className="space-y-3">
            {data.competitorCoverage.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No monitored competitors yet.
              </div>
            ) : (
              data.competitorCoverage.map((item) => (
                <div key={item.competitorId} className="rounded-xl border px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last activity {formatDateTime(item.latestActivityAt)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{item.newsletters} newsletters</p>
                      <p>{item.ads} ads</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Inbox extraction coverage</span>
                      <span>{item.extractionCoverageRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={item.extractionCoverageRate} className="h-2.5" />
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
        <ChartCard
          title="Discount posture"
          description="How aggressive the observed offer mechanics are, and how they are distributed across recent campaigns."
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Avg discount</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{summary.averageDiscount.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg border bg-muted/30 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Max discount</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{summary.maxDiscount.toFixed(0)}%</p>
              </div>
              <div className="rounded-lg border bg-muted/30 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Free shipping</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{summary.freeShippingRate.toFixed(1)}%</p>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.discountDistribution} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="band" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Newsletter cadence by weekday"
          description="Use cadence concentration to infer campaign send rhythm and likely planning windows."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weekdayCadence} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Insight category mix" description="Which strategic themes the current AI layer is surfacing most often.">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.insightCategoryDistribution}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={74}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  style={{ fontSize: 9 }}
                >
                  {data.insightCategoryDistribution.map((item, index) => (
                    <Cell key={item.category} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Product categories" description="The categories most often mentioned across competitor newsletter analysis.">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryDistribution.slice(0, 6)} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 9 }} angle={-22} textAnchor="end" height={48} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Urgency tactics" description="Which urgency signals appear most often in extracted newsletter campaigns.">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.urgencyFrequency.slice(0, 6)} layout="vertical" barSize={13}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} width={120} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {summary.unattributedBacklog > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">You still have unattributed competitor newsletters</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {summary.unattributedBacklog} newsletters are already in the inbox but still not mapped to a tracked competitor. Use Inbox suggestions to create the missing competitor or re-run attribution after updating domains.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="h-fit border-warning/30 bg-background text-[11px] font-medium text-warning">
              Inbox cleanup needed
            </Badge>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
        Analytics are generated from imported workspace data. No external estimates are injected into these charts.
      </p>
    </div>
  );
}
