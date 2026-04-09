import { useSubscription } from "@/hooks/useSubscription";
import { STRIPE_PLANS, type PlanTier } from "@/lib/subscription-plans";
import { useRoles } from "@/hooks/useRoles";
import { useUsage, PLAN_LIMITS } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Check, CreditCard, Loader2, ExternalLink, X, Zap, ArrowRight,
  Users, Newspaper, Sparkles, Bell, Megaphone, BarChart3, Lock, Clock,
  Shield, TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyticsTracker, ANALYTICS_EVENTS } from "@/hooks/useAnalyticsTracker";
import { getErrorMessage } from "@/lib/errors";

/** Value buckets for clear feature packaging */
const PLAN_VALUE_BUCKETS: Record<PlanTier, {
  tagline: string;
  targetUser: string;
  buckets: { name: string; icon: LucideIcon; features: string[] }[];
}> = {
  free: {
    tagline: "Explore the platform",
    targetUser: "For individuals getting started",
    buckets: [
      {
        name: "Data Access",
        icon: Newspaper,
        features: ["200 data imports/mo", "Manual import only", "30-day history"],
      },
      {
        name: "Intelligence",
        icon: Sparkles,
        features: ["50 AI analyses/mo", "Basic extraction"],
      },
      {
        name: "Monitoring",
        icon: Users,
        features: ["3 competitors", "Basic email alerts"],
      },
      {
        name: "Team",
        icon: Shield,
        features: ["1 user seat"],
      },
    ],
  },
  starter: {
    tagline: "Your competitive edge",
    targetUser: "For teams actively monitoring competitors",
    buckets: [
      {
        name: "Data Access",
        icon: Newspaper,
        features: ["2,000 data imports/mo", "Gmail auto-import", "Full history"],
      },
      {
        name: "Intelligence",
        icon: Sparkles,
        features: ["500 AI analyses/mo", "Full AI extraction", "Strategic insights"],
      },
      {
        name: "Monitoring",
        icon: Users,
        features: ["10 competitors", "Custom alert rules", "Keyword & discount alerts"],
      },
      {
        name: "Automation",
        icon: Bell,
        features: ["Scheduled reports", "Gmail sync"],
      },
      {
        name: "Team",
        icon: Shield,
        features: ["Up to 3 users", "Role-based access"],
      },
    ],
  },
  premium: {
    tagline: "Strategic advantage",
    targetUser: "For teams that need comprehensive intelligence",
    buckets: [
      {
        name: "Data Access",
        icon: Newspaper,
        features: ["20,000 data imports/mo", "Priority processing", "Unlimited history"],
      },
      {
        name: "Intelligence",
        icon: Sparkles,
        features: ["5,000 AI analyses/mo", "Advanced AI insights", "Trend detection"],
      },
      {
        name: "Monitoring",
        icon: Users,
        features: ["Unlimited competitors", "Slack/webhook alerts", "Anomaly detection"],
      },
      {
        name: "Ad Intelligence",
        icon: Megaphone,
        features: ["Meta Ads tracking (coming soon)", "Ad creative analysis", "Spend monitoring"],
      },
      {
        name: "Automation",
        icon: Bell,
        features: ["Branded reports", "Campaign library", "Advanced analytics"],
      },
      {
        name: "Team",
        icon: Shield,
        features: ["Up to 10 users", "Audit log", "Priority support"],
      },
    ],
  },
};

const PLAN_PRICES: Record<PlanTier, { amount: string; period: string; annual?: string }> = {
  free: { amount: "$0", period: "forever" },
  starter: { amount: "$29", period: "/month", annual: "$24/mo billed annually" },
  premium: { amount: "$99", period: "/month", annual: "$79/mo billed annually" },
};

/** Feature comparison rows for the comparison table */
const COMPARISON_ROWS: { label: string; free: string; starter: string; premium: string; category: string }[] = [
  { category: "Data", label: "Data imports/month", free: "200", starter: "2,000", premium: "20,000" },
  { category: "Data", label: "Import method", free: "Manual", starter: "Gmail auto-sync", premium: "Gmail + priority" },
  { category: "Intelligence", label: "AI analyses/month", free: "50", starter: "500", premium: "5,000" },
  { category: "Intelligence", label: "Strategic insights", free: "—", starter: "✓", premium: "Advanced" },
  { category: "Intelligence", label: "Trend detection", free: "—", starter: "—", premium: "✓" },
  { category: "Monitoring", label: "Competitors", free: "3", starter: "10", premium: "Unlimited" },
  { category: "Monitoring", label: "Custom alerts", free: "—", starter: "✓", premium: "✓" },
  { category: "Monitoring", label: "Slack/webhooks", free: "—", starter: "—", premium: "✓" },
  { category: "Ads", label: "Ad Intelligence", free: "—", starter: "—", premium: "Coming soon" },
  { category: "Team", label: "User seats", free: "1", starter: "3", premium: "10" },
  { category: "Team", label: "Role-based access", free: "—", starter: "✓", premium: "✓" },
  { category: "Reports", label: "Scheduled reports", free: "—", starter: "Weekly", premium: "Branded + daily" },
  { category: "Support", label: "Support", free: "Community", starter: "Email", premium: "Priority" },
];

export default function Billing() {
  const { tier, subscribed, subscriptionEnd, cancelAtPeriodEnd, loading, checkout, openPortal, checkSubscription } =
    useSubscription();
  const { isAdmin } = useRoles();
  const { usage, limits, getUsagePercent } = useUsage();
  const { toast } = useToast();
  const { track } = useAnalyticsTracker();

  const handleCheckout = async (plan: PlanTier) => {
    if (plan === "free") return;
    track(ANALYTICS_EVENTS.UPGRADE_CLICKED, { from: tier, to: plan });
    try {
      await checkout(plan);
    } catch (error) {
      toast({ title: "Checkout error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handlePortal = async () => {
    try {
      await openPortal();
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl space-y-6 animate-fade-in">
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
          {cancelAtPeriodEnd ? " and the subscription is set to cancel at period end." : ""}
        </p>
      )}

      {/* Current Usage Summary */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Current Usage This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Competitors", used: usage.competitors, limit: limits.competitors, key: "competitors" as const },
              { label: "Data Imports", used: usage.newsletters_this_month, limit: limits.newsletters_per_month, key: "newsletters_this_month" as const },
              { label: "AI Analyses", used: usage.analyses_this_month, limit: limits.analyses_per_month, key: "analyses_this_month" as const },
              { label: "Team Seats", used: usage.seats_used, limit: limits.seats, key: "seats_used" as const },
            ].map((m) => {
              const pct = getUsagePercent(m.key);
              const isUnlimited = m.limit === -1;
              const isNearLimit = pct >= 75;
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                    <span className={cn("text-xs font-medium tabular-nums", isNearLimit && !isUnlimited && "text-warning")}>
                      {m.used}{isUnlimited ? "" : ` / ${m.limit}`}
                    </span>
                  </div>
                  {!isUnlimited ? (
                    <Progress
                      value={pct}
                      className={cn(
                        "h-1.5",
                        pct >= 90 ? "[&>div]:bg-destructive" : pct >= 75 ? "[&>div]:bg-warning" : ""
                      )}
                    />
                  ) : (
                    <p className="text-[10px] text-primary font-medium">∞ Unlimited</p>
                  )}
                  {pct >= 90 && !isUnlimited && (
                    <p className="text-[10px] text-destructive mt-0.5 font-medium">Upgrade to increase limit</p>
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
          const value = PLAN_VALUE_BUCKETS[plan];
          const isRecommended = plan === "starter" && tier === "free";
          const isBestValue = plan === "premium" && tier === "starter";

          return (
            <Card
              key={plan}
              className={cn(
                "border relative transition-all",
                isCurrent && "ring-2 ring-primary shadow-md",
                (isRecommended || isBestValue) && !isCurrent && "ring-2 ring-primary/50 shadow-lg"
              )}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 left-4 text-[10px]">Your Plan</Badge>
              )}
              {isRecommended && !isCurrent && (
                <Badge className="absolute -top-2.5 left-4 text-[10px] bg-primary">
                  <Zap className="h-2.5 w-2.5 mr-0.5" /> Recommended
                </Badge>
              )}
              {isBestValue && !isCurrent && (
                <Badge className="absolute -top-2.5 left-4 text-[10px] bg-primary">
                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> Best Value
                </Badge>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-base capitalize">{STRIPE_PLANS[plan].label}</CardTitle>
                <p className="text-xs text-muted-foreground">{value.targetUser}</p>
                <div className="flex items-baseline gap-0.5 mt-2">
                  <span className="text-3xl font-bold text-foreground">{price.amount}</span>
                  <span className="text-sm text-muted-foreground">{price.period}</span>
                </div>
                <p className="text-[10px] text-primary font-medium mt-0.5">{value.tagline}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Value buckets */}
                <div className="space-y-3">
                  {value.buckets.map((bucket) => (
                    <div key={bucket.name}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <bucket.icon className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider">{bucket.name}</span>
                      </div>
                      <ul className="space-y-0.5">
                        {bucket.features.map((f) => {
                          const isComingSoon = f.includes("coming soon");
                          return (
                            <li key={f} className="flex items-start gap-1.5">
                              {isComingSoon ? (
                                <Clock className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                              ) : (
                                <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                              )}
                              <span className={cn("text-[11px]", isComingSoon ? "text-muted-foreground italic" : "text-foreground")}>
                                {f}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* CTA */}
                {isAdmin && !isCurrent && plan !== "free" && (
                  <Button
                    className={cn("w-full gap-1.5", (isRecommended || isBestValue) && "bg-primary shadow-sm")}
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

      {/* Feature Comparison Table */}
      <Card className="border overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Full Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Feature</th>
                  <th className={cn("text-center px-3 py-2 font-medium", tier === "free" && "text-primary")}>Free</th>
                  <th className={cn("text-center px-3 py-2 font-medium", tier === "starter" && "text-primary")}>Starter</th>
                  <th className={cn("text-center px-3 py-2 font-medium", tier === "premium" && "text-primary")}>Premium</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-foreground">{row.label}</td>
                    {(["free", "starter", "premium"] as const).map((plan) => {
                      const val = row[plan];
                      const isCheck = val === "✓";
                      const isDash = val === "—";
                      const isComingSoon = val === "Coming soon";
                      return (
                        <td key={plan} className="text-center px-3 py-2">
                          {isCheck ? (
                            <Check className="h-3.5 w-3.5 text-primary mx-auto" />
                          ) : isDash ? (
                            <X className="h-3 w-3 text-muted-foreground/30 mx-auto" />
                          ) : isComingSoon ? (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              <Clock className="h-2.5 w-2.5 mr-0.5" /> Soon
                            </Badge>
                          ) : (
                            <span className={cn("text-foreground", plan === tier && "font-semibold text-primary")}>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA for free/starter */}
      {tier !== "premium" && (
        <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-sm font-semibold text-foreground">
                {tier === "free" ? "Ready to get serious about competitive intelligence?" : "Unlock the full strategic advantage"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tier === "free"
                  ? "Starter gives you 10x more capacity, full AI extraction, and team collaboration."
                  : "Premium unlocks unlimited competitors, advanced insights, and Meta Ads intelligence."}
              </p>
            </div>
            <Button
              className="gap-1.5 shrink-0"
              onClick={() => handleCheckout(tier === "free" ? "starter" : "premium")}
            >
              Upgrade to {tier === "free" ? "Starter" : "Premium"} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
