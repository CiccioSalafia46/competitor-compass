import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import type { Database, Json } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/errors";

export type AlertRule = Database["public"]["Tables"]["alert_rules"]["Row"];
export type Alert = Database["public"]["Tables"]["alerts"]["Row"];
export type AlertTriggerLog = Database["public"]["Tables"]["alert_trigger_logs"]["Row"];

export type AlertRuleType =
  | "discount_threshold"
  | "keyword_detection"
  | "new_campaign_launch"
  | "activity_spike"
  | "keyword_match"
  | "new_competitor_ad"
  | "new_category";

export type AlertEvaluationMode = "event" | "scheduled" | "both";

export type AlertRuleOption = {
  value: AlertRuleType;
  label: string;
  description: string;
  legacy?: boolean;
};

export type AlertRuleConfig = {
  threshold?: number;
  keywords?: string[];
  campaign_types?: string[];
  spike_multiplier?: number;
  minimum_events?: number;
  min_ads?: number;
  known_categories?: string[];
  cooldown_hours?: number;
};

export const RULE_TYPES: AlertRuleOption[] = [
  {
    value: "discount_threshold",
    label: "Discount threshold",
    description: "Trigger when a tracked competitor discount reaches a threshold.",
  },
  {
    value: "keyword_detection",
    label: "Keyword detection",
    description: "Trigger when defined keywords appear in newly imported newsletters.",
  },
  {
    value: "new_campaign_launch",
    label: "New campaign launch",
    description: "Trigger when a new newsletter campaign or paid campaign is detected.",
  },
  {
    value: "activity_spike",
    label: "Unusual activity spike",
    description: "Trigger when a competitor activity volume jumps above the recent baseline.",
  },
  {
    value: "keyword_match",
    label: "Keyword match (legacy)",
    description: "Legacy keyword rule kept for backward compatibility.",
    legacy: true,
  },
  {
    value: "new_competitor_ad",
    label: "New competitor ads (legacy)",
    description: "Legacy ad rule kept for backward compatibility.",
    legacy: true,
  },
  {
    value: "new_category",
    label: "New category detected (legacy)",
    description: "Legacy category rule kept for backward compatibility.",
    legacy: true,
  },
] as const;

export const ALERT_EVALUATION_MODES: Array<{
  value: AlertEvaluationMode;
  label: string;
  description: string;
}> = [
  {
    value: "both",
    label: "Real-time + scheduled",
    description: "Trigger on new imports and during manual or scheduled scans.",
  },
  {
    value: "event",
    label: "Real-time only",
    description: "Trigger only when new emails, extractions or ads are ingested.",
  },
  {
    value: "scheduled",
    label: "Scheduled scans only",
    description: "Trigger only during manual or scheduled evaluation scans.",
  },
];

type UseAlertsOptions = {
  limit?: number;
  onlyUnread?: boolean;
};

type UseTriggerLogsOptions = {
  limit?: number;
};

type EvaluateAlertsResponse = {
  success: boolean;
  created: number;
  suppressed: number;
  failed: number;
  evaluatedRules: number;
  alerts: Array<{ title: string; status: string; ruleId: string; alertId?: string | null }>;
  message: string;
};

function normalizeRuleConfig(config: Json): AlertRuleConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }

  const record = config as Record<string, unknown>;

  return {
    threshold: typeof record.threshold === "number" ? record.threshold : undefined,
    keywords: Array.isArray(record.keywords)
      ? record.keywords.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : undefined,
    campaign_types: Array.isArray(record.campaign_types)
      ? record.campaign_types.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : undefined,
    spike_multiplier: typeof record.spike_multiplier === "number" ? record.spike_multiplier : undefined,
    minimum_events: typeof record.minimum_events === "number" ? record.minimum_events : undefined,
    min_ads: typeof record.min_ads === "number" ? record.min_ads : undefined,
    known_categories: Array.isArray(record.known_categories)
      ? record.known_categories.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : undefined,
    cooldown_hours: typeof record.cooldown_hours === "number" ? record.cooldown_hours : undefined,
  };
}

export function getRuleTypeMeta(ruleType: string) {
  return RULE_TYPES.find((entry) => entry.value === ruleType) ?? null;
}

export function getRuleConfigSummary(rule: AlertRule) {
  const config = normalizeRuleConfig(rule.config);

  switch (rule.rule_type) {
    case "discount_threshold":
      return `Threshold ${config.threshold ?? 30}%`;
    case "keyword_detection":
    case "keyword_match":
      return config.keywords?.length ? `Keywords: ${config.keywords.join(", ")}` : "No keywords configured";
    case "new_campaign_launch":
      return config.campaign_types?.length
        ? `Campaigns: ${config.campaign_types.join(", ")}`
        : "All campaign launches";
    case "activity_spike":
      return `>= ${config.minimum_events ?? 3} events and ${config.spike_multiplier ?? 2}x baseline`;
    case "new_competitor_ad":
      return `At least ${config.min_ads ?? 1} new ads`;
    case "new_category":
      return config.known_categories?.length
        ? `Known categories: ${config.known_categories.join(", ")}`
        : "Any new category";
    default:
      return "Custom rule";
  }
}

export function useAlertRules() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    if (!currentWorkspace || !user) {
      setRules([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(getErrorMessage(error, "Failed to load alert rules"));
      setRules([]);
      setLoading(false);
      return;
    }

    setRules((data as AlertRule[]) || []);
    setLoading(false);
  }, [currentWorkspace, user]);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const createRule = async (rule: {
    name: string;
    rule_type: string;
    config: Json;
    evaluation_mode?: AlertEvaluationMode;
    delivery_channels?: string[];
  }) => {
    if (!currentWorkspace || !user) return;

    const { error } = await supabase.from("alert_rules").insert({
      workspace_id: currentWorkspace.id,
      created_by: user.id,
      name: rule.name,
      rule_type: rule.rule_type,
      config: rule.config,
      evaluation_mode: rule.evaluation_mode || "both",
      delivery_channels: rule.delivery_channels || ["in_app"],
    });

    if (error) {
      toast.error(getErrorMessage(error, "Failed to create alert rule"));
      return;
    }

    toast.success("Alert rule created");
    await fetchRules();
  };

  const updateRule = async (id: string, updates: Partial<AlertRule>) => {
    const { error } = await supabase.from("alert_rules").update(updates).eq("id", id);
    if (error) {
      toast.error(getErrorMessage(error, "Failed to update alert rule"));
      return;
    }
    await fetchRules();
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from("alert_rules").delete().eq("id", id);
    if (error) {
      toast.error(getErrorMessage(error, "Failed to delete alert rule"));
      return;
    }
    toast.success("Rule deleted");
    await fetchRules();
  };

  return { rules, loading, createRule, updateRule, deleteRule, refetch: fetchRules };
}

export function useAlerts(options: UseAlertsOptions = {}) {
  const { currentWorkspace } = useWorkspace();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const limit = options.limit ?? 100;
  const onlyUnread = options.onlyUnread ?? false;

  const fetchAlerts = useCallback(async () => {
    if (!currentWorkspace) {
      setAlerts([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const baseQuery = supabase
      .from("alerts")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .eq("is_dismissed", false);

    const [alertsResult, unreadResult] = await Promise.all([
      (onlyUnread ? baseQuery.eq("is_read", false) : baseQuery)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_read", false)
        .eq("is_dismissed", false),
    ]);

    if (alertsResult.error) {
      toast.error(getErrorMessage(alertsResult.error, "Failed to load alerts"));
      setAlerts([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setAlerts((alertsResult.data as Alert[]) || []);
    setUnreadCount(unreadResult.count || 0);
    setLoading(false);
  }, [currentWorkspace, limit, onlyUnread]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const markRead = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    await fetchAlerts();
  };

  const markAllRead = async () => {
    if (!currentWorkspace) return;
    await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("workspace_id", currentWorkspace.id)
      .eq("is_read", false)
      .eq("is_dismissed", false);
    await fetchAlerts();
  };

  const dismiss = async (id: string) => {
    await supabase.from("alerts").update({ is_dismissed: true }).eq("id", id);
    await fetchAlerts();
  };

  const evaluate = async (source: "manual" | "scheduled" = "manual") => {
    if (!currentWorkspace) return;
    setEvaluating(true);
    try {
      const result = await invokeEdgeFunction<EvaluateAlertsResponse>("evaluate-alerts", {
        body: { workspaceId: currentWorkspace.id, source },
      });

      toast.success(
        result.created > 0
          ? `${result.created} alert${result.created === 1 ? "" : "s"} triggered`
          : "Rules checked with no new alerts",
      );

      if (result.suppressed > 0) {
        toast.info(`${result.suppressed} duplicate trigger${result.suppressed === 1 ? " was" : "s were"} suppressed`);
      }

      await fetchAlerts();
      return result;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to evaluate alerts"));
      return null;
    } finally {
      setEvaluating(false);
    }
  };

  return {
    alerts,
    unreadCount,
    loading,
    evaluating,
    markRead,
    markAllRead,
    dismiss,
    evaluate,
    refetch: fetchAlerts,
  };
}

export function useAlertTriggerLogs(options: UseTriggerLogsOptions = {}) {
  const { currentWorkspace } = useWorkspace();
  const [logs, setLogs] = useState<AlertTriggerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = options.limit ?? 100;

  const fetchLogs = useCallback(async () => {
    if (!currentWorkspace) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("alert_trigger_logs")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      toast.error(getErrorMessage(error, "Failed to load alert trigger log"));
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs((data as AlertTriggerLog[]) || []);
    setLoading(false);
  }, [currentWorkspace, limit]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}
