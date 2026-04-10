import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ALERT_EVALUATION_MODES,
  RULE_TYPES,
  getRuleConfigSummary,
  getRuleTypeMeta,
  normalizeRuleConfig,
  type AlertRuleConfig,
  type AlertRuleType,
  type AlertEvaluationMode,
  type AlertRule,
  useAlertRules,
  useAlerts,
  useAlertTriggerLogs,
  useAlertStats,
} from "@/hooks/useAlerts";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  History,
  Info,
  Megaphone,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, {
  border: string;
  icon: React.ElementType;
  badge: string;
  dot: string;
  bg: string;
}> = {
  high: {
    border: "border-l-destructive",
    icon: AlertCircle,
    badge: "border-destructive/25 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    bg: "bg-destructive/[0.03]",
  },
  medium: {
    border: "border-l-amber-400",
    icon: AlertTriangle,
    badge: "border-amber-400/30 bg-amber-400/15 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
    bg: "bg-amber-50/30 dark:bg-amber-950/10",
  },
  info: {
    border: "border-l-primary/60",
    icon: Info,
    badge: "border-primary/20 bg-primary/10 text-primary",
    dot: "bg-primary/60",
    bg: "",
  },
  low: {
    border: "border-l-muted-foreground/25",
    icon: Info,
    badge: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/30",
    bg: "",
  },
};

// ─── Rule type config ─────────────────────────────────────────────────────────

const RULE_TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  discount_threshold: { icon: Percent, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  keyword_detection: { icon: Search, color: "bg-primary/10 text-primary" },
  new_campaign_launch: { icon: Megaphone, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  activity_spike: { icon: Zap, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

function getRuleIcon(ruleType: string): React.ElementType {
  return RULE_TYPE_META[ruleType]?.icon ?? Bell;
}

function getRuleColor(ruleType: string): string {
  return RULE_TYPE_META[ruleType]?.color ?? "bg-primary/10 text-primary";
}

// ─── Rule presets ─────────────────────────────────────────────────────────────

const RULE_PRESETS = [
  {
    label: "Deep discount",
    icon: Percent,
    description: "Alert when a competitor drops prices ≥ 40%",
    ruleType: "discount_threshold" as AlertRuleType,
    config: { threshold: 40, cooldown_hours: 24 } as AlertRuleConfig,
  },
  {
    label: "Campaign launch",
    icon: Megaphone,
    description: "Alert on any new competitor campaign launch",
    ruleType: "new_campaign_launch" as AlertRuleType,
    config: { cooldown_hours: 12 } as AlertRuleConfig,
  },
  {
    label: "Activity spike",
    icon: Zap,
    description: "Alert when competitor activity jumps 2× baseline",
    ruleType: "activity_spike" as AlertRuleType,
    config: { spike_multiplier: 2, minimum_events: 3, cooldown_hours: 24 } as AlertRuleConfig,
  },
  {
    label: "Pricing signal",
    icon: Search,
    description: 'Alert on mentions of "price", "discount", "offer", "cost"',
    ruleType: "keyword_detection" as AlertRuleType,
    config: { keywords: ["price", "discount", "offer", "cost", "promotion", "fee"], cooldown_hours: 48 } as AlertRuleConfig,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toRelativeDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function StatCard({ icon: Icon, label, value, detail, accent }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border p-4",
      accent ? "border-destructive/25 bg-destructive/5" : "bg-card shadow-sm",
    )}>
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        accent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold tabular-nums leading-tight", accent && "text-destructive")}>{value}</p>
        {detail && <p className="text-[10px] text-muted-foreground/70 truncate">{detail}</p>}
      </div>
    </div>
  );
}

// ─── Create / Edit Rule Dialog ────────────────────────────────────────────────

type RulePreset = typeof RULE_PRESETS[number];

function CreateEditRuleDialog({
  open,
  onOpenChange,
  onSaved,
  existingRule,
  initialPreset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  existingRule?: AlertRule | null;
  initialPreset?: RulePreset | null;
}) {
  const { currentWorkspace } = useWorkspace();
  const { createRule, updateRule } = useAlertRules();
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<AlertRuleType>("discount_threshold");
  const [evaluationMode, setEvaluationMode] = useState<AlertEvaluationMode>("both");
  const [config, setConfig] = useState<AlertRuleConfig>({ threshold: 30, cooldown_hours: 24 });
  const [channels, setChannels] = useState(["in_app"]);
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const isEditing = !!existingRule;

  useEffect(() => {
    if (!open || !currentWorkspace) return;
    void supabase
      .from("competitors")
      .select("id, name")
      .eq("workspace_id", currentWorkspace.id)
      .order("name")
      .then(({ data }) => setCompetitors(data || []));
  }, [open, currentWorkspace]);

  useEffect(() => {
    if (!open) return;
    if (existingRule) {
      const normalized = normalizeRuleConfig(existingRule.config as Json);
      setName(existingRule.name);
      setRuleType(existingRule.rule_type as AlertRuleType);
      setEvaluationMode((existingRule.evaluation_mode as AlertEvaluationMode) || "both");
      setConfig(normalized);
      setChannels((existingRule.delivery_channels as string[]) || ["in_app"]);
      setSelectedCompetitorIds(normalized.competitor_ids ?? []);
    } else if (initialPreset) {
      setName(initialPreset.label);
      setRuleType(initialPreset.ruleType);
      setEvaluationMode("both");
      setConfig({ ...initialPreset.config });
      setChannels(["in_app"]);
      setSelectedCompetitorIds([]);
    } else {
      setName("");
      setRuleType("discount_threshold");
      setEvaluationMode("both");
      setConfig({ threshold: 30, cooldown_hours: 24 });
      setChannels(["in_app"]);
      setSelectedCompetitorIds([]);
    }
  }, [open, existingRule, initialPreset]);

  const handleTypeChange = (value: string) => {
    setRuleType(value as AlertRuleType);
    setConfig({ cooldown_hours: config.cooldown_hours ?? 24 });
  };

  const toggleCompetitor = (id: string) => {
    setSelectedCompetitorIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalConfig: AlertRuleConfig = {
        ...config,
        competitor_ids: selectedCompetitorIds.length > 0 ? selectedCompetitorIds : undefined,
      };
      if (isEditing && existingRule) {
        await updateRule(existingRule.id, {
          name,
          rule_type: ruleType,
          config: finalConfig as Json,
          evaluation_mode: evaluationMode,
          delivery_channels: channels,
        });
      } else {
        await createRule({
          name,
          rule_type: ruleType,
          config: finalConfig as Json,
          evaluation_mode: evaluationMode,
          delivery_channels: channels,
        });
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const visibleRuleTypes = RULE_TYPES.filter((r) => !r.legacy);

  const canSave =
    name.trim().length > 0 &&
    (ruleType !== "keyword_detection" || (config.keywords?.length ?? 0) > 0) &&
    (ruleType !== "discount_threshold" || (config.threshold ?? 0) > 0) &&
    (ruleType !== "activity_spike" || ((config.minimum_events ?? 0) > 0 && (config.spike_multiplier ?? 0) >= 1));

  const commonCooldown = (
    <div className="space-y-1.5">
      <Label className="text-xs">Cooldown (hours)</Label>
      <Input
        type="number"
        min={1}
        max={168}
        value={config.cooldown_hours ?? 24}
        onChange={(e) => setConfig((c) => ({ ...c, cooldown_hours: Number(e.target.value) }))}
        className="h-8"
      />
      <p className="text-[11px] text-muted-foreground">Suppress repeated alerts for this rule within this window.</p>
    </div>
  );

  const configFields: Record<AlertRuleType, React.ReactNode> = {
    discount_threshold: (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Discount threshold (%)</Label>
          <Input
            type="number"
            min={1}
            max={95}
            value={config.threshold ?? 30}
            onChange={(e) => setConfig((c) => ({ ...c, threshold: Number(e.target.value) }))}
            className="h-8"
          />
          <p className="text-[11px] text-muted-foreground">Fire when a competitor discount reaches or exceeds this percentage.</p>
        </div>
        {commonCooldown}
      </div>
    ),
    keyword_detection: (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Keywords (comma-separated)</Label>
          <Input
            value={(config.keywords || []).join(", ")}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
              }))
            }
            placeholder="launch, new pricing, Black Friday"
            className="h-8"
          />
          <p className="text-[11px] text-muted-foreground">Alert when any of these keywords appear in competitor newsletters.</p>
        </div>
        {commonCooldown}
      </div>
    ),
    new_campaign_launch: (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Campaign types (optional)</Label>
          <Input
            value={(config.campaign_types || []).join(", ")}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                campaign_types: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
              }))
            }
            placeholder="product_launch, promotional, announcement"
            className="h-8"
          />
          <p className="text-[11px] text-muted-foreground">Leave empty to monitor every new campaign detected.</p>
        </div>
        {commonCooldown}
      </div>
    ),
    activity_spike: (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Spike multiplier</Label>
            <Input
              type="number"
              step="0.5"
              min={1}
              value={config.spike_multiplier ?? 2}
              onChange={(e) => setConfig((c) => ({ ...c, spike_multiplier: Number(e.target.value) }))}
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Minimum events</Label>
            <Input
              type="number"
              min={1}
              value={config.minimum_events ?? 3}
              onChange={(e) => setConfig((c) => ({ ...c, minimum_events: Number(e.target.value) }))}
              className="h-8"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Fire when the 24h activity count is ≥ {config.spike_multiplier ?? 2}× the 7-day average and ≥ {config.minimum_events ?? 3} events.</p>
        {commonCooldown}
      </div>
    ),
    keyword_match: null,
    new_competitor_ad: null,
    new_category: null,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">{isEditing ? "Edit alert rule" : "Create alert rule"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the rule configuration below." : "Rules evaluate competitor newsletters, extractions, and ads automatically."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto pr-1">
          {/* Rule name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Rule name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deep discount detected"
              className="h-8"
            />
          </div>

          {/* Rule type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Rule type</Label>
            <Select value={ruleType} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleRuleTypes.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getRuleTypeMeta(ruleType) && (
              <p className="text-[11px] text-muted-foreground">{getRuleTypeMeta(ruleType)!.description}</p>
            )}
          </div>

          {/* Evaluation mode */}
          <div className="space-y-1.5">
            <Label className="text-xs">Evaluation mode</Label>
            <Select value={evaluationMode} onValueChange={(v) => setEvaluationMode(v as AlertEvaluationMode)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_EVALUATION_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {ALERT_EVALUATION_MODES.find((m) => m.value === evaluationMode)?.description}
            </p>
          </div>

          {/* Type-specific config */}
          {configFields[ruleType]}

          {/* Competitor targeting */}
          {competitors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Competitor scope (optional)</Label>
              <p className="text-[11px] text-muted-foreground">Leave all unselected to monitor every tracked competitor.</p>
              <div className="flex flex-wrap gap-1.5">
                {competitors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCompetitor(c.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      selectedCompetitorIds.includes(c.id)
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground",
                    )}
                  >
                    {selectedCompetitorIds.includes(c.id) && <Check className="h-2.5 w-2.5" />}
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery channels */}
          <div className="space-y-2 rounded-xl border bg-muted/20 px-4 py-3">
            <p className="text-xs font-medium">Notification channels</p>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-default text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                In-app (always active)
              </label>
              <label className="flex items-center gap-1.5 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={channels.includes("email")}
                  onChange={(e) =>
                    setChannels((prev) =>
                      e.target.checked
                        ? Array.from(new Set([...prev, "email"]))
                        : prev.filter((c) => c !== "email"),
                    )
                  }
                  className="rounded"
                />
                Email (saved for future delivery)
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={!canSave || saving}>
            {saving ? "Saving…" : isEditing ? "Save changes" : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rule card ────────────────────────────────────────────────────────────────

const RuleCard = memo(function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
  competitorMap,
}: {
  rule: AlertRule;
  onToggle: (active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  competitorMap: Map<string, string>;
}) {
  const meta = getRuleTypeMeta(rule.rule_type);
  const RuleIcon = getRuleIcon(rule.rule_type);
  const ruleColor = getRuleColor(rule.rule_type);
  const mode = ALERT_EVALUATION_MODES.find((m) => m.value === rule.evaluation_mode);
  const config = normalizeRuleConfig(rule.config as Json);
  const scopedCompetitorNames = (config.competitor_ids ?? [])
    .map((id) => competitorMap.get(id))
    .filter((name): name is string => !!name);

  return (
    <div className={cn(
      "overflow-hidden rounded-xl border border-l-[3px] bg-card shadow-sm transition-all",
      rule.is_active ? "border-l-primary/60" : "border-l-muted-foreground/25 opacity-70",
    )}>
      <div className="flex items-center gap-3 border-b bg-muted/15 px-4 py-3">
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", ruleColor)}>
          <RuleIcon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[13px] font-semibold leading-tight", !rule.is_active && "text-muted-foreground")}>
            {rule.name}
          </p>
          <p className="text-[10px] text-muted-foreground">{meta?.label ?? rule.rule_type}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={rule.is_active}
            onCheckedChange={onToggle}
            className="scale-90"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-2.5 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {getRuleConfigSummary(rule)}
          </Badge>
          {mode && (
            <Badge variant="secondary" className="text-[10px]">{mode.label}</Badge>
          )}
          {(rule.delivery_channels as string[] | null)?.includes("email") && (
            <Badge variant="outline" className="text-[10px]">Email planned</Badge>
          )}
        </div>

        {scopedCompetitorNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground/60" />
            {scopedCompetitorNames.map((name) => (
              <Badge key={name} variant="outline" className="text-[10px] border-primary/20 bg-primary/5 text-primary">
                {name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <p className="text-[10px] text-muted-foreground">
            Checked {toRelativeDate(rule.last_evaluated_at)}
          </p>
          {rule.last_triggered_at ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Triggered {toRelativeDate(rule.last_triggered_at)}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/50">Never triggered</p>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Alerts() {
  const { rules, loading: rulesLoading, updateRule, deleteRule, refetch: refetchRules } = useAlertRules();
  const {
    alerts,
    unreadCount,
    loading: alertsLoading,
    evaluating,
    markRead,
    markAllRead,
    dismiss,
    evaluate,
    refetch: refetchAlerts,
  } = useAlerts();
  const { logs, loading: logsLoading } = useAlertTriggerLogs({ limit: 100 });
  const { stats, refetch: refetchStats } = useAlertStats();
  const { currentWorkspace } = useWorkspace();

  const [activeTab, setActiveTab] = useState("notifications");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [activePreset, setActivePreset] = useState<typeof RULE_PRESETS[number] | null>(null);

  // Notification filters
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");

  // Log filters
  const [logStatusFilter, setLogStatusFilter] = useState<string>("all");
  const [logRuleFilter, setLogRuleFilter] = useState<string>("all");

  // Competitor map for rule cards
  const [competitors, setCompetitors] = useState<{ id: string; name: string }[]>([]);
  const competitorMap = useMemo(() => new Map(competitors.map((c) => [c.id, c.name])), [competitors]);

  useEffect(() => {
    if (!currentWorkspace) return;
    void supabase
      .from("competitors")
      .select("id, name")
      .eq("workspace_id", currentWorkspace.id)
      .order("name")
      .then(({ data }) => setCompetitors(data || []));
  }, [currentWorkspace]);

  const rulesById = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && alert.category !== categoryFilter) return false;
      if (readFilter === "unread" && alert.is_read) return false;
      if (readFilter === "read" && !alert.is_read) return false;
      return true;
    });
  }, [alerts, severityFilter, categoryFilter, readFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logStatusFilter !== "all" && log.status !== logStatusFilter) return false;
      if (logRuleFilter !== "all" && log.alert_rule_id !== logRuleFilter) return false;
      return true;
    });
  }, [logs, logStatusFilter, logRuleFilter]);

  const allCategories = useMemo(() => {
    return Array.from(new Set(alerts.map((a) => a.category).filter(Boolean)));
  }, [alerts]);

  const handleEvaluate = async (source: "manual" | "scheduled") => {
    await evaluate(source);
    void refetchStats();
  };

  const handleSaved = useCallback(() => {
    void refetchRules();
    void refetchStats();
    setEditingRule(null);
    setActivePreset(null);
  }, [refetchRules, refetchStats]);

  const openEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setActivePreset(null);
    setDialogOpen(true);
  };

  const openCreate = (preset?: typeof RULE_PRESETS[number]) => {
    setEditingRule(null);
    setActivePreset(preset ?? null);
    setDialogOpen(true);
  };

  const highAlerts = alerts.filter((a) => a.severity === "high" && !a.is_read).length;

  return (
    <div className="max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Gradient top strip */}
      <div className="-mx-4 -mt-4 mb-0 h-1 w-[calc(100%+2rem)] bg-gradient-to-r from-destructive via-destructive/50 to-transparent sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]" />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="page-title">Alert Center</h1>
            {highAlerts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                {highAlerts} critical
              </span>
            )}
          </div>
          <p className="page-description">
            Monitor competitor moves with rule-based, real-time and scheduled intelligence alerts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => void handleEvaluate("scheduled")}
            disabled={evaluating}
          >
            <Clock3 className="h-3.5 w-3.5" />
            Scheduled scan
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => void handleEvaluate("manual")}
            disabled={evaluating}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", evaluating && "animate-spin")} />
            {evaluating ? "Checking…" : "Check now"}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={BellOff} label="Active rules" value={stats.activeRules} detail="currently monitoring" />
        <StatCard icon={Bell} label="Unread" value={unreadCount} detail="notifications" accent={unreadCount > 0} />
        <StatCard icon={Activity} label="Alerts this week" value={stats.alertsThisWeek} detail="generated" />
        <StatCard
          icon={Zap}
          label="Triggers fired"
          value={stats.triggeredThisWeek}
          detail={stats.lastEvaluatedAt ? `Last scan ${toRelativeDate(stats.lastEvaluatedAt)}` : "No scans yet"}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 bg-muted/40 p-0.5">
          <TabsTrigger value="notifications" className="h-8 gap-1.5 text-xs">
            <Bell className="h-3.5 w-3.5" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[9px] leading-none">{unreadCount > 99 ? "99+" : unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="h-8 gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            Rules
            <span className="text-muted-foreground">({rules.filter((r) => r.is_active).length}/{rules.length})</span>
          </TabsTrigger>
          <TabsTrigger value="log" className="h-8 gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            Activity log
          </TabsTrigger>
        </TabsList>

        {/* ── NOTIFICATIONS TAB ── */}
        <TabsContent value="notifications" className="mt-4 space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-2">
            <div className="flex rounded-lg border bg-background p-0.5 gap-0.5">
              {(["all", "unread", "read"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setReadFilter(v)}
                  className={cn(
                    "h-6 rounded px-2.5 text-[11px] font-medium transition-colors capitalize",
                    readFilter === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex rounded-lg border bg-background p-0.5 gap-0.5">
              {(["all", "high", "medium", "info"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSeverityFilter(v)}
                  className={cn(
                    "h-6 rounded px-2.5 text-[11px] font-medium transition-colors capitalize",
                    severityFilter === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            {allCategories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-7 w-36 text-[11px] bg-background">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 gap-1 text-[11px]"
                onClick={() => {
                  void markAllRead();
                  void refetchAlerts();
                }}
              >
                <Check className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Alert list */}
          {alertsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 rounded-xl border bg-card px-4 py-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/80 py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40">
                <Bell className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {alerts.length === 0 ? "No alerts yet" : "No alerts match your filters"}
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                {alerts.length === 0
                  ? "Create rules and run a scan to start receiving competitor intelligence alerts."
                  : "Try clearing filters to see all alerts."}
              </p>
              {alerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-7 gap-1 text-xs"
                  onClick={() => { setSeverityFilter("all"); setCategoryFilter("all"); setReadFilter("all"); }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm divide-y">
              {filteredAlerts.map((alert) => {
                const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
                const SeverityIcon = sev.icon;
                const ownerRule = alert.alert_rule_id ? rulesById.get(alert.alert_rule_id) : null;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-3 border-l-[3px] px-4 py-3.5 transition-colors",
                      sev.border,
                      !alert.is_read ? cn("bg-primary/[0.03]", sev.bg) : "hover:bg-muted/20",
                    )}
                  >
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", !alert.is_read ? "bg-card shadow-sm" : "bg-muted/40")}>
                      <SeverityIcon className={cn(
                        "h-4 w-4",
                        alert.severity === "high" && "text-destructive",
                        alert.severity === "medium" && "text-amber-500",
                        alert.severity !== "high" && alert.severity !== "medium" && "text-primary",
                      )} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className={cn("text-[13px] leading-snug", !alert.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                          {alert.title}
                        </p>
                        {!alert.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                        <Badge variant="outline" className={cn("text-[10px] capitalize", sev.badge)}>{alert.severity}</Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{alert.category}</Badge>
                        {ownerRule && (
                          <Badge variant="outline" className="text-[10px]">{ownerRule.name}</Badge>
                        )}
                      </div>
                      {alert.description && (
                        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{alert.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/50">{new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex shrink-0 gap-0.5 mt-0.5">
                      {!alert.is_read && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void markRead(alert.id)} title="Mark read">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => void dismiss(alert.id)}
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── RULES TAB ── */}
        <TabsContent value="rules" className="mt-4 space-y-4">
          {/* Presets row */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-center gap-2.5 border-b bg-muted/15 px-4 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <p className="text-[12px] font-semibold text-foreground">Quick presets</p>
              <p className="ml-1 text-[11px] text-muted-foreground hidden sm:block">One-click rule templates for common monitoring scenarios</p>
              <Button size="sm" className="ml-auto h-7 gap-1.5 text-xs" onClick={() => openCreate()}>
                <Plus className="h-3.5 w-3.5" />
                Custom rule
              </Button>
            </div>
            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x">
              {RULE_PRESETS.map((preset) => {
                const PresetIcon = preset.icon;
                return (
                  <button
                    key={preset.label}
                    onClick={() => openCreate(preset)}
                    className="group flex flex-col gap-2 p-4 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", getRuleColor(preset.ruleType))}>
                        <PresetIcon className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-[13px] font-semibold text-foreground">{preset.label}</p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{preset.description}</p>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Use this preset <ChevronRight className="h-3 w-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rules grid */}
          {rulesLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-4">
                  <Skeleton className="h-14 w-full" />
                </div>
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/80 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40">
                <BellOff className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium">No alert rules yet</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                Use a preset above or create a custom rule to start monitoring competitor activity.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  competitorMap={competitorMap}
                  onToggle={(active) => void updateRule(rule.id, { is_active: active })}
                  onEdit={() => openEdit(rule)}
                  onDelete={() => void deleteRule(rule.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ACTIVITY LOG TAB ── */}
        <TabsContent value="log" className="mt-4 space-y-3">
          {/* Log filter bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-2">
            <div className="flex rounded-lg border bg-background p-0.5 gap-0.5">
              {(["all", "triggered", "suppressed", "failed"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setLogStatusFilter(v)}
                  className={cn(
                    "h-6 rounded px-2.5 text-[11px] font-medium transition-colors capitalize",
                    logStatusFilter === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            {rules.length > 0 && (
              <Select value={logRuleFilter} onValueChange={setLogRuleFilter}>
                <SelectTrigger className="h-7 w-44 text-[11px] bg-background">
                  <SelectValue placeholder="All rules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rules</SelectItem>
                  {rules.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="ml-auto text-[11px] text-muted-foreground/60">
              {filteredLogs.length} of {logs.length} entries
            </p>
          </div>

          {logsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card px-4 py-3">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/80 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40">
                <History className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium">No trigger activity</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {logs.length > 0 ? "No entries match your current filters." : "Logs appear when rules fire, get suppressed, or fail."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm divide-y">
              {filteredLogs.map((entry) => {
                const ownerRule = rulesById.get(entry.alert_rule_id);
                const isTriggered = entry.status === "triggered";
                const isSuppressed = entry.status === "suppressed";
                const isFailed = entry.status === "failed";
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3.5">
                    <div className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      isTriggered && "bg-emerald-500/10 text-emerald-500",
                      isSuppressed && "bg-muted/60 text-muted-foreground",
                      isFailed && "bg-destructive/10 text-destructive",
                    )}>
                      {isTriggered ? <Zap className="h-3.5 w-3.5" /> : isSuppressed ? <Clock3 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[13px] font-medium text-foreground">{entry.title}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize",
                            isTriggered && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            isSuppressed && "border-border bg-muted text-muted-foreground",
                            isFailed && "border-destructive/25 bg-destructive/10 text-destructive",
                          )}
                        >
                          {entry.status}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {entry.event_source.replace(/_/g, " ")}
                        </Badge>
                        {ownerRule && (
                          <Badge variant="outline" className="text-[10px]">{ownerRule.name}</Badge>
                        )}
                      </div>
                      {entry.message && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{entry.message}</p>
                      )}
                    </div>
                    <p className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground/60">
                      {toRelativeDate(entry.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <CreateEditRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
        existingRule={editingRule}
        initialPreset={activePreset}
      />
    </div>
  );
}
