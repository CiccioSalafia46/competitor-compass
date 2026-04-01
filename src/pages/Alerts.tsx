import { useState } from "react";
import { useAlertRules, useAlerts, RULE_TYPES } from "@/hooks/useAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellOff, Plus, Trash2, RefreshCw, Check, AlertTriangle, Info, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  high: { bg: "bg-destructive/10", text: "text-destructive", icon: AlertCircle },
  medium: { bg: "bg-warning/10", text: "text-warning", icon: AlertTriangle },
  info: { bg: "bg-accent", text: "text-accent-foreground", icon: Info },
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

  const configFields: Record<string, () => React.ReactNode> = {
    discount_threshold: () => (
      <div className="space-y-1.5">
        <Label className="text-xs">Discount threshold (%)</Label>
        <Input type="number" value={config.threshold || 20} onChange={(e) => setConfig({ threshold: Number(e.target.value) })} className="h-8" />
      </div>
    ),
    keyword_match: () => (
      <div className="space-y-1.5">
        <Label className="text-xs">Keywords (comma-separated)</Label>
        <Input value={(config.keywords || []).join(", ")} onChange={(e) => setConfig({ keywords: e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean) })} placeholder="sale, free, launch" className="h-8" />
      </div>
    ),
    new_competitor_ad: () => (
      <div className="space-y-1.5">
        <Label className="text-xs">Minimum new ads</Label>
        <Input type="number" value={config.min_ads || 1} onChange={(e) => setConfig({ min_ads: Number(e.target.value) })} className="h-8" />
      </div>
    ),
    activity_spike: () => (
      <div className="space-y-1.5">
        <Label className="text-xs">Spike multiplier (×normal)</Label>
        <Input type="number" step="0.5" value={config.spike_multiplier || 2} onChange={(e) => setConfig({ spike_multiplier: Number(e.target.value) })} className="h-8" />
      </div>
    ),
    new_category: () => (
      <div className="space-y-1.5">
        <Label className="text-xs">Known categories (comma-separated)</Label>
        <Input value={(config.known_categories || []).join(", ")} onChange={(e) => setConfig({ known_categories: e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean) })} className="h-8" />
      </div>
    ),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="h-3.5 w-3.5" />New Rule</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Create Alert Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Rule name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Big discount alert" className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rule type</Label>
            <Select value={ruleType} onValueChange={(v) => { setRuleType(v); setConfig({}); }}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {configFields[ruleType]?.()}
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked disabled className="rounded" /> In-app</label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={channels.includes("email")} onChange={(e) => setChannels(e.target.checked ? [...channels, "email"] : channels.filter(c => c !== "email"))} className="rounded" />
              Email
            </label>
          </div>
          <Button onClick={handleCreate} disabled={!name.trim()} className="w-full h-8 text-xs">Create Rule</Button>
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 animate-fade-in max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-description">Monitor competitors and get notified on key changes</p>
        </div>
        <Button variant="default" size="sm" className="h-8 text-xs gap-1.5" onClick={evaluate} disabled={evaluating}>
          <RefreshCw className={cn("h-3.5 w-3.5", evaluating && "animate-spin")} />
          {evaluating ? "Checking…" : "Check Now"}
        </Button>
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
        </TabsList>

        <TabsContent value="notifications" className="mt-4">
          {unreadCount > 0 && (
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-[11px] h-6 gap-1">
                <Check className="h-3 w-3" /> Mark all read
              </Button>
            </div>
          )}

          {alertsLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border"><CardContent className="p-3"><div className="flex gap-3"><Skeleton className="h-7 w-7 rounded-md" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-full" /></div></div></CardContent></Card>
            ))}</div>
          ) : alerts.length === 0 ? (
            <Card className="border">
              <CardContent className="py-16 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">No alerts yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create alert rules and click "Check Now" to evaluate.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {alerts.map((alert) => {
                const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
                const SevIcon = sev.icon;
                return (
                  <Card key={alert.id} className={cn("border transition-colors", !alert.is_read && "bg-accent/30 border-accent")}>
                    <CardContent className="p-3 flex items-start gap-2.5">
                      <div className={cn("rounded-md p-1.5 mt-0.5 shrink-0", sev.bg)}>
                        <SevIcon className={cn("h-3.5 w-3.5", sev.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className={cn("text-[13px]", !alert.is_read ? "font-semibold" : "font-medium")}>{alert.title}</h3>
                          <Badge variant="outline" className="text-[9px] capitalize">{alert.category}</Badge>
                        </div>
                        {alert.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</p>}
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {!alert.is_read && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markRead(alert.id)}><Check className="h-3 w-3" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => dismiss(alert.id)}><X className="h-3 w-3" /></Button>
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
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="border"><CardContent className="p-3"><Skeleton className="h-10 w-full" /></CardContent></Card>
            ))}</div>
          ) : rules.length === 0 ? (
            <Card className="border">
              <CardContent className="py-16 text-center">
                <BellOff className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">No alert rules</p>
                <p className="text-xs text-muted-foreground mt-1">Create rules to monitor competitor activity.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {rules.map((rule) => {
                const meta = RULE_TYPES.find(r => r.value === rule.rule_type);
                return (
                  <Card key={rule.id} className="border">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Switch checked={rule.is_active} onCheckedChange={(checked) => updateRule(rule.id, { is_active: checked })} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-[13px] font-medium">{rule.name}</h3>
                          <Badge variant="outline" className="text-[9px]">{meta?.label || rule.rule_type}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {meta?.description}{rule.delivery_channels?.includes("email") && " · Email enabled"}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteRule(rule.id)}>
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
