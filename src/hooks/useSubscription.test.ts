import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useWorkspace", () => ({ useWorkspace: vi.fn() }));
vi.mock("@/lib/invokeEdgeFunction", () => ({ invokeEdgeFunction: vi.fn() }));
vi.mock("@/hooks/useRealtimeTable", () => ({ useRealtimeTable: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseWorkspace = vi.mocked(useWorkspace);

import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
const mockedInvoke = vi.mocked(invokeEdgeFunction);

function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(SubscriptionProvider, null, children);
  };
}

const SESSION = { access_token: "tok-abc" };
const WORKSPACE = { id: "ws-1", name: "Acme", owner_id: "u-1" };

function mockAuthAndWorkspace(opts: { session?: unknown; workspace?: unknown } = {}) {
  mockedUseAuth.mockReturnValue({
    session: opts.session ?? SESSION,
    user: { id: "u-1", email: "test@example.com" },
    loading: false,
  } as never);
  mockedUseWorkspace.mockReturnValue({
    currentWorkspace: opts.workspace ?? WORKSPACE,
    workspaces: [WORKSPACE],
    loading: false,
  } as never);
}

describe("useSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure checkout param is absent by default
    Object.defineProperty(window, "location", {
      value: { search: "", pathname: "/dashboard" },
      writable: true,
    });
  });

  it("exposes free tier with loading=false when session is missing", async () => {
    mockedUseAuth.mockReturnValue({ session: null, user: null, loading: false } as never);
    mockedUseWorkspace.mockReturnValue({ currentWorkspace: null, workspaces: [], loading: false } as never);

    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscribed).toBe(false);
    expect(result.current.tier).toBe("free");
    expect(mockedInvoke).not.toHaveBeenCalled();
  });

  it("resolves premium tier when check-subscription returns subscribed=true", async () => {
    mockAuthAndWorkspace();
    mockedInvoke.mockResolvedValueOnce({
      subscribed: true,
      tier: "premium",
      price_id: "price_premium_123",
      subscription_end: "2027-01-01T00:00:00Z",
      cancel_at_period_end: false,
    });

    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscribed).toBe(true);
    expect(result.current.tier).toBe("premium");
    expect(result.current.priceId).toBe("price_premium_123");
    expect(result.current.cancelAtPeriodEnd).toBe(false);
  });

  it("resolves starter tier when check-subscription returns starter", async () => {
    mockAuthAndWorkspace();
    mockedInvoke.mockResolvedValueOnce({
      subscribed: true,
      tier: "starter",
      price_id: "price_starter_123",
      subscription_end: null,
      cancel_at_period_end: false,
    });

    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tier).toBe("starter");
    expect(result.current.subscribed).toBe(true);
  });

  it("falls back to free tier and subscribed=false when check-subscription throws", async () => {
    mockAuthAndWorkspace();
    mockedInvoke.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscribed).toBe(false);
    expect(result.current.tier).toBe("free");
  });

  it("exposes cancel_at_period_end from subscription state", async () => {
    mockAuthAndWorkspace();
    mockedInvoke.mockResolvedValueOnce({
      subscribed: true,
      tier: "premium",
      price_id: "price_premium_123",
      subscription_end: "2027-06-01T00:00:00Z",
      cancel_at_period_end: true,
    });

    const { result } = renderHook(() => useSubscription(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.cancelAtPeriodEnd).toBe(true);
    expect(result.current.subscriptionEnd).toBe("2027-06-01T00:00:00Z");
  });

  it("invokes check-subscription with the correct workspaceId", async () => {
    mockAuthAndWorkspace();
    mockedInvoke.mockResolvedValueOnce({ subscribed: false, tier: "free" });

    renderHook(() => useSubscription(), { wrapper: makeWrapper() });

    await waitFor(() => expect(mockedInvoke).toHaveBeenCalled());
    expect(mockedInvoke).toHaveBeenCalledWith("check-subscription", {
      body: { workspaceId: "ws-1" },
    });
  });

  it("throws when used outside SubscriptionProvider", () => {
    expect(() => renderHook(() => useSubscription())).toThrow(
      "useSubscription must be used within SubscriptionProvider",
    );
  });
});
