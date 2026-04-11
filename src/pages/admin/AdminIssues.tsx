import { useState } from "react";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  AlertTriangle, RefreshCw, Mail, BarChart3, CheckCircle2,
  Flame, AlertCircle, Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  AdminIssuesResponse, AdminGmailConnection, AdminAnalysisIssue, IssueSeverity,
} from "@/types/admin";

type CategoryFilter = "all" | "gmail_sync" | "analysis_failure";

function getGmailSeverity(conn: AdminGmailConnection): IssueSeverity {
  const err = (conn.sync_error ?? "").toLowerCase();
  if (
    err.includes("unauthorized") || err.includes("invalid_grant") ||
    err.includes("expired") || err.includes("401") || err.includes("403")
  ) return "critical";
  if (err.includes("rate") || err.includes("429")) return "high";
  return "high";
}

function getAnalysisSeverity(_: AdminAnalysisIssue): IssueSeverity {
  return "high";
}

const SEVERITY_CONFIG: Record<IssueSeverity, {
  label: string;
  barColor: string;
  chipClass: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  critical: {
    label: "Critical",
    barColor: "bg-destructive",
    chipClass: "bg-destructive/10 text-destructive border-destructive/20",
    icon: Flame,
  },
  high: {
    label: "High",
    barColor: "bg-orange-500",
    chipClass: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    icon: AlertCircle,
  },
  medium: {
    label: "Medium",
    barColor: "bg-yellow-500",
    chipClass: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    icon: AlertTriangle,
  },
  low: {
    label: "Low",
    barColor: "bg-muted-foreground",
    chipClass: "bg-muted/50 text-muted-foreground border-muted",
    icon: Info,
  },
};

function SeverityChip({ severity }: { severity: IssueSeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
      cfg.chipClass,
    )}>
      <cfg.icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function IssueCard({
  severity,
  icon: Icon,
  title,
  category,
  statusLabel,
  error,
  meta,
  action,
}: {
  severity: IssueSeverity;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  category: string;
  statusLabel: string;
  error?: string | null;
  meta: { label: string; value: string }[];
  action?: React.ReactNode;
}) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <div className="flex gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-border/80">
      <div className={cn("w-[3px] self-stretch rounded-full shrink-0", cfg.barColor)} />
      <div className="min-w-0 flex-1 space-y-2">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[13px] font-medium text-foreground">{title}</span>
            <SeverityChip severity={severity} />
            <Badge variant="secondary" className="text-[10px]">{category}</Badge>
            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
              {statusLabel}
            </Badge>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {/* Error message */}
        {error && (
          <p className="break-all rounded border border-destructive/10 bg-destructive/5 px-2.5 py-1.5 font-mono text-xs text-destructive">
            {error}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
          {meta.map(({ label, value }) => (
            <span key={label}>
              {label}: <span className="font-mono text-[10px]">{value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function IssuesSkeleton() {
  return (
    <div className="space-y-4 p-6 max-w-5xl">
      <div className="space-y-1">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-24" />)}
      </div>
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
    </div>
  );
}

export default function AdminIssues() {
  const { data, loading, error, refetch } = useAdminData<AdminIssuesResponse>("issues");
  const { execute, acting } = useAdminAction();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | IssueSeverity>("all");

  async function handleResync(connectionId: string) {
    try {
      await execute("force_resync", { connection_id: connectionId });
      toast.success("Sync state reset — next cycle will do a full re-import");
      refetch();
    } catch {
      // Error toast already handled by useAdminAction.
    }
  }

  if (loading) return <IssuesSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const syncErrors = data?.syncErrors ?? [];
  const failedAnalyses = data?.failedAnalyses ?? [];
  const totalIssues = syncErrors.length + failedAnalyses.length;

  // Severity counts for summary
  const criticalCount = syncErrors.filter((c) => getGmailSeverity(c) === "critical").length;
  const highCount =
    syncErrors.filter((c) => getGmailSeverity(c) === "high").length +
    failedAnalyses.filter((a) => getAnalysisSeverity(a) === "high").length;

  // Apply filters
  const showGmail = categoryFilter === "all" || categoryFilter === "gmail_sync";
  const showAnalysis = categoryFilter === "all" || categoryFilter === "analysis_failure";

  const filteredSync = showGmail
    ? syncErrors.filter(
        (c) => severityFilter === "all" || getGmailSeverity(c) === severityFilter,
      )
    : [];

  const filteredAnalysis = showAnalysis
    ? failedAnalyses.filter(
        (a) => severityFilter === "all" || getAnalysisSeverity(a) === severityFilter,
      )
    : [];

  const filteredTotal = filteredSync.length + filteredAnalysis.length;

  return (
    <div className="space-y-5 p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Issues & Incidents</h1>
          <p className="page-description">
            {totalIssues === 0 ? (
              "No active issues"
            ) : (
              <>
                <span className="font-semibold text-foreground">{totalIssues}</span> active
                {criticalCount > 0 && (
                  <> — <span className="font-medium text-destructive">{criticalCount} critical</span></>
                )}
                {highCount > 0 && (
                  <>, <span className="font-medium text-orange-500">{highCount} high</span></>
                )}
              </>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Severity summary pills */}
      {totalIssues > 0 && (
        <div className="flex flex-wrap gap-2">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              <Flame className="h-3 w-3" />
              {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-500">
              <AlertCircle className="h-3 w-3" />
              {highCount} High
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
            {syncErrors.length} sync errors · {failedAnalyses.length} analysis failures
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category filter */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
          {(
            [
              { value: "all", label: "All categories" },
              { value: "gmail_sync", label: "Gmail Sync" },
              { value: "analysis_failure", label: "Analyses" },
            ] as { value: CategoryFilter; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategoryFilter(value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                categoryFilter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
          {(
            [
              { value: "all", label: "Any severity" },
              { value: "critical", label: "Critical" },
              { value: "high", label: "High" },
            ] as { value: "all" | IssueSeverity; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSeverityFilter(value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                severityFilter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state — all clear */}
      {totalIssues === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary/60" />
            <p className="text-sm font-medium text-foreground">All systems operational</p>
            <p className="mt-1 text-xs text-muted-foreground">No active issues detected.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state — filtered */}
      {filteredTotal === 0 && totalIssues > 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No issues match the current filters.
        </p>
      )}

      {/* Gmail sync errors */}
      {filteredSync.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            Gmail Sync Errors ({filteredSync.length})
          </h2>
          {filteredSync.map((conn) => (
            <IssueCard
              key={conn.id}
              severity={getGmailSeverity(conn)}
              icon={Mail}
              title={conn.email_address}
              category="gmail_sync"
              statusLabel={conn.sync_status}
              error={conn.sync_error}
              meta={[
                ...(conn.workspace_id ? [{ label: "Workspace", value: conn.workspace_id.slice(0, 8) }] : []),
                {
                  label: "Last sync",
                  value: conn.last_sync_at
                    ? format(new Date(conn.last_sync_at), "MMM d, HH:mm")
                    : "Never",
                },
              ]}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  disabled={acting}
                  onClick={() => handleResync(conn.id)}
                >
                  <RefreshCw className="h-3 w-3" />
                  Force Resync
                </Button>
              }
            />
          ))}
        </section>
      )}

      {/* Failed analyses */}
      {filteredAnalysis.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            Failed Analyses ({filteredAnalysis.length})
          </h2>
          {filteredAnalysis.map((a) => (
            <IssueCard
              key={a.id}
              severity={getAnalysisSeverity(a)}
              icon={BarChart3}
              title={a.analysis_type.replace(/_/g, " ")}
              category="analysis_failure"
              statusLabel={a.status}
              error={a.error_message}
              meta={[
                ...(a.workspace_id ? [{ label: "Workspace", value: a.workspace_id.slice(0, 8) }] : []),
                { label: "Date", value: format(new Date(a.created_at), "MMM d, HH:mm") },
              ]}
            />
          ))}
        </section>
      )}
    </div>
  );
}
