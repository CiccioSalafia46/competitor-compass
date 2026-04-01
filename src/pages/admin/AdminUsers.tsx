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
import { Search, CheckCircle, XCircle, Ban, Trash2, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const { data, loading, error, refetch } = useAdminData("users");
  const { execute, acting } = useAdminAction();
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "ban" | "unban";
    user: any;
  } | null>(null);

  const users = data?.users || [];
  const filtered = users.filter(
    (u: any) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase())
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">{users.length} registered users</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or name…"
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
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Workspaces</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{user.display_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {user.email_confirmed_at ? (
                        <CheckCircle className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {user.banned && (
                        <Badge variant="destructive" className="text-[10px]">Disabled</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles?.length > 0 ? (
                        user.roles.map((r: any, i: number) => (
                          <Badge
                            key={i}
                            variant={r.role === "admin" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {r.role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {user.workspaces?.length > 0 ? (
                        user.workspaces.slice(0, 2).map((w: any, i: number) => (
                          <span key={i} className="text-xs">{w.name} ({w.role})</span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                      {user.workspaces?.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{user.workspaces.length - 2} more</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.last_sign_in_at
                      ? format(new Date(user.last_sign_in_at), "MMM d, HH:mm")
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
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
                          className="h-7 text-xs gap-1 text-warning"
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
                        className="h-7 text-xs gap-1 text-destructive"
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
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "delete"
                ? "Delete User"
                : confirmAction?.type === "ban"
                ? "Disable User"
                : "Re-enable User"}
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
              className={confirmAction?.type === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirmAction?.type === "delete" ? "Delete" : confirmAction?.type === "ban" ? "Disable" : "Enable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
