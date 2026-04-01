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

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <SidebarInset className="flex-1">
            <main className="flex-1 overflow-auto scrollbar-thin">
              <ErrorBoundary>
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
  const [unreadCount, setUnreadCount] = useState(0);

  // Lightweight unread count query — only counts, no full data fetch
  const fetchUnread = useCallback(async () => {
    if (!currentWorkspace) return;
    const { count } = await supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", currentWorkspace.id)
      .eq("is_read", false)
      .eq("is_dismissed", false);
    setUnreadCount(count || 0);
  }, [currentWorkspace]);

  useEffect(() => {
    fetchUnread();
    // Poll every 60s instead of re-fetching on every render
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  return (
    <header className="h-12 flex items-center justify-between border-b bg-card px-3 shrink-0">
      <SidebarTrigger className="h-8 w-8" />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          onClick={() => navigate("/alerts")}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
});
