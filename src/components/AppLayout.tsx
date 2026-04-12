import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { memo, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { useTranslation } from "react-i18next";
import { isTransientNavigationFetchError } from "@/lib/transient-network";

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading…</p>{/* pre-i18n intentional — translations may not be ready yet */}
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider className="overflow-x-hidden">
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <SidebarInset className="flex-1">
            <main className="flex-1 overflow-x-hidden md:overflow-y-auto scrollbar-thin">
              <ErrorBoundary>
                <div className="px-4 pt-3 sm:px-6 lg:px-8">
                  <EmailVerificationBanner />
                </div>
                <Outlet />
              </ErrorBoundary>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Memoized TopBar to avoid re-renders on every child route change
const TopBar = memo(function TopBar() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { t } = useTranslation("common");
  const [unreadCount, setUnreadCount] = useState(0);
  const [realtimeFailed, setRealtimeFailed] = useState(false);

  // Reset fallback state when workspace changes (new channel will be created)
  useEffect(() => {
    setRealtimeFailed(false);
  }, [currentWorkspace?.id]);

  const handleRealtimeError = useCallback(() => setRealtimeFailed(true), []);

  // Lightweight unread count query — only counts, no full data fetch
  const fetchUnread = useCallback(async () => {
    if (!currentWorkspace) {
      setUnreadCount(0);
      return;
    }
    const { count, error } = await supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", currentWorkspace.id)
      .eq("is_read", false)
      .eq("is_dismissed", false);
    if (error) {
      if (isTransientNavigationFetchError(error)) {
        return;
      }
      console.error("Top bar unread alerts query failed:", error);
      // Keep previous count — don't reset to 0 on non-transient errors
      return;
    }
    setUnreadCount(count || 0);
  }, [currentWorkspace]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useRealtimeTable({
    channelName: `alerts-unread:${currentWorkspace?.id ?? "none"}`,
    table: "alerts",
    filter: currentWorkspace ? `workspace_id=eq.${currentWorkspace.id}` : undefined,
    enabled: !!currentWorkspace,
    onEvent: fetchUnread,
    onError: handleRealtimeError,
  });

  // Polling fallback when Realtime subscription fails (e.g. mobile network, corporate firewall)
  useEffect(() => {
    if (!realtimeFailed || !currentWorkspace) return;
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [realtimeFailed, currentWorkspace, fetchUnread]);

  return (
    <header className="h-14 flex items-center justify-between border-b bg-card/95 backdrop-blur-sm px-3 sm:px-4 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-10 w-10 shrink-0" />
        {currentWorkspace && (
          <span className="hidden sm:block text-[13px] font-medium text-muted-foreground/70 select-none truncate max-w-[200px]">
            {currentWorkspace.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <LanguageSelector />
        <DarkModeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 relative"
          onClick={() => navigate("/alerts")}
          aria-label={t("alerts")}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
});
