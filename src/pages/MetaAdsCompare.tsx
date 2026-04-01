import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Beaker, Info } from "lucide-react";

// Architecture note: The comparison logic (loading competitors, aggregating ad data)
// is preserved in git history and ready to re-enable when real Meta Ads data flows in.

export default function MetaAdsCompare() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          Ad Comparison
          <Badge variant="outline" className="text-[10px] gap-1 font-normal ml-1">
            <Beaker className="h-2.5 w-2.5" /> Beta · Coming Soon
          </Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare competitor ad strategies side by side
        </p>
      </div>

      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Ad Comparison is coming soon
            </p>
            <p className="text-sm text-muted-foreground">
              When Meta Ads Intelligence launches, you'll be able to compare competitor
              ad strategies, CTA patterns, and spend levels side by side. This feature
              requires real ad data from the Meta Ad Library integration.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
