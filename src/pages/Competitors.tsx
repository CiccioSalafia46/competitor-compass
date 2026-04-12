import { useState, useEffect, useCallback, useMemo } from "react";
import DOMPurify from "dompurify";
import { useTranslation } from "react-i18next";
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
  Activity, AlertTriangle, Brain, ChevronRight, CheckCircle2,
  Clock, ExternalLink, Layers3, Lightbulb, Megaphone,
  Newspaper, Pencil, Plus, RefreshCcw, Target,
  Trash2, TrendingDown, Upload, Users, X, XCircle, Zap,
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
const dateTime = (value: string | null, fallback = "—") =>
  value
    ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : fallback;

const priorityTone = (value: InsightPriorityLevel) =>
  value === "high" ? "border-destructive/20 bg-destructive/10 text-destructive" : value === "medium" ? "border-warning/20 bg-warning/10 text-warning" : "border-primary/20 bg-primary/10 text-primary";
const impactTone = (value: InsightImpactArea) =>
  value === "conversion" ? "border-primary/20 bg-primary/10 text-primary" : value === "traffic" ? "border-chart-2/20 bg-chart-2/10 text-chart-2" : "border-muted bg-muted/60 text-foreground";
const profileBadgeClass = (profile: string): string => {
  if (profile === "aggressive") return "border-destructive/25 bg-destructive/10 text-destructive";
  if (profile === "moderate") return "border-amber-400/30 bg-amber-50/60 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400";
  return "border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400";
};

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

function StrategicList({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: string[];
  empty: string;
  tone?: "positive" | "warning";
}) {
  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {tone === "positive" && (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/12">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          )}
          {tone === "warning" && (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-400/15">
              <XCircle className="h-3.5 w-3.5 text-amber-500" />
            </div>
          )}
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={`${title}-${item}`} className="flex gap-2.5">
                {tone === "positive" ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
                ) : tone === "warning" ? (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/70" />
                ) : (
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                )}
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
  const { t } = useTranslation("competitors");
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
      title: t("importComplete"),
      description: t("importCompleteDesc", { count: created, failed: failed > 0 ? `, ${failed} failed` : "" }),
    });
    await fetchCompetitors();
    await refetchIntelligence();
  };

  const handleCreate = async () => {
    if (!currentWorkspace || !name.trim()) return;
    if (!canManageCompetitors) {
      toast({ title: t("accessDenied"), description: t("accessDeniedAdd"), variant: "destructive" });
      return;
    }
    if (isAtLimit("competitors")) {
      toast({ title: t("limitReached"), description: t("limitReachedDesc"), variant: "destructive" });
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
        title: t("competitorAdded"),
        description: attribution.matched > 0 ? t("competitorAddedMatched", { count: attribution.matched }) : t("competitorAddedNoMatch"),
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
      toast({ title: t("accessDenied"), description: t("accessDeniedRemove"), variant: "destructive" });
      setDeleteTarget(null);
      return;
    }
    const { error } = await supabase.from("competitors").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("deleted", "competitor", deleteTarget.id, { name: deleteTarget.name });
      setCompetitors((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast({ title: t("competitorRemoved") });
      void refetchIntelligence();
    }
    setDeleteTarget(null);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center p-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
          {!canManageCompetitors && <p className="mt-2 text-xs text-muted-foreground">{t("readOnly")}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void refetchIntelligence()}><RefreshCcw className="h-4 w-4" />{t("refreshIntelligence")}</Button>
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
            {t("importCsv")}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!canManageCompetitors}><Plus className="h-4 w-4" />{t("addCompetitor")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("addCompetitorDialog")}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>{t("companyName")}</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("companyNamePlaceholder")} /></div>
                <div className="space-y-2"><Label>{t("website")}</Label><Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder={t("websitePlaceholder")} /></div>
                <div className="space-y-2">
                  <Label>{t("senderDomains")}</Label>
                  <Input value={domainsInput} onChange={(event) => setDomainsInput(event.target.value)} placeholder={t("senderDomainsPlaceholder")} />
                  <p className="text-xs text-muted-foreground">{t("senderDomainsHint")}</p>
                </div>
                <div className="space-y-2"><Label>{t("notes")}</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("notesPlaceholder")} /></div>
                <Button onClick={handleCreate} disabled={isSubmitting || !name.trim() || !canManageCompetitors} className="w-full">{isSubmitting ? t("adding") : t("addCompetitor")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {competitors.length === 0 ? (
        <Card className="border-2 border-dashed bg-accent/20">
          <CardContent className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
            <h2 className="mb-1 text-base font-semibold text-foreground">{t("emptyTitle")}</h2>
            <p className="mx-auto mb-5 max-w-sm text-sm text-muted-foreground">{t("emptyDesc")}</p>
            <Button className="gap-2" onClick={() => setDialogOpen(true)} disabled={!canManageCompetitors}><Plus className="h-4 w-4" />{t("addFirstCompetitor")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{t("trackedSet")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {generatedAt ? t("refreshedAt", { time: dateTime(generatedAt) }) : t("intelligenceNotLoaded")}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {t("tracked", { count: sortedCompetitors.length })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                <div className="rounded-lg border bg-card p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t("totalSignals")}</p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{snapshots.reduce((sum, s) => sum + s.activity.totalSignals, 0)}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t("activeAds")}</p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{snapshots.reduce((sum, s) => sum + s.activity.activeAds, 0)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {sortedCompetitors.map((competitor, index) => {
                const snapshot = snapshotMap.get(competitor.id);
                const selected = competitor.id === selectedCompetitor?.id;
                return (
                  <div
                    key={competitor.id}
                    className={cn(
                      "overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-150",
                      "border-l-[3px]",
                      selected
                        ? "border-primary/40 border-l-primary bg-primary/[0.03] shadow-md"
                        : index === 0
                        ? "border-l-destructive/50 hover:shadow-md"
                        : index === 1
                        ? "border-l-amber-400/60 hover:shadow-md"
                        : "border-l-border hover:border-primary/20 hover:shadow-md",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCompetitorId(competitor.id)}
                      className="block w-full px-4 pb-0 pt-3.5 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <CompetitorLogo name={competitor.name} website={competitor.website} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-[13px] font-semibold text-foreground">{competitor.name}</p>
                              {snapshot && snapshot.activity.totalSignals > 0 && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {snapshot.activity.totalSignals}
                                </span>
                              )}
                            </div>
                            {competitor.website && (
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {competitor.website.replace(/^https?:\/\//, "")}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(event) => { event.stopPropagation(); setDeleteTarget(competitor); }}
                          className="shrink-0 rounded-md p-1 text-muted-foreground/40 transition-colors hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                          disabled={!canManageCompetitors}
                          aria-label={`Delete ${competitor.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mb-3 mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Newspaper className="h-3 w-3" />
                          {snapshot?.activity.newsletters ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Megaphone className="h-3 w-3" />
                          {snapshot?.activity.ads ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          {snapshot?.activity.insights ?? 0}
                        </span>
                        {snapshot?.activity.lastActivityAt && (
                          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/60">
                            <Clock className="h-2.5 w-2.5" />
                            {dateTime(snapshot.activity.lastActivityAt)}
                          </span>
                        )}
                      </div>
                    </button>
                    {snapshot && snapshot.activity.totalSignals > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedCompetitorId(competitor.id)}
                        className="block w-full border-t px-4 pb-3 pt-2.5 text-left"
                      >
                        <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{t("shareOfActivity")}</span>
                          <span className="font-semibold text-foreground/70">{percent(snapshot.activity.shareOfVoice)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              index === 0 ? "bg-destructive/50" : index === 1 ? "bg-amber-400/60" : "bg-primary/50",
                            )}
                            style={{ width: `${Math.min(100, snapshot.activity.shareOfVoice * 100)}%` }}
                          />
                        </div>
                      </button>
                    ) : (
                      <div className="border-t px-4 py-2.5 text-[11px] text-muted-foreground/60">
                        {t("addSenderDomains")}
                      </div>
                    )}
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
            <AlertDialogTitle>{t("deleteCompetitor")}</AlertDialogTitle>
            <AlertDialogDescription dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t("deleteConfirm", { name: deleteTarget?.name ?? "" })) }} />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", { ns: "common", defaultValue: "Cancel" })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={!canManageCompetitors}>{t("delete", { ns: "common", defaultValue: "Delete" })}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV import preview dialog */}
      <Dialog open={csvImportOpen} onOpenChange={(open) => { if (!open) { setCsvImportOpen(false); setCsvRows([]); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("csvImportTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p
              className="text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t("csvImportPreview", { count: csvRows.length })) }}
            />
            <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-md border">
              <table className="w-full min-w-[360px] text-xs">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t("csvColumnName")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("csvColumnWebsite")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("csvColumnDomains")}</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-1.5 text-foreground">{row.name || <span className="text-destructive">{t("csvMissing")}</span>}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{row.website || "—"}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{row.domains || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCsvImportOpen(false); setCsvRows([]); }}>{t("cancel", { ns: "common", defaultValue: "Cancel" })}</Button>
              <Button onClick={handleCsvImport} disabled={csvImporting || csvRows.length === 0 || !canManageCompetitors}>
                {csvImporting ? t("importing") : csvRows.length === 1 ? t("importCount", { count: csvRows.length }) : t("importCountPlural", { count: csvRows.length })}
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
  const { t } = useTranslation("competitors");
  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3 min-w-0">
              <div className="flex items-start gap-3">
                <CompetitorLogo name={competitor.name} website={competitor.website} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">{competitor.name}</CardTitle>
                    {snapshot && (
                      <Badge
                        variant="outline"
                        className={cn("capitalize font-medium", profileBadgeClass(snapshot.promoBehavior.profile))}
                      >
                        {t(snapshot.promoBehavior.profile as "aggressive" | "moderate" | "conservative")} {t("promo")}
                      </Badge>
                    )}
                    {snapshot && snapshot.activity.totalSignals > 0 && (
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
                    placeholder={t("descriptionPlaceholder")}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={savingDescription} onClick={onSaveDescription}>
                      {savingDescription ? t("saving") : t("save", { ns: "common", defaultValue: "Save" })}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancelDescription}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="group flex max-w-2xl items-start gap-2">
                  <CardDescription className="text-sm leading-6">
                    {competitor.description || t("descriptionFallback")}
                  </CardDescription>
                  {canManageCompetitors && (
                    <button
                      className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      onClick={onEditDescription}
                      title={t("editDescriptionTitle")}
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
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t("lastActivity")}</p>
              <p className="mt-1 text-sm font-semibold">{dateTime(snapshot?.activity.lastActivityAt ?? null, t("noRecentActivity", { defaultValue: "—" }))}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{t("lastActivityWindow")}</p>
            </div>
          </div>
        </CardHeader>

        {/* KPI strip */}
        <CardContent className="grid gap-3 border-t pt-4 sm:grid-cols-4">
          {[
            { label: t("kpi.newsletters"), value: snapshot?.activity.newsletters ?? 0, sub: t("kpi.newslettersSub") },
            { label: t("kpi.metaAds"), value: snapshot?.activity.ads ?? 0, sub: t("kpi.live", { count: snapshot?.activity.activeAds ?? 0 }) },
            { label: t("kpi.shareOfVoice"), value: percent(snapshot?.activity.shareOfVoice ?? 0), sub: t("kpi.shareOfVoiceSub") },
            { label: t("kpi.aiSignals"), value: snapshot?.activity.insights ?? 0, sub: t("kpi.aiSignalsSub") },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{kpi.label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{kpi.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{kpi.sub}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {intelligenceError && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground">{t("intelligenceUnavailable")}</p>
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
            <h2 className="text-base font-semibold">{t("noIntelligenceTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t("noIntelligenceDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="profile">
          <TabsList className="h-9 w-full justify-start gap-0.5 bg-muted/40">
            <TabsTrigger value="profile" className="gap-1.5 text-xs">
              <Activity className="h-3.5 w-3.5" />
              {t("tabProfile")}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" />
              {t("tabTimeline")}
            </TabsTrigger>
            <TabsTrigger value="strategy" className="gap-1.5 text-xs">
              <Target className="h-3.5 w-3.5" />
              {t("tabStrategy")}
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="gap-1.5 text-xs">
              <Lightbulb className="h-3.5 w-3.5" />
              {t("tabOpportunities")}
            </TabsTrigger>
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
  const { t } = useTranslation("competitors");
  const { promoBehavior, categoryFocus, campaignClusters } = snapshot;

  return (
    <>
      {/* Promo behavior */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("profile.title")}</CardTitle>
          <CardDescription>{t("profile.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t("profile.promoRate")}</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{percent(promoBehavior.promoRate)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t("profile.avgDiscount")}</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{Math.round(promoBehavior.averageDiscount)}%</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t("profile.maxDiscount")}</p>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{Math.round(promoBehavior.maxDiscount)}%</p>
            </div>
            <div className={cn("rounded-xl border p-4", profileBadgeClass(promoBehavior.profile).includes("destructive") ? "border-destructive/20 bg-destructive/5" : promoBehavior.profile === "moderate" ? "border-amber-400/25 bg-amber-50/50 dark:bg-amber-950/15" : "border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/15")}>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t("profile.profile")}</p>
              <p className={cn("mt-2 text-xl font-bold capitalize", promoBehavior.profile === "aggressive" ? "text-destructive" : promoBehavior.profile === "moderate" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                {promoBehavior.profile}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: t("profile.couponUsage"), value: promoBehavior.couponUsageRate },
              { label: t("profile.urgencySignals"), value: promoBehavior.urgencyRate },
              { label: t("profile.freeShipping"), value: promoBehavior.freeShippingRate },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.label}</span>
                  <span className="font-semibold text-foreground/70">{percent(item.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      item.value > 0.6 ? "bg-destructive/55" : item.value > 0.3 ? "bg-amber-400/65" : "bg-primary/55",
                    )}
                    style={{ width: `${item.value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category focus + campaign clusters side-by-side */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("profile.categoryFocus")}</CardTitle>
            <CardDescription>{t("profile.categoryFocusDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryFocus.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("profile.categoryFocusEmpty")}</p>
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
            <CardTitle className="text-sm">{t("profile.campaignClusters")}</CardTitle>
            <CardDescription>{t("profile.campaignClustersDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignClusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("profile.campaignClustersEmpty")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={campaignClusters} margin={{ top: 4, right: 4, bottom: 32, left: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v: string) => v.replace(/_/g, " ").slice(0, 12)}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    width={28}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [value, name]}
                    labelFormatter={(label: string) => label.replace(/_/g, " ")}
                    contentStyle={{ fontSize: 12, borderRadius: 8, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                  />
                  <Bar dataKey="count" name={t("profile.signals")} radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
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
  newsletter: { icon: Newspaper, dot: "bg-blue-500" },
  meta_ad: { icon: Megaphone, dot: "bg-violet-500" },
  insight: { icon: Lightbulb, dot: "bg-amber-500" },
} as const;

function TimelineEventRow({ event }: { event: CompetitorTimelineEvent }) {
  const { t } = useTranslation("competitors");
  const config = SOURCE_CONFIG[event.source];
  const Icon = config.icon;
  const sourceLabel = event.source === "newsletter" ? t("timeline.newsletter") : event.source === "meta_ad" ? t("timeline.metaAd") : t("timeline.insight");
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
          )}>{sourceLabel}</span>
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
  const { t } = useTranslation("competitors");
  const { campaignTimeline, activityByMonth } = snapshot;

  return (
    <>
      {/* Activity over time chart */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("timeline.activityOverTime")}</CardTitle>
          <CardDescription>{t("timeline.activityOverTimeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
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
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={28} allowDecimals={false} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
              <Area
                type="monotone"
                dataKey="newsletters"
                name={t("timeline.newsletter")}
                stroke="hsl(var(--primary))"
                fill="url(#colorNewsletters)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="ads"
                name={t("timeline.metaAd")}
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
          <CardTitle className="text-sm">{t("timeline.campaignTimeline")}</CardTitle>
          <CardDescription>{t("timeline.campaignTimelineDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {campaignTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("timeline.noTimeline")}</p>
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
  const { t } = useTranslation("competitors");
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
            <CardTitle className="text-sm">{t("strategy.positioningStrategy")}</CardTitle>
          </div>
          <CardDescription>{t("strategy.positioningStrategyDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-foreground">{positioningStrategy}</p>
        </CardContent>
      </Card>

      {/* Messaging evolution */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("strategy.messagingEvolution")}</CardTitle>
          <CardDescription>{t("strategy.messagingEvolutionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/10 p-3">
            <p className="text-sm leading-6 text-muted-foreground">{messagingEvolution.shiftSummary}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("strategy.currentThemes")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {messagingEvolution.currentThemes.length > 0
                  ? messagingEvolution.currentThemes.map((theme) => <Badge key={theme} variant="secondary" className="text-xs">{theme}</Badge>)
                  : <p className="text-xs text-muted-foreground">{t("strategy.noCurrentThemes")}</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("strategy.emergingAngles")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {messagingEvolution.emergingAngles.length > 0
                  ? messagingEvolution.emergingAngles.map((a) => <Badge key={a} variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs">{a}</Badge>)
                  : <p className="text-xs text-muted-foreground">{t("strategy.noEmergingAngles")}</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("strategy.currentAngles")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {messagingEvolution.currentAngles.length > 0
                  ? messagingEvolution.currentAngles.map((a) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)
                  : <p className="text-xs text-muted-foreground">{t("strategy.noCurrentAngles")}</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("strategy.previousThemes")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {messagingEvolution.previousThemes.length > 0
                  ? messagingEvolution.previousThemes.map((theme) => <Badge key={theme} variant="outline" className="text-xs">{theme}</Badge>)
                  : <p className="text-xs text-muted-foreground">{t("strategy.noPreviousThemes")}</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths / Weaknesses */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StrategicList title={t("strategy.strengths")} items={strengths} empty={t("strategy.noStrengths")} tone="positive" />
        <StrategicList title={t("strategy.weaknesses")} items={weaknesses} empty={t("strategy.noWeaknesses")} tone="warning" />
      </div>

      {/* Recurring patterns */}
      {recurringPatterns.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm">{t("strategy.recurringPatterns")}</CardTitle>
            </div>
            <CardDescription>{t("strategy.recurringPatternsDesc")}</CardDescription>
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
            <CardTitle className="text-sm">{t("strategy.topStrategicSignals")}</CardTitle>
            <CardDescription>{t("strategy.topStrategicSignalsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.topSignals.map((signal) => (
              <div
                key={`${signal.title}-${signal.takeaway}`}
                className={cn(
                  "rounded-xl border-l-[3px] bg-card p-4 shadow-sm",
                  signal.priority === "high"
                    ? "border-l-destructive bg-destructive/[0.02]"
                    : signal.priority === "medium"
                    ? "border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/10"
                    : "border-l-primary",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-foreground">{signal.title}</p>
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
  const { t } = useTranslation("competitors");
  const { opportunities, strategicGaps } = snapshot;

  const hasContent = opportunities.length > 0 || strategicGaps.length > 0;

  if (!hasContent) {
    return (
      <Card className="border-2 border-dashed bg-muted/10">
        <CardContent className="py-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Lightbulb className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t("opportunities.none")}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            {t("opportunities.noneDesc")}
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
            <p className="text-sm font-semibold">{t("opportunities.detected")}</p>
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
            <p className="text-sm font-semibold">{t("opportunities.gaps")}</p>
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
