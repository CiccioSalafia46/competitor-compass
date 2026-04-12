import { useState } from "react";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
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
import { ShieldOff, Ban, Trash2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AdminUserRecord, AdminUsersResponse } from "@/types/admin";

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-indigo-500",
] as const;

function UserAvatar({ name, email }: { name: string | null; email: string | null }) {
  const label = name || email || "?";
  const initial = label[0].toUpperCase();
  const bg = AVATAR_PALETTE[label.charCodeAt(0) % AVATAR_PALETTE.length];
  return (
    <div className={cn(
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
      bg,
    )}>
      {initial}
    </div>
  );
}

// ─── Status indicator ─────────────────────────────────────────────────────────

function UserStatusDot({
  verified,
  banned,
}: {
  verified: boolean;
  banned: boolean;
}) {
  if (banned) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
        <span className="text-[12px] font-medium text-destructive">Disabled</span>
      </div>
    );
  }
  if (verified) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
        <span className="text-[12px] text-muted-foreground">Verified</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
      <span className="text-[12px] text-muted-foreground">Pending</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
      <AdminPageLayout title="User Management" description={<Skeleton className="h-4 w-32 inline-block" />}>
        <Skeleton className="h-8 w-72" />
        <TableShell>
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </TableShell>
      </AdminPageLayout>
    );
  }

  if (error) {
    return (
      <AdminPageLayout title="User Management">
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      title="User Management"
      description={<><span className="font-semibold text-foreground">{total}</span> registered users</>}
    >
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
              <TableHead className="w-[280px]">User</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Workspaces</TableHead>
              <TableHead className="w-[130px]">Last sign in</TableHead>
              <TableHead className="w-[110px]">Joined</TableHead>
              <TableHead className="w-[1%] whitespace-nowrap" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableEmptyRow
                colSpan={7}
                message={search ? "No users match your search." : "No users found."}
                icon={Users}
              />
            )}
            {filtered.map((user) => (
              <TableRow key={user.id} className="group">
                {/* PRIMARY: avatar + user identity */}
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={user.display_name} email={user.email} />
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-[13px] font-medium leading-snug text-foreground truncate">
                        {user.display_name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </TableCell>

                {/* SECONDARY: verification + ban state */}
                <TableCell>
                  <UserStatusDot
                    verified={Boolean(user.email_confirmed_at)}
                    banned={user.banned}
                  />
                </TableCell>

                {/* SECONDARY: roles */}
                <TableCell>
                  {user.roles?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.roles.slice(0, 2).map((r) => (
                        <Badge key={r.workspace_id + r.role} variant="secondary" className="text-[10px] py-0">
                          {r.role}
                        </Badge>
                      ))}
                      {user.roles.length > 2 && (
                        <span className="text-[11px] text-muted-foreground/60">+{user.roles.length - 2}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
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
                      <span className="text-xs text-muted-foreground/40">None</span>
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
                        className="h-8 text-xs gap-1"
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
                        className={cn("h-8 text-xs gap-1 text-warning hover:text-warning hover:bg-warning/5")}
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
                      className="h-8 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/5"
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
    </AdminPageLayout>
  );
}
