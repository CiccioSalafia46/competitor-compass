import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center animate-fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mx-auto mb-6">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link to="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
