import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { supabase } from "@/integrations/supabase/client";

export const STRIPE_PLANS = {
  free: { label: "Free" },
  starter: { label: "Starter" },
  premium: { label: "Premium" },
} as const;

export type PlanTier = keyof typeof STRIPE_PLANS;

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

  // Subscribe to workspace_billing changes via Realtime instead of polling every 60s
  useEffect(() => {
    if (!workspaceId || !accessToken) return;

    const channel = supabase
      .channel(`workspace-billing:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_billing",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          void checkSubscription();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
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
  };

  const openPortal = async () => {
    if (!workspaceId) throw new Error("No workspace selected.");
    const pendingWindow = window.open("about:blank", "_blank");
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
  };

  // Sync tier to sessionStorage so useUsage can read it without circular deps
  useEffect(() => {
    if (!workspaceId) return;
    try {
      sessionStorage.setItem(`subscription_tier:${workspaceId}`, tier);
      sessionStorage.setItem("subscription_workspace_id", workspaceId);
    } catch {
      // Ignore storage write failures in restricted browser contexts.
    }
  }, [tier, workspaceId]);

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
