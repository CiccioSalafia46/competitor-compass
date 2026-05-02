import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useSubscription } from "@/hooks/useSubscription";
import { useAdminCheck } from "@/hooks/useAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  Shield, Inbox, Megaphone, Lightbulb,
  Bell, CreditCard, UserRound,
  FileText, ChevronsUpDown, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  count?: number;
};

export const AppSidebar = memo(function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();
  const { isAdmin, isAnalyst, canViewData, roles } = useRoles();
  const { isAdmin: isPlatformAdmin } = useAdminCheck();
  const { tier } = useSubscription();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { t } = useTranslation("nav");
  const workspaceId = currentWorkspace?.id ?? null;

  const { data: counts } = useQuery({
    queryKey: ["sidebar-counts", workspaceId],
    enabled: !!workspaceId,
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [inboxResult, insightsResult, alertsResult] = await Promise.all([
        supabase
          .from("newsletter_inbox")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId!)
          .eq("is_read", false),
        supabase
          .from("insights")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId!),
        supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId!)
          .eq("is_read", false)
          .eq("is_dismissed", false),
      ]);

      return {
        inbox: inboxResult.count ?? 0,
        insights: insightsResult.count ?? 0,
        alerts: alertsResult.count ?? 0,
      };
    },
  });

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/auth");
  }, [signOut, navigate]);

  const navigateTo = useCallback(
    (path: string) => {
      navigate(path);
      if (isMobile) setOpenMobile(false);
    },
    [isMobile, navigate, setOpenMobile],
  );

  const isActive = useCallback(
    (matchPrefix: string) =>
      location.pathname === matchPrefix || location.pathname.startsWith(matchPrefix + "/"),
    [location.pathname]
  );

  const coreNav = useMemo(
    () => [
      { label: t("dashboard"), icon: LayoutDashboard, path: "/dashboard", matchPrefix: "/dashboard", show: true },
      { label: t("inbox"), icon: Inbox, path: "/inbox", matchPrefix: "/inbox", show: true, count: counts?.inbox },
      { label: t("competitors"), icon: Users, path: "/competitors", matchPrefix: "/competitors", show: isAnalyst },
      { label: t("dataSources"), icon: Newspaper, path: "/newsletters", matchPrefix: "/newsletters", show: true },
    ],
    [counts?.inbox, isAnalyst, t]
  );

  const intelligenceNav = useMemo(
    () => [
      { label: t("insights"), icon: Lightbulb, path: "/insights", matchPrefix: "/insights", show: isAnalyst, count: counts?.insights },
      { label: t("reports"), icon: FileText, path: "/reports", matchPrefix: "/reports", show: canViewData },
      { label: t("alerts"), icon: Bell, path: "/alerts", matchPrefix: "/alerts", show: true, count: counts?.alerts },
      { label: t("metaAds"), icon: Megaphone, path: "/meta-ads", matchPrefix: "/meta-ads", show: isAnalyst, badge: tier !== "premium" ? t("common:premium") : undefined },
    ],
    [canViewData, counts?.alerts, counts?.insights, isAnalyst, tier, t]
  );

  const renderNavGroup = useCallback(
    (items: NavItem[], label: string) => {
      const filtered = items.filter((i) => i.show);
      if (filtered.length === 0) return null;
      return (
        <SidebarGroup>
          <SidebarGroupLabel className="section-label opacity-70">
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
                      onClick={() => navigateTo(item.path)}
                      tooltip={item.label}
                      className={cn(
                        "h-12 gap-2.5 rounded-lg text-nav transition-colors md:h-10",
                        active
                          ? "bg-accent text-accent-foreground font-medium"
                          : "font-normal text-sidebar-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0 stroke-[1.5]" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          {item.label}
                          <span className="ml-2 flex items-center gap-1.5">
                            {typeof item.count === "number" && item.count > 0 && (
                              <span className="stat-value rounded-md bg-primary/10 px-1.5 py-0.5 text-caption font-semibold text-primary">
                                {item.count > 99 ? "99+" : item.count}
                              </span>
                            )}
                            {item.badge && (
                              <Badge variant="outline" className="h-5 rounded-md px-1.5 py-0 text-caption font-normal">
                                {item.badge}
                              </Badge>
                            )}
                          </span>
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
    [collapsed, location.pathname, isActive, navigateTo]
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
              <button className="flex min-h-12 w-full items-center gap-2.5 rounded-lg bg-muted/40 px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:min-h-10">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-caption font-bold uppercase text-primary">
                  {currentWorkspace.name.charAt(0)}
                </div>
                <span className="flex-1 truncate text-nav font-medium text-foreground">
                  {currentWorkspace.name}
                </span>
                <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onSelect={() => {
                    setCurrentWorkspace(ws);
                    if (isMobile) setOpenMobile(false);
                  }}
                  className="gap-2"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-caption font-bold uppercase text-primary">
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
        <nav aria-label={t("primaryNavigation")}>
          {renderNavGroup(coreNav, t("groupWorkspace"))}
          {renderNavGroup(intelligenceNav, t("groupIntelligence"))}
        </nav>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname.startsWith("/settings")}
              onClick={() => navigateTo("/settings")}
              tooltip={t("settings")}
              className="h-12 gap-2.5 rounded-lg text-nav text-sidebar-foreground hover:bg-muted/50 hover:text-foreground md:h-10"
              aria-current={location.pathname.startsWith("/settings") ? "page" : undefined}
            >
              <Settings className="h-4 w-4 stroke-[1.5]" />
              {!collapsed && <span>{t("settings")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip={t("account")}
                  className="h-12 gap-2.5 rounded-lg text-nav text-sidebar-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <Avatar className="h-7 w-7 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-caption font-semibold uppercase text-primary">
                      {(user?.email || "U").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-xs font-medium text-foreground">{user?.email || t("account")}</span>
                      <span className="block truncate text-caption capitalize text-muted-foreground">{roles[0] || t("member")}</span>
                    </span>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  <span className="block truncate">{user?.email || t("account")}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigateTo("/settings")} className="gap-2">
                  <UserRound className="h-4 w-4" />
                  {t("profile")}
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem onSelect={() => navigateTo("/settings/billing")} className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      {t("billing")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigateTo("/settings/team")} className="gap-2">
                      <Users className="h-4 w-4" />
                      {t("team")}
                    </DropdownMenuItem>
                  </>
                )}
                {isPlatformAdmin && (
                  <DropdownMenuItem onSelect={() => navigateTo("/admin")} className="gap-2">
                    <Shield className="h-4 w-4" />
                    {t("adminPanel")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
});
