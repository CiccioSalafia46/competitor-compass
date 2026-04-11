import { useState, useRef, useEffect, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useOnboarding, type OnboardingStep } from "@/hooks/useOnboarding";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useRoles } from "@/hooks/useRoles";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, Loader2, ArrowRight, ArrowLeft, Check, Plus, Trash2,
  Mail, Users, Lightbulb, Newspaper, Sparkles, Inbox,
  CheckCircle, SkipForward, Rocket, ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return <OnboardingContent />;
}

function OnboardingContent() {
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();
  const { workspaces, currentWorkspace } = useWorkspace();
  const {
    currentStep, completeStep, skipStep, isStepComplete,
    progress, checklist, stepOrder,
  } = useOnboarding();

  type VisibleStep = Exclude<OnboardingStep, "done">;

  const [activeStep, setActiveStep] = useState<VisibleStep>(
    workspaces.length === 0 ? "welcome" : currentStep === "done" ? "insights" : currentStep
  );

  // If workspace exists, skip workspace step
  useEffect(() => {
    if (workspaces.length > 0 && activeStep === "welcome") {
      setActiveStep(currentStep === "workspace" ? "competitors" : currentStep === "done" ? "insights" : currentStep);
    }
  }, [activeStep, currentStep, workspaces.length]);

  const visibleSteps = stepOrder.filter((s): s is VisibleStep => s !== "done");
  const stepIndex = visibleSteps.indexOf(activeStep);
  const canGoBack = stepIndex > 0 && activeStep !== "welcome";

  const goNext = useCallback(() => {
    const idx = visibleSteps.indexOf(activeStep);
    if (idx < visibleSteps.length - 1) {
      setActiveStep(visibleSteps[idx + 1]);
    } else {
      navigate("/dashboard");
    }
  }, [activeStep, visibleSteps, navigate]);

  const goBack = useCallback(() => {
    const idx = visibleSteps.indexOf(activeStep);
    if (idx > 0) setActiveStep(visibleSteps[idx - 1]);
  }, [activeStep, visibleSteps]);

  const handleSkip = useCallback(() => {
    skipStep(activeStep);
    goNext();
  }, [activeStep, skipStep, goNext]);

  const handleComplete = useCallback(
    (step: OnboardingStep) => {
      completeStep(step);
      goNext();
    },
    [completeStep, goNext]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Progress Bar */}
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shrink-0">
                <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">{t("appName")}</span>
            </div>
            {workspaces.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/dashboard")}>
                {t("skipSetup")}
              </Button>
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1">
            {visibleSteps.map((step, i) => {
              const done = isStepComplete(step);
              const active = step === activeStep;
              return (
                <button
                  key={step}
                  onClick={() => setActiveStep(step)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px]">
                      {i + 1}
                    </span>
                  )}
                  {t(`steps.${step}.title`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg animate-fade-in" key={activeStep}>
          {activeStep === "welcome" && (
            <WelcomeStep onNext={() => {
              completeStep("welcome");
              setActiveStep(workspaces.length > 0 ? "competitors" : "workspace");
            }} />
          )}
          {activeStep === "workspace" && (
            <WorkspaceStep onComplete={() => handleComplete("workspace")} />
          )}
          {activeStep === "verify" && (
            <VerifyEmailStep onComplete={() => handleComplete("verify")} onSkip={handleSkip} />
          )}
          {activeStep === "competitors" && (
            <CompetitorStep onComplete={() => handleComplete("competitors")} onSkip={handleSkip} />
          )}
          {activeStep === "gmail" && (
            <GmailStep onComplete={() => handleComplete("gmail")} onSkip={handleSkip} />
          )}
          {activeStep === "import" && (
            <ImportStep onComplete={() => handleComplete("import")} onSkip={handleSkip} />
          )}
          {activeStep === "insights" && (
            <InsightsStep onComplete={() => {
              completeStep("insights");
              navigate("/dashboard");
            }} onSkip={() => {
              skipStep("insights");
              navigate("/dashboard");
            }} />
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      {activeStep !== "welcome" && (
        <div className="border-t bg-card">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={goBack} disabled={!canGoBack} className="gap-1.5 text-xs">
              <ArrowLeft className="h-3 w-3" /> {t("back")}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {t("stepOf", { current: stepIndex + 1, total: visibleSteps.length })}
            </span>
            <div />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ STEP COMPONENTS ============ */

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation("onboarding");

  const features: { icon: LucideIcon; key: "monitoring" | "tracking" | "insights" }[] = [
    { icon: Newspaper, key: "monitoring" },
    { icon: Users, key: "tracking" },
    { icon: Lightbulb, key: "insights" },
  ];

  return (
    <div className="text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto mb-4">
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">{t("welcome.title")}</h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
        {t("welcome.subtitle")}
      </p>

      <div className="grid gap-3 mb-8 text-left">
        {features.map((f) => (
          <div key={f.key} className="flex items-start gap-3 rounded-lg border p-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent shrink-0">
              <f.icon className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t(`welcome.features.${f.key}.title`)}</p>
              <p className="text-xs text-muted-foreground">{t(`welcome.features.${f.key}.desc`)}</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onNext} size="lg" className="gap-2 w-full">
        {t("welcome.getStarted")} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function WorkspaceStep({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation("onboarding");
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const submittingRef = useRef(false);
  const { createWorkspace, workspaces } = useWorkspace();
  const { toast } = useToast();

  // If workspace already exists, skip
  useEffect(() => {
    if (workspaces.length > 0) onComplete();
  }, [workspaces.length, onComplete]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submittingRef.current) return;
    submittingRef.current = true;
    setIsCreating(true);
    try {
      await createWorkspace(name.trim());
      onComplete();
    } catch (error) {
      submittingRef.current = false;
      const raw = getErrorMessage(error, "");
      const msg = raw.includes("row-level security") || raw.includes("violates")
        ? t("workspace.errorRls")
        : raw.includes("duplicate key")
        ? t("workspace.errorDuplicate")
        : raw || t("workspace.errorGeneric");
      toast({ title: t("workspace.errorGeneric"), description: msg, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent mx-auto mb-3">
          <BarChart3 className="h-5 w-5 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t("workspace.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("workspace.subtitle")}</p>
      </div>

      <Card className="border">
        <CardContent className="p-5">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace">{t("workspace.label")}</Label>
              <Input
                id="workspace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("workspace.placeholder")}
                autoFocus
                required
              />
              <p className="text-[11px] text-muted-foreground">
                {t("workspace.hint")}
              </p>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isCreating || !name.trim()}>
              {isCreating ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{t("workspace.creating")}</>
              ) : (
                <>{t("workspace.create")} <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CompetitorStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { t } = useTranslation("onboarding");
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [competitors, setCompetitors] = useState<{ name: string; website: string }[]>([
    { name: "", website: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const updateCompetitor = (i: number, field: "name" | "website", value: string) => {
    setCompetitors((prev) => prev.map((c, j) => (j === i ? { ...c, [field]: value } : c)));
  };

  const addRow = () => {
    if (competitors.length < 10) {
      setCompetitors((prev) => [...prev, { name: "", website: "" }]);
    }
  };

  const removeRow = (i: number) => {
    setCompetitors((prev) => prev.filter((_, j) => j !== i));
  };

  const validCompetitors = competitors.filter((c) => c.name.trim());

  const handleSave = async () => {
    if (!currentWorkspace || validCompetitors.length === 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("competitors").insert(
        validCompetitors.map((c) => ({
          workspace_id: currentWorkspace.id,
          name: c.name.trim(),
          website: c.website.trim() || null,
        }))
      );
      if (error) throw error;
      const key = validCompetitors.length === 1 ? "competitors.addedSingle" : "competitors.addedMultiple";
      toast({ title: t(key, { count: validCompetitors.length }) });
      onComplete();
    } catch (error) {
      toast({ title: t("workspace.errorGeneric"), description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent mx-auto mb-3">
          <Users className="h-5 w-5 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t("competitors.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("competitors.subtitle")}</p>
      </div>

      <Card className="border">
        <CardContent className="p-5 space-y-3">
          {competitors.map((comp, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder={t("competitors.namePlaceholder")}
                  value={comp.name}
                  onChange={(e) => updateCompetitor(i, "name", e.target.value)}
                  autoFocus={i === 0}
                />
                <Input
                  placeholder={t("competitors.websitePlaceholder")}
                  value={comp.website}
                  onChange={(e) => updateCompetitor(i, "website", e.target.value)}
                />
              </div>
              {competitors.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" onClick={() => removeRow(i)} aria-label="Remove competitor">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}

          {competitors.length < 10 && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full" onClick={addRow}>
              <Plus className="h-3 w-3" /> {t("competitors.addAnother")}
            </Button>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onSkip} className="flex-1 gap-1.5">
              <SkipForward className="h-3.5 w-3.5" /> {t("competitors.skipForNow")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || validCompetitors.length === 0}
              className="flex-1 gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {t("competitors.continue")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VerifyEmailStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { t } = useTranslation("onboarding");
  const { user } = useAuth();
  const { isVerified, resendVerification, resending } = useEmailVerification();
  const { toast } = useToast();

  // Auto-advance if already verified
  useEffect(() => {
    if (isVerified) onComplete();
  }, [isVerified, onComplete]);

  const handleResend = async () => {
    await resendVerification();
    toast({ title: t("verify.resentTitle"), description: t("verify.resentDesc") });
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent mx-auto mb-3">
          <ShieldCheck className="h-5 w-5 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t("verify.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("verify.subtitle")}</p>
      </div>

      <Card className="border">
        <CardContent className="p-5 space-y-4">
          <div className="rounded-md bg-accent/50 p-3 text-sm">
            <p className="text-muted-foreground">
              {t("verify.sentTo")}{" "}
              <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          </div>

          <div className="space-y-2 text-sm">
            {(["inbox", "newsletter", "meta"] as const).map((key) => (
              <div key={key} className="flex items-start gap-2.5 rounded-md bg-accent/30 p-2.5">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-muted-foreground">{t(`verify.features.${key}`)}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onSkip} className="flex-1 gap-1.5">
              <SkipForward className="h-3.5 w-3.5" /> {t("verify.skipForNow")}
            </Button>
            <Button
              onClick={handleResend}
              disabled={resending}
              variant="outline"
              className="flex-1 gap-1.5"
            >
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {t("verify.resend")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GmailStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { t } = useTranslation("onboarding");
  const { isConnected, connect, loading } = useGmailConnection();
  const { isAdmin } = useRoles();
  const { isVerified, requireVerification } = useEmailVerification();
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  // Check URL params for OAuth result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      toast({ title: t("gmail.connected") });
      onComplete();
    }
  }, [onComplete, toast, t]);

  // If already connected
  useEffect(() => {
    if (!loading && isConnected) onComplete();
  }, [loading, isConnected, onComplete]);

  const handleConnect = async () => {
    if (!requireVerification("connect Gmail")) {
      return;
    }
    setConnecting(true);
    try {
      await connect();
    } catch (error) {
      toast({ title: t("workspace.errorGeneric"), description: getErrorMessage(error), variant: "destructive" });
      setConnecting(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent mx-auto mb-3">
          <Mail className="h-5 w-5 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t("gmail.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("gmail.subtitle")}</p>
      </div>

      <Card className="border">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2 text-sm">
            {(["readOnly", "smartClassification", "disconnect"] as const).map((key) => (
              <div key={key} className="flex items-start gap-2.5 rounded-md bg-accent/50 p-3">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{t(`gmail.${key}.title`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`gmail.${key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onSkip} className="flex-1 gap-1.5">
              <SkipForward className="h-3.5 w-3.5" /> {t("gmail.skipForNow")}
            </Button>
            {isAdmin ? (
              <Button
                onClick={handleConnect}
                disabled={connecting || loading || !isVerified}
                className="flex-1 gap-1.5"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {connecting ? t("gmail.connecting") : t("gmail.connect")}
              </Button>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">{t("gmail.askAdmin")}</p>
              </div>
            )}
          </div>
          {!isVerified && (
            <p className="text-xs text-muted-foreground">{t("gmail.verifyFirst")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImportStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();

  const options: { icon: LucideIcon; key: "gmailSync" | "pasteContent"; action: () => void }[] = [
    {
      icon: Mail,
      key: "gmailSync",
      action: () => { onComplete(); },
    },
    {
      icon: Newspaper,
      key: "pasteContent",
      action: () => navigate("/newsletters/new"),
    },
  ];

  return (
    <div>
      <div className="text-center mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent mx-auto mb-3">
          <Inbox className="h-5 w-5 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t("import.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("import.subtitle")}</p>
      </div>

      <div className="grid gap-3">
        {options.map((opt) => (
          <Card key={opt.key} className="border cursor-pointer hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent shrink-0">
                <opt.icon className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t(`import.${opt.key}.title`)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(`import.${opt.key}.desc`)}</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={opt.action}>
                {t(`import.${opt.key}.label`)}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center mt-4">
        <Button variant="ghost" size="sm" onClick={onSkip} className="gap-1.5 text-xs text-muted-foreground">
          <SkipForward className="h-3 w-3" /> {t("import.skipForNow")}
        </Button>
      </div>
    </div>
  );
}

function InsightsStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { t } = useTranslation("onboarding");

  const bullets: { icon: LucideIcon; key: "insights" | "analytics" | "tracking" }[] = [
    { icon: Lightbulb, key: "insights" },
    { icon: BarChart3, key: "analytics" },
    { icon: Users, key: "tracking" },
  ];

  return (
    <div className="text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto mb-4">
        <Rocket className="h-6 w-6 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">{t("insights.title")}</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        {t("insights.subtitle")}
      </p>

      <div className="grid gap-3 mb-6 text-left max-w-sm mx-auto">
        {bullets.map((item) => (
          <div key={item.key} className="flex items-center gap-2.5 text-sm">
            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">{t(`insights.bullets.${item.key}`)}</span>
          </div>
        ))}
      </div>

      <Button onClick={onComplete} size="lg" className="gap-2 w-full max-w-sm">
        {t("insights.goToDashboard")} <ArrowRight className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onSkip} className="mt-2 text-xs text-muted-foreground">
        {t("insights.exploreOwn")}
      </Button>
    </div>
  );
}
