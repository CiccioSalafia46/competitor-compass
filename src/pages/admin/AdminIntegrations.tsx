import { useAdminData } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function AdminIntegrations() {
  const { data, loading, error } = useAdminData("integrations");

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

      {/* Gmail Connections */}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {gmailConns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No Gmail connections
                  </TableCell>
                </TableRow>
              )}
              {gmailConns.map((conn: any) => (
                <TableRow key={conn.id}>
                  <TableCell className="text-sm font-medium">{conn.email_address}</TableCell>
                  <TableCell>
                    <Badge
                      variant={conn.sync_status === "idle" ? "secondary" : conn.sync_error ? "destructive" : "default"}
                      className="text-[10px]"
                    >
                      {conn.sync_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {conn.last_sync_at
                      ? format(new Date(conn.last_sync_at), "MMM d, HH:mm")
                      : "Never"}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rate Limits by Endpoint */}
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
                .sort(([, a]: any, [, b]: any) => b - a)
                .map(([endpoint, count]: any) => (
                  <div key={endpoint} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <span className="text-sm font-mono">{endpoint}</span>
                    <Badge variant="secondary">{count} calls</Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
