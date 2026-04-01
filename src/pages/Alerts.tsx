import { useState } from "react";
import { useAlertRules, useAlerts, RULE_TYPES, type AlertRule } from "@/hooks/useAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, BellOff, Plus, Trash2, RefreshCw, Check, AlertTriangle, Info, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  high: { bg: "bg-destructive/10", text: "text-destructive", icon: AlertCircle },
  medium: { bg: "bg-warning/10", text: "text-warning", icon: AlertTriangle },
  info: { bg: "bg-primary/10", text: "text-primary", icon: Info },
  low: { bg: "bg-muted", text: "text-muted-foreground", icon: Info },
};

function CreateRuleDialog({ onCreated }: { onCreated: () => void }) {
  const { createRule } = useAlertRules();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState("discount_threshold");
  const [config, setConfig] = useState<any>({ threshold: 20 });
  const [channels, setChannels] = useState(["in_app"]);

  const handleCreate = async () => {
    await createRule({ name, rule_type: ruleType, config, delivery_channels: channels });
    setOpen(false);
    setName("");
    onCreated();
  };

  const renderConfigFields = () => {
    switch (ruleType) {
      case "discount_threshold":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Discount threshold (%)</Label>
            <Input type="number" value={config.threshold || 20} onChange={(e) => setConfig({ threshold: Number(e.target.value) })} />
          </div>
        );
      case "keyword_match":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Keywords (comma-separated)</Label>
            <Input
              value={(config.keywords || []).join(", ")}
              onChange={(e) => setConfig({ keywords: e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean) })}
              placeholder="sale, free, launch"
            />
          </div>
        );
      case "new_competitor_ad":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Minimum new ads to trigger</Label>
            <Input type="number" value={config.min_ads || 1} onChange={(e) => setConfig({ min_ads: Number(e.target.value) })} />
          </div>
        );
      case "activity_spike":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Spike multiplier (x normal)</Label>
            <Input type="number" step="0.5" value={config.spike_multiplier || 2} onChange={(e) => setConfig({ spike_multiplier: Number(e.target.value) })} />
          </div>
        );
      case "new_category":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Known categories (comma-separated)</Label>
            <Input
              value={(config.known_categories || []).join(", ")}
              onChange={(e) => setConfig({ known_categories: e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean) })}
              placeholder="shoes, clothing, electronics"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Rule</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Alert Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Rule name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Big discount alert" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Rule type</Label>
            <Select value={ruleType} onValueChange={(v) => { setRuleType(v); setConfig({}); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>
                    <div>
                      <p className="text-sm">{rt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{rt.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderConfigFields()}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={channels.includes("in_app")} onChange={() => {}} disabled className="rounded" /> In-app
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={channels.includes("email")}
                onChange={(e) => setChannels(e.target.checked ? [...channels, "email"] : channels.filter(c => c !== "email"))}
                className="rounded"
              /> Email
            </label>
          </div>
          <Button onClick={handleCreate} disabled={!name.trim()} className="w-full">Create Rule</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Alerts() {
  const { rules, loading: rulesLoading, updateRule, deleteRule, refetch: refetchRules } = useAlertRules();
  const { alerts, unreadCount, loading: alertsLoading, evaluating, markRead, markAllRead, dismiss, evaluate } = useAlerts();
  const [activeTab, setActiveTab] = useState("notifications");

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor competitors and get notified on key changes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={evaluate} disabled={evaluating}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", evaluating && "animate-spin")} />
            {evaluating ? "Checking…" : "Check Now"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[10px]">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5">
            <BellOff className="h-3.5 w-3.5" />
            Rules ({rules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-4">
          {unreadCount > 0 && (
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
                <Check className="h-3 w-3 mr-1" /> Mark all read
              </Button>
            </div>
          )}

          {alertsLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : alerts.length === 0 ? (
            <Card className="border">
              <CardContent className="py-12 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No alerts yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Create alert rules and click "Check Now" to evaluate.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
                const SevIcon = sev.icon;
                return (
                  <Card key={alert.id} className={cn("border transition-colors", !alert.is_read && "bg-accent/30")}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className={cn("rounded-md p-1.5 mt-0.5", sev.bg)}>
                        <SevIcon className={cn("h-4 w-4", sev.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={cn("text-sm font-medium", !alert.is_read && "font-semibold")}>{alert.title}</h3>
                          <Badge variant="outline" className="text-[10px] capitalize">{alert.category}</Badge>
                        </div>
                        {alert.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-1">
                        {!alert.is_read && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markRead(alert.id)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => dismiss(alert.id)}>
                          <X className="h-3.5 w-3.5" />
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
          <div className="flex justify-end mb-4">
            <CreateRuleDialog onCreated={refetchRules} />
          </div>

          {rulesLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : rules.length === 0 ? (
            <Card className="border">
              <CardContent className="py-12 text-center">
                <BellOff className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No alert rules created yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => {
                const ruleTypeMeta = RULE_TYPES.find(r => r.value === rule.rule_type);
                return (
                  <Card key={rule.id} className="border">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => updateRule(rule.id, { is_active: checked })}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium">{rule.name}</h3>
                          <Badge variant="outline" className="text-[10px]">{ruleTypeMeta?.label || rule.rule_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ruleTypeMeta?.description}
                          {rule.delivery_channels?.includes("email") && " • Email delivery enabled"}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
