import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles, useWorkspaceRoles, type AppRole } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield, Eye, BarChart3, Trash2 } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { getErrorMessage } from "@/lib/errors";

interface MemberInfo {
  user_id: string;
  role: string;
  display_name: string | null;
  email?: string;
  roles: { id: string; role: AppRole }[];
}

export default function TeamManagement() {
  const { currentWorkspace } = useWorkspace();
  const { isAdmin } = useRoles();
  const { memberRoles, assignRole, removeRole, refetch: refetchRoles } = useWorkspaceRoles();
  const { toast } = useToast();
  const { log } = useAuditLog();
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("viewer");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchMembers = async () => {
      setLoading(true);
      const { data: workspaceMembers } = await supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", currentWorkspace.id);

      if (!workspaceMembers) {
        setLoading(false);
        return;
      }

      const userIds = workspaceMembers.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const enriched: MemberInfo[] = workspaceMembers.map((m) => ({
        user_id: m.user_id,
        role: m.role,
        display_name: profileMap.get(m.user_id)?.display_name || null,
        roles: memberRoles
          .filter((r) => r.user_id === m.user_id)
          .map((r) => ({ id: r.id, role: r.role as AppRole })),
      }));

      setMembers(enriched);
      setLoading(false);
    };
    fetchMembers();
  }, [currentWorkspace, memberRoles]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentWorkspace) return;
    setInviting(true);
    try {
      // In a full implementation, this would send an invitation email
      // For now, show the flow structure
      toast({
        title: "Invitation flow",
        description: "Team invitations require email infrastructure. Coming soon.",
      });
      await log("invite_attempted", "team", undefined, { email: inviteEmail, role: inviteRole });
    } finally {
      setInviting(false);
      setInviteEmail("");
    }
  };

  const handleRoleChange = async (userId: string, existingRoleId: string | null, newRole: AppRole) => {
    if (!currentWorkspace) return;
    try {
      if (existingRoleId) {
        await removeRole(existingRoleId);
      }
      await assignRole(userId, newRole);

      // Sync workspace_members.role to prevent stale privilege escalation.
      // If the user is no longer an admin app-role, demote the membership role to "member"
      // so isWorkspaceAdmin stays accurate in useRoles.
      const membershipRole = newRole === "admin" ? "admin" : "member";
      const { error: memberError } = await supabase
        .from("workspace_members")
        .update({ role: membershipRole })
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", userId)
        .neq("role", "owner"); // never touch the workspace owner's membership row
      if (memberError) throw memberError;

      await log("role_changed", "user", userId, { new_role: newRole, membership_role: membershipRole });
      toast({ title: "Role updated" });
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const roleIcon = (role: AppRole) => {
    switch (role) {
      case "admin": return <Shield className="h-3.5 w-3.5" />;
      case "analyst": return <BarChart3 className="h-3.5 w-3.5" />;
      case "viewer": return <Eye className="h-3.5 w-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage workspace members and roles</p>
      </div>

      {isAdmin && (
        <Card className="shadow-raised border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invite member</CardTitle>
            <CardDescription>Add a team member to this workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="invite-email" className="sr-only">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                />
              </div>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-raised border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => {
            const primaryRole = member.roles[0];
            return (
              <div key={member.user_id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {(member.display_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.display_name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {primaryRole ? (
                    <Badge variant="outline" className="gap-1 capitalize">
                      {roleIcon(primaryRole.role)}
                      {primaryRole.role}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="capitalize">
                      No role assigned
                    </Badge>
                  )}
                  {isAdmin && primaryRole && (
                    <Select
                      value={primaryRole.role}
                      onValueChange={(v) => handleRoleChange(member.user_id, primaryRole.id, v as AppRole)}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="analyst">Analyst</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="shadow-raised border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-muted-foreground text-xs">Manage workspace, members, billing, integrations, alerts, reports</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-3">
              <BarChart3 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Analyst</p>
                <p className="text-muted-foreground text-xs">Manage competitor monitoring, tagging, analysis, reports</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Viewer</p>
                <p className="text-muted-foreground text-xs">Read-only access to dashboards, analyses, and reports</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
