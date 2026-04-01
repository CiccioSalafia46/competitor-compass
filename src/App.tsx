import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Newsletters from "./pages/Newsletters";
import NewNewsletter from "./pages/NewNewsletter";
import NewsletterDetail from "./pages/NewsletterDetail";
import NewsletterInbox from "./pages/NewsletterInbox";
import NewsletterReader from "./pages/NewsletterReader";
import Competitors from "./pages/Competitors";
import AnalysisView from "./pages/AnalysisView";
import SettingsPage from "./pages/Settings";
import TeamManagement from "./pages/TeamManagement";
import UsageDashboard from "./pages/UsageDashboard";
import AuthRedirect from "./components/AuthRedirect";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/redirect" element={<AuthRedirect />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inbox" element={<NewsletterInbox />} />
                <Route path="/inbox/:id" element={<NewsletterReader />} />
                <Route path="/newsletters" element={<Newsletters />} />
                <Route path="/newsletters/new" element={<NewNewsletter />} />
                <Route path="/newsletters/:id" element={<NewsletterDetail />} />
                <Route path="/competitors" element={<Competitors />} />
                <Route path="/analyses/:id" element={<AnalysisView />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/team" element={<TeamManagement />} />
                <Route path="/settings/usage" element={<UsageDashboard />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
