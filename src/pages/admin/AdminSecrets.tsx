import { useState } from "react";
import { useAdminData, useAdminAction } from "@/hooks/useAdmin";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  FlaskConical, EyeOff, Eye, Settings2, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  AdminFeatureFlag,
  AdminIntegrationHealthItem,
  AdminIntegrationTestResult,
  AdminSecretsResponse,
} from "@/types/admin";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { dotClass: string; label: string; textClass: string }> = {
    configured: {
      dotClass: "bg-success",
      label: "Configured",
      textClass: "text-success",
    },
    missing: {
      dotClass: "bg-destructive",
      label: "Missing",
      textClass: "text-destructive",
    },
    expired: {
      dotClass: "bg-warning",
      label: "Expired",
      textClass: "text-warning",
    },
  };
  const s = map[status] ?? { dotClass: "bg-muted-foreground/40", label: status, textClass: "text-muted-foreground" };
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dotClass)} />
      <span className={cn("text-[12px] font-medium", s.textClass)}>{s.label}</span>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SecretsSkeleton() {
  return (
    <AdminPageLayout title="Integrations & Secrets" description="Platform credentials and feature flags">
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </AdminPageLayout>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminSecrets() {
  const { data, loading, error, refetch } = useAdminData<AdminSecretsResponse>("integration_health");
  const { execute, acting } = useAdminAction();
  const [testResults, setTestResults] = useState<Record<string, AdminIntegrationTestResult[]>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [flagConfirm, setFlagConfirm] = useState<{ key: string; label: string; enabled: boolean } | null>(null);

  async function runTest(integrationId: string) {
    setTestingId(integrationId);
    try {
      const result = await execute<{ results: AdminIntegrationTestResult[] }>("test_integration", { integration_id: integrationId });
      setTestResults((prev) => ({ ...prev, [integrationId]: result.results }));
    } catch {
      // Error toast already handled by useAdminAction.
    } finally {
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
    } catch {
      // Error toast already handled by useAdminAction.
    }
  }

  if (loading) return <SecretsSkeleton />;

  if (error) {
    return (
      <AdminPageLayout title="Integrations & Secrets" description="Platform credentials and feature flags">
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  const integrations = data?.integrations || [];
  const flags = data?.flags || [];
  const flagCategories = [...new Set(flags.map((f) => f.category))];
  const configuredCount = integrations.filter((i) => i.envStatus === "configured").length;

  return (
    <AdminPageLayout
      title="Integrations & Secrets"
      description={<><span className="font-semibold text-foreground">{configuredCount}/{integrations.length}</span> integrations configured</>}
      actions={
        <Button variant="outline" size="sm" onClick={refetch} className="h-8 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      <Tabs defaultValue="registry" className="space-y-5">
        <TabsList className="h-8">
          <TabsTrigger value="registry" className="text-xs">Integration Registry</TabsTrigger>
          <TabsTrigger value="flags" className="text-xs">Feature Flags</TabsTrigger>
        </TabsList>

        {/* ─── Integration Registry ─── */}
        <TabsContent value="registry" className="space-y-3 mt-0">
          {integrations.map((integration: AdminIntegrationHealthItem) => (
            <Card key={integration.id} className={cn(
              "transition-colors",
              integration.envStatus === "missing" && "border-destructive/20",
              integration.envStatus === "expired" && "border-warning/20",
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-[14px]">{integration.name}</CardTitle>
                      <StatusDot status={integration.envStatus} />
                    </div>
                    <CardDescription className="text-xs">{integration.category}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {integration.productionReady ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-success/25 bg-success/10 px-1.5 py-0.5 text-caption font-medium text-success">
                        <CheckCircle className="h-2.5 w-2.5" />
                        Prod Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-caption font-medium text-warning">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Dev/Test
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Credentials */}
                <div className="space-y-1.5">
                  <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                    Credentials
                  </p>
                  <div className="divide-y rounded-lg border overflow-hidden">
                    {integration.secrets.map((secret) => (
                      <div key={secret.name} className="flex items-center justify-between gap-3 px-3 py-2 bg-card">
                        <div className="flex items-center gap-2 min-w-0">
                          {secret.configured ? (
                            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-success" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          )}
                          <span className="font-mono text-[12px] text-foreground">{secret.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-caption text-muted-foreground">
                            {secret.configured ? secret.masked : "Not configured"}
                          </code>
                          {secret.configured ? (
                            <EyeOff className="h-3 w-3 text-muted-foreground/40" />
                          ) : (
                            <Eye className="h-3 w-3 text-destructive/60" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health metrics */}
                {Object.keys(integration.health).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                      Health Metrics
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(integration.health).map(([key, value]) => (
                        <div key={key} className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
                          <p className="mt-0.5 text-caption text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {integration.notes && (
                  <p className="rounded-md border-l-2 border-muted-foreground/20 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    {integration.notes}
                  </p>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    disabled={acting || testingId === integration.id}
                    onClick={() => runTest(integration.id)}
                  >
                    <FlaskConical className="h-3 w-3" />
                    {testingId === integration.id ? "Testing…" : "Run Health Check"}
                  </Button>
                </div>

                {/* Test Results */}
                {testResults[integration.id] && (
                  <div className="space-y-1.5">
                    <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                      Test Results
                    </p>
                    <div className="divide-y rounded-lg border overflow-hidden">
                      {testResults[integration.id].map((r, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 bg-card">
                          <div className="flex items-center gap-2">
                            {r.status === "pass" ? (
                              <CheckCircle className="h-3.5 w-3.5 text-success" />
                            ) : r.status === "warn" ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                            <span className="text-nav">{r.test}</span>
                          </div>
                          <span className="text-caption text-muted-foreground">{r.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {integrations.length === 0 && (
            <div className="rounded-xl border border-dashed py-14 text-center">
              <p className="text-sm text-muted-foreground">No integrations configured.</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Feature Flags ─── */}
        <TabsContent value="flags" className="space-y-3 mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <CardTitle className="text-[14px]">Platform Configuration</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Toggle features across the platform. Changes take effect immediately and are logged.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {flagCategories.map((category) => (
                <div key={category}>
                  <p className="mb-2 text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                    {category}
                  </p>
                  <div className="divide-y rounded-lg border overflow-hidden">
                    {flags
                      .filter((f: AdminFeatureFlag) => f.category === category)
                      .map((flag) => (
                        <div key={flag.key} className="flex items-center justify-between gap-3 bg-card px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Zap className={cn("h-3.5 w-3.5 shrink-0", flag.enabled ? "text-primary" : "text-muted-foreground/40")} />
                            <div className="min-w-0">
                              <p className="text-nav font-medium text-foreground">{flag.label}</p>
                              {flag.description && (
                                <p className="text-caption text-muted-foreground">{flag.description}</p>
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

              {flags.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No feature flags configured.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Flag toggle confirmation */}
      <AlertDialog open={!!flagConfirm} onOpenChange={() => setFlagConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {flagConfirm?.enabled ? "Disable" : "Enable"} {flagConfirm?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will {flagConfirm?.enabled ? "disable" : "enable"} the &ldquo;{flagConfirm?.label}&rdquo; feature across the entire platform. This action is logged.
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
    </AdminPageLayout>
  );
}
