import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MacWindow } from "@/components/ui/MacWindow";
import {
  Megaphone, Sparkles, BarChart3, Eye, Layers, Target, ArrowRight, CheckCircle2,
} from "lucide-react";

// Architecture note: useMetaAds hook, edge functions (fetch-meta-ads, analyze-meta-ad),
// and DB tables (meta_ads, meta_ad_analyses) are fully intact and ready for activation.
// When the Meta Ad Library API is available, simply remove the coming-soon guard below
// and re-enable the fetch/analyze flows.

export default function MetaAdsPage() {
  const { t } = useTranslation("metaAds");
  const { tier } = useSubscription();
  const navigate = useNavigate();
  const isPremium = tier === "premium";

  return (
    <div className="mx-auto max-w-[900px] space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="page-title">{t("title")}</h1>
          <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 rounded-md">Coming Soon</Badge>
        </div>
        <p className="page-description mt-1">{t("subtitle")}</p>
      </div>

      {/* Hero — What's coming */}
      <MacWindow title="Meta Ads Intelligence · Coming Soon">
        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Megaphone className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Competitor ad tracking is coming
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            We're building deep integration with the Meta Ad Library to let you monitor competitor
            paid campaigns across Facebook and Instagram — with AI-powered creative analysis.
          </p>

          {/* Feature list */}
          <div className="mx-auto mt-8 grid max-w-lg gap-4 text-left sm:grid-cols-2">
            <FeatureItem icon={Eye} title="Track competitor ads" desc="See active creatives, copy, and CTAs across Facebook and Instagram" />
            <FeatureItem icon={Sparkles} title="AI creative analysis" desc="Automated analysis of messaging angles, offer tactics, and urgency patterns" />
            <FeatureItem icon={BarChart3} title="Spend monitoring" desc="Estimated spend ranges, impression data, and audience sizing" />
            <FeatureItem icon={Layers} title="Side-by-side comparison" desc="Compare your ads against competitor creatives in one view" />
          </div>

          {/* CTA */}
          <div className="mt-8">
            {isPremium ? (
              <p className="text-sm text-muted-foreground">
                You're on Premium — you'll get early access when this launches.
              </p>
            ) : (
              <Button className="gap-2" onClick={() => navigate("/settings/billing")}>
                Upgrade to Premium for early access
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </MacWindow>

      {/* How it will work */}
      <MacWindow title="How it will work">
        <div className="space-y-0 divide-y">
          <StepRow number={1} title="Connect your Meta account" desc="Link your Meta Business account to start tracking competitor ad pages." />
          <StepRow number={2} title="Select competitors to track" desc="Choose which competitor Facebook/Instagram pages to monitor. We'll pull their active ads daily." />
          <StepRow number={3} title="AI analyzes every creative" desc="Each ad gets analyzed for messaging strategy, offer mechanics, urgency tactics, and audience targeting." />
          <StepRow number={4} title="Get actionable intelligence" desc="See trends, compare creatives side-by-side, and get recommendations for your own paid strategy." />
        </div>
      </MacWindow>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function StepRow({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 px-6 py-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
