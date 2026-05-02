import { memo, useCallback, useMemo, useState, type ElementType } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { useInsights, INSIGHT_CATEGORIES, type Insight } from "@/hooks/useInsights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertTriangle,
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  Clipboard,
  Layers,
  Lightbulb,
  Mail,
  Megaphone,
  RefreshCw,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  INSIGHT_IMPACT_LABELS,
  INSIGHT_PRIORITY_LABELS,
  parseRecommendedResponseSections,
  type InsightPriorityLevel,
} from "@/lib/insight-priority";
import { toast } from "sonner";

// ─── Constants & helpers ──────────────────────────────────────────

function useCategoryMeta(t: (key: string) => string) {
  return useMemo<Record<string, { label: string; icon: ElementType }>>(() => ({
    pricing: { label: t("categoryPricing"), icon: Target },
    promotions: { label: t("categoryPromotions"), icon: TrendingUp },
    email_strategy: { label: t("categoryEmailStrategy"), icon: Mail },
    paid_ads: { label: t("categoryPaidAds"), icon: Megaphone },
    product_focus: { label: t("categoryProductFocus"), icon: Layers },
    seasonal_strategy: { label: t("categorySeasonal"), icon: Calendar },
    messaging_positioning: { label: t("categoryMessaging"), icon: Lightbulb },
    cadence_frequency: { label: t("categoryCadence"), icon: AlertTriangle },
  }), [t]);
}

function useFormatSourceLabel(t: (key: string) => string) {
  return (sourceType: string) => {
    if (sourceType === "cross_channel") return t("sourceCrossChannel");
    if (sourceType === "meta_ad") return t("sourceMetaAds");
    return t("sourceNewsletter");
  };
}

function useFormatOfferSummary(t: (key: string, opts?: Record<string, unknown>) => string) {
  return (insight: Insight) => {
    const segments: string[] = [];
    if (typeof insight.offer_discount_percentage === "number") segments.push(t("discount", { percent: insight.offer_discount_percentage }));
    if (insight.offer_coupon_code) segments.push(t("coupon", { code: insight.offer_coupon_code }));
    if ((insight.offer_urgency ?? []).length > 0) segments.push(t("urgency", { signals: insight.offer_urgency.join(", ") }));
    return segments.length > 0 ? segments.join(" · ") : t("noOffer");
  };
}

const PRIORITY_TONE: Record<InsightPriorityLevel, string> = {
  high: "border-destructive/20 bg-destructive/10 text-destructive",
  medium: "border-warning/20 bg-warning/10 text-warning",
  low: "border-primary/20 bg-primary/10 text-primary",
};

const PRIORITY_BORDER: Record<InsightPriorityLevel, string> = {
  high: "border-l-destructive",
  medium: "border-l-amber-400",
  low: "border-l-primary/60",
};

const PRIORITY_BORDER_WIDTH: Record<InsightPriorityLevel, string> = {
  high: "border-l-[3px]",
  medium: "border-l-2",
  low: "border-l",
};

// ─── Compact card (list view) ─────────────────────────────────────

const InsightCompactRow = memo(function InsightCompactRow({
  insight,
  categoryMeta,
  onClick,
}: {
  insight: Insight;
  categoryMeta: Record<string, { label: string; icon: ElementType }>;
  onClick: () => void;
}) {
  const { t } = useTranslation("insights");
  const meta = categoryMeta[insight.category] ?? categoryMeta["pricing"];
  const Icon = meta.icon;
  const confidencePct = insight.confidence != null ? `${Math.round(insight.confidence * 100)}%` : "–";
  const relDate = insight.created_at ? formatDistanceToNow(new Date(insight.created_at), { addSuffix: true }) : "";

  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-ring",
        PRIORITY_BORDER_WIDTH[insight.priority_level],
        PRIORITY_BORDER[insight.priority_level],
      )}
      onClick={onClick}
    >
      <div className="mt-0.5 shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("shrink-0 text-xs font-medium px-2 py-0.5 rounded-md capitalize", PRIORITY_TONE[insight.priority_level])}>
            {INSIGHT_PRIORITY_LABELS[insight.priority_level]}
          </Badge>
          <Badge variant="outline" className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-md capitalize">{meta.label}</Badge>
        </div>
        {/* FIX 6: High priority title slightly larger */}
        <p className={cn(
          "mt-2 truncate text-foreground",
          insight.priority_level === "high" ? "text-sm font-semibold" : "text-sm font-medium",
        )}>{insight.title}</p>
        {(insight.affected_competitors ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {insight.affected_competitors.slice(0, 3).map((c) => (
              <Badge key={c} variant="secondary" className="text-xs font-medium px-2 py-0.5 rounded-md">{c}</Badge>
            ))}
            {insight.affected_competitors.length > 3 && (
              <span className="text-xs text-muted-foreground">+{insight.affected_competitors.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="hidden shrink-0 items-end gap-3 text-right sm:flex">
        <div>
          <p className="stat-value text-sm font-semibold text-foreground">{confidencePct}</p>
          <p className="text-xs text-muted-foreground">{t("confidence")}</p>
        </div>
        <div>
          <p className="stat-value text-sm font-semibold text-foreground">{insight.supporting_evidence.length}</p>
          <p className="text-xs text-muted-foreground">{t("evidence")}</p>
        </div>
      </div>

      <div className="hidden shrink-0 text-right lg:block">
        <p className="text-xs text-muted-foreground">{INSIGHT_IMPACT_LABELS[insight.impact_area]}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="mt-0.5 text-xs text-muted-foreground/70">{relDate}</p>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{insight.created_at ? new Date(insight.created_at).toLocaleString() : ""}</TooltipContent>
        </Tooltip>
      </div>

      <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
    </button>
  );
});

// ─── Expanded card (detail view) ──────────────────────────────────
// FIX 2: 3-level hierarchy — L1 core (Why + Response), L2 context (Implication + Positioning), L3 evidence+metadata

// FIXME: tune AI prompt — when generating insight blocks, ensure no two blocks
// share more than 30% content words. If 'why_it_matters' and 'strategic_implication'
// overlap, regenerate strategic_implication with a market/macro framing.
// FIXME: 'why_it_matters' should start with "Because..." for causal framing.

function InsightExpanded({ insight }: { insight: Insight }) {
  const { t } = useTranslation("insights");
  const CATEGORY_META = useCategoryMeta(t);
  const formatSourceLabel = useFormatSourceLabel(t);
  const formatOfferSummary = useFormatOfferSummary(t);
  const meta = CATEGORY_META[insight.category] ?? CATEGORY_META["pricing"];
  const Icon = meta.icon;
  const confidencePct = insight.confidence != null ? `${Math.round(insight.confidence * 100)}%` : "–";
  const responseSections = parseRecommendedResponseSections(insight.recommended_response);
  const relDate = insight.created_at ? formatDistanceToNow(new Date(insight.created_at), { addSuffix: true }) : "";
  const [showEvidence, setShowEvidence] = useState(false);

  const handleCopy = useCallback(() => {
    const text = [
      insight.title,
      "",
      `Why it matters: ${insight.why_it_matters}`,
      "",
      `Recommended response: ${insight.recommended_response}`,
    ].join("\n");
    void navigator.clipboard.writeText(text);
    toast.success(t("copiedToClipboard"));
  }, [insight, t]);

  const offerSummary = formatOfferSummary(insight);
  const hasOffer = offerSummary !== t("noOffer");

  return (
    <div className="space-y-4">
      {/* Header: badges + title + confidence */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("text-xs font-medium px-2 py-0.5 rounded-md capitalize", PRIORITY_TONE[insight.priority_level])}>
              {INSIGHT_PRIORITY_LABELS[insight.priority_level]}
            </Badge>
            <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-md capitalize">{meta.label}</Badge>
            <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-md capitalize">{insight.campaign_type}</Badge>
            <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-md capitalize">{INSIGHT_IMPACT_LABELS[insight.impact_area]}</Badge>
          </div>
          <h2 className={cn(
            "leading-tight text-foreground",
            insight.priority_level === "high" ? "text-lg font-semibold" : "text-base font-semibold",
          )}>{insight.title}</h2>
          {/* FIX 4: removed "what_is_happening" — redundant with title */}
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="stat-value text-xl font-semibold text-foreground">{confidencePct}</p>
          <p className="text-xs text-muted-foreground">{t("confidence")}</p>
        </div>
      </div>

      {/* ── LEVEL 1: Core insight (prominent, full-width) ── */}
      <div className="space-y-4">
        <div>
          <p className="section-label text-foreground">{t("whyItMatters")}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{insight.why_it_matters}</p>
        </div>
        <div>
          <p className="section-label text-foreground">{t("recommendedResponse")}</p>
          {responseSections ? (
            <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted-foreground">
              <div className="flex items-start gap-2">
                <Target className="mt-1 h-3.5 w-3.5 shrink-0 text-foreground" />
                <p><span className="font-medium text-foreground">Immediate:</span> {responseSections.immediate || "—"}</p>
              </div>
              <p><span className="text-foreground">Next 30 days:</span> {responseSections.next30Days || "—"}</p>
              <p className="text-muted-foreground/70"><span className="text-muted-foreground">Measure:</span> {responseSections.measure || "—"}</p>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{insight.recommended_response}</p>
          )}
        </div>
      </div>

      {/* ── LEVEL 2: Strategic context (secondary, compact) ── */}
      <div className="grid gap-3 border-t pt-3 md:grid-cols-2">
        <div>
          <p className="section-label text-foreground">{t("strategicImplication")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{insight.strategic_implication}</p>
        </div>
        <div>
          <p className="section-label text-foreground">Positioning</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{insight.positioning_angle}</p>
        </div>
      </div>

      {/* ── LEVEL 3: Evidence & metadata (collapsed by default) ── */}
      {insight.supporting_evidence.length > 0 && (
        <div className="border-t pt-3">
          <button
            className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded"
            onClick={() => setShowEvidence((v) => !v)}
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", showEvidence && "rotate-180")} />
            {insight.supporting_evidence.length} {t("evidence").toLowerCase()} · {insight.affected_competitors.length} competitors · {relDate}
          </button>

          {showEvidence && (
            <div className="mt-3 space-y-3">
              {/* Evidence table */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Label</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Detail</th>
                      <th className="hidden px-3 py-2 text-left font-medium text-muted-foreground sm:table-cell">Metric</th>
                      <th className="hidden px-3 py-2 text-left font-medium text-muted-foreground md:table-cell">Source</th>
                      <th className="hidden px-3 py-2 text-left font-medium text-muted-foreground lg:table-cell">Competitor</th>
                      <th className="hidden px-3 py-2 text-left font-medium text-muted-foreground lg:table-cell">Timeframe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {insight.supporting_evidence.map((ev, i) => (
                      <tr key={i} className="even:bg-muted/10">
                        <td className="px-3 py-2 font-medium text-foreground">{ev.label}</td>
                        <td className="max-w-xs px-3 py-2 text-muted-foreground [overflow-wrap:anywhere]">{ev.detail}</td>
                        <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{ev.metric || "—"}</td>
                        <td className="hidden px-3 py-2 capitalize text-muted-foreground md:table-cell">{ev.source?.replaceAll("_", " ") || "—"}</td>
                        <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">{ev.competitor || "—"}</td>
                        <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">{ev.timeframe || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Offers + CTA (only when meaningful) */}
              {(hasOffer || insight.cta_primary) && (
                <div className="grid gap-3 md:grid-cols-2">
                  {hasOffer && (
                    <div className="rounded-lg border bg-muted/10 p-3">
                      <p className="section-label text-foreground">{t("offerDetails")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{offerSummary}</p>
                    </div>
                  )}
                  {insight.cta_primary && (
                    <div className="rounded-lg border bg-muted/10 p-3">
                      <p className="section-label text-foreground">CTA</p>
                      <p className="mt-1 text-xs text-muted-foreground">{insight.cta_analysis}</p>
                      <Badge variant="outline" className="mt-2 text-xs font-medium px-2 py-0.5 rounded-md">{insight.cta_primary}</Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer: competitors (left-aligned) + metadata + action bar */}
      <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {insight.affected_competitors.map((c) => (
            <Badge key={c} variant="secondary" className="text-xs font-medium px-2 py-0.5 rounded-md">{c}</Badge>
          ))}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground/70">{relDate}</span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{insight.created_at ? new Date(insight.created_at).toLocaleString() : ""}</TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground/70">
            · {formatSourceLabel(insight.source_type)} · {insight.supporting_evidence.length} sources
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={handleCopy}>
            <Clipboard className="h-3 w-3" /> {t("copyInsight")}
          </Button>
          {/* FIXME: needs backend — save to playbook */}
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => toast.info(t("comingSoon"))}>
            <Bookmark className="h-3 w-3" /> {t("savePlaybook")}
          </Button>
          {/* FIXME: needs backend — share with team */}
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => toast.info(t("comingSoon"))}>
            <Share2 className="h-3 w-3" /> {t("share")}
          </Button>
          {/* FIXME: needs backend — mark as actioned */}
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => toast.info(t("comingSoon"))}>
            <Check className="h-3 w-3" /> {t("markActioned")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function Insights() {
  const { t } = useTranslation("insights");
  const [activeTab, setActiveTab] = useState<string>("all");
  const categoryFilter = activeTab === "all" ? undefined : activeTab;
  const { insights, loading, generating, generateInsights } = useInsights(categoryFilter, { limit: 36 });
  const CATEGORY_META = useCategoryMeta(t);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mobileInsight, setMobileInsight] = useState<Insight | null>(null);

  // Stats
  const highCount = useMemo(() => insights.filter((i) => i.priority_level === "high").length, [insights]);
  const competitorCount = useMemo(() => new Set(insights.flatMap((i) => i.affected_competitors)).size, [insights]);
  const evidenceCount = useMemo(() => insights.reduce((sum, i) => sum + i.supporting_evidence.length, 0), [insights]);
  const avgConfidence = useMemo(() => {
    const vals = insights.map((i) => i.confidence).filter((v): v is number => v != null);
    return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) : null;
  }, [insights]);

  // Category counts for tab badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const hasHigh: Record<string, boolean> = {};
    for (const cat of INSIGHT_CATEGORIES) { counts[cat] = 0; hasHigh[cat] = false; }
    for (const i of insights) {
      counts[i.category] = (counts[i.category] ?? 0) + 1;
      if (i.priority_level === "high") hasHigh[i.category] = true;
    }
    return { counts, hasHigh };
  }, [insights]);

  const handleGenerate = useCallback(() => {
    const newestCreatedAt = insights[0]?.created_at;
    if (newestCreatedAt) {
      const hoursSince = (Date.now() - new Date(newestCreatedAt).getTime()) / 36e5;
      if (hoursSince < 24) {
        const hoursAgo = Math.round(hoursSince);
        if (!window.confirm(t("generateConfirm", { hours: hoursAgo }))) return;
      }
    }
    void generateInsights(categoryFilter);
  }, [insights, categoryFilter, generateInsights, t]);

  const handleCardClick = useCallback((insight: Insight) => {
    if (window.innerWidth < 768) {
      setMobileInsight(insight);
    } else {
      setExpandedId((prev) => (prev === insight.id ? null : insight.id));
    }
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-description">{t("subtitle")}</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="default" size="sm" className="gap-1.5" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
              {generating ? t("generating") : t("generate")}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-52 text-xs">{t("generateTooltip")}</TooltipContent>
        </Tooltip>
      </div>

      {/* FIX 3: Executive summary — inline stats, compact */}
      {/* FIXME: replace with AI-generated narrative paragraph once executive summary endpoint exists */}
      {!loading && insights.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {insights.length} insights · {highCount} high priority · {evidenceCount} evidence points · {competitorCount} competitors covered
          {avgConfidence != null && ` · ${avgConfidence}% avg confidence`}
        </p>
      )}

      {/* Category tabs with counts + high-priority dot */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="scrollbar-thin flex h-auto overflow-x-auto bg-muted/50 p-1">
          <TabsTrigger value="all" className="shrink-0 gap-1.5 text-xs">
            <Sparkles className="h-3 w-3" />{t("allCategories")} ({insights.length})
          </TabsTrigger>
          {INSIGHT_CATEGORIES.map((category) => {
            const CategoryIcon = CATEGORY_META[category]?.icon;
            const count = categoryCounts.counts[category] ?? 0;
            const hasHigh = categoryCounts.hasHigh[category];
            return (
              <TabsTrigger key={category} value={category} className={cn("shrink-0 gap-1.5 text-xs", count === 0 && "opacity-50")}>
                {CategoryIcon && <CategoryIcon className="h-3 w-3" />}
                {CATEGORY_META[category]?.label ?? category}
                <span className="text-muted-foreground">({count})</span>
                {hasHigh && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 rounded-lg border p-4">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : insights.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed bg-muted/10 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h2 className="text-base font-semibold text-foreground">{t("noInsights")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("noInsightsDesc")}</p>
              <Button className="mt-5 gap-1.5" size="sm" onClick={handleGenerate} disabled={generating}>
                <Sparkles className="h-4 w-4" />
                {generating ? t("generating") : t("generate")}
              </Button>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {insights.map((insight) => (
                <div key={insight.id}>
                  <InsightCompactRow
                    insight={insight}
                    categoryMeta={CATEGORY_META}
                    onClick={() => handleCardClick(insight)}
                  />
                  {expandedId === insight.id && (
                    <div className="border-t bg-muted/5 px-4 py-5 sm:px-6">
                      <InsightExpanded insight={insight} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Mobile full-screen dialog */}
      <Dialog open={!!mobileInsight} onOpenChange={(open) => !open && setMobileInsight(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {mobileInsight && <InsightExpanded insight={mobileInsight} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
