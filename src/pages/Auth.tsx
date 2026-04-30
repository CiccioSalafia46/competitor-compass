import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { useTranslation } from "react-i18next";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("auth");

  if (!loading && user) return <Navigate to="/redirect" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
        toast({ title: t("accountCreated"), description: t("checkEmailVerification") });
      } else {
        await signIn(email, password);
        navigate("/redirect");
      }
    } catch (error) {
      const msg = getErrorMessage(error, t("somethingWentWrong"));
      let description = msg;
      if (msg.includes("password") && (msg.includes("leaked") || msg.includes("breach") || msg.includes("compromised") || msg.includes("HIBP"))) {
        description = t("passwordBreach");
      } else if (msg.includes("password") && (msg.includes("weak") || msg.includes("short") || msg.includes("strength"))) {
        description = t("passwordWeak");
      }
      toast({ title: t("error"), description, variant: "destructive" });
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
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">{t("brand")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("tagline")}</p>
          </div>
        </div>

        <Card className="border shadow-md">
          <CardHeader className="pb-4 space-y-1.5">
            <CardTitle className="text-lg">{isSignUp ? t("createAccount") : t("signIn")}</CardTitle>
            <CardDescription className="text-sm">
              {isSignUp ? t("startMonitoring") : t("welcomeBack")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">{t("nameLabel")}</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("namePlaceholder")} className="h-10" autoComplete="name" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t("emailLabel")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} required className="h-10" autoComplete="email" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">{t("passwordLabel")}</Label>
                  {!isSignUp && (
                    <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                      {t("forgotPassword")}
                    </Link>
                  )}
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("passwordPlaceholder")} required minLength={6} className="h-10" autoComplete={isSignUp ? "new-password" : "current-password"} />
              </div>
              <Button type="submit" className="w-full h-10 text-sm font-semibold mt-2" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {isSignUp ? t("creatingAccount") ?? t("createAccount") : t("signingIn") ?? t("signIn")}</>
                ) : isSignUp ? t("createAccount") : t("signIn")}
              </Button>
            </form>
            <div className="mt-5 text-center">
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {isSignUp ? t("alreadyHaveAccount") : t("dontHaveAccount")}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
