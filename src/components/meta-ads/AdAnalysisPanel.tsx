import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MetaAdAnalysis } from "@/hooks/useMetaAds";
import { Target, Megaphone, Lightbulb, Users, ArrowDownToLine, Palette, Tag, AlertTriangle } from "lucide-react";

interface AdAnalysisPanelProps {
  analysis: MetaAdAnalysis;
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";
  return <Badge variant="outline" className={`text-[10px] ${color}`}>{pct}% confidence</Badge>;
}

export function AdAnalysisPanel({ analysis }: AdAnalysisPanelProps) {
  const fields = [
    { icon: Target, label: "Message Angle", value: analysis.message_angle },
    { icon: Megaphone, label: "Offer Angle", value: analysis.offer_angle },
    { icon: AlertTriangle, label: "Urgency Style", value: analysis.urgency_style },
    { icon: ArrowDownToLine, label: "Funnel Intent", value: analysis.funnel_intent },
    { icon: Palette, label: "Creative Pattern", value: analysis.creative_pattern },
    { icon: Tag, label: "Product Category", value: analysis.product_category },
  ];

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            AI Analysis
          </CardTitle>
          <ConfidenceBadge value={analysis.overall_confidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Key Fields */}
        <div className="grid grid-cols-2 gap-2">
          {fields.map(({ icon: Icon, label, value }) => (
            value && (
              <div key={label} className="space-y-0.5">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            )
          ))}
        </div>

        {/* Promo Language */}
        {analysis.promo_language && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Promo Language</span>
            <p className="text-sm bg-muted/50 rounded-md p-2 italic">"{analysis.promo_language}"</p>
          </div>
        )}

        {/* Audience Clues */}
        {analysis.audience_clues?.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              Audience Clues
            </div>
            <div className="flex flex-wrap gap-1">
              {analysis.audience_clues.map((clue, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{clue}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Strategy Takeaways */}
        {analysis.strategy_takeaways?.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Strategy Takeaways</span>
            <ul className="space-y-1">
              {analysis.strategy_takeaways.map((t, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">→</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
          Analyzed by {analysis.model_used || "AI"} · {new Date(analysis.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
