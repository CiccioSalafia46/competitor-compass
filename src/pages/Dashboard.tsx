import { useEffect, useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, Users, BarChart3, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Analysis = Database["public"]["Tables"]["analyses"]["Row"];

export default function Dashboard() {
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    newsletters: 0,
    competitors: 0,
    analyses: 0,
    completedAnalyses: 0,
  });
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchStats = async () => {
      setLoading(true);
      const [newsletters, competitors, analyses] = await Promise.all([
        supabase.from("newsletter_entries").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
        supabase.from("competitors").select("id", { count: "exact", head: true }).eq("workspace_id", currentWorkspace.id),
        supabase.from("analyses").select("id, status", { count: "exact" }).eq("workspace_id", currentWorkspace.id),
      ]);

      const completedCount = analyses.data?.filter((a) => a.status === "completed").length || 0;

      setStats({
        newsletters: newsletters.count || 0,
        competitors: competitors.count || 0,
        analyses: analyses.count || 0,
        completedAnalyses: completedCount,
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">No workspace found. Create one to get started.</p>
      </div>
    );
  }

  const statCards = [
    { label: "Newsletters", value: stats.newsletters, icon: Newspaper, color: "text-primary" },
    { label: "Competitors", value: stats.competitors, icon: Users, color: "text-accent-foreground" },
    { label: "Analyses", value: stats.analyses, icon: BarChart3, color: "text-success" },
    { label: "Completed", value: stats.completedAnalyses, icon: TrendingUp, color: "text-warning" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{currentWorkspace.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">Competitive intelligence overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-raised border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-raised border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Recent Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAnalyses.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No analyses yet</p>
                <button
                  onClick={() => navigate("/newsletters/new")}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Add your first newsletter →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnalyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/analyses/${analysis.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">{analysis.analysis_type.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {analysis.completed_at ? new Date(analysis.completed_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    {analysis.confidence && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        analysis.confidence === "high" ? "bg-success/10 text-success" :
                        analysis.confidence === "medium" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {analysis.confidence}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-raised border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => navigate("/newsletters/new")}
              className="w-full flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50 transition-colors text-left"
            >
              <Newspaper className="h-4 w-4 text-primary" />
              <div>
                <p className="font-medium">Add Newsletter</p>
                <p className="text-xs text-muted-foreground">Paste or import newsletter content</p>
              </div>
            </button>
            <button
              onClick={() => navigate("/competitors")}
              className="w-full flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50 transition-colors text-left"
            >
              <Users className="h-4 w-4 text-accent-foreground" />
              <div>
                <p className="font-medium">Manage Competitors</p>
                <p className="text-xs text-muted-foreground">Add or edit tracked competitors</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
