import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, Brain, Bell, RefreshCw, CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Status = "healthy" | "warning" | "error" | "idle";

interface SubsystemStatus {
  label: string;
  status: Status;
  detail: string;
  icon: typeof Mail;
  lastActivity?: string;
}

export function SystemHealthPanel() {
  const { connection, isConnected } = useGmailConnection();
  const { currentWorkspace } = useWorkspace();
  const [subsystems, setSubsystems] = useState<SubsystemStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const evaluate = useCallback(async () => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;

    // Parallel lightweight queries
    const [lastExtraction, lastInsight, alertRuleCount] = await Promise.all([
      supabase
        .from("newsletter_extractions")
        .select("created_at")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("insights")
        .select("created_at")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("alert_rules")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .eq("is_active", true),
    ]);

    const systems: SubsystemStatus[] = [];

    // Gmail
    if (isConnected && connection) {
      const syncStatus = connection.sync_status;
      const hasError = !!connection.sync_error;
      const lastSync = connection.last_sync_at;
      systems.push({
        label: "Gmail Sync",
        icon: Mail,
        status: hasError ? "error" : syncStatus === "syncing" ? "warning" : "healthy",
        detail: hasError
          ? `Error: ${connection.sync_error}`
          : syncStatus === "syncing"
          ? "Sync in progress…"
          : lastSync
          ? `Last sync ${formatDistanceToNow(new Date(lastSync), { addSuffix: true })}`
          : "Connected, awaiting first sync",
        lastActivity: lastSync || undefined,
      });
    } else {
      systems.push({
        label: "Gmail Sync",
        icon: Mail,
        status: "idle",
        detail: "Not connected",
      });
    }

    // AI Pipeline
    const lastExt = lastExtraction.data;
    systems.push({
      label: "AI Extraction",
      icon: Brain,
      status: lastExt ? "healthy" : "idle",
      detail: lastExt
        ? `Last run ${formatDistanceToNow(new Date(lastExt.created_at), { addSuffix: true })}`
        : "No extractions yet",
      lastActivity: lastExt?.created_at,
    });

    // Insights
    const lastIns = lastInsight.data;
    systems.push({
      label: "Insights",
      icon: Brain,
      status: lastIns ? "healthy" : "idle",
      detail: lastIns
        ? `Last generated ${formatDistanceToNow(new Date(lastIns.created_at), { addSuffix: true })}`
        : "No insights generated yet",
      lastActivity: lastIns?.created_at,
    });

    // Alerts
    const ruleCount = alertRuleCount.count || 0;
    systems.push({
      label: "Alert System",
      icon: Bell,
      status: ruleCount > 0 ? "healthy" : "idle",
      detail: ruleCount > 0 ? `${ruleCount} active rule${ruleCount > 1 ? "s" : ""}` : "No active rules",
    });

    setSubsystems(systems);
    setLoading(false);
  }, [currentWorkspace, isConnected, connection]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  if (loading || subsystems.length === 0) return null;

  const statusIcon = (s: Status) => {
    switch (s) {
      case "healthy": return <CheckCircle className="h-3 w-3 text-[hsl(var(--success))]" />;
      case "warning": return <Clock className="h-3 w-3 text-[hsl(var(--warning))]" />;
      case "error": return <XCircle className="h-3 w-3 text-destructive" />;
      case "idle": return <AlertCircle className="h-3 w-3 text-muted-foreground/40" />;
    }
  };

  return (
    <Card className="border">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {subsystems.map((sys) => (
            <Tooltip key={sys.label}>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-2 rounded-md border p-2 transition-colors",
                  sys.status === "error" && "border-destructive/30 bg-destructive/5",
                  sys.status === "healthy" && "border-emerald-500/20",
                )}>
                  {statusIcon(sys.status)}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium truncate">{sys.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{sys.detail}</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-56">
                {sys.detail}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
