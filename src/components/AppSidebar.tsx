import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BarChart3, LayoutDashboard, Newspaper, Users, Settings, LogOut, Plus, Shield, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();
  const { isAdmin, isAnalyst, roles } = useRoles();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isActive = (matchPrefix: string) => {
    return location.pathname === matchPrefix || location.pathname.startsWith(matchPrefix + "/");
  };

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", matchPrefix: "/dashboard", show: true },
    { label: "Newsletters", icon: Newspaper, path: "/newsletters", matchPrefix: "/newsletters", show: true },
    { label: "Competitors", icon: Users, path: "/competitors", matchPrefix: "/competitors", show: isAnalyst },
    { label: "Usage", icon: Gauge, path: "/settings/usage", matchPrefix: "/settings/usage", show: isAdmin },
    { label: "Team", icon: Shield, path: "/settings/team", matchPrefix: "/settings/team", show: isAdmin },
    { label: "Settings", icon: Settings, path: "/settings", matchPrefix: "/settings", show: true },
  ];

  const primaryRole = roles[0];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">Newsletter Intel</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {currentWorkspace && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground">Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2">
                <select
                  value={currentWorkspace.id}
                  onChange={(e) => {
                    const ws = workspaces.find((w) => w.id === e.target.value);
                    if (ws) setCurrentWorkspace(ws);
                  }}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.filter((item) => item.show).map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={
                      item.path === "/settings"
                        ? location.pathname === "/settings"
                        : isActive(item.matchPrefix)
                    }
                    onClick={() => navigate(item.path)}
                    className="gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAnalyst && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-sm"
                  onClick={() => navigate("/newsletters/new")}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add newsletter
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          {primaryRole && (
            <SidebarMenuItem>
              <div className="px-2 py-1">
                <Badge variant="outline" className="capitalize text-xs">
                  {primaryRole}
                </Badge>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
