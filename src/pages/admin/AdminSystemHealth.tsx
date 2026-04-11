import { useAdminData } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle, XCircle, AlertTriangle, HelpCircle, RefreshCw,
  Activity, Mail, BarChart3, ShieldAlert, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminSystemHealthResponse, AdminHealthCheck } from "@/types/admin";

const STATUS_CONFIG = {
  healthy: {
    label: "Healthy",
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    cardBg: "bg-success/[0.04] border-success/15",
    bar: "bg-success",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    cardBg: "bg-warning/[0.04] border-warning/15",
    bar: "bg-warning",
  },
  critical: {
    label: "Critical",
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    cardBg: "bg-destructive/[0.04] border-destructive/15",
    bar: "bg-destructive",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    cardBg: "bg-muted/30 border-border",
    bar: "bg-muted-foreground/40",
  },
} as const;

function healthLabel(score: number): { text: string; color: string } {
  if (score >= 90) return { text: "Excellent", color: "text-success" };
  if (score >= 75) return { text: "Good", color: "text-success" };
  if (score >= 50) return { text: "Degraded", color: "text-warning" };
  return { text: "Critical", color: "text-destructive" };
}

function CheckCard({ check }: { check: AdminHealthCheck }) {
  const cfg = STATUS_CONFIG[check.status];
  const Icon = cfg.icon;
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4", cfg.cardBg)}>
      <div className={cn("rounded-lg p-1.5 shrink-0", cfg.bg)}>
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-foreground">{check.name}</p>
          {check.value != null && (
            <span className={cn("tabular-nums text-xs font-mono font-medium", cfg.color)}>
              {check.value}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{check.message}</p>
      </div>
    </div>
  );
}

function StatStrip({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "ok" | "warn" | "bad" | "neutral";
}) {
  const valueCls = {
    ok: "text-success",
    warn: "text-warning",
    bad: "text-destructive",
    neutral: "text-foreground",
  }[tone ?? "neutral"];

  const iconBg = {
    ok: "bg-success/10",
    warn: "bg-warning/10",
    bad: "bg-destructive/10",
    neutral: "bg-muted/60",
  }[tone ?? "neutral"];

  const iconCls = {
    ok: "text-success",
    warn: "text-warning",
    bad: "text-destructive",
    neutral: "text-muted-foreground",
  }[tone ?? "neutral"];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-lg p-2 shrink-0", iconBg)}>
            <Icon className={cn("h-4 w-4", iconCls)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">{label}</p>
            <p className={cn("mt-1 text-2xl font-bold tabular-nums", valueCls)}>{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-muted-foreground/70">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div className="space-y-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    </div>
  );
}

export default function AdminSystemHealth() {
  const { data, loading, error, refetch } = useAdminData<AdminSystemHealthResponse>("system_health");

  if (loading) return <HealthSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const score = data?.overallScore ?? 0;
  const checks = data?.checks ?? [];
  const { text: scoreLabel, color: scoreLabelColor } = healthLabel(score);

  const gmailHealthPct = data?.gmailHealthPct ?? 100;
  const analysisSuccessRate = data?.analysisSuccessRate ?? 100;
  const recentErrorCount = data?.recentErrorCount ?? 0;
  const expiredTokenCount = data?.expiredTokenCount ?? 0;

  // Split checks by status for a summary
  const criticalChecks = checks.filter((c) => c.status === "critical");
  const warningChecks = checks.filter((c) => c.status === "warning");

  // Score progress color
  const progressColor = score >= 75 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-destructive";

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">System Health</h1>
          <p className="page-description">Real-time platform diagnostics and integration status</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Overall score card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Score circle */}
            <div className="flex flex-col items-center shrink-0">
              <div className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full border-4 text-2xl font-bold tabular-nums",
                score >= 90 ? "border-success/50 bg-success/10 text-success" :
                score >= 50 ? "border-warning/50 bg-warning/10 text-warning" :
                "border-destructive/50 bg-destructive/10 text-destructive",
              )}>
                {score}
              </div>
              <p className={cn("mt-1.5 text-xs font-semibold", scoreLabelColor)}>{scoreLabel}</p>
            </div>

            {/* Progress + summary */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Health score</span>
                  <span className="tabular-nums">{score}/100</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor)}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>

              {criticalChecks.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/[0.06] px-3 py-1.5">
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">
                    {criticalChecks.length} critical issue{criticalChecks.length > 1 ? "s" : ""} require attention
                  </p>
                </div>
              )}
              {criticalChecks.length === 0 && warningChecks.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-md border border-warning/20 bg-warning/[0.06] px-3 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                  <p className="text-xs text-warning">
                    {warningChecks.length} warning{warningChecks.length > 1 ? "s" : ""} detected
                  </p>
                </div>
              )}
              {criticalChecks.length === 0 && warningChecks.length === 0 && (
                <div className="flex items-center gap-1.5 rounded-md border border-success/20 bg-success/[0.06] px-3 py-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                  <p className="text-xs text-success">All systems operating normally</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metric strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatStrip
          icon={Mail}
          label="Gmail Health"
          value={`${gmailHealthPct}%`}
          sub="connections without errors"
          tone={gmailHealthPct >= 90 ? "ok" : gmailHealthPct >= 70 ? "warn" : "bad"}
        />
        <StatStrip
          icon={BarChart3}
          label="Analysis Rate"
          value={`${analysisSuccessRate}%`}
          sub="analyses succeeded"
          tone={analysisSuccessRate >= 90 ? "ok" : analysisSuccessRate >= 70 ? "warn" : "bad"}
        />
        <StatStrip
          icon={ShieldAlert}
          label="Recent Errors"
          value={recentErrorCount}
          sub="last 24 hours"
          tone={recentErrorCount === 0 ? "ok" : recentErrorCount < 10 ? "warn" : "bad"}
        />
        <StatStrip
          icon={Clock}
          label="Expired Tokens"
          value={expiredTokenCount}
          sub="Gmail OAuth tokens"
          tone={expiredTokenCount === 0 ? "ok" : expiredTokenCount < 5 ? "warn" : "bad"}
        />
      </div>

      {/* Health checks grid */}
      {checks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            Health Checks
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {checks.map((check, i) => (
              <CheckCard key={i} check={check} />
            ))}
          </div>
        </section>
      )}

      {checks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No health check data available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
