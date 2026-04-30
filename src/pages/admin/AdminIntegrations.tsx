import { useState } from "react";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableShell, TableEmptyRow } from "@/components/ui/table-toolbar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from "date-fns";
import { RefreshCw, Unplug, Plug, ShieldCheck, ShieldAlert, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AdminGmailConnection, AdminIntegrationsResponse, GmailTokenStatus } from "@/types/admin";

const TOKEN_STATUS_CONFIG: Record<GmailTokenStatus, {
  label: string;
  description: string;
  dot: string;
  badge: string;
  icon: typeof ShieldCheck;
}> = {
  healthy: {
    label: "Healthy",
    description: "Access token is valid. Sync will work without refresh.",
    dot: "bg-success",
    badge: "border-success/20 bg-success/10 text-success",
    icon: ShieldCheck,
  },
  expired_refreshable: {
    label: "Expired — auto-refresh",
    description: "Access token expired but refresh token is available. Will auto-refresh on next sync.",
    dot: "bg-warning",
    badge: "border-warning/20 bg-warning/10 text-warning",
    icon: KeyRound,
  },
  revoked: {
    label: "Revoked — reconnect required",
    description: "Token has been revoked or refresh failed. User must disconnect and reconnect Gmail.",
    dot: "bg-destructive",
    badge: "border-destructive/20 bg-destructive/10 text-destructive",
    icon: ShieldAlert,
  },
  missing: {
    label: "No token",
    description: "No OAuth token found for this connection. User must reconnect.",
    dot: "bg-destructive",
    badge: "border-destructive/20 bg-destructive/10 text-destructive",
    icon: AlertTriangle,
  },
};

function ConnectionHealthBadge({ conn }: { conn: AdminGmailConnection }) {
  const status = conn.token_status ?? "missing";
  const config = TOKEN_STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-medium cursor-default", config.badge)}>
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px] text-xs">
        <p>{config.description}</p>
        {conn.token_expires_at && (
          <p className="mt-1 text-muted-foreground">
            Token expired {formatDistanceToNow(new Date(conn.token_expires_at), { addSuffix: true })}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function SyncStatusDot({ conn }: { conn: AdminGmailConnection }) {
  const hasError = Boolean(conn.sync_error);
  const isActive = conn.sync_status === "syncing" || conn.sync_status === "active";
  const dotClass = hasError ? "bg-destructive" : isActive ? "bg-success" : "bg-muted-foreground/40";
  const textClass = hasError ? "text-destructive font-medium" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />
      <span className={cn("text-xs", textClass)}>{conn.sync_status}</span>
    </div>
  );
}

export default function AdminIntegrations() {
  const { data, loading, error, refetch } = useAdminData<AdminIntegrationsResponse>("integrations");
  const { execute, acting } = useAdminAction();
  const [disconnectTarget, setDisconnectTarget] = useState<AdminGmailConnection | null>(null);

  async function handleResync(connectionId: string) {
    try {
      await execute("force_resync", { connection_id: connectionId });
      toast.success("Sync state reset. Next sync will do a full re-import.");
      refetch();
    } catch {
      // Error toast already handled by useAdminAction.
    }
  }

  async function handleDisconnect() {
    if (!disconnectTarget) return;
    try {
      await execute("disconnect_gmail", { connection_id: disconnectTarget.id });
      toast.success(`Disconnected ${disconnectTarget.email_address}`);
      setDisconnectTarget(null);
      refetch();
    } catch {
      // Error toast already handled by useAdminAction.
    }
  }

  if (loading) {
    return (
      <AdminPageLayout title="Integrations Monitor" description="Gmail connections and API usage">
        <TableShell>
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 flex-1 max-w-sm" />
              </div>
            ))}
          </div>
        </TableShell>
      </AdminPageLayout>
    );
  }

  if (error) {
    return (
      <AdminPageLayout title="Integrations Monitor" description="Gmail connections and API usage">
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  const gmailConns = data?.gmailConnections || [];
  const rateLimits = data?.rateLimitsByEndpoint || {};
  const sortedEndpoints = Object.entries(rateLimits).sort(([, a], [, b]) => b - a);

  return (
    <AdminPageLayout
      title="Integrations Monitor"
      description="Gmail connections and API usage"
      actions={
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      {/* Health summary banner */}
      {(() => {
        const revokedConns = gmailConns.filter((c) => c.token_status === "revoked" || c.token_status === "missing");
        const expiredConns = gmailConns.filter((c) => c.token_status === "expired_refreshable");
        const errorConns = gmailConns.filter((c) => c.sync_error);
        const hasIssues = revokedConns.length > 0 || errorConns.length > 0;

        if (!hasIssues && expiredConns.length === 0) return null;

        return (
          <div className="space-y-2">
            {revokedConns.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    {revokedConns.length} connection{revokedConns.length > 1 ? "s" : ""} revoked
                  </p>
                  <p className="text-xs text-destructive/80 mt-0.5">
                    {revokedConns.map((c) => c.email_address).join(", ")} — user must disconnect and reconnect Gmail.
                  </p>
                </div>
              </div>
            )}
            {expiredConns.length > 0 && !revokedConns.length && (
              <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3">
                <KeyRound className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">
                    {expiredConns.length} token{expiredConns.length > 1 ? "s" : ""} expired — will auto-refresh
                  </p>
                  <p className="text-xs text-warning/80 mt-0.5">
                    Access tokens expired but refresh tokens are available. Click "Resync" to trigger a refresh now, or wait for the next automatic sync.
                  </p>
                </div>
              </div>
            )}
            {errorConns.length > 0 && !revokedConns.length && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    {errorConns.length} sync error{errorConns.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-destructive/80 mt-0.5">
                    {errorConns.map((c) => c.email_address).join(", ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Gmail connections table */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-foreground">Gmail Connections</h2>
          <span className="stat-value text-xs text-muted-foreground">{gmailConns.length}</span>
        </div>

        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Account</TableHead>
                <TableHead className="w-[180px]">Token Health</TableHead>
                <TableHead className="w-[90px]">Sync</TableHead>
                <TableHead className="w-[110px]">Last sync</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {gmailConns.length === 0 && (
                <TableEmptyRow colSpan={6} icon={Plug} message="No Gmail connections found." />
              )}
              {gmailConns.map((conn) => (
                <TableRow key={conn.id} className="group">
                  {/* ACCOUNT */}
                  <TableCell>
                    <div>
                      <p className="text-nav font-medium text-foreground">{conn.email_address}</p>
                      <p className="text-caption text-muted-foreground/50">
                        Connected {format(new Date(conn.connected_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </TableCell>

                  {/* TOKEN HEALTH */}
                  <TableCell>
                    <ConnectionHealthBadge conn={conn} />
                  </TableCell>

                  {/* SYNC STATUS */}
                  <TableCell>
                    <SyncStatusDot conn={conn} />
                  </TableCell>

                  {/* LAST SYNC */}
                  <TableCell className="tabular-nums text-xs text-muted-foreground">
                    {conn.last_sync_at
                      ? format(new Date(conn.last_sync_at), "MMM d, HH:mm")
                      : <span className="text-muted-foreground/40">Never</span>}
                  </TableCell>

                  {/* ERROR */}
                  <TableCell className="max-w-[260px]">
                    {conn.sync_error ? (
                      <span className="line-clamp-2 text-xs leading-relaxed text-destructive">
                        {conn.sync_error}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        disabled={acting}
                        onClick={() => handleResync(conn.id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Resync
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/5"
                        disabled={acting}
                        onClick={() => setDisconnectTarget(conn)}
                      >
                        <Unplug className="h-3 w-3" />
                        Disconnect
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      </section>

      {/* API usage — structured list, sorted by call count */}
      {sortedEndpoints.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">API Usage by Endpoint</h2>

          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="w-[100px] text-right">Calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEndpoints.map(([endpoint, count], idx) => (
                  <TableRow key={endpoint}>
                    <TableCell>
                      <span className={cn(
                        "font-mono text-[12px]",
                        idx === 0 ? "text-foreground font-medium" : "text-foreground/70",
                      )}>
                        {endpoint}
                      </span>
                    </TableCell>
                    <TableCell className="stat-value text-right text-sm">
                      <span className={cn(
                        idx === 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}>
                        {count}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
        </section>
      )}

      {Object.keys(rateLimits).length === 0 && (
        <p className="text-sm text-muted-foreground">No rate limit data available.</p>
      )}

      {/* Disconnect confirm */}
      <AlertDialog open={!!disconnectTarget} onOpenChange={() => setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Gmail</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the Gmail connection for {disconnectTarget?.email_address}, including all stored tokens. The user will need to reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageLayout>
  );
}
