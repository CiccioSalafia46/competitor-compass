import { useEffect, useState, useMemo, memo } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAlerts } from "@/hooks/useAlerts";
import { useInsights } from "@/hooks/useInsights";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useUsage } from "@/hooks/useUsage";
import { supabase } from "@/integrations/supabase/client";
import UpgradePrompt from "@/components/UpgradePrompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Newspaper, Users, BarChart3, TrendingUp, Megaphone,
  Lightbulb, Bell, ArrowRight, AlertCircle, Mail,
  Plus, Sparkles, Activity, Eye, Info, Clock, Zap,
  CheckCircle, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { SystemHealthPanel } from "@/components/SystemHealthPanel";

type Competitor = Database["public"]["Tables"]["competitors"]["Row"];
type InboxItem = Database["public"]["Tables"]["newsletter_inbox"]["Row"];

export default function Dashboard() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const { alerts, unreadCount } = useAlerts();
  const { insights } = useInsights();
  const { isConnected: gmailConnected } = useGmailConnection();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    newsletters: 0, competitors: 0, completedAnalyses: 0,
    metaAds: 0, activeAds: 0, inboxItems: 0, insightCount: 0,
  });
  const [recentInbox, setRecentInbox] = useState<InboxItem[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    const fetchAll = async () => {
      setLoading(true);
      const [nlCount, compCount, analysesCount, metaCount, activeAdCount, inboxCount, insightCount, recentNl, comps] =
        await Promise.all([
          supabase.from("newsletter_entries").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
          supabase.from("competitors").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
          supabase.from("analyses").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).eq("status", "completed"),
          supabase.from("meta_ads").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
          supabase.from("meta_ads").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).eq("is_active", true),
          supabase.from("newsletter_inbox").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).eq("is_newsletter", true),
          supabase.from("insights").select("id", { count: "exact", head: true }).eq("workspace_id", wsId),
          supabase.from("newsletter_inbox").select("*").eq("workspace_id", wsId).eq("is_newsletter", true).order("received_at", { ascending: false }).limit(5),
          supabase.from("competitors").select("*").eq("workspace_id", wsId).eq("is_monitored", true).order("name").limit(8),
        ]);

      setStats({
        newsletters: nlCount.count || 0,
        competitors: compCount.count || 0,
        completedAnalyses: analysesCount.count || 0,
        metaAds: metaCount.count || 0,
        activeAds: activeAdCount.count || 0,
        inboxItems: inboxCount.count || 0,
        insightCount: insightCount.count || 0,
      });
      setRecentInbox(recentNl.data || []);
      setCompetitors(comps.data || []);
      setLoading(false);
    };
    fetchAll();
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

  const hasData = stats.inboxItems > 0 || stats.competitors > 0 || stats.metaAds > 0;
  const recentAlerts = alerts.filter((a) => !a.is_read).slice(0, 4);
  const topInsights = insights.slice(0, 3);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 animate-fade-in max-w-[1280px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">{currentWorkspace.name}</h1>
          <p className="text-sm text-muted-foreground">Intelligence command center</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => navigate("/newsletters/new")}>
            <Plus className="h-3 w-3" /> Add newsletter
          </Button>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => navigate("/insights")}>
            <Sparkles className="h-3 w-3" /> Generate insights
          </Button>
        </div>
      </div>

      {/* Onboarding — only shows if incomplete */}
      <OnboardingChecklist />

      {/* ─── KPI Strip ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <KpiCard icon={Newspaper} label="Newsletter Inbox" value={stats.inboxItems} href="/inbox" sublabel="Observed" />
        <KpiCard icon={Users} label="Competitors" value={stats.competitors} href="/competitors" sublabel="Tracked" />
        <KpiCard icon={BarChart3} label="Analyses" value={stats.completedAnalyses} href="/analytics" sublabel="Completed" />
        <KpiCard icon={Megaphone} label="Meta Ads" value={stats.metaAds} href="/meta-ads" sublabel={`${stats.activeAds} active`} />
        <KpiCard icon={Lightbulb} label="Insights" value={stats.insightCount} href="/insights" sublabel="AI-derived" />
        <KpiCard icon={Bell} label="Alerts" value={unreadCount} href="/alerts" sublabel="Unread" accent={unreadCount > 0} />
      </div>

      {/* ─── Empty state if no data yet ─── */}
      {!hasData && (
        <Card className="border-dashed border-2 bg-accent/20">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">Get started with your intelligence</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Connect your data sources and add competitors to unlock automated competitive intelligence.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {!gmailConnected && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/settings")}>
                  <Mail className="h-3.5 w-3.5" /> Connect Gmail
                </Button>
              )}
              {stats.competitors === 0 && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/competitors")}>
                  <Users className="h-3.5 w-3.5" /> Add competitors
                </Button>
              )}
              <Button size="sm" className="gap-1.5" onClick={() => navigate("/newsletters/new")}>
                <Newspaper className="h-3.5 w-3.5" /> Import newsletter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Main Grid: Insights + Alerts ─── */}
      {hasData && (
        <div className="grid lg:grid-cols-5 gap-4">
          {/* AI Insights — Wider */}
          <Card className="border lg:col-span-3">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />
                AI Insights
                <MetricBadge label="AI-derived" />
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => navigate("/insights")}>
                View all <ChevronRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {topInsights.length === 0 ? (
                <EmptySection
                  icon={Lightbulb}
                  title="No insights yet"
                  desc="Add newsletters or competitor data to generate AI insights"
                  action={{ label: "Generate insights", onClick: () => navigate("/insights") }}
                />
              ) : (
                <div className="space-y-2">
                  {topInsights.map((insight) => (
                    <button
                      key={insight.id}
                      onClick={() => navigate("/insights")}
                      className="w-full text-left rounded-lg border p-3 hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {insight.title}
                        </p>
                        <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                          {insight.category.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{insight.what_is_happening}</p>
                      {insight.confidence && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Progress value={insight.confidence * 100} className="h-1 flex-1 max-w-20" />
                          <span className="text-[10px] text-muted-foreground">{Math.round(insight.confidence * 100)}% confidence</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts — Narrower */}
          <Card className="border lg:col-span-2">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                Alerts
                {unreadCount > 0 && <Badge className="h-4 px-1.5 text-[10px]">{unreadCount}</Badge>}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => navigate("/alerts")}>
                View all <ChevronRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {recentAlerts.length === 0 ? (
                <EmptySection
                  icon={Bell}
                  title="All clear"
                  desc="No unread alerts. Set up rules to monitor competitor activity."
                  action={{ label: "Configure alerts", onClick: () => navigate("/alerts") }}
                />
              ) : (
                <div className="space-y-1">
                  {recentAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => navigate("/alerts")}
                      className="w-full flex items-start gap-2 rounded-md p-2 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn(
                        "mt-0.5 h-2 w-2 rounded-full shrink-0",
                        alert.severity === "high" ? "bg-destructive" :
                        alert.severity === "medium" ? "bg-warning" : "bg-muted-foreground/30"
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{alert.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{alert.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Activity Row: Recent Newsletters + Competitors ─── */}
      {hasData && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent Newsletters */}
          <Card className="border">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Recent Newsletters
                <MetricBadge label="Observed" />
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => navigate("/inbox")}>
                View inbox <ChevronRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {recentInbox.length === 0 ? (
                <EmptySection
                  icon={Newspaper}
                  title="No newsletters yet"
                  desc={gmailConnected ? "Newsletters will appear after your next Gmail sync" : "Connect Gmail or paste newsletters to start tracking"}
                  action={gmailConnected ? undefined : { label: "Connect Gmail", onClick: () => navigate("/settings") }}
                />
              ) : (
                <div className="space-y-0.5">
                  {recentInbox.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/inbox/${item.id}`)}
                      className="w-full flex items-center gap-3 rounded-md p-2 text-left hover:bg-muted/50 transition-colors group"
                    >
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md shrink-0 text-xs font-semibold",
                        item.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                      )}>
                        {(item.from_name || item.from_email || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{item.subject || "No subject"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.from_name || item.from_email || "Unknown sender"}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">
                        {item.received_at ? formatDistanceToNow(new Date(item.received_at), { addSuffix: true }) : "—"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competitor Tracker */}
          <Card className="border">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Tracked Competitors
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => navigate("/competitors")}>
                Manage <ChevronRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {competitors.length === 0 ? (
                <EmptySection
                  icon={Users}
                  title="No competitors yet"
                  desc="Add competitors to start tracking their newsletter and ad activity"
                  action={{ label: "Add competitor", onClick: () => navigate("/competitors") }}
                />
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {competitors.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => navigate("/competitors")}
                      className="flex items-center gap-2 rounded-md border p-2.5 text-left hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-semibold text-accent-foreground shrink-0">
                        {comp.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{comp.name}</p>
                        {comp.website && (
                          <p className="text-[10px] text-muted-foreground truncate">{comp.website.replace(/https?:\/\//, "")}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── System Health ─── */}
      <SystemHealthPanel />

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: Newspaper, label: "Add Newsletter", desc: "Paste or import", path: "/newsletters/new" },
          { icon: Users, label: "Competitors", desc: "Add or manage", path: "/competitors" },
          { icon: TrendingUp, label: "Analytics", desc: "Trends & patterns", path: "/analytics" },
          { icon: Megaphone, label: "Meta Ads", desc: "Ad intelligence", path: "/meta-ads" },
        ].map((a) => (
          <button
            key={a.path}
            onClick={() => navigate(a.path)}
            className="flex items-center gap-2.5 rounded-lg border p-3 text-left hover:bg-accent/50 hover:border-primary/20 transition-all group"
          >
            <a.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{a.label}</p>
              <p className="text-[10px] text-muted-foreground">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

const KpiCard = memo(function KpiCard({
  icon: Icon, label, value, href, sublabel, accent,
}: {
  icon: any; label: string; value: number; href: string; sublabel: string; accent?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <Card
      className={cn(
        "border cursor-pointer hover:shadow-sm transition-all group",
        accent && "border-primary/30 bg-primary/5"
      )}
      onClick={() => navigate(href)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <Icon className={cn("h-3.5 w-3.5", accent ? "text-primary" : "text-muted-foreground")} />
          <ArrowRight className="h-3 w-3 text-transparent group-hover:text-muted-foreground transition-colors" />
        </div>
        <p className={cn("text-lg font-semibold tracking-tight", accent && "text-primary")}>{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-[9px] text-muted-foreground/60 mt-0.5">{sublabel}</p>
      </CardContent>
    </Card>
  );
});

function MetricBadge({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-medium text-accent-foreground cursor-help">
          <Info className="h-2.5 w-2.5" /> {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-48">
        {label === "Observed" && "Data collected directly from imported newsletters and emails"}
        {label === "AI-derived" && "Generated by AI analysis of your competitive data"}
        {label === "Estimated" && "Statistical estimate based on available data points"}
      </TooltipContent>
    </Tooltip>
  );
}

function EmptySection({ icon: Icon, title, desc, action }: {
  icon: any; title: string; desc: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="py-6 text-center">
      <Icon className="h-5 w-5 mx-auto text-muted-foreground/20 mb-2" />
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5 max-w-48 mx-auto">{desc}</p>
      {action && (
        <Button variant="outline" size="sm" className="mt-3 h-7 text-xs gap-1" onClick={action.onClick}>
          {action.label} <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
