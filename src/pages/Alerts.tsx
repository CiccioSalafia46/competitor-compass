import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { toast } from "sonner";
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
    labelKey: "presets.deepDiscount.label",
    descriptionKey: "presets.deepDiscount.description",
    icon: Percent,
    ruleType: "discount_threshold" as AlertRuleType,
    config: { threshold: 40, cooldown_hours: 24 } as AlertRuleConfig,
  },
  {
    labelKey: "presets.campaignLaunch.label",
    descriptionKey: "presets.campaignLaunch.description",
    icon: Megaphone,
    ruleType: "new_campaign_launch" as AlertRuleType,
    config: { cooldown_hours: 12 } as AlertRuleConfig,
  },
  {
    labelKey: "presets.activitySpike.label",
    descriptionKey: "presets.activitySpike.description",
    icon: Zap,
    ruleType: "activity_spike" as AlertRuleType,
    config: { spike_multiplier: 2, minimum_events: 3, cooldown_hours: 24 } as AlertRuleConfig,
  },
  {
    labelKey: "presets.pricingSignal.label",
    descriptionKey: "presets.pricingSignal.description",
    icon: Search,
    ruleType: "keyword_detection" as AlertRuleType,
    config: { keywords: ["price", "discount", "offer", "cost", "promotion", "fee"], cooldown_hours: 48 } as AlertRuleConfig,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toRelativeDate(value: string | null, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (!value) return t("relative.never");
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return t("relative.justNow");
  if (diff < 3_600_000) return t("relative.minutesAgo", { count: Math.floor(diff / 60_000) });
  if (diff < 86_400_000) return t("relative.hoursAgo", { count: Math.floor(diff / 3_600_000) });
  return t("relative.daysAgo", { count: Math.floor(diff / 86_400_000) });
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
        <p className="text-caption uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-semibold tabular-nums leading-tight", accent && "text-destructive")}>{value}</p>
        {detail && <p className="text-caption text-muted-foreground/70 truncate">{detail}</p>}
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
  const { t } = useTranslation("alerts");
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
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load competitors");
          return;
        }
        setCompetitors(data || []);
      });
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
      setName(t(initialPreset.labelKey));
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
  }, [open, existingRule, initialPreset, t]);

  const handleTypeChange = (value: string) => {
    setRuleType(value as AlertRuleType);
    // Preserve the full config across type changes — user-entered values (threshold,
    // keywords, cooldown, etc.) are not lost if they switch type and switch back.
    // Type-specific fields that don't apply to the new type are simply ignored on save.
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
      <Label className="text-xs">{t("dialog.cooldownLabel")}</Label>
      <Input
        type="number"
        min={1}
        max={168}
        value={config.cooldown_hours ?? 24}
        onChange={(e) => setConfig((c) => ({ ...c, cooldown_hours: Number(e.target.value) }))}
        className="h-8"
      />
      <p className="text-caption text-muted-foreground">{t("dialog.cooldownHint")}</p>
    </div>
  );

  const configFields: Record<AlertRuleType, React.ReactNode> = {
    discount_threshold: (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("dialog.discountThresholdLabel")}</Label>
          <Input
            type="number"
            min={1}
            max={95}
            value={config.threshold ?? 30}
            onChange={(e) => setConfig((c) => ({ ...c, threshold: Number(e.target.value) }))}
            className="h-9"
          />
          <p className="text-caption text-muted-foreground">{t("dialog.discountThresholdHint")}</p>
        </div>
        {commonCooldown}
      </div>
    ),
    keyword_detection: (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("dialog.keywordsLabel")}</Label>
          <Input
            value={(config.keywords || []).join(", ")}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
              }))
            }
            placeholder={t("dialog.keywordsPlaceholder")}
            className="h-9"
          />
          <p className="text-caption text-muted-foreground">{t("dialog.keywordsHint")}</p>
        </div>
        {commonCooldown}
      </div>
    ),
    new_campaign_launch: (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("dialog.campaignTypesLabel")}</Label>
          <Input
            value={(config.campaign_types || []).join(", ")}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                campaign_types: e.target.value.split(",").map((tp) => tp.trim()).filter(Boolean),
              }))
            }
            placeholder={t("dialog.campaignTypesPlaceholder")}
            className="h-9"
          />
          <p className="text-caption text-muted-foreground">{t("dialog.campaignTypesHint")}</p>
        </div>
        {commonCooldown}
      </div>
    ),
    activity_spike: (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("dialog.spikeMultiplierLabel")}</Label>
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
            <Label className="text-xs">{t("dialog.minimumEventsLabel")}</Label>
            <Input
              type="number"
              min={1}
              value={config.minimum_events ?? 3}
              onChange={(e) => setConfig((c) => ({ ...c, minimum_events: Number(e.target.value) }))}
              className="h-8"
            />
          </div>
        </div>
        <p className="text-caption text-muted-foreground">{t("dialog.spikeHint", { multiplier: config.spike_multiplier ?? 2, events: config.minimum_events ?? 3 })}</p>
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
          <DialogTitle className="text-base">{isEditing ? t("dialog.editTitle") : t("dialog.createTitle")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("dialog.editDescription") : t("dialog.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto pr-1">
          {/* Rule name */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("dialog.ruleName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialog.ruleNamePlaceholder")}
              className="h-8"
            />
          </div>

          {/* Rule type */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("dialog.ruleType")}</Label>
            <Select value={ruleType} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-9">
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
              <p className="text-caption text-muted-foreground">{getRuleTypeMeta(ruleType)!.description}</p>
            )}
          </div>

          {/* Evaluation mode */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("dialog.evaluationMode")}</Label>
            <Select value={evaluationMode} onValueChange={(v) => setEvaluationMode(v as AlertEvaluationMode)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_EVALUATION_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-caption text-muted-foreground">
              {ALERT_EVALUATION_MODES.find((m) => m.value === evaluationMode)?.description}
            </p>
          </div>

          {/* Type-specific config */}
          {configFields[ruleType]}

          {/* Competitor targeting */}
          {competitors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">{t("dialog.competitorScope")}</Label>
              <p className="text-caption text-muted-foreground">{t("dialog.competitorScopeHint")}</p>
              <div className="flex flex-wrap gap-1.5">
                {competitors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCompetitor(c.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption font-medium transition-colors",
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
            <p className="text-xs font-medium">{t("dialog.notificationChannels")}</p>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-default text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {t("dialog.inAppAlways")}
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
                {t("dialog.emailFuture")}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("dialog.cancel")}</Button>
          <Button onClick={() => void handleSave()} disabled={!canSave || saving}>
            {saving ? t("dialog.saving") : isEditing ? t("dialog.saveChanges") : t("dialog.createRule")}
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
  const { t } = useTranslation("alerts");
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
          <p className={cn("text-nav font-semibold leading-tight", !rule.is_active && "text-muted-foreground")}>
            {rule.name}
          </p>
          <p className="text-caption text-muted-foreground">{meta?.label ?? rule.rule_type}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={rule.is_active}
            onCheckedChange={onToggle}
            className="scale-90"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onEdit} aria-label="Edit alert rule">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={onDelete} aria-label="Delete alert rule">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2.5 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-caption">
            {getRuleConfigSummary(rule)}
          </Badge>
          {mode && (
            <Badge variant="secondary" className="text-caption">{mode.label}</Badge>
          )}
          {(rule.delivery_channels as string[] | null)?.includes("email") && (
            <Badge variant="outline" className="text-caption">{t("rules.emailPlanned")}</Badge>
          )}
        </div>

        {scopedCompetitorNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground/60" />
            {scopedCompetitorNames.map((name) => (
              <Badge key={name} variant="outline" className="text-caption border-primary/20 bg-primary/5 text-primary">
                {name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <p className="text-caption text-muted-foreground">
            {t("rules.checked", { when: toRelativeDate(rule.last_evaluated_at, t) })}
          </p>
          {rule.last_triggered_at ? (
            <p className="text-caption text-amber-600 dark:text-amber-400">
              {t("rules.triggered", { when: toRelativeDate(rule.last_triggered_at, t) })}
            </p>
          ) : (
            <p className="text-caption text-muted-foreground/50">{t("rules.neverTriggered")}</p>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Alerts() {
  const { t } = useTranslation("alerts");
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
  // Default to "rules" tab for new users who have no rules yet
  const [tabInitDone, setTabInitDone] = useState(false);
  useEffect(() => {
    if (!rulesLoading && !tabInitDone) {
      setTabInitDone(true);
      if (rules.length === 0) setActiveTab("rules");
    }
  }, [rulesLoading, rules.length, tabInitDone]);
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
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load competitors");
          return;
        }
        setCompetitors(data || []);
      });
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
    <div className="max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Gradient top strip */}
      <div className="-mx-4 -mt-4 mb-0 h-1 w-[calc(100%+2rem)] bg-gradient-to-r from-destructive via-destructive/50 to-transparent sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]" />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="page-title">{t("title")}</h1>
            {highAlerts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-caption font-semibold text-destructive">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                {t("criticalBadge", { count: highAlerts })}
              </span>
            )}
          </div>
          <p className="page-description">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => void handleEvaluate("scheduled")}
            disabled={evaluating}
          >
            <Clock3 className="h-3.5 w-3.5" />
            {t("actions.scheduledScan")}
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => void handleEvaluate("manual")}
            disabled={evaluating}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", evaluating && "animate-spin")} />
            {evaluating ? t("actions.checking") : t("actions.checkNow")}
          </Button>
        </div>
      </div>

      {/* Stats — compact inline instead of 4 cards */}
      <p className="text-xs text-muted-foreground">
        {stats.activeRules} active rules · {unreadCount} unread · {stats.alertsThisWeek} alerts this week · {stats.triggeredThisWeek} triggers fired
        {stats.lastEvaluatedAt ? ` · last scan ${toRelativeDate(stats.lastEvaluatedAt, t)}` : " · no scans yet"}
      </p>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 bg-muted/40 p-0.5">
          <TabsTrigger value="notifications" className="h-8 gap-1.5 text-xs">
            <Bell className="h-3.5 w-3.5" />
            {t("tabs.notifications")}
            {unreadCount > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-caption leading-none">{unreadCount > 99 ? "99+" : unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="h-8 gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            {t("tabs.rules")}
            <span className="text-muted-foreground">({rules.filter((r) => r.is_active).length}/{rules.length})</span>
          </TabsTrigger>
          <TabsTrigger value="log" className="h-8 gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            {t("tabs.activityLog")}
          </TabsTrigger>
        </TabsList>

        {/* ── NOTIFICATIONS TAB ── */}
        <TabsContent value="notifications" className="mt-4 space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-2">
            <div className="flex rounded-lg border bg-background p-0.5 gap-1">
              {(["all", "unread", "read"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setReadFilter(v)}
                  className={cn(
                    "h-8 rounded px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    readFilter === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`filters.${v}`)}
                </button>
              ))}
            </div>

            <div className="flex rounded-lg border bg-background p-0.5 gap-1">
              {(["all", "high", "medium", "info"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSeverityFilter(v)}
                  className={cn(
                    "h-8 rounded px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    severityFilter === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`filters.${v}`)}
                </button>
              ))}
            </div>

            {allCategories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-36 text-xs bg-background">
                  <SelectValue placeholder={t("filters.allCategories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
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
                className="ml-auto h-8 gap-1 text-xs"
                onClick={() => {
                  void markAllRead();
                  void refetchAlerts();
                }}
              >
                <Check className="h-3 w-3" />
                {t("filters.markAllRead")}
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
                {alerts.length === 0 ? t("notifications.emptyTitle") : t("notifications.emptyTitleFiltered")}
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                {alerts.length === 0
                  ? t("notifications.emptyDescription")
                  : t("notifications.emptyDescriptionFiltered")}
              </p>
              {alerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-9 gap-1 text-xs"
                  onClick={() => { setSeverityFilter("all"); setCategoryFilter("all"); setReadFilter("all"); }}
                >
                  {t("notifications.clearFilters")}
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
                        <p className={cn("text-nav leading-snug", !alert.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                          {alert.title}
                        </p>
                        {!alert.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                        <Badge variant="outline" className={cn("text-caption capitalize", sev.badge)}>{alert.severity}</Badge>
                        <Badge variant="secondary" className="text-caption capitalize">{alert.category}</Badge>
                        {ownerRule && (
                          <Badge variant="outline" className="text-caption">{ownerRule.name}</Badge>
                        )}
                      </div>
                      {alert.description && (
                        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{alert.description}</p>
                      )}
                      <p className="text-caption text-muted-foreground/50">{new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex shrink-0 gap-1 mt-0.5">
                      {!alert.is_read && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void markRead(alert.id)} title={t("notifications.markRead")}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => void dismiss(alert.id)}
                        title={t("notifications.dismiss")}
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
            <div className="flex items-center gap-3 border-b bg-muted/15 px-4 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs font-semibold text-foreground">{t("rules.quickPresetsTitle")}</p>
              <p className="ml-1 text-caption text-muted-foreground hidden sm:block">{t("rules.quickPresetsSubtitle")}</p>
              <Button size="sm" className="ml-auto h-8 gap-1.5 text-xs" onClick={() => openCreate()}>
                <Plus className="h-3.5 w-3.5" />
                {t("rules.customRule")}
              </Button>
            </div>
            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x">
              {RULE_PRESETS.map((preset) => {
                const PresetIcon = preset.icon;
                return (
                  <button
                    key={preset.labelKey}
                    onClick={() => openCreate(preset)}
                    className="min-w-0 group flex flex-col gap-2 p-4 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", getRuleColor(preset.ruleType))}>
                        <PresetIcon className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-nav font-semibold text-foreground">{t(preset.labelKey)}</p>
                    </div>
                    <p className="text-caption leading-relaxed text-muted-foreground">{t(preset.descriptionKey)}</p>
                    <div className="flex items-center gap-1 text-caption font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      {t("rules.useThisPreset")} <ChevronRight className="h-3 w-3" />
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
              <p className="text-sm font-medium">{t("rules.noRulesTitle")}</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                {t("rules.noRulesDescription")}
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
            <div className="flex rounded-lg border bg-background p-0.5 gap-1">
              {(["all", "triggered", "suppressed", "failed"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setLogStatusFilter(v)}
                  className={cn(
                    "h-8 rounded px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    logStatusFilter === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`logStatus.${v}`)}
                </button>
              ))}
            </div>
            {rules.length > 0 && (
              <Select value={logRuleFilter} onValueChange={setLogRuleFilter}>
                <SelectTrigger className="h-8 w-44 text-caption bg-background">
                  <SelectValue placeholder={t("filters.allRules")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.allRules")}</SelectItem>
                  {rules.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="ml-auto text-caption text-muted-foreground/60">
              {t("filters.entries", { filtered: filteredLogs.length, total: logs.length })}
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
              <p className="text-sm font-medium">{t("log.noActivityTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {logs.length > 0 ? t("log.noActivityDescriptionFiltered") : t("log.noActivityDescription")}
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
                        <p className="text-nav font-medium text-foreground">{entry.title}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-caption capitalize",
                            isTriggered && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            isSuppressed && "border-border bg-muted text-muted-foreground",
                            isFailed && "border-destructive/25 bg-destructive/10 text-destructive",
                          )}
                        >
                          {entry.status}
                        </Badge>
                        <Badge variant="secondary" className="text-caption capitalize">
                          {entry.event_source.replace(/_/g, " ")}
                        </Badge>
                        {ownerRule && (
                          <Badge variant="outline" className="text-caption">{ownerRule.name}</Badge>
                        )}
                      </div>
                      {entry.message && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{entry.message}</p>
                      )}
                    </div>
                    <p className="shrink-0 whitespace-nowrap text-caption text-muted-foreground/60">
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
