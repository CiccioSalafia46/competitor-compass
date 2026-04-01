import { useState } from "react";
import { MetaAdCard } from "@/components/meta-ads/MetaAdCard";
import { AdAnalysisPanel } from "@/components/meta-ads/AdAnalysisPanel";
import { EstimatedMetric } from "@/components/meta-ads/EstimatedMetric";
import { DEMO_META_ADS } from "@/lib/demo-meta-ads";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Megaphone, Eye, Sparkles, Clock, Zap, ArrowRight, Info, Beaker,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

// Architecture note: useMetaAds hook, edge functions (fetch-meta-ads, analyze-meta-ad),
// and DB tables (meta_ads, meta_ad_analyses) are fully intact and ready for activation.
// When the Meta Ad Library API is available, simply remove the demo guard below
// and re-enable the fetch/analyze flows.

export default function MetaAdsPage() {
  const { tier } = useSubscription();
  const navigate = useNavigate();
  const isUnlocked = tier === "premium";

  const [selectedDemoAd, setSelectedDemoAd] = useState<string | null>(null);
  const selectedAdData = DEMO_META_ADS.find((a) => a.id === selectedDemoAd);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Meta Ads Intelligence
            <Badge variant="outline" className="text-[10px] gap-1 font-normal ml-1">
              <Beaker className="h-2.5 w-2.5" /> Beta · Coming Soon
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor competitor paid media across Facebook and Instagram
          </p>
        </div>
      </div>

      {/* Beta Notice */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Meta Ads Intelligence is in beta
            </p>
            <p className="text-sm text-muted-foreground">
              We're finalizing the Meta Ad Library integration. Below you can preview the experience
              with sample data. When the integration is live, you'll be able to track real competitor
              ads, analyze messaging strategies, and monitor spend patterns automatically.
            </p>
            {!isUnlocked && (
              <p className="text-xs text-muted-foreground mt-2">
                This feature will be available on the <strong>Premium plan</strong> when launched.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Premium upgrade CTA for non-premium users */}
      {!isUnlocked && (
        <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-3">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Get early access to Meta Ads Intelligence
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-1">
              Premium users will be the first to access real ad tracking and AI analysis
              when this feature launches.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground mb-4">
              {["Ad creative analysis", "Spend monitoring", "Messaging patterns", "Competitive benchmarks"].map((f) => (
                <span key={f} className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> {f}
                </span>
              ))}
            </div>
            <Button className="gap-2" onClick={() => navigate("/settings/billing")}>
              <Zap className="h-4 w-4" /> Upgrade to Premium
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Demo Data Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Sample Ads Preview</h3>
          <Badge variant="secondary" className="text-[9px] gap-1">
            <Clock className="h-2 w-2" /> Demo Data
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_META_ADS.map((ad) => (
            <MetaAdCard
              key={ad.id}
              ad={ad as any}
              isDemo
              onSelect={(id) => setSelectedDemoAd(id)}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground italic">
          These are sample ads for preview purposes only. No real data is being fetched or displayed.
        </p>
      </div>

      {/* What you'll get section */}
      <Card className="border">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">When Meta Ads Intelligence launches, you'll be able to:</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { title: "Track competitor ads", desc: "Automatically import ads from Meta Ad Library" },
              { title: "AI-powered analysis", desc: "Analyze messaging angles, offers, and urgency patterns" },
              { title: "Spend monitoring", desc: "Track estimated spend ranges across competitors" },
              { title: "Side-by-side comparison", desc: "Compare ad strategies between competitors" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Demo Ad Detail Sheet */}
      <Sheet open={!!selectedDemoAd} onOpenChange={(open) => !open && setSelectedDemoAd(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Ad Details
              <Badge variant="secondary" className="text-[9px]">Demo</Badge>
            </SheetTitle>
          </SheetHeader>
          {selectedAdData && (
            <div className="space-y-4 mt-4">
              <div className="space-y-1">
                <p className="text-lg font-medium text-foreground">{selectedAdData.page_name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedAdData.is_active ? (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                  {(selectedAdData.publisher_platforms || []).map((p) => (
                    <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Ad Copy</h4>
                {selectedAdData.ad_creative_link_titles?.map((t, i) => (
                  <p key={i} className="text-sm font-semibold">{t}</p>
                ))}
                {selectedAdData.ad_creative_bodies?.map((b, i) => (
                  <p key={i} className="text-sm text-muted-foreground whitespace-pre-wrap">{b}</p>
                ))}
                {selectedAdData.ad_creative_link_descriptions?.map((d, i) => (
                  <p key={i} className="text-xs text-muted-foreground italic">{d}</p>
                ))}
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Observed Data</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">First seen</span>
                    <p className="font-medium">{selectedAdData.first_seen_at ? new Date(selectedAdData.first_seen_at).toLocaleDateString() : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last seen</span>
                    <p className="font-medium">{selectedAdData.last_seen_at ? new Date(selectedAdData.last_seen_at).toLocaleDateString() : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CTA</span>
                    <p className="font-medium">{selectedAdData.cta_type?.replace(/_/g, " ") || "None"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Media</span>
                    <p className="font-medium capitalize">{selectedAdData.media_type || "Unknown"}</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  Estimated Metrics
                  <Badge variant="outline" className="text-[10px]">Sample Ranges</Badge>
                </h4>
                <EstimatedMetric label="Spend" range={selectedAdData.spend_range} prefix="$" />
                <EstimatedMetric label="Impressions" range={selectedAdData.impressions_range} />
                <EstimatedMetric label="Audience Size" range={selectedAdData.estimated_audience_size} />
              </div>
              <Separator />
              <div className="p-3 rounded-lg bg-muted/50 border text-center">
                <p className="text-xs text-muted-foreground">
                  AI analysis will be available when the Meta Ads integration launches.
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
