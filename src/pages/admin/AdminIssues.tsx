import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AlertTriangle, RefreshCw, Mail, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function AdminIssues() {
  const { data, loading, error, refetch } = useAdminData("issues");
  const { execute, acting } = useAdminAction();

  async function handleResync(connectionId: string) {
    try {
      await execute("force_resync", { connection_id: connectionId });
      toast.success("Sync state reset");
      refetch();
    } catch {}
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

  const syncErrors = data?.syncErrors || [];
  const failedAnalyses = data?.failedAnalyses || [];
  const totalIssues = syncErrors.length + failedAnalyses.length;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Issues & Errors</h1>
          <p className="text-sm text-muted-foreground">{totalIssues} active issues</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {totalIssues === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No active issues. Everything is running smoothly.</p>
          </CardContent>
        </Card>
      )}

      {syncErrors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Gmail Sync Errors ({syncErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {syncErrors.map((conn: any) => (
              <div key={conn.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">{conn.email_address}</span>
                    <Badge variant="destructive" className="text-[10px]">{conn.sync_status}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={acting}
                    onClick={() => handleResync(conn.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Force Resync
                  </Button>
                </div>
                <p className="text-xs text-destructive bg-destructive/10 rounded p-2 font-mono">
                  {conn.sync_error}
                </p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Last sync: {conn.last_sync_at ? format(new Date(conn.last_sync_at), "MMM d, HH:mm") : "Never"}</span>
                  <span>Workspace: {conn.workspace_id?.slice(0, 8)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {failedAnalyses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Failed Analyses ({failedAnalyses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {failedAnalyses.map((a: any) => (
              <div key={a.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
                  <span className="text-sm font-medium">{a.analysis_type}</span>
                  <Badge variant="secondary" className="text-[10px]">{a.status}</Badge>
                </div>
                {a.error_message && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded p-2 font-mono">
                    {a.error_message}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{format(new Date(a.created_at), "MMM d, HH:mm")}</span>
                  <span>Workspace: {a.workspace_id?.slice(0, 8)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
