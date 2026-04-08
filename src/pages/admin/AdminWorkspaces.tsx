import { useState } from "react";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Search, Trash2 } from "lucide-react";
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
      w.owner_display_name?.toLowerCase().includes(search.toLowerCase())
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
        <h1 className="text-2xl font-bold">Workspace Management</h1>
        <p className="text-sm text-muted-foreground">{workspaces.length} total workspaces</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workspaces…"
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
                <TableHead>Workspace</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-center">Members</TableHead>
                <TableHead className="text-center">Competitors</TableHead>
                <TableHead className="text-center">Newsletters</TableHead>
                <TableHead className="text-center">Insights</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No workspaces found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{ws.name}</p>
                      <p className="text-xs text-muted-foreground">{ws.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{ws.owner_display_name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{ws.memberCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{ws.competitorCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{ws.newsletterCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{ws.insightCount}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(ws.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive"
                      disabled={acting}
                      onClick={() => setDeleteTarget(ws)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete workspace "{deleteTarget?.name}" and all its data
              (newsletters, insights, competitors, analyses, connections). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
