import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
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
import { BarChart3, LayoutDashboard, Newspaper, Users, Settings, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", matchPrefix: "/dashboard" },
  { label: "Newsletters", icon: Newspaper, path: "/newsletters", matchPrefix: "/newsletters" },
  { label: "Competitors", icon: Users, path: "/competitors", matchPrefix: "/competitors" },
  { label: "Settings", icon: Settings, path: "/settings", matchPrefix: "/settings" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isActive = (matchPrefix: string) => {
    return location.pathname === matchPrefix || location.pathname.startsWith(matchPrefix + "/");
  };

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
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.matchPrefix)}
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
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
