import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();

  // Protect: redirect unauthenticated users
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return <OnboardingContent />;
}

// Separate component to avoid hook rules issues with early return
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BarChart3 } from "lucide-react";

function OnboardingContent() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { createWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setIsCreating(true);
    try {
      await createWorkspace(workspaceName.trim());
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err?.message?.includes("row-level security")
        ? "Something went wrong creating your workspace. Please try signing out and back in."
        : err?.message || "Failed to create workspace. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Welcome!</h1>
          <p className="text-sm text-muted-foreground text-center">
            Create your first workspace to start tracking competitor newsletters
          </p>
        </div>

        <Card className="shadow-card border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Create workspace</CardTitle>
            <CardDescription>A workspace contains your team's competitive intelligence</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace name</Label>
                <Input
                  id="workspace"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="My Company"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isCreating || !workspaceName.trim()}>
                {isCreating ? "Creating..." : "Create workspace"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
