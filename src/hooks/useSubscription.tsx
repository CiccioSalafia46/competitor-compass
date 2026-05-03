import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import type { PlanTier } from "@/lib/subscription-plans";

export type { PlanTier };

interface SubscriptionState {
  subscribed: boolean;
  priceId: string | null;
  subscriptionEnd: string | null;
  cancelAtPeriodEnd: boolean;
  tier: PlanTier;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  checkout: (plan: Exclude<PlanTier, "free">) => Promise<void>;
  openPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const [subscribed, setSubscribed] = useState(false);
  const [priceId, setPriceId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [tier, setTier] = useState<PlanTier>("free");
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!accessToken || !workspaceId) {
      setSubscribed(false);
      setPriceId(null);
      setSubscriptionEnd(null);
      setCancelAtPeriodEnd(false);
      setTier("free");
      setLoading(false);
      return;
    }
    try {
      const data = await invokeEdgeFunction<{
        subscribed?: boolean;
        tier?: PlanTier;
        price_id?: string | null;
        subscription_end?: string | null;
        cancel_at_period_end?: boolean;
      }>("check-subscription", {
        body: { workspaceId },
      });
      setSubscribed(Boolean(data?.subscribed));
      setPriceId(data?.price_id ?? null);
      setSubscriptionEnd(data?.subscription_end ?? null);
      setCancelAtPeriodEnd(Boolean(data?.cancel_at_period_end));
      setTier(data?.tier ?? "free");
    } catch (e) {
      console.error("check-subscription error:", e);
      setSubscribed(false);
      setPriceId(null);
      setSubscriptionEnd(null);
      setCancelAtPeriodEnd(false);
      setTier("free");
    } finally {
      setLoading(false);
    }
  }, [accessToken, workspaceId]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Subscribe to workspace_billing changes via Realtime for instant updates.
  // A 5-minute interval poll acts as a safety net in case the Realtime channel
  // drops (mobile networks, corporate firewalls) so billing state never stays
  // permanently stale after a plan change.
  useRealtimeTable({
    channelName: `workspace-billing:${workspaceId ?? "none"}`,
    table: "workspace_billing",
    filter: workspaceId ? `workspace_id=eq.${workspaceId}` : undefined,
    enabled: !!workspaceId && !!accessToken,
    onEvent: checkSubscription,
  });

  useEffect(() => {
    if (!workspaceId || !accessToken) return;
    const interval = setInterval(checkSubscription, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [workspaceId, accessToken, checkSubscription]);

  // Check on checkout return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      checkSubscription();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [checkSubscription]);

  const checkout = async (plan: Exclude<PlanTier, "free">) => {
    if (!workspaceId) throw new Error("No workspace selected.");
    const pendingWindow = window.open("about:blank", "_blank");
    try {
      const data = await invokeEdgeFunction<{ url?: string }>("create-checkout", {
        body: { workspaceId, plan },
      });
      if (data?.url) {
        if (pendingWindow) {
          pendingWindow.location.href = data.url;
        } else {
          window.location.assign(data.url);
        }
      } else if (pendingWindow) {
        pendingWindow.close();
      }
    } catch (err) {
      // Close the blank window so it doesn't dangle on network / API errors.
      pendingWindow?.close();
      throw err;
    }
  };

  const openPortal = async () => {
    if (!workspaceId) throw new Error("No workspace selected.");
    const pendingWindow = window.open("about:blank", "_blank");
    try {
      const data = await invokeEdgeFunction<{ url?: string }>("customer-portal", {
        body: { workspaceId },
      });
      if (data?.url) {
        if (pendingWindow) {
          pendingWindow.location.href = data.url;
        } else {
          window.location.assign(data.url);
        }
      } else if (pendingWindow) {
        pendingWindow.close();
      }
    } catch (err) {
      pendingWindow?.close();
      throw err;
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{ subscribed, priceId, subscriptionEnd, cancelAtPeriodEnd, tier, loading, checkSubscription, checkout, openPortal }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
