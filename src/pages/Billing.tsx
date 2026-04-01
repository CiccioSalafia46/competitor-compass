import { useSubscription, STRIPE_PLANS, PlanTier } from "@/hooks/useSubscription";
import { useRoles } from "@/hooks/useRoles";
import { useUsage, PLAN_LIMITS } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Check, CreditCard, Loader2, ExternalLink, X, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyticsTracker, ANALYTICS_EVENTS } from "@/hooks/useAnalyticsTracker";

const PLAN_FEATURES: Record<PlanTier, { features: string[]; highlight?: string }> = {
  free: {
    features: [
      "1 user seat",
      "3 competitors",
      "200 newsletters/mo",
      "50 AI analyses/mo",
      "Basic email alerts",
      "Manual newsletter import",
    ],
  },
  starter: {
    highlight: "Most Popular",
    features: [
      "Up to 3 users",
      "10 competitors",
      "2,000 newsletters/mo",
      "500 AI analyses/mo",
      "Full AI extraction",
      "Meta Ads tracking",
      "Custom alert rules",
      "Weekly scheduled reports",
    ],
  },
  premium: {
    features: [
      "Up to 10 users",
      "Unlimited competitors",
      "20,000 newsletters/mo",
      "5,000 AI analyses/mo",
      "Advanced AI insights",
      "Priority AI processing",
      "Slack/webhook alerts",
      "Campaign library",
      "Branded shareable reports",
      "Advanced analytics",
      "Priority support",
    ],
  },
};

const PLAN_PRICES: Record<PlanTier, { amount: string; period: string }> = {
  free: { amount: "$0", period: "forever" },
  starter: { amount: "$29", period: "/month" },
  premium: { amount: "$99", period: "/month" },
};

// Features not available on free plan
const LOCKED_ON_FREE = [
  "Meta Ads tracking",
  "Custom alert rules",
  "Weekly scheduled reports",
  "Advanced analytics",
];

export default function Billing() {
  const { tier, subscribed, subscriptionEnd, loading, checkout, openPortal, checkSubscription } =
    useSubscription();
  const { isAdmin } = useRoles();
  const { usage, limits, getUsagePercent } = useUsage();
  const { toast } = useToast();
  const { track } = useAnalyticsTracker();

  const handleCheckout = async (plan: PlanTier) => {
    const priceId = STRIPE_PLANS[plan].price_id;
    if (!priceId) return;
    track(ANALYTICS_EVENTS.UPGRADE_CLICKED, { from: tier, to: plan });
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Plans & Billing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            You're on the <Badge variant={tier === "free" ? "secondary" : "default"} className="mx-1 text-xs capitalize">{tier}</Badge> plan
          </p>
        </div>
        <div className="flex gap-2">
          {subscribed && (
            <Button variant="outline" size="sm" onClick={handlePortal} className="gap-1.5 text-xs h-8">
              <ExternalLink className="h-3 w-3" /> Manage subscription
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => checkSubscription()} className="gap-1.5 text-xs h-8">
            <CreditCard className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {subscriptionEnd && (
        <p className="text-xs text-muted-foreground">
          Current billing period ends {new Date(subscriptionEnd).toLocaleDateString()}
        </p>
      )}

      {/* Current Usage Summary */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Current Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Competitors", used: usage.competitors, limit: limits.competitors, key: "competitors" as const },
              { label: "Newsletters/mo", used: usage.newsletters_this_month, limit: limits.newsletters_per_month, key: "newsletters_this_month" as const },
              { label: "AI Analyses/mo", used: usage.analyses_this_month, limit: limits.analyses_per_month, key: "analyses_this_month" as const },
              { label: "Team Seats", used: usage.seats_used, limit: limits.seats, key: "seats_used" as const },
            ].map((m) => {
              const pct = getUsagePercent(m.key);
              const isUnlimited = m.limit === -1;
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                    <span className="text-xs font-medium tabular-nums">
                      {m.used}{isUnlimited ? "" : `/${m.limit}`}
                    </span>
                  </div>
                  {!isUnlimited && (
                    <Progress
                      value={pct}
                      className={cn(
                        "h-1.5",
                        pct >= 90 ? "[&>div]:bg-destructive" : pct >= 75 ? "[&>div]:bg-warning" : ""
                      )}
                    />
                  )}
                  {isUnlimited && (
                    <p className="text-[10px] text-muted-foreground">Unlimited</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Plan Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(STRIPE_PLANS) as PlanTier[]).map((plan) => {
          const isCurrent = tier === plan;
          const price = PLAN_PRICES[plan];
          const features = PLAN_FEATURES[plan];
          const isRecommended = plan === "starter" && tier === "free";

          return (
            <Card
              key={plan}
              className={cn(
                "border relative transition-shadow",
                isCurrent && "ring-2 ring-primary",
                isRecommended && !isCurrent && "ring-2 ring-primary/50 shadow-md"
              )}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 left-4 text-[10px]">Your Plan</Badge>
              )}
              {isRecommended && !isCurrent && features.highlight && (
                <Badge className="absolute -top-2.5 left-4 text-[10px] bg-primary">
                  <Zap className="h-2.5 w-2.5 mr-0.5" /> {features.highlight}
                </Badge>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base capitalize">{STRIPE_PLANS[plan].label}</CardTitle>
                <CardDescription className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold text-foreground">{price.amount}</span>
                  <span className="text-sm text-muted-foreground">{price.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5 text-sm">
                  {features.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs">{f}</span>
                    </li>
                  ))}
                </ul>
                {isAdmin && !isCurrent && plan !== "free" && (
                  <Button
                    className={cn("w-full gap-1.5", isRecommended && "bg-primary")}
                    onClick={() => handleCheckout(plan)}
                  >
                    {tier === "free" ? "Upgrade" : "Switch"} to {STRIPE_PLANS[plan].label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isCurrent && plan !== "free" && (
                  <Button variant="outline" className="w-full" onClick={handlePortal}>
                    Manage subscription
                  </Button>
                )}
                {isCurrent && plan === "free" && (
                  <p className="text-center text-xs text-muted-foreground">Current plan</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison - visible for free users */}
      {tier === "free" && (
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">What you're missing on Free</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {LOCKED_ON_FREE.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm rounded-md border p-2.5">
                  <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span className="text-xs text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => handleCheckout("starter")}>
              Unlock all features <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
