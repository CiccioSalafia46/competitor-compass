import { useState } from "react";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Card, CardContent } from "@/components/ui/card";
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
import { format } from "date-fns";
import { RefreshCw, Unplug, Plug } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AdminGmailConnection, AdminIntegrationsResponse } from "@/types/admin";

function SyncStatusDot({ conn }: { conn: AdminGmailConnection }) {
  const hasError = Boolean(conn.sync_error);
  const isActive = conn.sync_status === "syncing" || conn.sync_status === "active";
  const dotClass = hasError ? "bg-destructive" : isActive ? "bg-success" : "bg-muted-foreground/40";
  const textClass = hasError ? "text-destructive font-medium" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />
      <span className={cn("text-[12px]", textClass)}>{conn.sync_status}</span>
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
                <TableHead className="w-[260px]">Account</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[130px]">Last sync</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="w-[120px]">Connected</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {gmailConns.length === 0 && (
                <TableEmptyRow colSpan={6} icon={Plug} message="No Gmail connections found." />
              )}
              {gmailConns.map((conn) => (
                <TableRow key={conn.id} className="group">
                  {/* PRIMARY */}
                  <TableCell className="text-[13px] font-medium text-foreground">
                    {conn.email_address}
                  </TableCell>

                  {/* STATUS */}
                  <TableCell>
                    <SyncStatusDot conn={conn} />
                  </TableCell>

                  {/* META: timestamps */}
                  <TableCell className="tabular-nums text-xs text-muted-foreground">
                    {conn.last_sync_at
                      ? format(new Date(conn.last_sync_at), "MMM d, HH:mm")
                      : <span className="text-muted-foreground/40">Never</span>}
                  </TableCell>

                  {/* ERROR — destructive when present */}
                  <TableCell className="max-w-[280px]">
                    {conn.sync_error ? (
                      <span className="line-clamp-2 text-xs leading-relaxed text-destructive">
                        {conn.sync_error}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>

                  <TableCell className="tabular-nums text-xs text-muted-foreground">
                    {format(new Date(conn.connected_at), "MMM d, yyyy")}
                  </TableCell>

                  {/* ACTIONS — hover-reveal */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={acting}
                        onClick={() => handleResync(conn.id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Resync
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/5"
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
