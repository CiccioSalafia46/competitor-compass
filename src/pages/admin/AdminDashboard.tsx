import { useAdminData } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Building2, Mail, Newspaper, Lightbulb, Target,
  AlertTriangle, Activity, BarChart3, Megaphone, TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";

type AdminOverviewActivity = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

type AdminOverviewSyncError = {
  id: string;
  email_address: string;
  sync_status: string;
  sync_error: string | null;
};

type AdminOverviewData = {
  recentSignups: number;
  totalUsers: number;
  totalWorkspaces: number;
  gmailConnections: number;
  totalNewsletters: number;
  totalInsights: number;
  totalCompetitors: number;
  totalAnalyses: number;
  totalMetaAds: number;
  rateLimitHits: number;
  recentActivity?: AdminOverviewActivity[];
  syncErrors?: AdminOverviewSyncError[];
};

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data, loading, error } = useAdminData<AdminOverviewData>("overview");

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Overview</h1>
          <p className="text-sm text-muted-foreground">Real-time platform metrics and activity</p>
        </div>
        <Badge variant="outline" className="text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          {data.recentSignups} new users this week
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Total Users" value={data.totalUsers} />
        <StatCard icon={Building2} label="Workspaces" value={data.totalWorkspaces} />
        <StatCard icon={Mail} label="Gmail Connections" value={data.gmailConnections} />
        <StatCard icon={Newspaper} label="Newsletters" value={data.totalNewsletters} />
        <StatCard icon={Lightbulb} label="Insights" value={data.totalInsights} />
        <StatCard icon={Target} label="Competitors" value={data.totalCompetitors} />
        <StatCard icon={BarChart3} label="Analyses" value={data.totalAnalyses} />
        <StatCard icon={Megaphone} label="Meta Ads" value={data.totalMetaAds} />
        <StatCard icon={Activity} label="Rate Limit Entries" value={data.rateLimitHits} />
        <StatCard icon={AlertTriangle} label="Sync Errors" value={data.syncErrors?.length || 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-auto">
            {data.recentActivity?.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
            {data.recentActivity?.map((log) => (
              <div key={log.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.entity_type}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(log.created_at), "MMM d, HH:mm")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Integration Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-auto">
            {data.syncErrors?.length === 0 && (
              <p className="text-sm text-muted-foreground">No active issues</p>
            )}
            {data.syncErrors?.map((conn) => (
              <div key={conn.id} className="border rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{conn.email_address}</span>
                  <Badge variant="destructive" className="text-[10px]">{conn.sync_status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{conn.sync_error}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
