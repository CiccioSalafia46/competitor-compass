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
  FileText, Sparkles, ChevronsUpDown, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { memo, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("nav");

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
      { label: t("dashboard"), icon: LayoutDashboard, path: "/dashboard", matchPrefix: "/dashboard", show: true },
      { label: t("inbox"), icon: Inbox, path: "/inbox", matchPrefix: "/inbox", show: true },
      { label: t("dataSources"), icon: Newspaper, path: "/newsletters", matchPrefix: "/newsletters", show: true },
      { label: t("competitors"), icon: Users, path: "/competitors", matchPrefix: "/competitors", show: isAnalyst },
    ],
    [isAnalyst, t]
  );

  const intelligenceNav = useMemo(
    () => [
      { label: t("metaAds"), icon: Megaphone, path: "/meta-ads", matchPrefix: "/meta-ads", show: isAnalyst, badge: tier !== "premium" ? t("common:premium") : undefined },
      { label: t("insights"), icon: Lightbulb, path: "/insights", matchPrefix: "/insights", show: isAnalyst },
      { label: t("weeklyBriefing"), icon: Sparkles, path: "/weekly-briefing", matchPrefix: "/weekly-briefing", show: isAnalyst },
      { label: t("analytics"), icon: TrendingUp, path: "/analytics", matchPrefix: "/analytics", show: isAnalyst },
      { label: t("reports"), icon: FileText, path: "/reports", matchPrefix: "/reports", show: canViewData },
      { label: t("alerts"), icon: Bell, path: "/alerts", matchPrefix: "/alerts", show: true },
    ],
    [canViewData, isAnalyst, tier, t]
  );

  const adminNav = useMemo(
    () => [
      { label: t("usage"), icon: Gauge, path: "/settings/usage", matchPrefix: "/settings/usage", show: isAdmin },
      { label: t("team"), icon: Shield, path: "/settings/team", matchPrefix: "/settings/team", show: isAdmin },
      { label: t("billing"), icon: CreditCard, path: "/settings/billing", matchPrefix: "/settings/billing", show: isAdmin },
      { label: t("settings"), icon: Settings, path: "/settings", matchPrefix: "/settings", show: true },
      { label: t("adminPanel"), icon: Shield, path: "/admin", matchPrefix: "/admin", show: isPlatformAdmin },
    ],
    [isAdmin, isPlatformAdmin, t]
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
        <div className="px-2 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-bold uppercase text-primary">
                  {currentWorkspace.name.charAt(0)}
                </div>
                <span className="flex-1 truncate text-[13px] font-medium text-foreground">
                  {currentWorkspace.name}
                </span>
                <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onSelect={() => setCurrentWorkspace(ws)}
                  className="gap-2"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-bold uppercase text-primary">
                    {ws.name.charAt(0)}
                  </div>
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.id === currentWorkspace.id && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <SidebarContent className="scrollbar-thin">
        {renderNavGroup(coreNav, t("groupCore"))}
        {renderNavGroup(intelligenceNav, t("groupIntelligence"))}

        {isAnalyst && !collapsed && (
          <div className="px-3 py-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs h-7"
              onClick={() => navigate("/newsletters/new")}
            >
              <Plus className="h-3 w-3" />
              {t("importData")}
            </Button>
          </div>
        )}

        {renderNavGroup(adminNav, t("groupManagement"))}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          {!collapsed && roles[0] && (
            <SidebarMenuItem>
              <div className="flex items-center justify-between px-2 py-1">
                <Badge
                  variant="secondary"
                  className="capitalize text-[10px] font-medium h-5 px-2"
                >
                  {roles[0]}
                </Badge>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="gap-2.5 h-8 text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>{t("signOut")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
});
