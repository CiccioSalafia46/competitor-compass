import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoles, type AppRole } from "@/hooks/useRoles";
import { useWorkspace } from "@/hooks/useWorkspace";

type MinimumRole = AppRole | "viewer";

function RouteGuardLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function RouteGuard({
  children,
  minimumRole = "viewer",
  requireVerified = false,
  fallbackPath = "/dashboard",
}: {
  children: React.ReactNode;
  minimumRole?: MinimumRole;
  requireVerified?: boolean;
  fallbackPath?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const { loading: rolesLoading, hasRole } = useRoles();
  const { loading: workspaceLoading, currentWorkspace } = useWorkspace();

  if (authLoading || rolesLoading || workspaceLoading) {
    return <RouteGuardLoader label="Verifying access..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireVerified && !user.email_confirmed_at) {
    return <Navigate to="/settings?verify=email" replace />;
  }

  if (!currentWorkspace) {
    return <Navigate to="/onboarding" replace />;
  }

  const allowed =
    minimumRole === "viewer" ? true : hasRole(minimumRole);

  if (!allowed) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
