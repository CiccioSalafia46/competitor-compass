import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message;
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk") ||
    msg.includes("Importing a module script failed")
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Chunk loading error — show "new version" UI with refresh button
      if (isChunkLoadError(this.state.error)) {
        return (
          <div className="flex h-full min-h-[300px] items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3" />
              <h2 className="text-sm font-semibold text-foreground mb-1">A new version is available</h2>
              <p className="text-xs text-muted-foreground mb-4">
                The app has been updated. Please refresh to load the latest version.
              </p>
              <Button size="sm" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex h-full min-h-[300px] items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <h2 className="text-sm font-semibold text-foreground mb-1">Something went wrong</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
