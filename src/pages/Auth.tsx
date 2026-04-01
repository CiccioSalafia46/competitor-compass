import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Loader2 } from "lucide-react";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!loading && user) return <Navigate to="/redirect" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
        toast({ title: "Account created", description: "Check your email to verify your account." });
      } else {
        await signIn(email, password);
        navigate("/redirect");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Newsletter Intel</h1>
          <p className="text-xs text-muted-foreground">Competitive intelligence from newsletters</p>
        </div>

        <Card className="border shadow-md">
          <CardHeader className="pb-4 space-y-1">
            <CardTitle className="text-base">{isSignUp ? "Create account" : "Sign in"}</CardTitle>
            <CardDescription className="text-xs">
              {isSignUp ? "Start tracking competitor newsletters" : "Welcome back"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">Name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="h-9" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required className="h-9" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  {!isSignUp && (
                    <Link to="/forgot-password" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-9" />
              </div>
              <Button type="submit" className="w-full h-9 text-sm" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? "Create account" : "Sign in"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
