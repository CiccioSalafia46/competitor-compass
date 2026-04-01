import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AlertRule {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  rule_type: string;
  config: any;
  is_active: boolean;
  delivery_channels: string[];
  created_at: string;
}

export interface Alert {
  id: string;
  workspace_id: string;
  alert_rule_id: string | null;
  title: string;
  description: string | null;
  severity: string;
  category: string;
  is_read: boolean;
  is_dismissed: boolean;
  metadata: any;
  competitor_id: string | null;
  created_at: string;
}

export const RULE_TYPES = [
  { value: "discount_threshold", label: "Discount Threshold", description: "Alert when a competitor's discount exceeds a threshold" },
  { value: "keyword_match", label: "Keyword Match", description: "Alert when specific keywords appear in newsletters" },
  { value: "new_competitor_ad", label: "New Competitor Ads", description: "Alert when new competitor ads are detected" },
  { value: "activity_spike", label: "Activity Spike", description: "Alert on unusual volume of competitor activity" },
  { value: "new_category", label: "New Category Detected", description: "Alert when a competitor enters a new product category" },
] as const;

export function useAlertRules() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    if (!currentWorkspace) { setRules([]); setLoading(false); return; }
    const { data } = await supabase
      .from("alert_rules").select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false });
    setRules((data as unknown as AlertRule[]) || []);
    setLoading(false);
  }, [currentWorkspace]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const createRule = async (rule: { name: string; rule_type: string; config: any; delivery_channels?: string[] }) => {
    if (!currentWorkspace || !user) return;
    const { error } = await supabase.from("alert_rules").insert({
      workspace_id: currentWorkspace.id,
      created_by: user.id,
      ...rule,
      delivery_channels: rule.delivery_channels || ["in_app"],
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Alert rule created");
    await fetchRules();
  };

  const updateRule = async (id: string, updates: Partial<AlertRule>) => {
    const { error } = await supabase.from("alert_rules").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await fetchRules();
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from("alert_rules").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rule deleted");
    await fetchRules();
  };

  return { rules, loading, createRule, updateRule, deleteRule, refetch: fetchRules };
}

export function useAlerts() {
  const { currentWorkspace } = useWorkspace();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!currentWorkspace) { setAlerts([]); setUnreadCount(0); setLoading(false); return; }
    const { data } = await supabase
      .from("alerts").select("*")
      .eq("workspace_id", currentWorkspace.id)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(100);
    const alertData = (data as unknown as Alert[]) || [];
    setAlerts(alertData);
    setUnreadCount(alertData.filter(a => !a.is_read).length);
    setLoading(false);
  }, [currentWorkspace]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markRead = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    await fetchAlerts();
  };

  const markAllRead = async () => {
    if (!currentWorkspace) return;
    await supabase.from("alerts").update({ is_read: true }).eq("workspace_id", currentWorkspace.id).eq("is_read", false);
    await fetchAlerts();
  };

  const dismiss = async (id: string) => {
    await supabase.from("alerts").update({ is_dismissed: true }).eq("id", id);
    await fetchAlerts();
  };

  const evaluate = async () => {
    if (!currentWorkspace) return;
    setEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-alerts", {
        body: { workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      toast.success(`Evaluated rules: ${data?.alerts?.length || 0} alerts triggered`);
      await fetchAlerts();
    } catch (e: any) {
      toast.error(e.message || "Failed to evaluate alerts");
    } finally {
      setEvaluating(false);
    }
  };

  return { alerts, unreadCount, loading, evaluating, markRead, markAllRead, dismiss, evaluate, refetch: fetchAlerts };
}
