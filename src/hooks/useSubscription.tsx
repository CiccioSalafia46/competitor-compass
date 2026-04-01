import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const STRIPE_PLANS = {
  free: { product_id: null, price_id: null, label: "Free" },
  starter: {
    product_id: "prod_UFlZSmAqdMlUBK",
    price_id: "price_1THG2Z1A6XiCCUbzrdMuP3Xj",
    label: "Starter",
  },
  premium: {
    product_id: "prod_UFla6p6WSysUBH",
    price_id: "price_1THG2r1A6XiCCUbz0FlpAOGa",
    label: "Premium",
  },
} as const;

export type PlanTier = keyof typeof STRIPE_PLANS;

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  tier: PlanTier;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  checkout: (priceId: string) => Promise<void>;
  openPortal: () => Promise<void>;
}

function tierFromProductId(productId: string | null): PlanTier {
  if (!productId) return "free";
  if (productId === STRIPE_PLANS.starter.product_id) return "starter";
  if (productId === STRIPE_PLANS.premium.product_id) return "premium";
  return "free";
}

const SubscriptionContext = createContext<SubscriptionState | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!session) {
      setSubscribed(false);
      setProductId(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscribed(data?.subscribed ?? false);
      setProductId(data?.product_id ?? null);
      setSubscriptionEnd(data?.subscription_end ?? null);
    } catch (e) {
      console.error("check-subscription error:", e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  // Check on checkout return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      checkSubscription();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [checkSubscription]);

  const checkout = async (priceId: string) => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  };

  const openPortal = async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  };

  const tier = tierFromProductId(productId);

  return (
    <SubscriptionContext.Provider
      value={{ subscribed, productId, subscriptionEnd, tier, loading, checkSubscription, checkout, openPortal }}
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
