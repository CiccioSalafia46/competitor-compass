import { useState } from "react";
import { useAdminData } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableShell, TableEmptyRow } from "@/components/ui/table-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CreditCard, TrendingUp, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminBillingResponse, AdminWorkspaceBilling } from "@/types/admin";

const STATUS_CONFIG: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}> = {
  active: { label: "Active", variant: "default" },
  trialing: { label: "Trialing", variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  past_due: { label: "Past Due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "outline", className: "text-muted-foreground" },
  unpaid: { label: "Unpaid", variant: "destructive" },
  incomplete: { label: "Incomplete", variant: "outline" },
};

function StripeStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground/40 text-xs">—</span>;
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
  return (
    <Badge
      variant={cfg.variant}
      className={cn("text-[10px]", cfg.className)}
    >
      {cfg.label}
    </Badge>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-[0.08em]">{label}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
          </div>
          <div className="rounded-lg bg-primary/8 p-2 shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type StatusFilter = "all" | "active" | "trialing" | "past_due" | "other";

function BillingSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <div className="space-y-1">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-8 w-full max-w-sm" />
      <TableShell>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-2.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </TableShell>
    </div>
  );
}

export default function AdminBilling() {
  const { data, loading, error } = useAdminData<AdminBillingResponse>("billing");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  if (loading) return <BillingSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const subscriptions = data?.subscriptions ?? [];
  const tierCounts = data?.tierCounts ?? {};
  const statusCounts = data?.statusCounts ?? {};
  const totalPaid = data?.totalPaid ?? 0;

  const filtered = subscriptions.filter((s: AdminWorkspaceBilling) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return s.stripe_status === "active";
    if (statusFilter === "trialing") return s.stripe_status === "trialing";
    if (statusFilter === "past_due") return s.stripe_status === "past_due" || s.stripe_status === "unpaid";
    return !["active", "trialing", "past_due", "unpaid"].includes(s.stripe_status ?? "");
  });

  const activeCount = statusCounts["active"] ?? 0;
  const trialingCount = statusCounts["trialing"] ?? 0;
  const issueCount = (statusCounts["past_due"] ?? 0) + (statusCounts["unpaid"] ?? 0);

  // Tier distribution label
  const tierEntries = Object.entries(tierCounts).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="page-title">Billing & Subscriptions</h1>
        <p className="page-description">
          <span className="font-semibold text-foreground">{subscriptions.length}</span> workspaces tracked
          {tierEntries.length > 0 && (
            <> · {tierEntries.map(([tier, n]) => `${n} ${tier}`).join(", ")}</>
          )}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={CreditCard} label="Total Tracked" value={subscriptions.length} />
        <KpiCard
          icon={CheckCircle}
          label="Active"
          value={activeCount}
          sub={activeCount > 0 ? `${Math.round(activeCount / Math.max(subscriptions.length, 1) * 100)}% of total` : undefined}
        />
        <KpiCard icon={Clock} label="Trialing" value={trialingCount} />
        <KpiCard
          icon={issueCount > 0 ? XCircle : TrendingUp}
          label="Issues"
          value={issueCount}
          sub={issueCount > 0 ? "past due or unpaid" : "none"}
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5 w-fit">
        {(
          [
            { value: "all", label: `All (${subscriptions.length})` },
            { value: "active", label: `Active (${activeCount})` },
            { value: "trialing", label: `Trialing (${trialingCount})` },
            { value: "past_due", label: `Issues (${issueCount})` },
          ] as { value: StatusFilter; label: string }[]
        ).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              statusFilter === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Subscriptions table */}
      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Workspace</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[110px]">Plan</TableHead>
              <TableHead className="w-[70px] text-right">Members</TableHead>
              <TableHead className="w-[130px]">Renewal</TableHead>
              <TableHead className="text-muted-foreground/60">Stripe Customer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableEmptyRow colSpan={6} message="No subscriptions match the current filter." />
            )}
            {filtered.map((sub: AdminWorkspaceBilling) => (
              <TableRow key={sub.workspace_id}>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-foreground">{sub.workspace_name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground/50">
                      {sub.workspace_id.slice(0, 8)}
                    </p>
                  </div>
                </TableCell>

                <TableCell>
                  <StripeStatusBadge status={sub.stripe_status} />
                </TableCell>

                <TableCell>
                  {sub.plan_key ? (
                    <span className="text-[12px] font-medium text-foreground capitalize">
                      {sub.plan_key}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">free</span>
                  )}
                </TableCell>

                <TableCell className="tabular-nums text-right text-sm text-muted-foreground">
                  <Users className="h-3 w-3 inline mr-1 text-muted-foreground/40" />
                  {sub.member_count}
                </TableCell>

                <TableCell className="tabular-nums text-xs text-muted-foreground">
                  {sub.current_period_end
                    ? format(new Date(sub.current_period_end), "MMM d, yyyy")
                    : <span className="text-muted-foreground/40">—</span>}
                </TableCell>

                <TableCell className="font-mono text-[11px] text-muted-foreground/60">
                  {sub.stripe_customer_id
                    ? sub.stripe_customer_id
                    : <span className="text-muted-foreground/40">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </div>
  );
}
