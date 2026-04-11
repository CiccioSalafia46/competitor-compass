import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useGmailConnection } from "@/hooks/useGmailConnection";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: vi.fn() }));
vi.mock("@/hooks/useGmailConnection", () => ({ useGmailConnection: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ count: 0, data: [], error: null }),
      }),
    }),
  },
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseWorkspace = vi.mocked(useWorkspace);
const mockedUseGmailConnection = vi.mocked(useGmailConnection);

const WORKSPACE = { id: "ws-test", name: "Acme" };

function mockDefaults(opts: { emailConfirmedAt?: string | null; gmailConnected?: boolean; workspaces?: unknown[] } = {}) {
  mockedUseAuth.mockReturnValue({
    user: {
      id: "u-1",
      email: "test@example.com",
      email_confirmed_at: opts.emailConfirmedAt ?? null,
    },
    loading: false,
  } as never);
  mockedUseWorkspace.mockReturnValue({
    currentWorkspace: WORKSPACE,
    workspaces: opts.workspaces ?? [WORKSPACE],
    loading: false,
  } as never);
  mockedUseGmailConnection.mockReturnValue({
    isConnected: opts.gmailConnected ?? false,
    loading: false,
    connect: vi.fn(),
  } as never);
}

describe("useOnboarding — step order", () => {
  beforeEach(() => {
    localStorage.clear();
    mockDefaults();
  });

  it("includes verify step between workspace and competitors", () => {
    const { result } = renderHook(() => useOnboarding());
    const { stepOrder } = result.current;
    const wsIdx = stepOrder.indexOf("workspace");
    const verifyIdx = stepOrder.indexOf("verify");
    const competitorsIdx = stepOrder.indexOf("competitors");
    expect(verifyIdx).toBeGreaterThan(wsIdx);
    expect(verifyIdx).toBeLessThan(competitorsIdx);
  });

  it("contains all expected steps", () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.stepOrder).toEqual([
      "welcome",
      "workspace",
      "verify",
      "competitors",
      "gmail",
      "import",
      "insights",
      "done",
    ]);
  });
});

describe("useOnboarding — email verification auto-complete", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("auto-completes verify step when email is confirmed", () => {
    mockDefaults({ emailConfirmedAt: "2026-04-01T10:00:00Z" });
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.isStepComplete("verify")).toBe(true);
  });

  it("does not auto-complete verify step when email is unconfirmed", () => {
    mockDefaults({ emailConfirmedAt: null });
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.isStepComplete("verify")).toBe(false);
  });
});

describe("useOnboarding — checklist", () => {
  beforeEach(() => {
    localStorage.clear();
    mockDefaults({ emailConfirmedAt: "2026-04-01T10:00:00Z" });
  });

  it("includes verify item in checklist", () => {
    const { result } = renderHook(() => useOnboarding());
    const verifyItem = result.current.checklist.find((c) => c.key === "verify");
    expect(verifyItem).toBeDefined();
    expect(verifyItem?.done).toBe(true);
  });

  it("workspace and verify both done, welcome skipped → currentStep is competitors", () => {
    const { result } = renderHook(() => useOnboarding());
    // workspace and verify are auto-completed, but welcome is not — skip it
    act(() => { result.current.skipStep("welcome"); });
    expect(result.current.currentStep).toBe("competitors");
  });
});

describe("useOnboarding — completeStep / skipStep", () => {
  beforeEach(() => {
    localStorage.clear();
    mockDefaults({ emailConfirmedAt: null, workspaces: [] });
  });

  it("marks a step as complete", () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.isStepComplete("welcome")).toBe(false);

    act(() => { result.current.completeStep("welcome"); });

    expect(result.current.isStepComplete("welcome")).toBe(true);
  });

  it("skips a step so it is excluded from currentStep progression", () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.completeStep("welcome");
      result.current.skipStep("workspace");
    });
    // welcome done, workspace skipped → currentStep should advance past workspace
    expect(result.current.currentStep).not.toBe("workspace");
  });

  it("persists completed steps to localStorage", () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => { result.current.completeStep("welcome"); });

    const stored = JSON.parse(localStorage.getItem(`onboarding_state_${WORKSPACE.id}`) ?? "{}");
    expect(stored.completedSteps).toContain("welcome");
  });

  it("progress reaches 100 when all checklist items are done", () => {
    mockDefaults({
      emailConfirmedAt: "2026-04-01T10:00:00Z",
      workspaces: [WORKSPACE],
      gmailConnected: true,
    });
    const { result } = renderHook(() => useOnboarding());
    // Call each completeStep in a separate act() to avoid stale closure on `state`
    act(() => { result.current.completeStep("competitors"); });
    act(() => { result.current.completeStep("import"); });
    act(() => { result.current.completeStep("insights"); });
    expect(result.current.progress).toBe(100);
  });
});
