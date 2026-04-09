import { useState } from "react";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableToolbar, TablePagination, TableShell, TableEmptyRow } from "@/components/ui/table-toolbar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { CheckCircle, XCircle, Ban, Trash2, ShieldOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AdminUserRecord, AdminUsersResponse } from "@/types/admin";

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const perPage = 25;
  const { data, loading, error, refetch } = useAdminData<AdminUsersResponse>("users", { page, perPage });
  const { execute, acting } = useAdminAction();
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "ban" | "unban";
    user: AdminUserRecord;
  } | null>(null);

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const filtered = users.filter(
    (u: AdminUserRecord) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleConfirm() {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    try {
      if (type === "delete") {
        await execute("delete_user", { target_user_id: user.id });
        toast.success(`User ${user.email} deleted`);
      } else if (type === "ban") {
        await execute("ban_user", { target_user_id: user.id, ban: true });
        toast.success(`User ${user.email} disabled`);
      } else if (type === "unban") {
        await execute("ban_user", { target_user_id: user.id, ban: false });
        toast.success(`User ${user.email} re-enabled`);
      }
      setConfirmAction(null);
      refetch();
    } catch {
      // toast already shown by useAdminAction
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6 max-w-7xl">
        <div className="space-y-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-72" />
        <TableShell>
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-24" />
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-description">
            <span className="stat-value font-semibold text-foreground">{total}</span> registered users
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <TableToolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search by email or name…"
      />

      {/* Table */}
      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[260px]">User</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Workspaces</TableHead>
              <TableHead className="w-[130px]">Last sign in</TableHead>
              <TableHead className="w-[110px]">Joined</TableHead>
              {/* Actions column — invisible header, right-aligned */}
              <TableHead className="w-[1%] whitespace-nowrap" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableEmptyRow colSpan={7} message={search ? "No users match your search." : "No users found."} />
            )}
            {filtered.map((user) => (
              <TableRow key={user.id}>
                {/* PRIMARY: user identity */}
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-medium leading-snug text-foreground">
                      {user.display_name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </TableCell>

                {/* SECONDARY: verification + ban state */}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {user.email_confirmed_at ? (
                      <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    {user.banned && (
                      <Badge variant="destructive" className="text-[10px] py-0">
                        Disabled
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* SECONDARY: roles */}
                <TableCell>
                  {user.roles?.length > 0 ? (
                    <span className="text-[12px] text-muted-foreground">
                      {user.roles.map((r) => r.role).join(" · ")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </TableCell>

                {/* META: workspace list */}
                <TableCell>
                  <div className="space-y-0.5">
                    {user.workspaces?.length > 0 ? (
                      <>
                        {user.workspaces.slice(0, 2).map((w, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground leading-snug">
                            {w.name}
                            <span className="ml-1 text-muted-foreground/50">({w.role})</span>
                          </p>
                        ))}
                        {user.workspaces.length > 2 && (
                          <p className="text-xs text-muted-foreground/50">
                            +{user.workspaces.length - 2} more
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">None</span>
                    )}
                  </div>
                </TableCell>

                {/* META: timestamps */}
                <TableCell className="tabular-nums text-xs text-muted-foreground">
                  {user.last_sign_in_at
                    ? format(new Date(user.last_sign_in_at), "MMM d, HH:mm")
                    : <span className="text-muted-foreground/40">Never</span>}
                </TableCell>
                <TableCell className="tabular-nums text-xs text-muted-foreground">
                  {format(new Date(user.created_at), "MMM d, yyyy")}
                </TableCell>

                {/* ACTIONS: hover-reveal */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {user.banned ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={acting}
                        onClick={() => setConfirmAction({ type: "unban", user })}
                      >
                        <ShieldOff className="h-3 w-3" />
                        Enable
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-7 text-xs gap-1", !user.banned && "text-warning hover:text-warning")}
                        disabled={acting}
                        onClick={() => setConfirmAction({ type: "ban", user })}
                      >
                        <Ban className="h-3 w-3" />
                        Disable
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/5"
                      disabled={acting}
                      onClick={() => setConfirmAction({ type: "delete", user })}
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

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "delete"
                ? "Delete user"
                : confirmAction?.type === "ban"
                ? "Disable user"
                : "Re-enable user"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "delete"
                ? `This will permanently delete ${confirmAction?.user?.email} and remove all their data. This cannot be undone.`
                : confirmAction?.type === "ban"
                ? `This will disable ${confirmAction?.user?.email}'s account. They will not be able to sign in.`
                : `This will re-enable ${confirmAction?.user?.email}'s account.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmAction?.type === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {confirmAction?.type === "delete"
                ? "Delete"
                : confirmAction?.type === "ban"
                ? "Disable"
                : "Enable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
