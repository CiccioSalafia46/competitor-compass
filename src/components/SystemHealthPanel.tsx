import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, type Locale } from "date-fns";
import { de, enUS, es, fr, it } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Bell,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Mail,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Status = "healthy" | "warning" | "error" | "idle";

interface SubsystemStatus {
  id: "gmail" | "extraction" | "insights" | "alerts";
  label: string;
  status: Status;
  detail: string;
  icon: LucideIcon;
  lastActivity?: string;
  action?: {
    label: string;
    path: string;
  };
}

const DATE_FNS_LOCALES = { de, en: enUS, es, fr, it };

function getDateFnsLocale(language: string): Locale {
  const lang = language.split("-")[0] as keyof typeof DATE_FNS_LOCALES;
  return DATE_FNS_LOCALES[lang] ?? enUS;
}

function getStaleStatus(timestamp?: string | null): Status {
  if (!timestamp) return "idle";
  const hoursSince = Math.max(0, (Date.now() - new Date(timestamp).getTime()) / 36e5);
  if (hoursSince > 24 * 7) return "error";
  if (hoursSince > 24) return "warning";
  return "healthy";
}

function getStatusIcon(status: Status) {
  switch (status) {
    case "healthy":
      return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    case "warning":
      return <Clock3 className="h-3.5 w-3.5 text-warning" />;
    case "error":
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    case "idle":
      return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/50" />;
  }
}

function getSummaryStatus(subsystems: SubsystemStatus[]): Status {
  if (subsystems.some((system) => system.status === "error")) return "error";
  if (subsystems.some((system) => system.status === "warning")) return "warning";
  if (subsystems.some((system) => system.status === "healthy")) return "healthy";
  return "idle";
}

export function SystemHealthPanel() {
  const { t, i18n } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { connection, isConnected } = useGmailConnection();
  const { currentWorkspace } = useWorkspace();
  const [subsystems, setSubsystems] = useState<SubsystemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const locale = useMemo(
    () => getDateFnsLocale(i18n.resolvedLanguage || i18n.language || "en"),
    [i18n.language, i18n.resolvedLanguage],
  );

  const relativeTime = useCallback(
    (timestamp: string) => formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale }),
    [locale],
  );

  const evaluate = useCallback(async () => {
    if (!currentWorkspace) {
      setSubsystems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const workspaceId = currentWorkspace.id;

    const [lastExtraction, lastInsight, alertRuleCount] = await Promise.all([
      supabase
        .from("newsletter_extractions")
        .select("created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("insights")
        .select("created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("alert_rules")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("is_active", true),
    ]);

    const nextSubsystems: SubsystemStatus[] = [];

    if (isConnected && connection) {
      const lastSyncAt = connection.last_sync_at;
      const staleStatus = getStaleStatus(lastSyncAt);
      const hasError = Boolean(connection.sync_error);

      nextSubsystems.push({
        id: "gmail",
        label: t("systemHealthGmail"),
        icon: Mail,
        status: hasError ? "error" : connection.sync_status === "syncing" ? "warning" : staleStatus,
        detail: hasError
          ? t("systemHealthGmailError", { value: connection.sync_error })
          : connection.sync_status === "syncing"
            ? t("systemHealthSyncInProgress")
            : lastSyncAt
              ? t("systemHealthLastSync", { value: relativeTime(lastSyncAt) })
              : t("systemHealthAwaitingFirstSync"),
        lastActivity: lastSyncAt || undefined,
        action: hasError || staleStatus === "error" || staleStatus === "warning"
          ? { label: hasError ? t("reconnect") : t("investigate"), path: "/settings" }
          : undefined,
      });
    } else {
      nextSubsystems.push({
        id: "gmail",
        label: t("systemHealthGmail"),
        icon: Mail,
        status: "idle",
        detail: t("systemHealthNotConnected"),
        action: { label: t("connectSource"), path: "/settings" },
      });
    }

    const extractionTimestamp = lastExtraction.data?.created_at;
    nextSubsystems.push({
      id: "extraction",
      label: t("systemHealthExtraction"),
      icon: Brain,
      status: lastExtraction.error ? "error" : getStaleStatus(extractionTimestamp),
      detail: lastExtraction.error
        ? t("systemHealthQueryFailed")
        : extractionTimestamp
          ? t("systemHealthLastRun", { value: relativeTime(extractionTimestamp) })
          : t("systemHealthNoExtractions"),
      lastActivity: extractionTimestamp,
      action: lastExtraction.error ? { label: t("investigate"), path: "/settings" } : undefined,
    });

    const insightTimestamp = lastInsight.data?.created_at;
    nextSubsystems.push({
      id: "insights",
      label: t("systemHealthInsights"),
      icon: Brain,
      status: lastInsight.error ? "error" : getStaleStatus(insightTimestamp),
      detail: lastInsight.error
        ? t("systemHealthQueryFailed")
        : insightTimestamp
          ? t("systemHealthLastGenerated", { value: relativeTime(insightTimestamp) })
          : t("systemHealthNoInsights"),
      lastActivity: insightTimestamp,
      action: lastInsight.error ? { label: t("investigate"), path: "/settings" } : undefined,
    });

    const activeRuleCount = alertRuleCount.count || 0;
    nextSubsystems.push({
      id: "alerts",
      label: t("systemHealthAlerts"),
      icon: Bell,
      status: alertRuleCount.error ? "error" : activeRuleCount > 0 ? "healthy" : "idle",
      detail: alertRuleCount.error
        ? t("systemHealthQueryFailed")
        : activeRuleCount > 0
          ? t("systemHealthActiveRules", { count: activeRuleCount })
          : t("systemHealthNoActiveRules"),
      action: alertRuleCount.error ? { label: t("investigate"), path: "/alerts" } : undefined,
    });

    setSubsystems(nextSubsystems);
    setLoading(false);
  }, [connection, currentWorkspace, isConnected, relativeTime, t]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  const summaryStatus = getSummaryStatus(subsystems);
  const hasIssue = summaryStatus === "warning" || summaryStatus === "error";
  const lastActivity = subsystems
    .map((system) => system.lastActivity)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

  useEffect(() => {
    if (hasIssue) setExpanded(true);
  }, [hasIssue]);

  if (loading && subsystems.length === 0) {
    return <div className="h-12 rounded-xl border bg-card motion-safe:animate-pulse motion-reduce:animate-none" />;
  }

  if (!currentWorkspace || subsystems.length === 0) return null;

  const summaryLabel = {
    healthy: t("systemHealthOperational"),
    warning: t("systemHealthDegraded"),
    error: t("systemHealthNeedsAttention"),
    idle: t("systemHealthIdle"),
  }[summaryStatus];
  const lastActivityLabel = lastActivity
    ? t("systemHealthLastActivity", { value: relativeTime(lastActivity) })
    : t("systemHealthNoActivity");

  return (
    <section
      className={cn(
        "rounded-xl border bg-card shadow-sm",
        summaryStatus === "warning" && "border-warning/30 bg-warning/5",
        summaryStatus === "error" && "border-destructive/30 bg-destructive/5",
      )}
    >
      <button
        className="flex min-h-12 w-full items-center gap-2.5 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            !expanded && "-rotate-90",
          )}
        />
        {getStatusIcon(summaryStatus)}
        <span className="min-w-0 flex-1">
          <span className="font-medium text-foreground">{t("systemHealth")}</span>
          <span className="ml-2 text-xs text-muted-foreground">{summaryLabel}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline"> · {lastActivityLabel}</span>
        </span>
        {hasIssue && (
          <span className={cn("text-caption font-semibold", summaryStatus === "error" ? "text-destructive" : "text-warning")}>
            {t("attentionRequired")}
          </span>
        )}
      </button>

      {expanded && (
        <div className="grid gap-2 border-t px-4 py-3 sm:grid-cols-2">
          {subsystems.map((system) => {
            const Icon = system.icon;
            return (
              <Tooltip key={system.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-lg border bg-background/60 p-2.5",
                      system.status === "warning" && "border-warning/30 bg-warning/5",
                      system.status === "error" && "border-destructive/30 bg-destructive/5",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {getStatusIcon(system.status)}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">{system.label}</span>
                      <span className="block truncate text-caption text-muted-foreground">{system.detail}</span>
                    </span>
                    {system.action && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 px-2 text-caption"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(system.action.path);
                        }}
                      >
                        {system.action.label}
                      </Button>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64 text-xs">
                  {system.detail}
                </TooltipContent>
              </Tooltip>
            );
          })}
          <div className="flex items-center gap-2 px-1 pt-1 text-caption text-muted-foreground sm:col-span-2">
            <RefreshCw className="h-3 w-3" />
            {t("systemHealthRefreshHint")}
          </div>
        </div>
      )}
    </section>
  );
}
