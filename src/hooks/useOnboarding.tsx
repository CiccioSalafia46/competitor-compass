import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingStep =
  | "welcome"
  | "workspace"
  | "verify"
  | "competitors"
  | "gmail"
  | "import"
  | "insights"
  | "done";

const STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "workspace",
  "verify",
  "competitors",
  "gmail",
  "import",
  "insights",
  "done",
];

interface OnboardingState {
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];
  dismissed: boolean;
}

const STORAGE_KEY = "onboarding_state";

function loadState(workspaceId?: string): OnboardingState {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${workspaceId || "global"}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore invalid localStorage data and fall back to the default state.
  }
  return { completedSteps: [], skippedSteps: [], dismissed: false };
}

function saveState(state: OnboardingState, workspaceId?: string) {
  localStorage.setItem(`${STORAGE_KEY}_${workspaceId || "global"}`, JSON.stringify(state));
}

export function useOnboarding() {
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useWorkspace();
  const { isConnected: gmailConnected, loading: gmailLoading } = useGmailConnection();
  const emailVerified = !!user?.email_confirmed_at;
  const [state, setState] = useState<OnboardingState>(() => loadState(currentWorkspace?.id));
  const [competitorCount, setCompetitorCount] = useState<number | null>(null);
  const [inboxCount, setInboxCount] = useState<number | null>(null);
  const [insightCount, setInsightCount] = useState<number | null>(null);
  const [countsLoaded, setCountsLoaded] = useState(false);

  // Reload state when workspace changes
  useEffect(() => {
    setState(loadState(currentWorkspace?.id));
    setCountsLoaded(false);
  }, [currentWorkspace?.id]);

  // Fetch live counts
  useEffect(() => {
    if (!currentWorkspace) return;
    const fetch = async () => {
      try {
        const [comp, inbox, insights] = await Promise.all([
          supabase.from("competitors").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
          supabase.from("newsletter_inbox").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
          supabase.from("insights").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
        ]);
        setCompetitorCount(comp.count || 0);
        setInboxCount(inbox.count || 0);
        setInsightCount(insights.count || 0);
        setCountsLoaded(true);
      } catch (err) {
        console.error("[useOnboarding] failed to fetch counts", err);
      }
    };
    void fetch();
  }, [currentWorkspace]);

  const persist = useCallback(
    (newState: OnboardingState) => {
      setState(newState);
      saveState(newState, currentWorkspace?.id);
    },
    [currentWorkspace?.id]
  );

  const completeStep = useCallback(
    (step: OnboardingStep) => {
      persist({
        ...state,
        completedSteps: [...new Set([...state.completedSteps, step])],
      });
    },
    [state, persist]
  );

  const skipStep = useCallback(
    (step: OnboardingStep) => {
      persist({
        ...state,
        skippedSteps: [...new Set([...state.skippedSteps, step])],
      });
    },
    [state, persist]
  );

  const dismiss = useCallback(() => {
    persist({ ...state, dismissed: true });
  }, [state, persist]);

  // Auto-detect completed steps from live data
  const autoCompleted = useMemo(() => {
    const auto: OnboardingStep[] = [];
    if (workspaces.length > 0) auto.push("workspace");
    if (emailVerified) auto.push("verify");
    if ((competitorCount ?? 0) > 0) auto.push("competitors");
    if (gmailConnected) auto.push("gmail");
    if ((inboxCount ?? 0) > 0) auto.push("import");
    if ((insightCount ?? 0) > 0) auto.push("insights");
    return auto;
  }, [workspaces, emailVerified, competitorCount, gmailConnected, inboxCount, insightCount]);

  const allCompleted = useMemo(
    () => [...new Set([...state.completedSteps, ...autoCompleted])],
    [state.completedSteps, autoCompleted]
  );

  const isStepComplete = useCallback(
    (step: OnboardingStep) => allCompleted.includes(step),
    [allCompleted]
  );

  const isStepSkipped = useCallback(
    (step: OnboardingStep) => state.skippedSteps.includes(step),
    [state.skippedSteps]
  );

  // The next incomplete, non-skipped step
  const currentStep = useMemo(() => {
    for (const step of STEP_ORDER) {
      if (step === "done") continue;
      if (!allCompleted.includes(step) && !state.skippedSteps.includes(step)) {
        return step;
      }
    }
    return "done" as OnboardingStep;
  }, [allCompleted, state.skippedSteps]);

  // Activation checklist items for dashboard
  const checklist = useMemo(
    () => [
      { key: "workspace" as const, label: "Create workspace", done: isStepComplete("workspace") },
      { key: "verify" as const, label: "Verify email", done: isStepComplete("verify") },
      { key: "competitors" as const, label: "Add competitors", done: isStepComplete("competitors") },
      { key: "gmail" as const, label: "Connect Gmail", done: isStepComplete("gmail") },
      { key: "import" as const, label: "Import newsletters", done: isStepComplete("import") },
      { key: "insights" as const, label: "Get first insights", done: isStepComplete("insights") },
    ],
    [isStepComplete]
  );

  const progress = useMemo(() => {
    const done = checklist.filter((c) => c.done).length;
    return Math.round((done / checklist.length) * 100);
  }, [checklist]);

  const isComplete = progress === 100;

  // loading=true until both Gmail state and live counts are resolved,
  // so callers can gate on accurate data before computing the current step.
  const loading = gmailLoading || (!!currentWorkspace && !countsLoaded);

  return {
    currentStep,
    completeStep,
    skipStep,
    isStepComplete,
    isStepSkipped,
    dismiss,
    dismissed: state.dismissed,
    checklist,
    progress,
    isComplete,
    loading,
    competitorCount,
    inboxCount,
    insightCount,
    stepOrder: STEP_ORDER,
  };
}
