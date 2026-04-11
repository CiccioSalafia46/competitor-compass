import { useState } from "react";
import { useAdminData } from "@/hooks/useAdmin";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableToolbar, TablePagination, TableShell, TableEmptyRow } from "@/components/ui/table-toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Download, ScrollText } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";
import type { AdminLogEntry, AdminLogsResponse } from "@/types/admin";

/** Render the metadata object as a readable compact string with tooltip for full value */
function MetaCell({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-muted-foreground/40">—</span>;
  }

  const entries = Object.entries(metadata);
  const summary = entries
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("  ·  ");
  const hasMore = entries.length > 2;
  const full = JSON.stringify(metadata, null, 2);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default font-mono text-[11px] text-muted-foreground">
            {summary}
            {hasMore && (
              <span className="ml-1 text-muted-foreground/50">+{entries.length - 2}</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <pre className="text-[10px] leading-relaxed whitespace-pre-wrap break-all">{full}</pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Short UUID display with full value on hover */
function UuidCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground/40">—</span>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default font-mono text-[11px] text-muted-foreground/70">
            {value.slice(0, 8)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="font-mono text-xs">{value}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type ActionPrefix = "all" | "admin" | "other";

export default function AdminLogs() {
  const [page, setPage] = useState(1);
  const perPage = 50;
  const { data, loading, error } = useAdminData<AdminLogsResponse>("logs", { page, perPage });
  const [search, setSearch] = useState("");
  const [actionPrefix, setActionPrefix] = useState<ActionPrefix>("all");

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / perPage);

  const filtered = logs.filter((l: AdminLogEntry) => {
    const matchesSearch = !search || (
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_id?.toLowerCase().includes(search.toLowerCase())
    );
    const matchesPrefix =
      actionPrefix === "all" ||
      (actionPrefix === "admin" && l.action?.startsWith("admin.")) ||
      (actionPrefix === "other" && !l.action?.startsWith("admin."));
    return matchesSearch && matchesPrefix;
  });

  function handleExport() {
    exportToCSV(
      filtered.map((l) => ({
        id: l.id,
        action: l.action,
        entity_type: l.entity_type ?? "",
        entity_id: l.entity_id ?? "",
        user_id: l.user_id ?? "",
        metadata: l.metadata ? JSON.stringify(l.metadata) : "",
        created_at: l.created_at,
      })),
      `audit-logs-${format(new Date(), "yyyy-MM-dd")}`,
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6 max-w-7xl">
        <div className="space-y-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-72" />
        <TableShell>
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3.5 flex-1 max-w-xs" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            ))}
          </div>
        </TableShell>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminPageLayout
      title="Audit Logs"
      description={<><span className="font-semibold text-foreground">{total}</span> total entries</>}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <TableToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Filter by action or entity…"
          />
        </div>
        <Select value={actionPrefix} onValueChange={(v) => setActionPrefix(v as ActionPrefix)}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All actions</SelectItem>
            <SelectItem value="admin" className="text-xs">Admin actions</SelectItem>
            <SelectItem value="other" className="text-xs">User actions</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={filtered.length === 0}
          onClick={handleExport}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Table — intentionally dense; this is a log, not a data entry form */}
      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Action</TableHead>
              <TableHead className="w-[140px]">Entity</TableHead>
              <TableHead className="w-[90px]">Entity ID</TableHead>
              <TableHead className="w-[90px]">User ID</TableHead>
              <TableHead>Metadata</TableHead>
              <TableHead className="w-[130px] text-right">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableEmptyRow
                colSpan={6}
                icon={ScrollText}
                message={search ? "No logs match your search." : "No log entries found."}
              />
            )}
            {filtered.map((log) => (
              <TableRow key={log.id}>
                {/* PRIMARY: action badge */}
                <TableCell>
                  <Badge
                    variant={log.action?.startsWith("admin.") ? "default" : "outline"}
                    className="font-mono text-[10px]"
                  >
                    {log.action}
                  </Badge>
                </TableCell>

                {/* SECONDARY: entity type */}
                <TableCell className="text-[13px] text-foreground/80">
                  {log.entity_type || <span className="text-muted-foreground/40">—</span>}
                </TableCell>

                {/* META: truncated UUIDs with tooltip */}
                <TableCell>
                  <UuidCell value={log.entity_id} />
                </TableCell>
                <TableCell>
                  <UuidCell value={log.user_id} />
                </TableCell>

                {/* META: structured metadata preview */}
                <TableCell className="max-w-[280px]">
                  <MetaCell metadata={log.metadata as Record<string, unknown> | null} />
                </TableCell>

                {/* META: timestamp — right-aligned, tabular */}
                <TableCell className="tabular-nums text-right text-xs text-muted-foreground">
                  {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>

      {/* Pagination */}
      {totalPages > 1 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalCount={total}
          perPage={perPage}
          onPageChange={setPage}
        />
      )}
    </AdminPageLayout>
  );
}
