import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Building2, Mail, Newspaper, Lightbulb, Target,
  AlertTriangle, Activity, BarChart3,
  RefreshCw, ArrowRight, CheckCircle, XCircle, AlertCircle,
  TrendingUp, Zap, Server, CreditCard,
  ScrollText, Plug, KeyRound, RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { AdminOverviewData } from "@/types/admin";

// ─── Health score ──────────────────────────────────────────────────────────────

function computeHealth(data: AdminOverviewData) {
  let score = 100;

  const syncErrorRate = (data.syncErrors?.length || 0) / Math.max(data.gmailConnections, 1);
  if (syncErrorRate >= 0.5) score -= 30;
  else if (syncErrorRate >= 0.2) score -= 15;
  else if (syncErrorRate > 0) score -= 5;

  const failRate = (data.failedAnalysesCount || 0) / Math.max(data.totalAnalyses, 1);
  if (failRate >= 0.3) score -= 25;
  else if (failRate >= 0.1) score -= 12;
  else if (failRate > 0) score -= 4;

  const s = Math.max(0, Math.round(score));
  return {
    score: s,
    label: s >= 90 ? "Healthy" : s >= 70 ? "Fair" : s >= 50 ? "Degraded" : "Critical",
    tone: s >= 90 ? "healthy" : s >= 70 ? "fair" : "critical",
  } as const;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
  tone?: "default" | "destructive" | "warning";
}

function KpiCard({ icon: Icon, label, value, sub, href, tone = "default" }: KpiCardProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={href ? () => navigate(href) : undefined}
      className={cn(
        "group w-full rounded-xl border bg-card p-4 text-left transition-all duration-150",
        href && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20",
        !href && "cursor-default",
        tone === "destructive" && "border-destructive/25 bg-destructive/[0.03]",
        tone === "warning" && "border-warning/25 bg-warning/[0.03]",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          tone === "destructive" ? "bg-destructive/10 text-destructive"
            : tone === "warning" ? "bg-warning/10 text-warning"
            : "bg-muted/60 text-muted-foreground",
        )}>
          <Icon className="h-4 w-4" />
        </div>
        {href && (
          <ArrowRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
        )}
      </div>
      <p className={cn(
        "text-2xl font-bold tabular-nums leading-none tracking-tight",
        tone === "destructive" ? "text-destructive"
          : tone === "warning" ? "text-warning"
          : "text-foreground",
      )}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1.5 text-xs font-medium text-foreground/70">{label}</p>
      {sub && <p className="mt-0.5 text-caption text-muted-foreground/55">{sub}</p>}
    </button>
  );
}

// ─── Quick action ─────────────────────────────────────────────────────────────

function QuickAction({ icon: Icon, label, desc, href }: {
  icon: LucideIcon;
  label: string;
  desc: string;
  href: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-all hover:border-primary/20 hover:bg-accent/40 hover:shadow-sm"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-caption text-muted-foreground/60 truncate">{desc}</p>
      </div>
      <ArrowRight className="h-3 w-3 text-muted-foreground/25 group-hover:text-primary/50 transition-colors shrink-0" />
    </button>
  );
}

// ─── Loading skeleton (inside AdminPageLayout) ─────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[88px] w-full rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useAdminData<AdminOverviewData>("overview");
  const { execute, acting } = useAdminAction();

  const health = useMemo(() => data ? computeHealth(data) : null, [data]);

  const totalIssues = useMemo(
    () => (data?.syncErrors?.length || 0) + (data?.failedAnalysesCount || 0),
    [data],
  );

  const analysisSuccessRate = useMemo(() => {
    if (!data || !data.totalAnalyses) return 100;
    const failed = data.failedAnalysesCount || 0;
    return Math.round(((data.totalAnalyses - failed) / data.totalAnalyses) * 100);
  }, [data]);

  const headerActions = (
    <>
      {totalIssues > 0 && (
        <Button
          variant="destructive"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => navigate("/admin/issues")}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {totalIssues} Issue{totalIssues > 1 ? "s" : ""}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => void refetch()}
        disabled={loading}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        Refresh
      </Button>
    </>
  );

  if (loading) {
    return (
      <AdminPageLayout
        title="Platform Overview"
        description={<Skeleton className="h-4 w-44 inline-block" />}
        actions={headerActions}
        maxWidth="max-w-[1400px]"
      >
        <DashboardSkeleton />
      </AdminPageLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminPageLayout
        title="Platform Overview"
        description="Real-time metrics"
        actions={headerActions}
        maxWidth="max-w-[1400px]"
      >
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center">
            <XCircle className="mx-auto h-8 w-8 text-destructive mb-3" />
            <p className="text-sm font-medium text-destructive">Failed to load dashboard</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      title="Platform Overview"
      description={`${format(new Date(), "EEEE, MMMM d")} · Real-time metrics`}
      actions={headerActions}
      maxWidth="max-w-[1400px]"
    >
      {/* ── Alert banner ─────────────────────────────────────────── */}
      {totalIssues > 0 && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-l-[3px] border-destructive/20 border-l-destructive bg-destructive/[0.04] px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-destructive">
                {[
                  (data.syncErrors?.length || 0) > 0 && `${data.syncErrors.length} Gmail sync error${data.syncErrors.length > 1 ? "s" : ""}`,
                  (data.failedAnalysesCount || 0) > 0 && `${data.failedAnalysesCount} failed analysis job${data.failedAnalysesCount > 1 ? "s" : ""}`,
                ].filter(Boolean).join(" · ")}
              </p>
              <p className="text-xs text-destructive/70">These issues require immediate attention.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
            onClick={() => navigate("/admin/issues")}
          >
            Investigate <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ── Health + summary bar ──────────────────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Health score */}
            <div className="flex items-center gap-4 min-w-[200px]">
              <div className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-black tabular-nums",
                health?.tone === "healthy" ? "bg-success/10 text-success"
                  : health?.tone === "fair" ? "bg-warning/10 text-warning"
                  : "bg-destructive/10 text-destructive",
              )}>
                {health?.score}
              </div>
              <div className="flex-1 min-w-[110px]">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-foreground">Platform Health</p>
                  <span className={cn(
                    "text-caption font-semibold",
                    health?.tone === "healthy" ? "text-success"
                      : health?.tone === "fair" ? "text-warning"
                      : "text-destructive",
                  )}>
                    {health?.label}
                  </span>
                </div>
                <Progress
                  value={health?.score}
                  className={cn(
                    "h-1.5",
                    health?.tone === "healthy" && "[&>div]:bg-success",
                    health?.tone === "fair" && "[&>div]:bg-warning",
                    health?.tone === "critical" && "[&>div]:bg-destructive",
                  )}
                />
              </div>
            </div>

            <Separator orientation="vertical" className="h-10 hidden sm:block" />

            {/* Key stats */}
            <div className="flex items-center gap-6 flex-wrap flex-1">
              {[
                { label: "Total Users", value: data.totalUsers.toLocaleString() },
                { label: "Active Workspaces", value: (data.activeWorkspaces || 0).toLocaleString() },
                { label: "New This Week", value: data.recentSignups.toLocaleString() },
                { label: "Analysis Success", value: `${analysisSuccessRate}%` },
                { label: "Today's Signups", value: (data.newUsersToday || 0).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="text-center min-w-[72px]">
                  <p className="text-lg font-bold tabular-nums leading-none text-foreground">{value}</p>
                  <p className="text-caption text-muted-foreground mt-1 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI grid — 8 cards, 2×4 ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={Users}
          label="Total Users"
          value={data.totalUsers}
          sub={`${data.newUsersToday || 0} joined today`}
          href="/admin/users"
        />
        <KpiCard
          icon={Building2}
          label="Workspaces"
          value={data.totalWorkspaces}
          sub={`${data.activeWorkspaces || 0} active (30d)`}
          href="/admin/workspaces"
        />
        <KpiCard
          icon={Mail}
          label="Gmail Connections"
          value={data.gmailConnections}
          sub={data.syncErrors?.length ? `${data.syncErrors.length} with errors` : "All healthy"}
          tone={data.syncErrors?.length ? "destructive" : "default"}
          href="/admin/integrations"
        />
        <KpiCard
          icon={Newspaper}
          label="Newsletters"
          value={data.totalNewsletters}
          sub="Ingested total"
        />
        <KpiCard
          icon={Target}
          label="Competitors"
          value={data.totalCompetitors}
          sub="Monitored"
        />
        <KpiCard
          icon={BarChart3}
          label="Total Analyses"
          value={data.totalAnalyses}
          sub="Jobs completed"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Failed Analyses"
          value={data.failedAnalysesCount || 0}
          sub={`${100 - analysisSuccessRate}% failure rate`}
          tone={(data.failedAnalysesCount || 0) > 0 ? "warning" : "default"}
          href="/admin/issues"
        />
        <KpiCard
          icon={Activity}
          label="Rate Limit Hits"
          value={data.rateLimitHits}
          sub="API calls logged"
          tone={(data.rateLimitHits || 0) > 100 ? "warning" : "default"}
          href="/admin/integrations"
        />
      </div>

      {/* ── Trend + activity ─────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* 7-day signup trend */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">User Signups — Last 7 Days</CardTitle>
              <Badge variant="secondary" className="text-caption">{data.recentSignups} this week</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {data.signupTrend && data.signupTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.signupTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => format(parseISO(v), "d MMM")}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      boxShadow: "0 4px 12px hsl(var(--foreground) / 0.08)",
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 2 }}
                    labelFormatter={(v: string) => format(parseISO(v), "EEEE, MMM d")}
                    cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Signups"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#signupGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--card))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center rounded-lg bg-muted/20 border border-dashed">
                <p className="text-xs text-muted-foreground">No signup data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-caption gap-1 text-muted-foreground" onClick={() => navigate("/admin/logs")}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5 max-h-[215px] overflow-y-auto">
            {(!data.recentActivity || data.recentActivity.length === 0) ? (
              <div className="py-8 text-center">
                <Activity className="mx-auto h-5 w-5 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              data.recentActivity.map((log) => {
                const isAdmin = log.action?.startsWith("admin.");
                return (
                  <div key={log.id} className="flex items-start justify-between gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-muted/40 transition-colors">
                    <span className={cn(
                      "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full",
                      isAdmin ? "bg-primary" : "bg-muted-foreground/40",
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-mono text-foreground/80 truncate leading-snug">
                        {log.action}
                      </p>
                      {log.entity_type && (
                        <p className="text-caption text-muted-foreground/55 truncate">
                          {log.entity_type}
                          {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ""}
                        </p>
                      )}
                    </div>
                    <span className="text-caption text-muted-foreground/50 shrink-0 tabular-nums">
                      {format(new Date(log.created_at), "HH:mm")}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Gmail sync errors ────────────────────────────────────── */}
      {(data.syncErrors?.length || 0) > 0 && (
        <Card className="border-destructive/25">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Gmail Sync Errors
                <Badge variant="destructive" className="text-caption">{data.syncErrors.length}</Badge>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={() => navigate("/admin/issues")}
              >
                Manage Issues <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.syncErrors.slice(0, 3).map((conn) => (
                <div key={conn.id} className="flex items-start justify-between gap-3 rounded-lg border border-destructive/15 bg-destructive/[0.04] px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-nav font-medium text-foreground">{conn.email_address}</span>
                      <Badge variant="destructive" className="text-caption">{conn.sync_status}</Badge>
                    </div>
                    {conn.sync_error && (
                      <p className="text-caption font-mono text-destructive/75 line-clamp-1">{conn.sync_error}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-caption gap-1 shrink-0"
                    disabled={acting}
                    onClick={async () => {
                      await execute("force_resync", { connection_id: conn.id });
                      void refetch();
                    }}
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Retry
                  </Button>
                </div>
              ))}
              {data.syncErrors.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{data.syncErrors.length - 3} more —{" "}
                  <button className="text-primary hover:underline" onClick={() => navigate("/admin/issues")}>
                    view all
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick actions ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-3.5 w-3.5 text-muted-foreground/60" />
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">Quick Actions</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <QuickAction icon={Users} label="Users" desc="View and moderate" href="/admin/users" />
          <QuickAction icon={Building2} label="Workspaces" desc="Inspect and manage" href="/admin/workspaces" />
          <QuickAction icon={AlertTriangle} label="Issues" desc="Triage incidents" href="/admin/issues" />
          <QuickAction icon={Plug} label="Integrations" desc="Connection health" href="/admin/integrations" />
          <QuickAction icon={CreditCard} label="Billing" desc="Plans & subscriptions" href="/admin/billing" />
          <QuickAction icon={ScrollText} label="Audit Logs" desc="Platform activity" href="/admin/logs" />
        </div>
      </section>

    </AdminPageLayout>
  );
}
