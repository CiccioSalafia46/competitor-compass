import { useState } from "react";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import type { AdminGmailConnection, AdminIntegrationsResponse } from "@/types/admin";

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
      <div className="p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const gmailConns = data?.gmailConnections || [];
  const rateLimits = data?.rateLimitsByEndpoint || {};

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Integrations Monitor</h1>
        <p className="text-sm text-muted-foreground">Gmail connections and API usage</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gmail Connections ({gmailConns.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gmailConns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    No Gmail connections
                  </TableCell>
                </TableRow>
              )}
              {gmailConns.map((conn) => (
                <TableRow key={conn.id}>
                  <TableCell className="text-sm font-medium">{conn.email_address}</TableCell>
                  <TableCell>
                    <Badge
                      variant={conn.sync_error ? "destructive" : conn.sync_status === "idle" ? "secondary" : "default"}
                      className="text-[10px]"
                    >
                      {conn.sync_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {conn.last_sync_at ? format(new Date(conn.last_sync_at), "MMM d, HH:mm") : "Never"}
                  </TableCell>
                  <TableCell className="max-w-48">
                    {conn.sync_error ? (
                      <span className="text-xs text-destructive line-clamp-2">{conn.sync_error}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(conn.connected_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
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
                        className="h-7 text-xs gap-1 text-destructive"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">API Usage by Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(rateLimits).length === 0 ? (
            <p className="text-sm text-muted-foreground">No rate limit data</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(rateLimits)
                .sort(([, a], [, b]) => b - a)
                .map(([endpoint, count]) => (
                  <div key={endpoint} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <span className="text-sm font-mono">{endpoint}</span>
                    <Badge variant="secondary">{count} calls</Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
