import { useEffect, useState, lazy, Suspense } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAlerts } from "@/hooks/useAlerts";
import { useInsights } from "@/hooks/useInsights";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Newspaper, Users, BarChart3, TrendingUp, Megaphone,
  Lightbulb, Bell, ArrowRight, AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import OnboardingChecklist from "@/components/OnboardingChecklist";

type Analysis = Database["public"]["Tables"]["analyses"]["Row"];

export default function Dashboard() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const { alerts, unreadCount } = useAlerts();
  const { insights } = useInsights();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    newsletters: 0, competitors: 0, analyses: 0, completedAnalyses: 0,
    metaAds: 0, inboxItems: 0,
  });
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchStats = async () => {
      setLoading(true);
      const [newsletters, competitors, totalAnalyses, completedAnalyses, metaAds, inboxItems] = await Promise.all([
        supabase.from("newsletter_entries").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
        supabase.from("competitors").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
        supabase.from("analyses").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
        supabase.from("analyses").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).eq("status", "completed"),
        supabase.from("meta_ads").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
        supabase.from("newsletter_inbox").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id).eq("is_newsletter", true),
      ]);

      setStats({
        newsletters: newsletters.count || 0,
        competitors: competitors.count || 0,
        analyses: totalAnalyses.count || 0,
        completedAnalyses: completedAnalyses.count || 0,
        metaAds: metaAds.count || 0,
        inboxItems: inboxItems.count || 0,
      });

      const { data: recent } = await supabase
        .from("analyses")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(5);

      setRecentAnalyses(recent || []);
      setLoading(false);
    };
    fetchStats();
  }, [currentWorkspace]);

  if (wsLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">No workspace found.</p>
          <Button onClick={() => navigate("/onboarding")}>Create workspace</Button>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Inbox", value: stats.inboxItems, icon: Newspaper, href: "/inbox" },
    { label: "Competitors", value: stats.competitors, icon: Users, href: "/competitors" },
    { label: "Analyses", value: stats.completedAnalyses, icon: BarChart3, href: "/analytics" },
    { label: "Meta Ads", value: stats.metaAds, icon: Megaphone, href: "/meta-ads" },
  ];

  const recentAlerts = alerts.slice(0, 4);
  const recentInsights = insights.slice(0, 3);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-7xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{currentWorkspace.name}</h1>
          <p className="page-description">Competitive intelligence overview</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="border cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate(kpi.href)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
                <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
              </div>
              <p className="text-2xl font-semibold tracking-tight">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Alerts Summary */}
        <Card className="border lg:col-span-1">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              Alerts
              {unreadCount > 0 && (
                <Badge className="h-4 px-1 text-[10px]">{unreadCount}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate("/alerts")}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAlerts.length === 0 ? (
              <div className="py-6 text-center">
                <Bell className="h-5 w-5 mx-auto text-muted-foreground/30 mb-1.5" />
                <p className="text-xs text-muted-foreground">No alerts</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-2 rounded-md p-2 text-xs cursor-pointer hover:bg-muted/50 transition-colors",
                      !alert.is_read && "bg-accent/40"
                    )}
                    onClick={() => navigate("/alerts")}
                  >
                    <AlertCircle className={cn(
                      "h-3.5 w-3.5 mt-0.5 shrink-0",
                      alert.severity === "high" ? "text-destructive" :
                      alert.severity === "medium" ? "text-warning" : "text-muted-foreground"
                    )} />
                    <div className="min-w-0">
                      <p className={cn("truncate", !alert.is_read && "font-medium")}>{alert.title}</p>
                      <p className="text-muted-foreground/70 truncate">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights Preview */}
        <Card className="border lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Latest Insights
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate("/insights")}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {recentInsights.length === 0 ? (
              <div className="py-6 text-center">
                <Lightbulb className="h-5 w-5 mx-auto text-muted-foreground/30 mb-1.5" />
                <p className="text-xs text-muted-foreground">No insights yet</p>
                <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => navigate("/insights")}>
                  Generate insights
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate("/insights")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{insight.title}</p>
                      <Badge variant="outline" className="text-[9px] capitalize shrink-0">{insight.category.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{insight.what_is_happening}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Analyses */}
        <Card className="border">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Recent Analyses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAnalyses.length === 0 ? (
              <div className="py-6 text-center">
                <BarChart3 className="h-5 w-5 mx-auto text-muted-foreground/30 mb-1.5" />
                <p className="text-xs text-muted-foreground">No analyses yet</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto p-0 text-xs"
                  onClick={() => navigate("/newsletters/new")}
                >
                  Add your first newsletter →
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {recentAnalyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between rounded-md p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/analyses/${analysis.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {analysis.analysis_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {analysis.completed_at ? new Date(analysis.completed_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    {analysis.confidence && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          analysis.confidence === "high" ? "border-success/40 text-success" :
                          analysis.confidence === "medium" ? "border-warning/40 text-warning" :
                          "text-muted-foreground"
                        )}
                      >
                        {analysis.confidence}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5">
            {[
              { icon: Newspaper, label: "Add Newsletter", desc: "Paste or import content", path: "/newsletters/new" },
              { icon: Users, label: "Manage Competitors", desc: "Add or edit tracked companies", path: "/competitors" },
              { icon: Lightbulb, label: "Generate Insights", desc: "Run AI analysis on your data", path: "/insights" },
              { icon: TrendingUp, label: "View Analytics", desc: "Activity trends and comparisons", path: "/analytics" },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center gap-3 rounded-md border p-3 text-left hover:bg-muted/50 transition-colors group"
              >
                <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-[11px] text-muted-foreground">{action.desc}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
