import { useState } from "react";
import { useInsights, INSIGHT_CATEGORIES } from "@/hooks/useInsights";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, RefreshCw, ChevronDown, ChevronUp, Target, TrendingUp, AlertTriangle, Sparkles, Megaphone, Mail, Calendar, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType }> = {
  pricing: { label: "Pricing", icon: Target },
  promotions: { label: "Promotions", icon: TrendingUp },
  email_strategy: { label: "Email Strategy", icon: Mail },
  paid_ads: { label: "Paid Ads", icon: Megaphone },
  product_focus: { label: "Product Focus", icon: Layers },
  seasonal_strategy: { label: "Seasonal", icon: Calendar },
  messaging_positioning: { label: "Messaging", icon: Lightbulb },
  cadence_frequency: { label: "Cadence", icon: AlertTriangle },
};

function InsightCard({ insight }: { insight: any }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[insight.category] || CATEGORY_META.pricing;
  const Icon = meta.icon;

  return (
    <Card className="border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md p-1.5 bg-accent text-accent-foreground shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
              <Badge variant="outline" className="text-[9px] capitalize">{meta.label}</Badge>
              {insight.confidence != null && (
                <Badge
                  variant={insight.confidence >= 0.7 ? "default" : "secondary"}
                  className="text-[9px]"
                >
                  {Math.round(insight.confidence * 100)}%
                </Badge>
              )}
            </div>

            <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
              {insight.what_is_happening}
            </p>

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-2 font-medium"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Less detail" : "Full analysis"}
            </button>

            {expanded && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {[
                  { label: "Why it matters", text: insight.why_it_matters },
                  { label: "Strategic implication", text: insight.strategic_implication },
                  { label: "Recommended response", text: insight.recommended_response },
                ].map((section) => (
                  <div key={section.label}>
                    <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider mb-0.5">{section.label}</p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{section.text}</p>
                  </div>
                ))}
                {insight.affected_competitors?.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">Competitors:</span>
                    {insight.affected_competitors.map((c: string) => (
                      <Badge key={c} variant="outline" className="text-[9px]">{c}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  Source: {insight.source_type} · {new Date(insight.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Insights() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const categoryFilter = activeTab === "all" ? undefined : activeTab;
  const { insights, loading, generating, generateInsights } = useInsights(categoryFilter);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 animate-fade-in max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Strategic Insights</h1>
          <p className="page-description">AI-generated competitive intelligence analysis</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => generateInsights(categoryFilter)}
          disabled={generating}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
          {generating ? "Analyzing…" : "Generate Insights"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-0.5 bg-muted/50 p-0.5">
          <TabsTrigger value="all" className="text-[11px] h-7">All</TabsTrigger>
          {INSIGHT_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-[11px] h-7 capitalize">
              {CATEGORY_META[cat]?.label || cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border"><CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          ) : insights.length === 0 ? (
            <Card className="border-dashed border-2 bg-accent/20">
              <CardContent className="py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-4">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-base font-semibold text-foreground mb-1">No insights yet</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-1">
                  AI insights are generated from your newsletter and ad data.
                </p>
                <p className="text-xs text-muted-foreground/70 mb-5">
                  Import some newsletters first, then generate insights to discover what your competitors are doing.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => generateInsights(categoryFilter)}
                    disabled={generating}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {generating ? "Analyzing…" : "Generate Insights"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
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
