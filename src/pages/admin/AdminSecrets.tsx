import { useState } from "react";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle, XCircle, AlertTriangle, Shield, RefreshCw,
  FlaskConical, Eye, EyeOff, Settings2, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    configured: { variant: "default", label: "Configured" },
    missing: { variant: "destructive", label: "Missing" },
    expired: { variant: "destructive", label: "Expired" },
  };
  const s = map[status] || { variant: "outline", label: status };
  return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
}

function HealthIcon({ ok }: { ok: boolean | null }) {
  if (ok === null) return <AlertTriangle className="h-4 w-4 text-warning" />;
  return ok ? <CheckCircle className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />;
}

export default function AdminSecrets() {
  const { data, loading, error, refetch } = useAdminData("integration_health");
  const { execute, acting } = useAdminAction();
  const [testResults, setTestResults] = useState<Record<string, any[]>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [flagConfirm, setFlagConfirm] = useState<{ key: string; label: string; enabled: boolean } | null>(null);

  async function runTest(integrationId: string) {
    setTestingId(integrationId);
    try {
      const result = await execute("test_integration", { integration_id: integrationId });
      setTestResults((prev) => ({ ...prev, [integrationId]: result.results }));
    } catch {} finally {
      setTestingId(null);
    }
  }

  async function handleToggleFlag() {
    if (!flagConfirm) return;
    try {
      await execute("toggle_flag", { flag_key: flagConfirm.key, enabled: !flagConfirm.enabled });
      toast.success(`${flagConfirm.label} ${!flagConfirm.enabled ? "enabled" : "disabled"}`);
      setFlagConfirm(null);
      refetch();
    } catch {}
  }

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

  const integrations = data?.integrations || [];
  const flags = data?.flags || [];
  const flagCategories = [...new Set(flags.map((f: any) => f.category))];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Integrations & Secrets Control Center
          </h1>
          <p className="text-sm text-muted-foreground">Secure management of platform integrations, credentials, and configuration</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="registry" className="space-y-4">
        <TabsList>
          <TabsTrigger value="registry">Integration Registry</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
        </TabsList>

        {/* ─── Integration Registry ─── */}
        <TabsContent value="registry" className="space-y-4">
          {integrations.map((integration: any) => (
            <Card key={integration.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HealthIcon ok={integration.envStatus === "configured"} />
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <CardDescription className="text-xs">{integration.category}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={integration.envStatus} />
                    {integration.productionReady ? (
                      <Badge variant="outline" className="text-[10px] border-primary text-primary">Prod Ready</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-[hsl(var(--warning))] text-[hsl(var(--warning))]">Dev/Test</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Secrets Table */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Credentials</p>
                  <div className="space-y-1.5">
                    {integration.secrets.map((secret: any) => (
                      <div key={secret.name} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          {secret.configured ? (
                            <CheckCircle className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          )}
                          <span className="text-sm font-mono">{secret.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                            {secret.configured ? secret.masked : "Not configured"}
                          </code>
                          {secret.configured ? (
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Eye className="h-3 w-3 text-destructive" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health Metrics */}
                {Object.keys(integration.health).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Health</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(integration.health).map(([key, value]: any) => (
                        <div key={key} className="bg-muted/50 rounded-md p-2.5">
                          <p className="text-lg font-bold">{value}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {integration.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2 border-l-2 border-muted-foreground/20">
                    {integration.notes}
                  </p>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={acting || testingId === integration.id}
                    onClick={() => runTest(integration.id)}
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    {testingId === integration.id ? "Testing…" : "Run Health Check"}
                  </Button>
                </div>

                {/* Test Results */}
                {testResults[integration.id] && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Test Results</p>
                    {testResults[integration.id].map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          {r.status === "pass" ? (
                            <CheckCircle className="h-3.5 w-3.5 text-primary" />
                          ) : r.status === "warn" ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          )}
                          <span className="text-sm">{r.test}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{r.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ─── Feature Flags ─── */}
        <TabsContent value="flags" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Platform Configuration
              </CardTitle>
              <CardDescription>Toggle features and integrations. Changes take effect immediately.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {flagCategories.map((category: string) => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">{category}</p>
                  <div className="space-y-3">
                    {flags
                      .filter((f: any) => f.category === category)
                      .map((flag: any) => (
                        <div key={flag.key} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Zap className={`h-4 w-4 ${flag.enabled ? "text-primary" : "text-muted-foreground"}`} />
                            <div>
                              <p className="text-sm font-medium">{flag.label}</p>
                              {flag.description && (
                                <p className="text-xs text-muted-foreground">{flag.description}</p>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={flag.enabled}
                            onCheckedChange={() =>
                              setFlagConfirm({ key: flag.key, label: flag.label, enabled: flag.enabled })
                            }
                            disabled={acting}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Flag Toggle Confirmation */}
      <AlertDialog open={!!flagConfirm} onOpenChange={() => setFlagConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {flagConfirm?.enabled ? "Disable" : "Enable"} {flagConfirm?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will {flagConfirm?.enabled ? "disable" : "enable"} the "{flagConfirm?.label}" feature across the entire platform. This action is logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleFlag}>
              {flagConfirm?.enabled ? "Disable" : "Enable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
