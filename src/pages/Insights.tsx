import { memo, useMemo, useState, type ElementType } from "react";
import { useInsights, INSIGHT_CATEGORIES, type Insight, type InsightEvidence } from "@/hooks/useInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  INSIGHT_IMPACT_LABELS,
  INSIGHT_PRIORITY_LABELS,
  parseRecommendedResponseSections,
  type InsightPriorityLevel,
} from "@/lib/insight-priority";

const CATEGORY_META: Record<string, { label: string; icon: ElementType }> = {
  pricing: { label: "Pricing", icon: Target },
  promotions: { label: "Promotions", icon: TrendingUp },
  email_strategy: { label: "Email Strategy", icon: Mail },
  paid_ads: { label: "Paid Ads", icon: Megaphone },
  product_focus: { label: "Product Focus", icon: Layers },
  seasonal_strategy: { label: "Seasonal", icon: Calendar },
  messaging_positioning: { label: "Messaging", icon: Lightbulb },
  cadence_frequency: { label: "Cadence", icon: AlertTriangle },
};

function formatConfidence(confidence: number | null) {
  if (confidence == null) return "Unknown";
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.7) return "Medium";
  return "Watch";
}

function formatSourceLabel(sourceType: string) {
  if (sourceType === "cross_channel") return "Cross-channel";
  if (sourceType === "meta_ad") return "Meta ads";
  return "Newsletter";
}

function formatOfferSummary(insight: Insight) {
  const segments: string[] = [];

  if (typeof insight.offer_discount_percentage === "number") {
    segments.push(`${insight.offer_discount_percentage}% discount`);
  }

  if (insight.offer_coupon_code) {
    segments.push(`Coupon: ${insight.offer_coupon_code}`);
  }

  if (insight.offer_urgency.length > 0) {
    segments.push(`Urgency: ${insight.offer_urgency.join(", ")}`);
  }

  return segments.length > 0 ? segments.join(" | ") : "No explicit offer mechanics detected";
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ElementType;
}) {
  return (
    <Card className="border bg-card/70">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceItemView({ evidence }: { evidence: InsightEvidence }) {
  return (
    <div className="rounded-xl border bg-muted/25 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">{evidence.label}</p>
        {evidence.metric ? <Badge variant="secondary">{evidence.metric}</Badge> : null}
        {evidence.source ? (
          <Badge variant="outline" className="capitalize">
            {evidence.source.replaceAll("_", " ")}
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{evidence.detail}</p>
      {(evidence.competitor || evidence.timeframe) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {[evidence.competitor, evidence.timeframe].filter(Boolean).join(" | ")}
        </p>
      )}
    </div>
  );
}

const InsightCard = memo(function InsightCard({ insight }: { insight: Insight }) {
  const meta = CATEGORY_META[insight.category] || CATEGORY_META.pricing;
  const Icon = meta.icon;
  const confidenceValue = insight.confidence != null ? `${Math.round(insight.confidence * 100)}%` : "N/A";
  const responseSections = parseRecommendedResponseSections(insight.recommended_response);
  const priorityTone: Record<InsightPriorityLevel, string> = {
    high: "border-destructive/20 bg-destructive/10 text-destructive",
    medium: "border-warning/20 bg-warning/10 text-warning",
    low: "border-primary/20 bg-primary/10 text-primary",
  };

  return (
    <Card className="border bg-card/80 shadow-sm transition-colors hover:border-primary/25">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {meta.label}
                </Badge>
                <Badge variant="outline" className={cn("capitalize", priorityTone[insight.priority_level])}>
                  {INSIGHT_PRIORITY_LABELS[insight.priority_level]}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {insight.campaign_type}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {INSIGHT_IMPACT_LABELS[insight.impact_area]}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="cursor-default">{formatConfidence(insight.confidence)}</Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      <p className="font-semibold mb-1">Confidence score</p>
                      <p><span className="font-medium">High</span> ≥ 85% — strong signal, multiple corroborating sources</p>
                      <p><span className="font-medium">Medium</span> 70–84% — probable, limited corroboration</p>
                      <p><span className="font-medium">Watch</span> &lt; 70% — weak signal, treat as directional only</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardTitle className="text-xl leading-tight">{insight.title}</CardTitle>
              <p className="text-sm font-medium text-foreground/80">Main message: {insight.main_message}</p>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{insight.what_is_happening}</p>
            </div>
          </div>

          <div className="grid min-w-[220px] grid-cols-2 gap-3 lg:w-[260px]">
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Confidence</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{confidenceValue}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Evidence</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{insight.supporting_evidence.length}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Impact</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{INSIGHT_IMPACT_LABELS[insight.impact_area]}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Source</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatSourceLabel(insight.source_type)}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-0">
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Why it matters</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.why_it_matters}</p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Strategic implication</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.strategic_implication}</p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Recommended response</p>
            {responseSections ? (
              <div className="mt-2 space-y-3 text-sm leading-6 text-muted-foreground">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">Immediate</p>
                  <p>{responseSections.immediate || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">Next 30 days</p>
                  <p>{responseSections.next30Days || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">Measure</p>
                  <p>{responseSections.measure || "Not specified"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {insight.recommended_response}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Offers</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{formatOfferSummary(insight)}</p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">CTA analysis</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.cta_analysis}</p>
            {insight.cta_primary ? (
              <Badge variant="outline" className="mt-3">
                Primary CTA: {insight.cta_primary}
              </Badge>
            ) : null}
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Positioning angle</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.positioning_angle}</p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Strategic takeaway</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.strategic_takeaway}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border bg-muted/10 p-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Product categories</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {insight.product_categories.map((category) => (
                <Badge key={`${insight.id}-${category}`} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
          <div className="md:max-w-xs">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Campaign type</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.campaign_type}</p>
          </div>
        </div>

        {insight.supporting_evidence.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Supporting evidence</p>
              <p className="text-xs text-muted-foreground">
                {insight.supporting_evidence.length} data point{insight.supporting_evidence.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {insight.supporting_evidence.map((evidence, index) => (
                <EvidenceItemView key={`${insight.id}-evidence-${index}`} evidence={evidence} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {insight.affected_competitors.length > 0 ? (
              <>
                <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Competitors</span>
                {insight.affected_competitors.map((competitor) => (
                  <Badge key={`${insight.id}-${competitor}`} variant="outline">
                    {competitor}
                  </Badge>
                ))}
              </>
            ) : (
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">No competitor labels attached</span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Generated {new Date(insight.created_at).toLocaleString()} | {formatSourceLabel(insight.source_type)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

export default function Insights() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const categoryFilter = activeTab === "all" ? undefined : activeTab;
  const { insights, loading, generating, generateInsights } = useInsights(categoryFilter, { limit: 36 });

  const evidenceCount = insights.reduce((total, insight) => total + insight.supporting_evidence.length, 0);
  const competitorCount = new Set(insights.flatMap((insight) => insight.affected_competitors)).size;
  const confidenceValues = insights
    .map((insight) => insight.confidence)
    .filter((value): value is number => typeof value === "number");
  const averageConfidence =
    confidenceValues.length > 0
      ? `${Math.round((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) * 100)}%`
      : "N/A";
  const priorityCounts = useMemo(
    () => ({
      high: insights.filter((insight) => insight.priority_level === "high").length,
      medium: insights.filter((insight) => insight.priority_level === "medium").length,
      low: insights.filter((insight) => insight.priority_level === "low").length,
    }),
    [insights],
  );
  const impactCounts = useMemo(
    () => ({
      conversion: insights.filter((insight) => insight.impact_area === "conversion").length,
      traffic: insights.filter((insight) => insight.impact_area === "traffic").length,
      branding: insights.filter((insight) => insight.impact_area === "branding").length,
    }),
    [insights],
  );

  return (
    <div className="max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Competitor Insights</h1>
          <p className="page-description">
            Dense, evidence-backed competitive analysis generated from newsletters, promotions, pricing signals and
            paid ads.
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="gap-1.5"
          onClick={() => generateInsights(categoryFilter)}
          disabled={generating}
        >
          <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
          {generating ? "Generating..." : "Generate Insights"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Signals" value={String(insights.length)} detail="Current insight briefs available" icon={Sparkles} />
        <SummaryCard
          title="High Priority"
          value={String(priorityCounts.high)}
          detail={`${priorityCounts.medium} medium, ${priorityCounts.low} low-priority briefs`}
          icon={Target}
        />
        <SummaryCard
          title="Evidence"
          value={String(evidenceCount)}
          detail="Supporting data points attached to insights"
          icon={BarChart3}
        />
        <SummaryCard
          title="Coverage"
          value={String(competitorCount)}
          detail={`${impactCounts.conversion} conversion | ${impactCounts.traffic} traffic | ${impactCounts.branding} branding | ${averageConfidence} avg confidence`}
          icon={Layers}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="all">All</TabsTrigger>
          {INSIGHT_CATEGORIES.map((category) => (
            <TabsTrigger key={category} value={category}>
              {CATEGORY_META[category]?.label ?? category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="space-y-4 p-6">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-8 w-2/3" />
                    <Skeleton className="h-20 w-full" />
                    <div className="grid gap-3 md:grid-cols-3">
                      <Skeleton className="h-28 w-full" />
                      <Skeleton className="h-28 w-full" />
                      <Skeleton className="h-28 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : insights.length === 0 ? (
            <Card className="border-2 border-dashed bg-muted/20">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Lightbulb className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">No insights generated yet</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Generate a full analyst pack from your competitor newsletters and ads. The richer your tracked data,
                  the denser and more useful these briefs become.
                </p>
                <Button className="mt-6 gap-1.5" onClick={() => generateInsights(categoryFilter)} disabled={generating}>
                  <Sparkles className="h-4 w-4" />
                  {generating ? "Generating..." : "Generate Insights"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
