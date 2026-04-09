import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";

/**
 * After auth, routes user to onboarding (if no workspace) or dashboard.
 */
export default function AuthRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: wsLoading, error, refetch } = useWorkspace();

  if (authLoading || wsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h1 className="text-sm font-semibold text-foreground">Workspace bootstrap failed</h1>
          <p className="mt-2 text-xs text-muted-foreground">{error}</p>
          <Button className="mt-4" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }
  if (workspaces.length === 0) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/dashboard" replace />;
}
