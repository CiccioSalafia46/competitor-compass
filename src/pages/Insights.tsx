import { memo, useCallback, useMemo, useState, type ElementType } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { useInsights, INSIGHT_CATEGORIES, type Insight, type InsightEvidence } from "@/hooks/useInsights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Clipboard,
  Layers,
  Lightbulb,
  Mail,
  Megaphone,
  RefreshCw,
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
        "flex w-full items-start gap-3 border-l-[3px] px-4 py-3.5 text-left transition-colors duration-150 hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-ring",
        PRIORITY_BORDER[insight.priority_level],
      )}
      onClick={onClick}
    >
      <div className="mt-0.5 shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("shrink-0 text-[10px] capitalize", PRIORITY_TONE[insight.priority_level])}>
            {INSIGHT_PRIORITY_LABELS[insight.priority_level]}
          </Badge>
          <Badge variant="outline" className="shrink-0 text-[10px] capitalize">{meta.label}</Badge>
        </div>
        <p className="mt-1.5 truncate text-sm font-medium text-foreground">{insight.title}</p>
        {(insight.affected_competitors ?? []).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {insight.affected_competitors.slice(0, 3).map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
            ))}
            {insight.affected_competitors.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{insight.affected_competitors.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="hidden shrink-0 items-end gap-3 text-right sm:flex">
        <div>
          <p className="stat-value text-sm font-semibold text-foreground">{confidencePct}</p>
          <p className="text-[10px] text-muted-foreground">{t("confidence")}</p>
        </div>
        <div>
          <p className="stat-value text-sm font-semibold text-foreground">{insight.supporting_evidence.length}</p>
          <p className="text-[10px] text-muted-foreground">{t("evidence")}</p>
        </div>
      </div>

      <div className="hidden shrink-0 text-right lg:block">
        <p className="text-[10px] text-muted-foreground">{INSIGHT_IMPACT_LABELS[insight.impact_area]}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="mt-0.5 text-[10px] text-muted-foreground/70">{relDate}</p>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{insight.created_at ? new Date(insight.created_at).toLocaleString() : ""}</TooltipContent>
        </Tooltip>
      </div>

      <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
    </button>
  );
});

// ─── Expanded card (detail view) ──────────────────────────────────

function InsightExpanded({ insight, onClose }: { insight: Insight; onClose?: () => void }) {
  const { t } = useTranslation("insights");
  const CATEGORY_META = useCategoryMeta(t);
  const formatSourceLabel = useFormatSourceLabel(t);
  const formatOfferSummary = useFormatOfferSummary(t);
  const meta = CATEGORY_META[insight.category] ?? CATEGORY_META["pricing"];
  const Icon = meta.icon;
  const confidencePct = insight.confidence != null ? `${Math.round(insight.confidence * 100)}%` : "–";
  const responseSections = parseRecommendedResponseSections(insight.recommended_response);
  const relDate = insight.created_at ? formatDistanceToNow(new Date(insight.created_at), { addSuffix: true }) : "";
  const [showMore, setShowMore] = useState(false);

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("text-[10px] capitalize", PRIORITY_TONE[insight.priority_level])}>
              {INSIGHT_PRIORITY_LABELS[insight.priority_level]}
            </Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{meta.label}</Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{insight.campaign_type}</Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{INSIGHT_IMPACT_LABELS[insight.impact_area]}</Badge>
          </div>
          <h2 className="text-lg font-semibold leading-tight text-foreground">{insight.title}</h2>
          <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{insight.what_is_happening}</p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="stat-value text-xl font-semibold text-foreground">{confidencePct}</p>
          <p className="text-[10px] text-muted-foreground">{t("confidence")}</p>
        </div>
      </div>

      {/* Core analysis — 3 columns */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-muted/15 p-3.5">
          <p className="section-label text-foreground">{t("whyItMatters")}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{insight.why_it_matters}</p>
        </div>
        <div className="rounded-lg border bg-muted/15 p-3.5">
          <p className="section-label text-foreground">{t("strategicImplication")}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{insight.strategic_implication}</p>
        </div>
        <div className="rounded-lg border bg-muted/15 p-3.5">
          <p className="section-label text-foreground">{t("recommendedResponse")}</p>
          {responseSections ? (
            <div className="mt-1.5 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Target className="mt-0.5 h-3 w-3 shrink-0 text-foreground" />
                <p><span className="font-medium text-foreground">Immediate:</span> {responseSections.immediate || "—"}</p>
              </div>
              <p><span className="text-foreground">Next 30 days:</span> {responseSections.next30Days || "—"}</p>
              <p className="text-muted-foreground/70"><span className="text-muted-foreground">Measure:</span> {responseSections.measure || "—"}</p>
            </div>
          ) : (
            <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{insight.recommended_response}</p>
          )}
        </div>
      </div>

      {/* Evidence table */}
      {insight.supporting_evidence.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-foreground">
            {t("evidence")} · {insight.supporting_evidence.length} data points
          </p>
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
        </div>
      )}

      {/* More details (offers, CTA, positioning, takeaway) */}
      <button
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setShowMore((v) => !v)}
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", showMore && "rotate-180")} />
        {showMore ? t("lessDetails") : t("moreDetails")}
      </button>

      {showMore && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-muted/10 p-3">
            <p className="section-label text-foreground">{t("offerDetails")}</p>
            <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{formatOfferSummary(insight)}</p>
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <p className="section-label text-foreground">CTA</p>
            <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{insight.cta_analysis}</p>
            {insight.cta_primary && <Badge variant="outline" className="mt-2 text-[10px]">{insight.cta_primary}</Badge>}
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <p className="section-label text-foreground">Positioning</p>
            <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{insight.positioning_angle}</p>
          </div>
          <div className="rounded-lg border bg-muted/10 p-3">
            <p className="section-label text-foreground">{t("strategicTakeaway")}</p>
            <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{insight.strategic_takeaway}</p>
          </div>
        </div>
      )}

      {/* Footer: metadata + actions */}
      <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {insight.affected_competitors.map((c) => (
            <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
          ))}
          <span className="text-[10px] text-muted-foreground/70">
            · {relDate} · {formatSourceLabel(insight.source_type)} · {insight.supporting_evidence.length} sources
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={handleCopy}>
            <Clipboard className="h-3 w-3" /> {t("copyInsight")}
          </Button>
          {/* FIXME: needs backend — mark as actioned, save to playbook, share */}
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

  // Stats for summary line
  const highCount = useMemo(() => insights.filter((i) => i.priority_level === "high").length, [insights]);
  const competitorCount = useMemo(() => new Set(insights.flatMap((i) => i.affected_competitors)).size, [insights]);
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

  // Confirmation for re-generation
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

  // Mobile: open dialog for insight detail
  const handleCardClick = useCallback((insight: Insight) => {
    if (window.innerWidth < 768) {
      setMobileInsight(insight);
    } else {
      setExpandedId((prev) => (prev === insight.id ? null : insight.id));
    }
  }, []);

  return (
    <div className="max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
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

      {/* Executive summary — single line */}
      {!loading && insights.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {insights.length} insights · {highCount} high priority · {competitorCount} competitors
          {avgConfidence != null && ` · ${avgConfidence}% avg confidence`}
        </p>
      )}

      {/* Category tabs with counts */}
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
              <TabsTrigger key={category} value={category} className="shrink-0 gap-1.5 text-xs">
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
                    <div className="border-t bg-muted/5 px-4 py-4 sm:px-6">
                      <InsightExpanded insight={insight} onClose={() => setExpandedId(null)} />
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
