import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Zap, Users, Newspaper, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  /** What triggered this prompt */
  reason: "competitor_limit" | "newsletter_limit" | "analysis_limit" | "seat_limit" | "feature_locked";
  /** Optional custom message */
  message?: string;
  /** Inline = small banner, card = standalone card */
  variant?: "inline" | "card";
  className?: string;
}

const REASON_ICONS: Record<string, LucideIcon> = {
  competitor_limit: Users,
  newsletter_limit: Newspaper,
  analysis_limit: Sparkles,
  seat_limit: Users,
  feature_locked: Lock,
};

const UpgradePrompt = memo(function UpgradePrompt({
  reason,
  message,
  variant = "card",
  className,
}: UpgradePromptProps) {
  const { t } = useTranslation("upgrade");
  const navigate = useNavigate();
  const { tier } = useSubscription();

  // Don't show upgrade prompts to premium users
  if (tier === "premium") return null;

  const validReason = reason in REASON_ICONS ? reason : "feature_locked";
  const Icon = REASON_ICONS[validReason];
  const title = t(`${validReason}.title`);
  const desc = message || t(`${validReason}.desc`);
  const suggestedPlan = tier === "free" ? "Starter" : "Premium";
  const price = tier === "free" ? "29" : "99";

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5",
          className
        )}
      >
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <Button
          size="sm"
          className="shrink-0 gap-1.5 text-xs h-8"
          onClick={() => navigate("/settings/billing")}
        >
          {t("upgrade")} <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn("border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10", className)}>
      <CardContent className="p-5 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-3">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">{desc}</p>
        <Button size="sm" className="gap-1.5" onClick={() => navigate("/settings/billing")}>
          {t("upgradeTo", { plan: suggestedPlan })} <ArrowRight className="h-3 w-3" />
        </Button>
        <p className="text-caption text-muted-foreground mt-2">
          {t("startingAt", { price })}
        </p>
      </CardContent>
    </Card>
  );
});

export default UpgradePrompt;
