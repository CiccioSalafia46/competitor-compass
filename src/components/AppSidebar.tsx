import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useSubscription } from "@/hooks/useSubscription";
import { useAdminCheck } from "@/hooks/useAdmin";
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  BarChart3, LayoutDashboard, Newspaper, Users, Settings, LogOut,
  Plus, Shield, Gauge, Inbox, Megaphone, Lightbulb, TrendingUp,
  Bell, CreditCard,
  FileText, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { memo, useMemo, useCallback } from "react";

type NavItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  matchPrefix: string;
  show: boolean;
  badge?: string;
};

export const AppSidebar = memo(function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();
  const { isAdmin, isAnalyst, canViewData, roles } = useRoles();
  const { isAdmin: isPlatformAdmin } = useAdminCheck();
  const { tier } = useSubscription();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/auth");
  }, [signOut, navigate]);

  const isActive = useCallback(
    (matchPrefix: string) =>
      location.pathname === matchPrefix || location.pathname.startsWith(matchPrefix + "/"),
    [location.pathname]
  );

  const coreNav = useMemo(
    () => [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", matchPrefix: "/dashboard", show: true },
      { label: "Inbox", icon: Inbox, path: "/inbox", matchPrefix: "/inbox", show: true },
      { label: "Data Sources", icon: Newspaper, path: "/newsletters", matchPrefix: "/newsletters", show: true },
      { label: "Competitors", icon: Users, path: "/competitors", matchPrefix: "/competitors", show: isAnalyst },
    ],
    [isAnalyst]
  );

  const intelligenceNav = useMemo(
    () => [
      { label: "Meta Ads", icon: Megaphone, path: "/meta-ads", matchPrefix: "/meta-ads", show: isAnalyst, badge: tier !== "premium" ? "Premium" : undefined },
      { label: "Insights", icon: Lightbulb, path: "/insights", matchPrefix: "/insights", show: isAnalyst },
      { label: "Weekly Briefing", icon: Sparkles, path: "/weekly-briefing", matchPrefix: "/weekly-briefing", show: isAnalyst },
      { label: "Analytics", icon: TrendingUp, path: "/analytics", matchPrefix: "/analytics", show: isAnalyst },
      { label: "Reports", icon: FileText, path: "/reports", matchPrefix: "/reports", show: canViewData },
      { label: "Alerts", icon: Bell, path: "/alerts", matchPrefix: "/alerts", show: true },
    ],
    [canViewData, isAnalyst, tier]
  );

  const adminNav = useMemo(
    () => [
      { label: "Usage", icon: Gauge, path: "/settings/usage", matchPrefix: "/settings/usage", show: isAdmin },
      { label: "Team", icon: Shield, path: "/settings/team", matchPrefix: "/settings/team", show: isAdmin },
      { label: "Billing", icon: CreditCard, path: "/settings/billing", matchPrefix: "/settings/billing", show: isAdmin },
      { label: "Settings", icon: Settings, path: "/settings", matchPrefix: "/settings", show: true },
      { label: "Admin Panel", icon: Shield, path: "/admin", matchPrefix: "/admin", show: isPlatformAdmin },
    ],
    [isAdmin, isPlatformAdmin]
  );

  const renderNavGroup = useCallback(
    (items: NavItem[], label: string) => {
      const filtered = items.filter((i) => i.show);
      if (filtered.length === 0) return null;
      return (
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">
            {label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filtered.map((item) => {
                const active =
                  item.path === "/settings"
                    ? location.pathname === "/settings"
                    : isActive(item.matchPrefix);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "gap-2.5 h-8 text-[13px] font-normal transition-colors",
                        active
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          {item.label}
                          {item.badge && (
                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 font-normal ml-1">
                              {item.badge}
                            </Badge>
                          )}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    },
    [collapsed, location.pathname, isActive, navigate]
  );

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shrink-0">
            <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-foreground tracking-tight">Tracklyze</span>
          )}
        </div>
      </SidebarHeader>

      {!collapsed && currentWorkspace && (
        <div className="px-3 pb-2">
          <select
            value={currentWorkspace.id}
            onChange={(e) => {
              const ws = workspaces.find((w) => w.id === e.target.value);
              if (ws) setCurrentWorkspace(ws);
            }}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <SidebarContent className="scrollbar-thin">
        {renderNavGroup(coreNav, "Core")}
        {renderNavGroup(intelligenceNav, "Intelligence")}

        {isAnalyst && !collapsed && (
          <div className="px-3 py-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs h-7"
              onClick={() => navigate("/newsletters/new")}
            >
              <Plus className="h-3 w-3" />
              Import data
            </Button>
          </div>
        )}

        {renderNavGroup(adminNav, "Management")}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          {!collapsed && roles[0] && (
            <SidebarMenuItem>
              <div className="px-2 py-1">
                <Badge variant="outline" className="capitalize text-[10px] font-normal">
                  {roles[0]}
                </Badge>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="gap-2.5 h-8 text-[13px] text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
});
