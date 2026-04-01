import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import AppLayout from "./components/AppLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";

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
      <BrowserRouter>
        <AuthProvider>
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
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/inbox" element={<NewsletterInbox />} />
                    <Route path="/inbox/:id" element={<NewsletterReader />} />
                    <Route path="/newsletters" element={<Newsletters />} />
                    <Route path="/newsletters/new" element={<NewNewsletter />} />
                    <Route path="/newsletters/:id" element={<NewsletterDetail />} />
                    <Route path="/competitors" element={<Competitors />} />
                    <Route path="/meta-ads" element={<MetaAds />} />
                    <Route path="/meta-ads/compare" element={<MetaAdsCompare />} />
                    <Route path="/insights" element={<Insights />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/analyses/:id" element={<AnalysisView />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/team" element={<TeamManagement />} />
                    <Route path="/settings/usage" element={<UsageDashboard />} />
                    <Route path="/settings/billing" element={<Billing />} />
                    <Route path="/billing" element={<Billing />} />
                  </Route>
                  {/* Admin Panel — isolated from main app layout */}
                  <Route path="/admin" element={<AdminGuardWrapper><AdminLayout /></AdminGuardWrapper>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="workspaces" element={<AdminWorkspaces />} />
                    <Route path="logs" element={<AdminLogs />} />
                    <Route path="integrations" element={<AdminIntegrations />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </SubscriptionProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
