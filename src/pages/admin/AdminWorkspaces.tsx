import { useState } from "react";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableToolbar, TableShell, TableEmptyRow } from "@/components/ui/table-toolbar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminWorkspaceRecord, AdminWorkspacesResponse } from "@/types/admin";

export default function AdminWorkspaces() {
  const { data, loading, error, refetch } = useAdminData<AdminWorkspacesResponse>("workspaces");
  const { execute, acting } = useAdminAction();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminWorkspaceRecord | null>(null);

  const workspaces = data?.workspaces || [];
  const filtered = workspaces.filter(
    (w: AdminWorkspaceRecord) =>
      w.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.slug?.toLowerCase().includes(search.toLowerCase()) ||
      w.owner_display_name?.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await execute("delete_workspace", { workspace_id: deleteTarget.id });
      toast.success(`Workspace "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      refetch();
    } catch {
      // Error toast already handled by useAdminAction.
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6 max-w-7xl">
        <div className="space-y-1">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-8 w-72" />
        <TableShell>
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
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
    <div className="space-y-4 p-6 max-w-7xl">
      {/* Page header */}
      <div>
        <h1 className="page-title">Workspace Management</h1>
        <p className="page-description">
          <span className="stat-value font-semibold text-foreground">{workspaces.length}</span> total workspaces
        </p>
      </div>

      {/* Toolbar */}
      <TableToolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search by name, slug or owner…"
      />

      {/* Table */}
      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[240px]">Workspace</TableHead>
              <TableHead>Owner</TableHead>
              {/* Numeric columns — right-aligned for easy scanning */}
              <TableHead className="w-[80px] text-right">Members</TableHead>
              <TableHead className="w-[100px] text-right">Competitors</TableHead>
              <TableHead className="w-[110px] text-right">Newsletters</TableHead>
              <TableHead className="w-[80px] text-right">Insights</TableHead>
              <TableHead className="w-[110px]">Created</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableEmptyRow
                colSpan={8}
                icon={Building2}
                message={search ? "No workspaces match your search." : "No workspaces found."}
              />
            )}
            {filtered.map((ws) => (
              <TableRow key={ws.id} className="group">
                {/* PRIMARY */}
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-medium leading-snug text-foreground">{ws.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{ws.slug}</p>
                  </div>
                </TableCell>

                {/* SECONDARY */}
                <TableCell className="text-sm text-foreground/80">{ws.owner_display_name}</TableCell>

                {/* NUMERIC — tabular-nums, muted, right-aligned */}
                <TableCell className="stat-value text-right text-sm text-muted-foreground">
                  {ws.memberCount}
                </TableCell>
                <TableCell className="stat-value text-right text-sm text-muted-foreground">
                  {ws.competitorCount}
                </TableCell>
                <TableCell className="stat-value text-right text-sm text-muted-foreground">
                  {ws.newsletterCount}
                </TableCell>
                <TableCell className="stat-value text-right text-sm text-muted-foreground">
                  {ws.insightCount}
                </TableCell>

                {/* META */}
                <TableCell className="tabular-nums text-xs text-muted-foreground">
                  {format(new Date(ws.created_at), "MMM d, yyyy")}
                </TableCell>

                {/* ACTIONS — hover-reveal */}
                <TableCell>
                  <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/5"
                      disabled={acting}
                      onClick={() => setDeleteTarget(ws)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>

      {/* Confirm dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete workspace &ldquo;{deleteTarget?.name}&rdquo; and all its data
              (newsletters, insights, competitors, analyses, connections). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
