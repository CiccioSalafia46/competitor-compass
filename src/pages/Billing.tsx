import { useSubscription, STRIPE_PLANS, PlanTier } from "@/hooks/useSubscription";
import { useRoles } from "@/hooks/useRoles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, CreditCard, Loader2, ExternalLink } from "lucide-react";

const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free: ["1 user", "3 competitors", "200 newsletters/mo", "Basic AI extraction", "Manual reports"],
  starter: [
    "Up to 3 users",
    "10 competitors",
    "2,000 newsletters/mo",
    "Full AI extraction",
    "Weekly scheduled reports",
    "Keyword & discount alerts",
  ],
  premium: [
    "Up to 10 users",
    "Unlimited competitors",
    "20,000 newsletters/mo",
    "Advanced AI insights",
    "Slack/webhook alerts",
    "Campaign library",
    "Branded shareable reports",
    "Collaboration features",
  ],
};

const PLAN_PRICES: Record<PlanTier, string> = {
  free: "$0",
  starter: "$29",
  premium: "$99",
};

export default function Billing() {
  const { tier, subscribed, subscriptionEnd, loading, checkout, openPortal, checkSubscription } =
    useSubscription();
  const { isAdmin } = useRoles();
  const { toast } = useToast();

  const handleCheckout = async (plan: PlanTier) => {
    const priceId = STRIPE_PLANS[plan].price_id;
    if (!priceId) return;
    try {
      await checkout(priceId);
    } catch (err: any) {
      toast({ title: "Checkout error", description: err.message, variant: "destructive" });
    }
  };

  const handlePortal = async () => {
    try {
      await openPortal();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading billing…</span>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your subscription</p>
        </div>
        <div className="flex gap-2">
          {subscribed && (
            <Button variant="outline" size="sm" onClick={handlePortal} className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Manage subscription
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => checkSubscription()} className="gap-2">
            <CreditCard className="h-3.5 w-3.5" />
            Refresh status
          </Button>
        </div>
      </div>

      {subscriptionEnd && (
        <p className="text-sm text-muted-foreground">
          Current period ends: {new Date(subscriptionEnd).toLocaleDateString()}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(STRIPE_PLANS) as PlanTier[]).map((plan) => {
          const isCurrent = tier === plan;
          return (
            <Card
              key={plan}
              className={`border relative ${isCurrent ? "ring-2 ring-primary" : ""}`}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 left-4 text-xs">Your Plan</Badge>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg capitalize">{STRIPE_PLANS[plan].label}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">{PLAN_PRICES[plan]}</span>
                  {plan !== "free" && <span className="text-muted-foreground">/mo</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {PLAN_FEATURES[plan].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {isAdmin && !isCurrent && plan !== "free" && (
                  <Button className="w-full" onClick={() => handleCheckout(plan)}>
                    {tier === "free" ? "Upgrade" : "Switch"} to {STRIPE_PLANS[plan].label}
                  </Button>
                )}
                {isCurrent && plan !== "free" && (
                  <Button variant="outline" className="w-full" onClick={handlePortal}>
                    Manage
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
