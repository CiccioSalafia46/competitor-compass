import { useState } from "react";
import { useInsights, INSIGHT_CATEGORIES, type InsightCategory } from "@/hooks/useInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, RefreshCw, ChevronDown, ChevronUp, Target, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pricing: { label: "Pricing", icon: Target, color: "text-primary" },
  promotions: { label: "Promotions", icon: TrendingUp, color: "text-success" },
  email_strategy: { label: "Email Strategy", icon: Lightbulb, color: "text-warning" },
  paid_ads: { label: "Paid Ads", icon: Sparkles, color: "text-accent-foreground" },
  product_focus: { label: "Product Focus", icon: Target, color: "text-primary" },
  seasonal_strategy: { label: "Seasonal", icon: AlertTriangle, color: "text-destructive" },
  messaging_positioning: { label: "Messaging", icon: Lightbulb, color: "text-warning" },
  cadence_frequency: { label: "Cadence", icon: TrendingUp, color: "text-success" },
};

function InsightCard({ insight }: { insight: any }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[insight.category] || CATEGORY_META.pricing;
  const Icon = meta.icon;

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 rounded-md p-1.5 bg-muted", meta.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
              <Badge variant="outline" className="text-[10px] capitalize">{meta.label}</Badge>
              {insight.confidence != null && (
                <Badge variant={insight.confidence >= 0.7 ? "default" : "secondary"} className="text-[10px]">
                  {Math.round(insight.confidence * 100)}% confidence
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {insight.what_is_happening}
            </p>

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Less detail" : "Full analysis"}
            </button>

            {expanded && (
              <div className="mt-3 space-y-3 border-t pt-3">
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Why it matters</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{insight.why_it_matters}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Strategic implication</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{insight.strategic_implication}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Recommended response</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{insight.recommended_response}</p>
                </div>
                {insight.affected_competitors?.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">Competitors:</span>
                    {insight.affected_competitors.map((c: string) => (
                      <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                  Source: {insight.source_type} • {new Date(insight.created_at).toLocaleDateString()}
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
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Strategic Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-generated competitive intelligence analysis</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateInsights(categoryFilter)}
            disabled={generating}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", generating && "animate-spin")} />
            {generating ? "Analyzing…" : "Generate Insights"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          {INSIGHT_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs capitalize">
              {CATEGORY_META[cat]?.label || cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : insights.length === 0 ? (
            <Card className="border">
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No insights generated yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Import newsletters or ads first, then click "Generate Insights."
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => generateInsights(categoryFilter)}
                  disabled={generating}
                >
                  {generating ? "Analyzing…" : "Generate Now"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
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
