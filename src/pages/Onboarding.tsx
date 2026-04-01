import { useState, useRef, useEffect, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useOnboarding, type OnboardingStep } from "@/hooks/useOnboarding";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, Loader2, ArrowRight, ArrowLeft, Check, Plus, Trash2,
  Mail, Users, Lightbulb, Newspaper, Sparkles, Inbox, Globe,
  CheckCircle, SkipForward, Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return <OnboardingContent />;
}

const STEP_META: Record<OnboardingStep, { title: string; subtitle: string; icon: any }> = {
  welcome: { title: "Welcome", subtitle: "Get started", icon: Sparkles },
  workspace: { title: "Workspace", subtitle: "Your team hub", icon: BarChart3 },
  competitors: { title: "Competitors", subtitle: "Track rivals", icon: Users },
  gmail: { title: "Gmail", subtitle: "Import emails", icon: Mail },
  import: { title: "Import", subtitle: "Your data", icon: Inbox },
  insights: { title: "Insights", subtitle: "AI analysis", icon: Lightbulb },
  done: { title: "Ready", subtitle: "All set", icon: Rocket },
};

function OnboardingContent() {
  const navigate = useNavigate();
  const { workspaces, currentWorkspace } = useWorkspace();
  const {
    currentStep, completeStep, skipStep, isStepComplete,
    progress, checklist, stepOrder,
  } = useOnboarding();

  type VisibleStep = Exclude<OnboardingStep, "done">;
  const toVisible = (s: OnboardingStep): VisibleStep => s === "done" ? "insights" : s as VisibleStep;

  const [activeStep, setActiveStep] = useState<VisibleStep>(
    workspaces.length === 0 ? "welcome" : toVisible(currentStep)
  );

  // If workspace exists, skip workspace step
  useEffect(() => {
    if (workspaces.length > 0 && activeStep === "welcome") {
      setActiveStep(currentStep === "workspace" ? "competitors" : toVisible(currentStep));
    }
  }, [workspaces.length]);

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
              <span className="text-sm font-semibold text-foreground">Tracklyze</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate("/dashboard")}>
              Skip setup →
            </Button>
          </div>
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1">
            {visibleSteps.map((step, i) => {
              const meta = STEP_META[step];
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
                  {meta.title}
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
              <ArrowLeft className="h-3 w-3" /> Back
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Step {stepIndex + 1} of {visibleSteps.length}
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
  const features = [
    { icon: Newspaper, title: "Competitor Monitoring", desc: "Import and analyze competitor campaigns automatically" },
    { icon: Users, title: "Competitive Tracking", desc: "Monitor rivals' messaging, offers, and strategies" },
    { icon: Lightbulb, title: "AI Insights", desc: "Get strategic recommendations from your competitive data" },
  ];

  return (
    <div className="text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto mb-4">
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to Tracklyze</h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
        Your competitor intelligence platform. We'll help you set up in just a few minutes.
      </p>

      <div className="grid gap-3 mb-8 text-left">
        {features.map((f) => (
          <div key={f.title} className="flex items-start gap-3 rounded-lg border p-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent shrink-0">
              <f.icon className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onNext} size="lg" className="gap-2 w-full">
        Get started <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function WorkspaceStep({ onComplete }: { onComplete: () => void }) {
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
    } catch (err: any) {
      submittingRef.current = false;
      const raw = err?.message || "";
      const msg = raw.includes("row-level security") || raw.includes("violates")
        ? "Something went wrong. Please try signing out and back in."
        : raw.includes("duplicate key")
        ? "A workspace with that name already exists."
        : raw || "Failed to create workspace.";
      toast({ title: "Error", description: msg, variant: "destructive" });
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
        <h2 className="text-xl font-semibold text-foreground">Create your workspace</h2>
        <p className="text-sm text-muted-foreground mt-1">
          A workspace organizes your team's competitive intelligence
        </p>
      </div>

      <Card className="border">
        <CardContent className="p-5">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace name</Label>
              <Input
                id="workspace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Marketing"
                autoFocus
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Typically your company or team name
              </p>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isCreating || !name.trim()}>
              {isCreating ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Creating…</>
              ) : (
                <>Create workspace <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CompetitorStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
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
      toast({ title: `Added ${validCompetitors.length} competitor${validCompetitors.length > 1 ? "s" : ""}` });
      onComplete();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
        <h2 className="text-xl font-semibold text-foreground">Add your competitors</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Who are you tracking? You can always add more later.
        </p>
      </div>

      <Card className="border">
        <CardContent className="p-5 space-y-3">
          {competitors.map((comp, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Company name"
                  value={comp.name}
                  onChange={(e) => updateCompetitor(i, "name", e.target.value)}
                  autoFocus={i === 0}
                />
                <Input
                  placeholder="Website (optional)"
                  value={comp.website}
                  onChange={(e) => updateCompetitor(i, "website", e.target.value)}
                />
              </div>
              {competitors.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" onClick={() => removeRow(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}

          {competitors.length < 10 && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full" onClick={addRow}>
              <Plus className="h-3 w-3" /> Add another competitor
            </Button>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onSkip} className="flex-1 gap-1.5">
              <SkipForward className="h-3.5 w-3.5" /> Skip for now
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || validCompetitors.length === 0}
              className="flex-1 gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GmailStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { isConnected, connect, loading } = useGmailConnection();
  const { isAdmin } = useRoles();
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  // Check URL params for OAuth result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      toast({ title: "Gmail connected!" });
      onComplete();
    }
  }, []);

  // If already connected
  useEffect(() => {
    if (!loading && isConnected) onComplete();
  }, [loading, isConnected, onComplete]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setConnecting(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent mx-auto mb-3">
          <Mail className="h-5 w-5 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Connect Gmail</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically import competitor newsletters from your inbox
        </p>
      </div>

      <Card className="border">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2.5 rounded-md bg-accent/50 p-3">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Read-only access</p>
                <p className="text-xs text-muted-foreground">We never send emails or modify your inbox</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-md bg-accent/50 p-3">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Smart classification</p>
                <p className="text-xs text-muted-foreground">AI identifies newsletters vs regular emails</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-md bg-accent/50 p-3">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Disconnect anytime</p>
                <p className="text-xs text-muted-foreground">Revoke access from settings whenever you want</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onSkip} className="flex-1 gap-1.5">
              <SkipForward className="h-3.5 w-3.5" /> Skip for now
            </Button>
            {isAdmin ? (
              <Button onClick={handleConnect} disabled={connecting || loading} className="flex-1 gap-1.5">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {connecting ? "Redirecting…" : "Connect Gmail"}
              </Button>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Ask a workspace admin to connect Gmail</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ImportStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="text-center mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent mx-auto mb-3">
          <Inbox className="h-5 w-5 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Import your first data</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how to get competitor data into the platform
        </p>
      </div>

      <div className="grid gap-3">
        {[
          {
            icon: Mail,
            title: "Gmail sync",
            desc: "If you connected Gmail, competitor communications will appear automatically in your inbox",
            action: () => { onComplete(); },
            label: "Continue",
            disabled: false,
          },
          {
            icon: Newspaper,
            title: "Paste a newsletter",
            desc: "Manually paste newsletter HTML or text for immediate analysis",
            action: () => navigate("/newsletters/new"),
            label: "Add newsletter",
            disabled: false,
          },
        ].map((opt) => (
          <Card key={opt.title} className="border cursor-pointer hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent shrink-0">
                <opt.icon className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{opt.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={opt.action} disabled={opt.disabled}>
                {opt.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center mt-4">
        <Button variant="ghost" size="sm" onClick={onSkip} className="gap-1.5 text-xs text-muted-foreground">
          <SkipForward className="h-3 w-3" /> Skip for now
        </Button>
      </div>
    </div>
  );
}

function InsightsStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  return (
    <div className="text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto mb-4">
        <Rocket className="h-6 w-6 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">You're all set!</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Your workspace is ready. As data flows in, AI will generate insights, alerts, and strategic recommendations automatically.
      </p>

      <div className="grid gap-3 mb-6 text-left max-w-sm mx-auto">
        {[
          { icon: Lightbulb, label: "AI insights generated from newsletter patterns" },
          { icon: BarChart3, label: "Analytics dashboards updated in real-time" },
          { icon: Users, label: "Competitor activity tracked continuously" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 text-sm">
            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <Button onClick={onComplete} size="lg" className="gap-2 w-full max-w-sm">
        Go to Dashboard <ArrowRight className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onSkip} className="mt-2 text-xs text-muted-foreground">
        I'll explore on my own
      </Button>
    </div>
  );
}
