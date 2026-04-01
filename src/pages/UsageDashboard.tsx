import { useUsage, PLAN_LIMITS } from "@/hooks/useUsage";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, Newspaper, BarChart3, Zap, Bell, Brain, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UsageDashboard() {
  const { usage, loading, currentPlan, limits, getUsagePercent, isAtLimit } = useUsage();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  // Additional metrics not in useUsage
  const [extraMetrics, setExtraMetrics] = useState({ alertsTriggered: 0, aiExtractions: 0 });
  useEffect(() => {
    if (!currentWorkspace) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const since = startOfMonth.toISOString();

    Promise.all([
      supabase.from("alerts").select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id).gte("created_at", since),
      supabase.from("newsletter_extractions").select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id).gte("created_at", since),
    ]).then(([alerts, extractions]) => {
      setExtraMetrics({
        alertsTriggered: alerts.count || 0,
        aiExtractions: extractions.count || 0,
      });
    });
  }, [currentWorkspace]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const metrics = [
    { label: "Seats used", value: usage.seats_used, limit: limits.seats, icon: Users, key: "seats_used" as const },
    { label: "Competitors tracked", value: usage.competitors, limit: limits.competitors, icon: Zap, key: "competitors" as const },
    { label: "Newsletters this month", value: usage.newsletters_this_month, limit: limits.newsletters_per_month, icon: Newspaper, key: "newsletters_this_month" as const },
    { label: "Analyses this month", value: usage.analyses_this_month, limit: limits.analyses_per_month, icon: BarChart3, key: "analyses_this_month" as const },
  ];

  const nearLimit = (key: keyof typeof usage) => {
    const percent = getUsagePercent(key);
    return percent >= 80 && percent < 100;
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Usage</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor your workspace resource consumption</p>
        </div>
        <Badge variant="outline" className="capitalize text-sm px-3 py-1">
          {PLAN_LIMITS[currentPlan].label} plan
        </Badge>
      </div>

      {/* Near-limit warning */}
      {metrics.some((m) => nearLimit(m.key)) && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Approaching plan limits</p>
            <p className="text-xs text-muted-foreground">
              Some resources are above 80% usage. Consider upgrading to avoid disruption.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {metrics.map((metric) => {
          const percent = getUsagePercent(metric.key);
          const atLimit = isAtLimit(metric.key);
          const near = nearLimit(metric.key);
          const limitLabel = metric.limit === -1 ? "Unlimited" : metric.limit.toLocaleString();

          return (
            <Card key={metric.key} className={cn("border", atLimit && "border-destructive/30")}>
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
                    className={cn(
                      "h-2",
                      atLimit && "[&>div]:bg-destructive",
                      near && !atLimit && "[&>div]:bg-[hsl(var(--warning))]"
                    )}
                  />
                )}
                {atLimit && (
                  <p className="text-xs text-destructive mt-1">Limit reached — upgrade your plan to continue</p>
                )}
                {near && !atLimit && (
                  <p className="text-xs text-[hsl(var(--warning))] mt-1">
                    {percent}% used — approaching limit
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Activity Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{extraMetrics.aiExtractions}</p>
              <p className="text-xs text-muted-foreground">AI extractions this month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{extraMetrics.alertsTriggered}</p>
              <p className="text-xs text-muted-foreground">Alerts triggered this month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {currentPlan === "free" && (
        <Card className="border border-primary/20 bg-primary/5">
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
