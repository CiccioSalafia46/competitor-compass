import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import AppLayout from "./components/AppLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { RouteGuard } from "@/components/RouteGuard";

function AdminGuardWrapper({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}

// Eagerly loaded (always needed on first paint)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthRedirect from "./components/AuthRedirect";

// Lazy loaded pages
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Newsletters = lazy(() => import("./pages/Newsletters"));
const NewNewsletter = lazy(() => import("./pages/NewNewsletter"));
const NewsletterDetail = lazy(() => import("./pages/NewsletterDetail"));
const NewsletterInbox = lazy(() => import("./pages/NewsletterInbox"));
const NewsletterReader = lazy(() => import("./pages/NewsletterReader"));
const Competitors = lazy(() => import("./pages/Competitors"));
const AnalysisView = lazy(() => import("./pages/AnalysisView"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const UsageDashboard = lazy(() => import("./pages/UsageDashboard"));
const Billing = lazy(() => import("./pages/Billing"));
const MetaAds = lazy(() => import("./pages/MetaAds"));
const MetaAdsCompare = lazy(() => import("./pages/MetaAdsCompare"));
const Insights = lazy(() => import("./pages/Insights"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Reports = lazy(() => import("./pages/Reports"));
const WeeklyBriefing = lazy(() => import("./pages/WeeklyBriefing"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));

// Admin pages
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminWorkspaces = lazy(() => import("./pages/admin/AdminWorkspaces"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminIntegrations = lazy(() => import("./pages/admin/AdminIntegrations"));
const AdminIssues = lazy(() => import("./pages/admin/AdminIssues"));
const AdminSecrets = lazy(() => import("./pages/admin/AdminSecrets"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminSystemHealth = lazy(() => import("./pages/admin/AdminSystemHealth"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min
      gcTime: 1000 * 60 * 10, // 10 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <LanguageProvider>
          <WorkspaceProvider>
            <SubscriptionProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/redirect" element={<AuthRedirect />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<RouteGuard><Dashboard /></RouteGuard>} />
                    <Route path="/inbox" element={<RouteGuard requireVerified><NewsletterInbox /></RouteGuard>} />
                    <Route path="/inbox/:id" element={<RouteGuard requireVerified><NewsletterReader /></RouteGuard>} />
                    <Route path="/newsletters" element={<RouteGuard><Newsletters /></RouteGuard>} />
                    <Route path="/newsletters/new" element={<RouteGuard minimumRole="analyst" requireVerified><NewNewsletter /></RouteGuard>} />
                    <Route path="/newsletters/:id" element={<RouteGuard requireVerified><NewsletterDetail /></RouteGuard>} />
                    <Route path="/competitors" element={<RouteGuard requireVerified><Competitors /></RouteGuard>} />
                    <Route path="/meta-ads" element={<RouteGuard minimumRole="analyst" requireVerified><MetaAds /></RouteGuard>} />
                    <Route path="/meta-ads/compare" element={<RouteGuard minimumRole="analyst" requireVerified><MetaAdsCompare /></RouteGuard>} />
                    <Route path="/insights" element={<RouteGuard minimumRole="analyst" requireVerified><Insights /></RouteGuard>} />
                    <Route path="/weekly-briefing" element={<RouteGuard minimumRole="analyst" requireVerified><WeeklyBriefing /></RouteGuard>} />
                    <Route path="/analytics" element={<RouteGuard><Analytics /></RouteGuard>} />
                    <Route path="/reports" element={<RouteGuard requireVerified><Reports /></RouteGuard>} />
                    <Route path="/alerts" element={<RouteGuard requireVerified><Alerts /></RouteGuard>} />
                    <Route path="/analyses/:id" element={<RouteGuard requireVerified><AnalysisView /></RouteGuard>} />
                    <Route path="/settings" element={<RouteGuard><SettingsPage /></RouteGuard>} />
                    <Route path="/settings/team" element={<RouteGuard minimumRole="admin"><TeamManagement /></RouteGuard>} />
                    <Route path="/settings/usage" element={<RouteGuard minimumRole="admin"><UsageDashboard /></RouteGuard>} />
                    <Route path="/settings/billing" element={<RouteGuard minimumRole="admin"><Billing /></RouteGuard>} />
                    <Route path="/billing" element={<Navigate to="/settings/billing" replace />} />
                  </Route>
                  {/* Admin Panel — isolated from main app layout */}
                  <Route path="/admin" element={<AdminGuardWrapper><AdminLayout /></AdminGuardWrapper>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="workspaces" element={<AdminWorkspaces />} />
                    <Route path="logs" element={<AdminLogs />} />
                    <Route path="integrations" element={<AdminIntegrations />} />
                    <Route path="issues" element={<AdminIssues />} />
                    <Route path="secrets" element={<AdminSecrets />} />
                    <Route path="billing" element={<AdminBilling />} />
                    <Route path="health" element={<AdminSystemHealth />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </SubscriptionProvider>
          </WorkspaceProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
