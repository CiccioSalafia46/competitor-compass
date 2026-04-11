import { useState } from "react";
import DOMPurify from "dompurify";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("metaAds");
  const { tier } = useSubscription();
  const navigate = useNavigate();
  const isUnlocked = tier === "premium";

  const [selectedDemoAd, setSelectedDemoAd] = useState<string | null>(null);
  const selectedAdData = DEMO_META_ADS.find((a) => a.id === selectedDemoAd);

  const upgradeFeatures = [
    t("upgradeCard.features.adCreativeAnalysis"),
    t("upgradeCard.features.spendMonitoring"),
    t("upgradeCard.features.messagingPatterns"),
    t("upgradeCard.features.competitiveBenchmarks"),
  ];

  const featureItems = [
    { titleKey: "featureList.trackAds.title", descKey: "featureList.trackAds.desc" },
    { titleKey: "featureList.aiAnalysis.title", descKey: "featureList.aiAnalysis.desc" },
    { titleKey: "featureList.spendMonitoring.title", descKey: "featureList.spendMonitoring.desc" },
    { titleKey: "featureList.sideComparison.title", descKey: "featureList.sideComparison.desc" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            {t("title")}
            <Badge variant="outline" className="text-[10px] gap-1 font-normal ml-1">
              <Beaker className="h-2.5 w-2.5" /> {t("titleBadge")}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Beta Notice */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {t("betaNotice.title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("betaNotice.description")}
            </p>
            {!isUnlocked && (
              <p
                className="text-xs text-muted-foreground mt-2"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t("betaNotice.premiumNote"), { ALLOWED_TAGS: ["strong", "em", "b", "a"], ALLOWED_ATTR: ["href"] }) }}
              />
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
              {t("upgradeCard.title")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-1">
              {t("upgradeCard.description")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground mb-4">
              {upgradeFeatures.map((f) => (
                <span key={f} className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> {f}
                </span>
              ))}
            </div>
            <Button className="gap-2" onClick={() => navigate("/settings/billing")}>
              <Zap className="h-4 w-4" /> {t("upgradeCard.upgradeButton")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Demo Data Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">{t("samplePreview.title")}</h3>
          <Badge variant="secondary" className="text-[9px] gap-1">
            <Clock className="h-2 w-2" /> {t("samplePreview.badge")}
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_META_ADS.map((ad) => (
            <MetaAdCard
              key={ad.id}
              ad={ad}
              isDemo
              onSelect={(id) => setSelectedDemoAd(id)}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground italic">
          {t("samplePreview.disclaimer")}
        </p>
      </div>

      {/* What you'll get section */}
      <Card className="border">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">{t("featureList.title")}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {featureItems.map((item) => (
              <div key={item.titleKey} className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{t(item.titleKey)}</p>
                  <p className="text-xs text-muted-foreground">{t(item.descKey)}</p>
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
              <Eye className="h-4 w-4" /> {t("adDetail.title")}
              <Badge variant="secondary" className="text-[9px]">{t("adDetail.demoBadge")}</Badge>
            </SheetTitle>
          </SheetHeader>
          {selectedAdData && (
            <div className="space-y-4 mt-4">
              <div className="space-y-1">
                <p className="text-lg font-medium text-foreground">{selectedAdData.page_name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedAdData.is_active ? (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">{t("status.active")}</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">{t("status.inactive")}</Badge>
                  )}
                  {(selectedAdData.publisher_platforms || []).map((p) => (
                    <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">{t("adDetail.adCopy")}</h4>
                {selectedAdData.ad_creative_link_titles?.map((title, i) => (
                  <p key={i} className="text-sm font-semibold">{title}</p>
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
                <h4 className="text-sm font-medium text-foreground">{t("adDetail.observedData")}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("adDetail.firstSeen")}</span>
                    <p className="font-medium">{selectedAdData.first_seen_at ? new Date(selectedAdData.first_seen_at).toLocaleDateString() : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("adDetail.lastSeen")}</span>
                    <p className="font-medium">{selectedAdData.last_seen_at ? new Date(selectedAdData.last_seen_at).toLocaleDateString() : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("adDetail.cta")}</span>
                    <p className="font-medium">{selectedAdData.cta_type?.replace(/_/g, " ") || "None"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("adDetail.media")}</span>
                    <p className="font-medium capitalize">{selectedAdData.media_type || "Unknown"}</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  {t("adDetail.estimatedMetrics")}
                  <Badge variant="outline" className="text-[10px]">{t("adDetail.sampleRanges")}</Badge>
                </h4>
                <EstimatedMetric label={t("adDetail.spend")} range={selectedAdData.spend_range} prefix="$" />
                <EstimatedMetric label={t("adDetail.impressions")} range={selectedAdData.impressions_range} />
                <EstimatedMetric label={t("adDetail.audienceSize")} range={selectedAdData.estimated_audience_size} />
              </div>
              <Separator />
              <div className="p-3 rounded-lg bg-muted/50 border text-center">
                <p className="text-xs text-muted-foreground">
                  {t("adDetail.aiAnalysisNote")}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
