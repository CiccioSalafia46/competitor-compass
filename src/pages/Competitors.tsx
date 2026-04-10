import { useState, useEffect, useCallback, useMemo } from "react";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useUsage } from "@/hooks/useUsage";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useCompetitorIntelligence } from "@/hooks/useCompetitorIntelligence";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, AlertTriangle, Brain, ChevronRight,
  ExternalLink, Layers3, Lightbulb, Megaphone,
  Newspaper, Pencil, Plus, RefreshCcw, Target,
  Trash2, TrendingDown, Upload, Users, X, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";
import type { Database } from "@/integrations/supabase/types";
import type {
  CompetitorIntelligenceSnapshot,
  CompetitorTimelineEvent,
} from "@/lib/competitor-intelligence";
import { getErrorMessage } from "@/lib/errors";
import { extractDomainsFromInput, mergeCompetitorDomains } from "@/lib/domains";
import { syncCompetitorInboxAttribution } from "@/lib/competitor-attribution";
import { INSIGHT_IMPACT_LABELS, INSIGHT_PRIORITY_LABELS, type InsightImpactArea, type InsightPriorityLevel } from "@/lib/insight-priority";
import { cn } from "@/lib/utils";

type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

const percent = (value: number) => `${Math.round(value * 100)}%`;
const dateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "No recent activity";

const priorityTone = (value: InsightPriorityLevel) =>
  value === "high" ? "border-destructive/20 bg-destructive/10 text-destructive" : value === "medium" ? "border-warning/20 bg-warning/10 text-warning" : "border-primary/20 bg-primary/10 text-primary";
const impactTone = (value: InsightImpactArea) =>
  value === "conversion" ? "border-primary/20 bg-primary/10 text-primary" : value === "traffic" ? "border-chart-2/20 bg-chart-2/10 text-chart-2" : "border-muted bg-muted/60 text-foreground";

// ─── Logo helpers ─────────────────────────────────────────────────────────────

function competitorDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

interface CompetitorLogoProps {
  name: string;
  website: string | null;
  size?: "sm" | "md";
}

function CompetitorLogo({ name, website, size = "md" }: CompetitorLogoProps) {
  const domain = competitorDomain(website);
  const [src, setSrc] = useState<string | null>(
    domain ? `https://logo.clearbit.com/${domain}` : null,
  );

  useEffect(() => {
    setSrc(domain ? `https://logo.clearbit.com/${domain}` : null);
  }, [domain]);

  const handleError = () => {
    if (src?.includes("clearbit") && domain) {
      setSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
    } else {
      setSrc(null);
    }
  };

  const sizeClass = size === "sm" ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl";

  if (!src) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center border bg-muted/40",
          sizeClass,
        )}
      >
        <span
          className={cn(
            "font-semibold text-foreground/60",
            size === "sm" ? "text-xs" : "text-sm",
          )}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden border bg-background shadow-sm",
        sizeClass,
      )}
    >
      <img
        src={src}
        alt={`${name} logo`}
        className="h-full w-full object-contain p-1"
        onError={handleError}
      />
    </div>
  );
}

function StrategicList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={`${title}-${item}`} className="flex gap-2.5">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function Competitors() {
  const { currentWorkspace } = useWorkspace();
  const { canManageCompetitors } = useRoles();
  const { isAtLimit, trackUsage } = useUsage();
  const { log } = useAuditLog();
  const { toast } = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Competitor | null>(null);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [domainsInput, setDomainsInput] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<{ name: string; website: string; domains: string }[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const { snapshots, generatedAt, loading: intelligenceLoading, error: intelligenceError, refetch: refetchIntelligence } = useCompetitorIntelligence(currentWorkspace?.id);

  const fetchCompetitors = useCallback(async () => {
    if (!currentWorkspace) {
      setCompetitors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("competitors").select("*").eq("workspace_id", currentWorkspace.id).order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setCompetitors([]);
      setLoading(false);
      return;
    }
    setCompetitors(data || []);
    setLoading(false);
  }, [currentWorkspace, toast]);

  useEffect(() => {
    void fetchCompetitors();
  }, [fetchCompetitors]);

  const snapshotMap = useMemo(() => new Map(snapshots.map((snapshot) => [snapshot.competitorId, snapshot])), [snapshots]);
  const sortedCompetitors = useMemo(() => [...competitors].sort((a, b) => (snapshotMap.get(b.id)?.activity.totalSignals ?? 0) - (snapshotMap.get(a.id)?.activity.totalSignals ?? 0) || a.name.localeCompare(b.name)), [competitors, snapshotMap]);
  const selectedCompetitor = sortedCompetitors.find((item) => item.id === selectedCompetitorId) ?? sortedCompetitors[0] ?? null;
  const selectedSnapshot = selectedCompetitor ? snapshotMap.get(selectedCompetitor.id) ?? null : null;

  useEffect(() => {
    if (!selectedCompetitorId && sortedCompetitors.length > 0) setSelectedCompetitorId(sortedCompetitors[0].id);
    if (selectedCompetitorId && !sortedCompetitors.some((item) => item.id === selectedCompetitorId)) {
      setSelectedCompetitorId(sortedCompetitors[0]?.id ?? null);
    }
  }, [selectedCompetitorId, sortedCompetitors]);

  useEffect(() => {
    setEditingDescription(false);
  }, [selectedCompetitorId]);

  const handleSaveDescription = async () => {
    if (!selectedCompetitor) return;
    setSavingDescription(true);
    const { error } = await supabase
      .from("competitors")
      .update({ description: descriptionDraft.trim() || null })
      .eq("id", selectedCompetitor.id);
    setSavingDescription(false);
    if (error) {
      toast({ title: "Error", description: getErrorMessage(error, "Failed to save description"), variant: "destructive" });
      return;
    }
    setCompetitors((prev) =>
      prev.map((c) => c.id === selectedCompetitor.id ? { ...c, description: descriptionDraft.trim() || null } : c)
    );
    setEditingDescription(false);
  };

  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = typeof event.target?.result === "string" ? event.target.result : "";
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      // Skip header row if first cell looks like a header
      const start = lines[0]?.toLowerCase().includes("name") ? 1 : 0;
      const parsed = lines.slice(start).map((line) => {
        // Basic CSV split — handles quoted fields with commas inside
        const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").trim());
        return {
          name: cols[0] ?? "",
          website: cols[1] ?? "",
          domains: cols[2] ?? "",
        };
      }).filter((row) => row.name.length > 0);
      setCsvRows(parsed);
      setCsvImportOpen(true);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!currentWorkspace || csvRows.length === 0) return;
    if (!canManageCompetitors) {
      toast({ title: "Access denied", variant: "destructive" });
      return;
    }
    setCsvImporting(true);
    let created = 0;
    let failed = 0;
    for (const row of csvRows) {
      try {
        const domains = mergeCompetitorDomains({ website: row.website, domains: extractDomainsFromInput(row.domains) });
        const { error } = await supabase.from("competitors").insert({
          workspace_id: currentWorkspace.id,
          name: row.name,
          website: row.website || null,
          domains,
          is_monitored: true,
        });
        if (error) throw error;
        created++;
      } catch {
        failed++;
      }
    }
    setCsvImporting(false);
    setCsvImportOpen(false);
    setCsvRows([]);
    toast({
      title: `Import complete`,
      description: `${created} competitor${created !== 1 ? "s" : ""} added${failed > 0 ? `, ${failed} failed` : ""}.`,
    });
    await fetchCompetitors();
    await refetchIntelligence();
  };

  const handleCreate = async () => {
    if (!currentWorkspace || !name.trim()) return;
    if (!canManageCompetitors) {
      toast({ title: "Access denied", description: "Analyst or admin access is required to add competitors.", variant: "destructive" });
      return;
    }
    if (isAtLimit("competitors")) {
      toast({ title: "Limit reached", description: "Upgrade your plan to track more competitors.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const domains = mergeCompetitorDomains({ website, domains: extractDomainsFromInput(domainsInput) });
      const { data, error } = await supabase.from("competitors").insert({
        workspace_id: currentWorkspace.id,
        name: name.trim(),
        website: website.trim() || null,
        domains,
        description: description.trim() || null,
      }).select().single();
      if (error) throw error;

      const attribution = await syncCompetitorInboxAttribution(data.id);
      await trackUsage("competitor_added");
      await log("created", "competitor", data.id, { name: data.name });
      toast({
        title: "Competitor added",
        description: attribution.matched > 0 ? `Matched ${attribution.matched} inbox ${attribution.matched === 1 ? "email" : "emails"} to this competitor.` : "No existing inbox emails matched yet.",
      });
      setName("");
      setWebsite("");
      setDomainsInput("");
      setDescription("");
      setDialogOpen(false);
      await fetchCompetitors();
      await refetchIntelligence();
      setSelectedCompetitorId(data.id);
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canManageCompetitors) {
      toast({ title: "Access denied", description: "Analyst or admin access is required to remove competitors.", variant: "destructive" });
      setDeleteTarget(null);
      return;
    }
    const { error } = await supabase.from("competitors").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("deleted", "competitor", deleteTarget.id, { name: deleteTarget.name });
      setCompetitors((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast({ title: "Competitor removed" });
      void refetchIntelligence();
    }
    setDeleteTarget(null);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center p-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6 p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Competitor Intelligence</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Understand how each competitor is moving across campaigns, promotions, positioning and category focus.</p>
          {!canManageCompetitors && <p className="mt-2 text-xs text-muted-foreground">Read-only mode. Analyst or admin access is required to add or remove competitors.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void refetchIntelligence()}><RefreshCcw className="h-4 w-4" />Refresh intelligence</Button>
          {/* Hidden file input for CSV import */}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            id="csv-import-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) parseCsvFile(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={!canManageCompetitors}
            onClick={() => document.getElementById("csv-import-input")?.click()}
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!canManageCompetitors}><Plus className="h-4 w-4" />Add competitor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Competitor</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Company name *</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Acme Corp" /></div>
                <div className="space-y-2"><Label>Website</Label><Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://acme.com" /></div>
                <div className="space-y-2">
                  <Label>Sender domains</Label>
                  <Input value={domainsInput} onChange={(event) => setDomainsInput(event.target.value)} placeholder="acme.com, news.acme.com" />
                  <p className="text-xs text-muted-foreground">Used to auto-assign imported newsletters to this competitor.</p>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Key things to track..." /></div>
                <Button onClick={handleCreate} disabled={isSubmitting || !name.trim() || !canManageCompetitors} className="w-full">{isSubmitting ? "Adding..." : "Add competitor"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {competitors.length === 0 ? (
        <Card className="border-2 border-dashed bg-accent/20">
          <CardContent className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
            <h2 className="mb-1 text-base font-semibold text-foreground">Start tracking competitors</h2>
            <p className="mx-auto mb-5 max-w-sm text-sm text-muted-foreground">Add the companies you want to monitor. This page turns newsletters, ads and insights into a strategic profile per competitor.</p>
            <Button className="gap-2" onClick={() => setDialogOpen(true)} disabled={!canManageCompetitors}><Plus className="h-4 w-4" />Add your first competitor</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tracked competitor set</CardTitle>
                <CardDescription>{sortedCompetitors.length} companies in scope. Last refresh {generatedAt ? dateTime(generatedAt) : "not available"}.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-xl border bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Tracked</p><p className="mt-1 text-xl font-semibold text-foreground">{sortedCompetitors.length}</p></div>
                <div className="rounded-xl border bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Signals</p><p className="mt-1 text-xl font-semibold text-foreground">{snapshots.reduce((sum, item) => sum + item.activity.totalSignals, 0)}</p></div>
                <div className="rounded-xl border bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Active ads</p><p className="mt-1 text-xl font-semibold text-foreground">{snapshots.reduce((sum, item) => sum + item.activity.activeAds, 0)}</p></div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {sortedCompetitors.map((competitor) => {
                const snapshot = snapshotMap.get(competitor.id);
                const selected = competitor.id === selectedCompetitor?.id;
                return (
                  <div key={competitor.id} className={cn("rounded-2xl border bg-card shadow-sm transition-all hover:border-primary/30", selected && "border-primary bg-primary/5 shadow-md")}>
                    <div className="flex items-start justify-between gap-2 p-4">
                      <button type="button" onClick={() => setSelectedCompetitorId(competitor.id)} className="min-w-0 flex-1 text-left">
                        <div className="flex items-start gap-3">
                          <CompetitorLogo name={competitor.name} website={competitor.website} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">{competitor.name}</p>
                              {snapshot ? <Badge variant="outline" className="text-[10px] font-medium">{snapshot.activity.totalSignals} signals</Badge> : null}
                            </div>
                            {competitor.website ? <p className="mt-1 text-xs text-muted-foreground">{competitor.website.replace(/^https?:\/\//, "")}</p> : null}
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              <span>{snapshot?.activity.newsletters ?? 0} newsletters</span>
                              <span>{snapshot?.activity.ads ?? 0} ads</span>
                              <span>{snapshot?.activity.insights ?? 0} insights</span>
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(competitor);
                        }}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                        disabled={!canManageCompetitors}
                        aria-label={`Delete ${competitor.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {snapshot ? (
                      <button type="button" onClick={() => setSelectedCompetitorId(competitor.id)} className="block w-full space-y-2 border-t px-4 pb-4 pt-3 text-left">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>Share of visible activity</span><span>{percent(snapshot.activity.shareOfVoice)}</span></div>
                        <Progress value={snapshot.activity.shareOfVoice * 100} className="h-2" />
                      </button>
                    ) : <button type="button" onClick={() => setSelectedCompetitorId(competitor.id)} className="block w-full border-t px-4 pb-4 pt-3 text-left text-xs text-muted-foreground">Intelligence profile will appear once signals are available.</button>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            {intelligenceLoading && !selectedSnapshot ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
                <Skeleton className="h-[320px] w-full" />
              </div>
            ) : selectedCompetitor ? (
              <CompetitorDetail
                competitor={selectedCompetitor}
                snapshot={selectedSnapshot}
                intelligenceError={intelligenceError}
                canManageCompetitors={canManageCompetitors}
                editingDescription={editingDescription}
                descriptionDraft={descriptionDraft}
                savingDescription={savingDescription}
                onEditDescription={() => { setDescriptionDraft(selectedCompetitor.description ?? ""); setEditingDescription(true); }}
                onCancelDescription={() => setEditingDescription(false)}
                onSaveDescription={handleSaveDescription}
                onDescriptionDraftChange={setDescriptionDraft}
              />
            ) : null}
          </div>
        </div>
      )}

      {isAtLimit("competitors") && <UpgradePrompt reason="competitor_limit" variant="inline" />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete competitor</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? This will not delete associated newsletters or analyses, but they will no longer be linked to this competitor.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={!canManageCompetitors}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV import preview dialog */}
      <Dialog open={csvImportOpen} onOpenChange={(open) => { if (!open) { setCsvImportOpen(false); setCsvRows([]); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import competitors from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview of <strong>{csvRows.length}</strong> competitor{csvRows.length !== 1 ? "s" : ""} to import. Expected columns: <code className="text-xs">name, website, domains</code>.
            </p>
            <div className="max-h-64 overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Website</th>
                    <th className="px-3 py-2 text-left font-medium">Domains</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-1.5 text-foreground">{row.name || <span className="text-destructive">Missing</span>}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{row.website || "—"}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{row.domains || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCsvImportOpen(false); setCsvRows([]); }}>Cancel</Button>
              <Button onClick={handleCsvImport} disabled={csvImporting || csvRows.length === 0 || !canManageCompetitors}>
                {csvImporting ? "Importing…" : `Import ${csvRows.length} competitor${csvRows.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── CompetitorDetail ─────────────────────────────────────────────────────────

interface CompetitorDetailProps {
  competitor: Competitor;
  snapshot: CompetitorIntelligenceSnapshot | null;
  intelligenceError: string | null;
  canManageCompetitors: boolean;
  editingDescription: boolean;
  descriptionDraft: string;
  savingDescription: boolean;
  onEditDescription: () => void;
  onCancelDescription: () => void;
  onSaveDescription: () => void;
  onDescriptionDraftChange: (value: string) => void;
}

function CompetitorDetail({
  competitor,
  snapshot,
  intelligenceError,
  canManageCompetitors,
  editingDescription,
  descriptionDraft,
  savingDescription,
  onEditDescription,
  onCancelDescription,
  onSaveDescription,
  onDescriptionDraftChange,
}: CompetitorDetailProps) {
  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3 min-w-0">
              <div className="flex items-start gap-3">
                <CompetitorLogo name={competitor.name} website={competitor.website} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">{competitor.name}</CardTitle>
                    {snapshot && (
                      <Badge variant="outline" className="capitalize">{snapshot.promoBehavior.profile} promo</Badge>
                    )}
                    {snapshot && (
                      <Badge variant="secondary">{snapshot.activity.totalSignals} signals</Badge>
                    )}
                  </div>
                </div>
              </div>

              {editingDescription ? (
                <div className="flex max-w-2xl flex-col gap-2">
                  <Textarea
                    value={descriptionDraft}
                    onChange={(e) => onDescriptionDraftChange(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                    placeholder="Add a description for this competitor…"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={savingDescription} onClick={onSaveDescription}>
                      {savingDescription ? "Saving…" : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancelDescription}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="group flex max-w-2xl items-start gap-2">
                  <CardDescription className="text-sm leading-6">
                    {competitor.description || "This profile aggregates tracked newsletters, Meta ads and AI insights linked to this competitor."}
                  </CardDescription>
                  {canManageCompetitors && (
                    <button
                      className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      onClick={onEditDescription}
                      title="Edit description"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {competitor.website && (
                  <a
                    href={competitor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-primary hover:border-primary/40 hover:bg-primary/5"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {competitor.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {(competitor.domains ?? []).map((d) => (
                  <Badge key={d} variant="outline">{d}</Badge>
                ))}
              </div>
            </div>

            <div className="shrink-0 rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Last activity</p>
              <p className="mt-1 text-sm font-semibold">{dateTime(snapshot?.activity.lastActivityAt ?? null)}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">Last 180-day signal window</p>
            </div>
          </div>
        </CardHeader>

        {/* KPI strip */}
        <CardContent className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Newsletters", value: snapshot?.activity.newsletters ?? 0, sub: "email campaigns" },
            { label: "Meta Ads", value: snapshot?.activity.ads ?? 0, sub: `${snapshot?.activity.activeAds ?? 0} live` },
            { label: "Share of voice", value: percent(snapshot?.activity.shareOfVoice ?? 0), sub: "vs. tracked set" },
            { label: "AI signals", value: snapshot?.activity.insights ?? 0, sub: "strategic briefs" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border bg-muted/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{kpi.label}</p>
              <p className="mt-1.5 text-2xl font-semibold">{kpi.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{kpi.sub}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {intelligenceError && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground">Intelligence unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">{intelligenceError}</p>
          </CardContent>
        </Card>
      )}

      {!snapshot || snapshot.activity.totalSignals === 0 ? (
        <Card className="border-2 border-dashed bg-muted/20">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Brain className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold">No intelligence yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Add sender domains, sync Gmail or connect more signals. Once newsletters, ads or insights are linked, this profile becomes strategic.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="profile">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          </TabsList>

          {/* ── Tab: Profile ── */}
          <TabsContent value="profile" className="mt-4 space-y-4">
            <ProfileTab snapshot={snapshot} />
          </TabsContent>

          {/* ── Tab: Timeline ── */}
          <TabsContent value="timeline" className="mt-4 space-y-4">
            <TimelineTab snapshot={snapshot} />
          </TabsContent>

          {/* ── Tab: Strategy ── */}
          <TabsContent value="strategy" className="mt-4 space-y-4">
            <StrategyTab snapshot={snapshot} />
          </TabsContent>

          {/* ── Tab: Opportunities ── */}
          <TabsContent value="opportunities" className="mt-4 space-y-4">
            <OpportunitiesTab snapshot={snapshot} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({ snapshot }: { snapshot: CompetitorIntelligenceSnapshot }) {
  const { promoBehavior, categoryFocus, campaignClusters } = snapshot;

  return (
    <>
      {/* Promo behavior */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Promotion behavior</CardTitle>
          <CardDescription>Offer depth, urgency mechanics and conversion pressure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Promo rate", value: percent(promoBehavior.promoRate) },
              { label: "Avg discount", value: `${Math.round(promoBehavior.averageDiscount)}%` },
              { label: "Max discount", value: `${Math.round(promoBehavior.maxDiscount)}%` },
              { label: "Profile", value: promoBehavior.profile, capitalize: true },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border bg-muted/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className={cn("mt-1.5 text-xl font-semibold", item.capitalize && "capitalize")}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[
              { label: "Coupon usage", value: promoBehavior.couponUsageRate },
              { label: "Urgency signals", value: promoBehavior.urgencyRate },
              { label: "Free shipping", value: promoBehavior.freeShippingRate },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.label}</span>
                  <span>{percent(item.value)}</span>
                </div>
                <Progress value={item.value * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category focus + campaign clusters side-by-side */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Category focus</CardTitle>
            <CardDescription>Top product and content categories by mention frequency.</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryFocus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Visible once newsletter extractions or insight categories are available.</p>
            ) : (
              <div className="space-y-3">
                {categoryFocus.map((entry) => (
                  <div key={entry.category} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Layers3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <p className="truncate text-sm font-medium">{entry.category}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{entry.count} · {percent(entry.share)}</span>
                    </div>
                    <Progress value={entry.share * 100} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Campaign clusters</CardTitle>
            <CardDescription>Distribution of campaign types across all observed signals.</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignClusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaign types detected yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={campaignClusters} margin={{ top: 4, right: 4, bottom: 28, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) => v.replace(/_/g, " ").slice(0, 12)}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={28} />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [value, name]}
                    labelFormatter={(label: string) => label.replace(/_/g, " ")}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="count" name="signals" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Tab: Timeline ────────────────────────────────────────────────────────────

const SOURCE_CONFIG = {
  newsletter: { icon: Newspaper, label: "Newsletter", dot: "bg-blue-500" },
  meta_ad: { icon: Megaphone, label: "Meta Ad", dot: "bg-violet-500" },
  insight: { icon: Lightbulb, label: "Insight", dot: "bg-amber-500" },
} as const;

function TimelineEventRow({ event }: { event: CompetitorTimelineEvent }) {
  const config = SOURCE_CONFIG[event.source];
  const Icon = config.icon;
  return (
    <div className="flex gap-3">
      {/* Dot */}
      <div className="flex flex-col items-center">
        <div className={cn("mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", config.dot)}>
          <Icon className="h-3 w-3 text-white" />
        </div>
        <div className="mt-1 flex-1 w-px bg-border" />
      </div>
      {/* Content */}
      <div className="mb-4 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white",
            config.dot,
          )}>{config.label}</span>
          {event.campaignType && (
            <Badge variant="secondary" className="text-[10px] capitalize">
              {event.campaignType.replace(/_/g, " ")}
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground">{dateTime(event.happenedAt)}</span>
        </div>
        <p className="text-sm font-medium leading-snug">{event.title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{event.summary}</p>
      </div>
    </div>
  );
}

function TimelineTab({ snapshot }: { snapshot: CompetitorIntelligenceSnapshot }) {
  const { campaignTimeline, activityByMonth } = snapshot;

  return (
    <>
      {/* Activity over time chart */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Activity over time</CardTitle>
          <CardDescription>Monthly signal volume across emails, ads and insights (last 6 months).</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityByMonth} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="colorNewsletters" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={28} allowDecimals={false} />
              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area
                type="monotone"
                dataKey="newsletters"
                name="Newsletters"
                stroke="hsl(var(--primary))"
                fill="url(#colorNewsletters)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="ads"
                name="Meta Ads"
                stroke="#8b5cf6"
                fill="url(#colorAds)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Visual timeline */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Campaign timeline</CardTitle>
          <CardDescription>Recent launches, pushes and strategic signals in chronological order.</CardDescription>
        </CardHeader>
        <CardContent>
          {campaignTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events available yet.</p>
          ) : (
            <div className="pt-1">
              {campaignTimeline.map((event, index) => (
                <div key={event.id} style={{ position: "relative" }}>
                  {/* Hide the trailing line for the last item */}
                  <div className={cn(index === campaignTimeline.length - 1 && "[&_.connector]:hidden")}>
                    <TimelineEventRow event={event} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ─── Tab: Strategy ────────────────────────────────────────────────────────────

function StrategyTab({ snapshot }: { snapshot: CompetitorIntelligenceSnapshot }) {
  const { messagingEvolution, positioningStrategy, recurringPatterns, strengths, weaknesses } = snapshot;

  return (
    <>
      {/* Positioning strategy */}
      <Card className="border border-l-[3px] border-l-primary shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
              <Target className="h-3.5 w-3.5 text-primary" />
            </div>
            <CardTitle className="text-sm">Positioning strategy</CardTitle>
          </div>
          <CardDescription>Derived from observed positioning angles, channel mix and pricing posture.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-foreground">{positioningStrategy}</p>
        </CardContent>
      </Card>

      {/* Messaging evolution */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Messaging evolution</CardTitle>
          <CardDescription>How the narrative is shifting across campaigns and positioning angles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/10 p-3">
            <p className="text-sm leading-6 text-muted-foreground">{messagingEvolution.shiftSummary}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current themes</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {messagingEvolution.currentThemes.length > 0
                  ? messagingEvolution.currentThemes.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)
                  : <p className="text-xs text-muted-foreground">No stable theme yet.</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Emerging angles</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {messagingEvolution.emergingAngles.length > 0
                  ? messagingEvolution.emergingAngles.map((a) => <Badge key={a} variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs">{a}</Badge>)
                  : <p className="text-xs text-muted-foreground">No new angle detected.</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current angles</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {messagingEvolution.currentAngles.length > 0
                  ? messagingEvolution.currentAngles.map((a) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)
                  : <p className="text-xs text-muted-foreground">No angles detected.</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Previous themes</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {messagingEvolution.previousThemes.length > 0
                  ? messagingEvolution.previousThemes.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)
                  : <p className="text-xs text-muted-foreground">Insufficient history.</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths / Weaknesses */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StrategicList title="Strengths" items={strengths} empty="No clear strengths detected yet." />
        <StrategicList title="Weaknesses" items={weaknesses} empty="No obvious weaknesses have surfaced yet." />
      </div>

      {/* Recurring patterns */}
      {recurringPatterns.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm">Recurring patterns</CardTitle>
            </div>
            <CardDescription>Consistent behavioral signals detected across the observation window.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {recurringPatterns.map((pattern) => (
                <li key={pattern} className="flex gap-2.5">
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                  <p className="text-sm leading-6 text-muted-foreground">{pattern}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Top strategic signals */}
      {snapshot.topSignals.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top strategic signals</CardTitle>
            <CardDescription>Highest-value AI briefs linked to this competitor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.topSignals.map((signal) => (
              <div key={`${signal.title}-${signal.takeaway}`} className="rounded-xl border bg-muted/10 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{signal.title}</p>
                  <Badge variant="outline" className={cn("text-[10px]", priorityTone(signal.priority))}>
                    {INSIGHT_PRIORITY_LABELS[signal.priority]}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px]", impactTone(signal.impact))}>
                    {INSIGHT_IMPACT_LABELS[signal.impact]}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{signal.takeaway}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ─── Tab: Opportunities ───────────────────────────────────────────────────────

function OpportunitiesTab({ snapshot }: { snapshot: CompetitorIntelligenceSnapshot }) {
  const { opportunities, strategicGaps } = snapshot;

  const hasContent = opportunities.length > 0 || strategicGaps.length > 0;

  if (!hasContent) {
    return (
      <Card className="border-2 border-dashed bg-muted/10">
        <CardContent className="py-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Lightbulb className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No opportunities or gaps detected yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Opportunities surface once enough signals are available to detect whitespace in competitor strategy.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Opportunities */}
      {opportunities.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
              <ChevronRight className="h-3 w-3 text-primary" />
            </div>
            <p className="text-sm font-semibold">Detected opportunities</p>
            <span className="text-xs text-muted-foreground">({opportunities.length})</span>
          </div>
          <div className="space-y-2">
            {opportunities.map((opp, index) => (
              <div
                key={`opp-${index}`}
                className="flex gap-3 rounded-xl border border-l-[3px] border-l-primary bg-background p-3 transition-colors hover:bg-accent/10"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-foreground">{opp}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Strategic gaps */}
      {strategicGaps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-warning/10">
              <AlertTriangle className="h-3 w-3 text-warning" />
            </div>
            <p className="text-sm font-semibold">Competitor gaps</p>
            <span className="text-xs text-muted-foreground">({strategicGaps.length})</span>
          </div>
          <div className="space-y-2">
            {strategicGaps.map((gap, index) => (
              <div
                key={`gap-${index}`}
                className="flex gap-3 rounded-xl border border-l-[3px] border-l-warning bg-background p-3"
              >
                <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p className="text-sm leading-6 text-foreground">{gap}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
