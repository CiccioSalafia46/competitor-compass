import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
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
import { RadarLoader } from "@/components/RadarLoader";

function AdminGuardWrapper({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}

// Eagerly loaded (always needed on first paint)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthRedirect from "./components/AuthRedirect";

// Lazy loaded pages — wrapped with retry for resilient chunk loading after deploys
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Newsletters = lazyWithRetry(() => import("./pages/Newsletters"));
const NewNewsletter = lazyWithRetry(() => import("./pages/NewNewsletter"));
const NewsletterDetail = lazyWithRetry(() => import("./pages/NewsletterDetail"));
const NewsletterInbox = lazyWithRetry(() => import("./pages/NewsletterInbox"));
const NewsletterReader = lazyWithRetry(() => import("./pages/NewsletterReader"));
const Competitors = lazyWithRetry(() => import("./pages/Competitors"));
const AnalysisView = lazyWithRetry(() => import("./pages/AnalysisView"));
const SettingsPage = lazyWithRetry(() => import("./pages/Settings"));
const TeamManagement = lazyWithRetry(() => import("./pages/TeamManagement"));
const UsageDashboard = lazyWithRetry(() => import("./pages/UsageDashboard"));
const Billing = lazyWithRetry(() => import("./pages/Billing"));
const MetaAds = lazyWithRetry(() => import("./pages/MetaAds"));
const MetaAdsCompare = lazyWithRetry(() => import("./pages/MetaAdsCompare"));
const Insights = lazyWithRetry(() => import("./pages/Insights"));
const Analytics = lazyWithRetry(() => import("./pages/Analytics"));
const Alerts = lazyWithRetry(() => import("./pages/Alerts"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));

// Admin pages
const AdminLayout = lazyWithRetry(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazyWithRetry(() => import("./pages/admin/AdminUsers"));
const AdminWorkspaces = lazyWithRetry(() => import("./pages/admin/AdminWorkspaces"));
const AdminLogs = lazyWithRetry(() => import("./pages/admin/AdminLogs"));
const AdminIntegrations = lazyWithRetry(() => import("./pages/admin/AdminIntegrations"));
const AdminIssues = lazyWithRetry(() => import("./pages/admin/AdminIssues"));
const AdminSecrets = lazyWithRetry(() => import("./pages/admin/AdminSecrets"));
const AdminBilling = lazyWithRetry(() => import("./pages/admin/AdminBilling"));
const AdminSystemHealth = lazyWithRetry(() => import("./pages/admin/AdminSystemHealth"));

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
      <RadarLoader label="Loading…" />
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
                    <Route path="/weekly-briefing" element={<Navigate to="/reports" replace />} />
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
