import { useState } from "react";
import { useAdminData } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminLogEntry, AdminLogsResponse } from "@/types/admin";

export default function AdminLogs() {
  const [page, setPage] = useState(1);
  const perPage = 50;
  const { data, loading, error } = useAdminData<AdminLogsResponse>("logs", { page, perPage });
  const [search, setSearch] = useState("");

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / perPage);

  const filtered = search
    ? logs.filter(
        (l: AdminLogEntry) =>
          l.action?.toLowerCase().includes(search.toLowerCase()) ||
          l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
          l.entity_id?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

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

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">{total} total entries</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by action or entity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No logs found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge
                      variant={log.action?.startsWith("admin.") ? "default" : "outline"}
                      className="text-xs font-mono"
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.entity_type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {log.entity_id?.slice(0, 8) || "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {log.user_id?.slice(0, 8)}
                  </TableCell>
                  <TableCell className="max-w-72">
                    {log.metadata && Object.keys(log.metadata).length > 0 ? (
                      <code className="line-clamp-2 rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </code>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
