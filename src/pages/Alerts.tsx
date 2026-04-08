import { useMemo, useState } from "react";
import {
  ALERT_EVALUATION_MODES,
  RULE_TYPES,
  getRuleConfigSummary,
  getRuleTypeMeta,
  type AlertRuleConfig,
  type AlertRuleType,
  type AlertEvaluationMode,
  useAlertRules,
  useAlerts,
  useAlertTriggerLogs,
} from "@/hooks/useAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  BellOff,
  Check,
  AlertTriangle,
  Info,
  AlertCircle,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
  Clock3,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  high: { bg: "bg-destructive/10", text: "text-destructive", icon: AlertCircle },
  medium: { bg: "bg-warning/10", text: "text-warning", icon: AlertTriangle },
  info: { bg: "bg-accent", text: "text-accent-foreground", icon: Info },
  low: { bg: "bg-muted", text: "text-muted-foreground", icon: Info },
};

const LOG_STATUS_STYLES: Record<string, string> = {
  triggered: "bg-success/10 text-success border-success/20",
  suppressed: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

function toRelativeDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function CreateRuleDialog({ onCreated }: { onCreated: () => void }) {
  const { createRule } = useAlertRules();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<AlertRuleType>("discount_threshold");
  const [evaluationMode, setEvaluationMode] = useState<AlertEvaluationMode>("both");
  const [config, setConfig] = useState<AlertRuleConfig>({ threshold: 30, cooldown_hours: 24 });
  const [channels, setChannels] = useState(["in_app"]);

  const visibleRuleTypes = useMemo(() => RULE_TYPES.filter((rule) => !rule.legacy), []);

  const resetState = () => {
    setName("");
    setRuleType("discount_threshold");
    setEvaluationMode("both");
    setConfig({ threshold: 30, cooldown_hours: 24 });
    setChannels(["in_app"]);
  };

  const handleCreate = async () => {
    await createRule({
      name,
      rule_type: ruleType,
      config,
      evaluation_mode: evaluationMode,
      delivery_channels: channels,
    });
    setOpen(false);
    resetState();
    onCreated();
  };

  const canCreate =
    name.trim().length > 0 &&
    (ruleType !== "keyword_detection" || (config.keywords?.length ?? 0) > 0) &&
    (ruleType !== "discount_threshold" || (config.threshold ?? 0) > 0) &&
    (ruleType !== "activity_spike" ||
      ((config.minimum_events ?? 0) > 0 && (config.spike_multiplier ?? 0) >= 1));

  const commonFields = (
    <div className="space-y-1.5">
      <Label className="text-xs">Cooldown (hours)</Label>
      <Input
        type="number"
        min={1}
        max={168}
        value={config.cooldown_hours ?? 24}
        onChange={(event) =>
          setConfig((current) => ({
            ...current,
            cooldown_hours: Number(event.target.value),
          }))
        }
        className="h-8"
      />
      <p className="text-[11px] text-muted-foreground">
        Prevent repeated alerts for the same trigger within this window.
      </p>
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
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                threshold: Number(event.target.value),
              }))
            }
            className="h-8"
          />
        </div>
        {commonFields}
      </div>
    ),
    keyword_detection: (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Keywords (comma-separated)</Label>
          <Input
            value={(config.keywords || []).join(", ")}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                keywords: event.target.value
                  .split(",")
                  .map((keyword) => keyword.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="launch, coupon, pricing"
            className="h-8"
          />
        </div>
        {commonFields}
      </div>
    ),
    new_campaign_launch: (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Campaign types (optional)</Label>
          <Input
            value={(config.campaign_types || []).join(", ")}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                campaign_types: event.target.value
                  .split(",")
                  .map((campaignType) => campaignType.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="product_launch, promotional, announcement"
            className="h-8"
          />
          <p className="text-[11px] text-muted-foreground">
            Leave empty to monitor every new campaign detected by the pipeline.
          </p>
        </div>
        {commonFields}
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
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  spike_multiplier: Number(event.target.value),
                }))
              }
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Minimum events</Label>
            <Input
              type="number"
              min={1}
              value={config.minimum_events ?? 3}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  minimum_events: Number(event.target.value),
                }))
              }
              className="h-8"
            />
          </div>
        </div>
        {commonFields}
      </div>
    ),
    keyword_match: null,
    new_competitor_ad: null,
    new_category: null,
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Create alert rule</DialogTitle>
          <DialogDescription>
            Rules can run in real time on new imports, during scheduled scans, or both.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Rule name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Deep discount detected"
              className="h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Rule type</Label>
            <Select
              value={ruleType}
              onValueChange={(value) => {
                setRuleType(value as AlertRuleType);
                setConfig({ cooldown_hours: 24 });
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleRuleTypes.map((rule) => (
                  <SelectItem key={rule.value} value={rule.value}>
                    {rule.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Evaluation mode</Label>
            <Select value={evaluationMode} onValueChange={(value) => setEvaluationMode(value as AlertEvaluationMode)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_EVALUATION_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {ALERT_EVALUATION_MODES.find((mode) => mode.value === evaluationMode)?.description}
            </p>
          </div>

          {configFields[ruleType]}

          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium">Notification channels</p>
            <div className="flex items-start gap-4 text-xs">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked disabled className="rounded" />
                In-app
              </label>
              <label className="flex items-center gap-1.5 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={channels.includes("email")}
                  onChange={(event) =>
                    setChannels((current) =>
                      event.target.checked
                        ? Array.from(new Set([...current, "email"]))
                        : current.filter((channel) => channel !== "email"),
                    )
                  }
                  className="rounded"
                />
                Email preference saved for later
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Email delivery is not dispatched yet. Only in-app notifications are active right now.
            </p>
          </div>

          <Button onClick={handleCreate} disabled={!canCreate} className="w-full h-8 text-xs">
            Create rule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  } = useAlerts();
  const { logs, loading: logsLoading } = useAlertTriggerLogs({ limit: 75 });
  const [activeTab, setActiveTab] = useState("notifications");
  const rulesById = useMemo(() => new Map(rules.map((rule) => [rule.id, rule])), [rules]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 animate-fade-in max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-description">
            Track meaningful competitor moves with real-time and scheduled rule evaluation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => void evaluate("scheduled")}
            disabled={evaluating}
          >
            <Clock3 className="h-3.5 w-3.5" />
            Scheduled Scan
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => void evaluate("manual")} disabled={evaluating}>
            <RefreshCw className={cn("h-3.5 w-3.5", evaluating && "animate-spin")} />
            {evaluating ? "Checking..." : "Check Now"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-0.5">
          <TabsTrigger value="notifications" className="text-xs h-7 gap-1.5">
            <Bell className="h-3 w-3" />
            Notifications
            {unreadCount > 0 && <Badge className="h-4 min-w-4 px-1 text-[9px]">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rules" className="text-xs h-7 gap-1.5">
            <BellOff className="h-3 w-3" />
            Rules ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="trigger-log" className="text-xs h-7 gap-1.5">
            <History className="h-3 w-3" />
            Trigger Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-4">
          {unreadCount > 0 && (
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="sm" onClick={() => void markAllRead()} className="text-[11px] h-6 gap-1">
                <Check className="h-3 w-3" /> Mark all read
              </Button>
            </div>
          )}

          {alertsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="border">
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <Card className="border">
              <CardContent className="py-16 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">No alerts yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a rule and Tracklyze will notify you when meaningful competitor actions happen.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {alerts.map((alert) => {
                const severityStyle = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
                const SeverityIcon = severityStyle.icon;

                return (
                  <Card key={alert.id} className={cn("border transition-colors", !alert.is_read && "bg-accent/30 border-accent")}>
                    <CardContent className="p-3 flex items-start gap-2.5">
                      <div className={cn("rounded-md p-1.5 mt-0.5 shrink-0", severityStyle.bg)}>
                        <SeverityIcon className={cn("h-3.5 w-3.5", severityStyle.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className={cn("text-[13px]", !alert.is_read ? "font-semibold" : "font-medium")}>{alert.title}</h3>
                          <Badge variant="outline" className="text-[9px] capitalize">
                            {alert.category}
                          </Badge>
                        </div>
                        {alert.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {!alert.is_read && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => void markRead(alert.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground"
                          onClick={() => void dismiss(alert.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <div className="flex justify-end mb-3">
            <CreateRuleDialog onCreated={refetchRules} />
          </div>

          {rulesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Card key={index} className="border">
                  <CardContent className="p-3">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rules.length === 0 ? (
            <Card className="border">
              <CardContent className="py-16 text-center">
                <BellOff className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">No alert rules</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create rules to monitor discounts, campaigns, keywords and unusual activity.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => {
                const meta = getRuleTypeMeta(rule.rule_type);
                const mode = ALERT_EVALUATION_MODES.find((entry) => entry.value === rule.evaluation_mode);

                return (
                  <Card key={rule.id} className="border">
                    <CardContent className="p-3 flex items-start gap-3">
                      <Switch checked={rule.is_active} onCheckedChange={(checked) => void updateRule(rule.id, { is_active: checked })} />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-[13px] font-medium">{rule.name}</h3>
                          <Badge variant="outline" className="text-[9px]">
                            {meta?.label || rule.rule_type}
                          </Badge>
                          {mode && (
                            <Badge variant="secondary" className="text-[9px]">
                              {mode.label}
                            </Badge>
                          )}
                          {rule.delivery_channels?.includes("email") && (
                            <Badge variant="outline" className="text-[9px]">
                              Email planned
                            </Badge>
                          )}
                        </div>
                        <div className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                          <p>{getRuleConfigSummary(rule)}</p>
                          <p>Last evaluated: {toRelativeDate(rule.last_evaluated_at)}</p>
                          <p>Last triggered: {toRelativeDate(rule.last_triggered_at)}</p>
                          <p>{meta?.description}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => void deleteRule(rule.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trigger-log" className="mt-4">
          {logsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="border">
                  <CardContent className="p-3">
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <Card className="border">
              <CardContent className="py-16 text-center">
                <History className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">No trigger activity yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Trigger logs will appear when rules fire, get suppressed by cooldown or fail to persist.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map((logEntry) => {
                const ownerRule = rulesById.get(logEntry.alert_rule_id);
                return (
                  <Card key={logEntry.id} className="border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[13px] font-medium">{logEntry.title}</p>
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] capitalize", LOG_STATUS_STYLES[logEntry.status] || "")}
                            >
                              {logEntry.status}
                            </Badge>
                            <Badge variant="secondary" className="text-[9px] capitalize">
                              {logEntry.event_source.replace(/_/g, " ")}
                            </Badge>
                            {ownerRule && (
                              <Badge variant="outline" className="text-[9px]">
                                {ownerRule.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{logEntry.message || "No details available."}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                          {logEntry.status === "triggered" ? (
                            <Zap className="h-3 w-3" />
                          ) : logEntry.status === "suppressed" ? (
                            <Clock3 className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {new Date(logEntry.created_at).toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
