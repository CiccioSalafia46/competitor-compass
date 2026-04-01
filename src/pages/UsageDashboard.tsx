import { useUsage, PLAN_LIMITS } from "@/hooks/useUsage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, Newspaper, BarChart3, Zap } from "lucide-react";

export default function UsageDashboard() {
  const { usage, loading, currentPlan, limits, getUsagePercent, isAtLimit } = useUsage();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const metrics = [
    {
      label: "Seats used",
      value: usage.seats_used,
      limit: limits.seats,
      icon: Users,
      key: "seats_used" as const,
    },
    {
      label: "Competitors tracked",
      value: usage.competitors,
      limit: limits.competitors,
      icon: Zap,
      key: "competitors" as const,
    },
    {
      label: "Newsletters this month",
      value: usage.newsletters_this_month,
      limit: limits.newsletters_per_month,
      icon: Newspaper,
      key: "newsletters_this_month" as const,
    },
    {
      label: "Analyses this month",
      value: usage.analyses_this_month,
      limit: limits.analyses_per_month,
      icon: BarChart3,
      key: "analyses_this_month" as const,
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Usage</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor your workspace resource consumption</p>
        </div>
        <Badge variant="outline" className="capitalize text-sm px-3 py-1">
          {PLAN_LIMITS[currentPlan].label} plan
        </Badge>
      </div>

      <div className="grid gap-4">
        {metrics.map((metric) => {
          const percent = getUsagePercent(metric.key);
          const atLimit = isAtLimit(metric.key);
          const limitLabel = metric.limit === -1 ? "Unlimited" : metric.limit.toLocaleString();

          return (
            <Card key={metric.key} className="shadow-raised border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{metric.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {metric.value.toLocaleString()} / {limitLabel}
                  </span>
                </div>
                {metric.limit !== -1 && (
                  <Progress
                    value={percent}
                    className={`h-2 ${atLimit ? "[&>div]:bg-destructive" : ""}`}
                  />
                )}
                {atLimit && (
                  <p className="text-xs text-destructive mt-1">
                    Limit reached — upgrade your plan to continue
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {currentPlan === "free" && (
        <Card className="shadow-raised border border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-foreground">Upgrade to unlock more</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get more seats, competitors, and newsletters per month
            </p>
            <Button className="mt-4" onClick={() => navigate("/settings/billing")}>
              View plans
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
