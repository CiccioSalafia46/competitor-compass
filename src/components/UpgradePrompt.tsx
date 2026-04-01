import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Lock, Zap, TrendingUp, Users, Newspaper, Sparkles } from "lucide-react";
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

const REASON_CONFIG: Record<string, { icon: any; title: string; desc: string; plan: string }> = {
  competitor_limit: {
    icon: Users,
    title: "Competitor limit reached",
    desc: "Upgrade to track more competitors and get deeper intelligence.",
    plan: "Starter",
  },
  newsletter_limit: {
    icon: Newspaper,
    title: "Newsletter limit reached",
    desc: "You've hit your monthly newsletter import limit. Upgrade for more capacity.",
    plan: "Starter",
  },
  analysis_limit: {
    icon: Sparkles,
    title: "AI analysis limit reached",
    desc: "Unlock more AI analyses to extract deeper competitive insights.",
    plan: "Starter",
  },
  seat_limit: {
    icon: Users,
    title: "Team seat limit reached",
    desc: "Invite more team members by upgrading your plan.",
    plan: "Starter",
  },
  feature_locked: {
    icon: Lock,
    title: "Premium feature",
    desc: "This feature is available on paid plans.",
    plan: "Starter",
  },
};

const UpgradePrompt = memo(function UpgradePrompt({
  reason,
  message,
  variant = "card",
  className,
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const { tier } = useSubscription();

  // Don't show upgrade prompts to premium users
  if (tier === "premium") return null;

  const config = REASON_CONFIG[reason] || REASON_CONFIG.feature_locked;
  const Icon = config.icon;
  const displayDesc = message || config.desc;
  const suggestedPlan = tier === "free" ? "Starter" : "Premium";

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
          <p className="text-sm font-medium text-foreground">{config.title}</p>
          <p className="text-xs text-muted-foreground">{displayDesc}</p>
        </div>
        <Button
          size="sm"
          className="shrink-0 gap-1.5 text-xs h-7"
          onClick={() => navigate("/settings/billing")}
        >
          Upgrade <ArrowRight className="h-3 w-3" />
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
        <h3 className="text-sm font-semibold text-foreground mb-1">{config.title}</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">{displayDesc}</p>
        <Button size="sm" className="gap-1.5" onClick={() => navigate("/settings/billing")}>
          Upgrade to {suggestedPlan} <ArrowRight className="h-3 w-3" />
        </Button>
        <p className="text-[10px] text-muted-foreground mt-2">
          {tier === "free" ? "Starting at $29/mo" : "Starting at $99/mo"}
        </p>
      </CardContent>
    </Card>
  );
});

export default UpgradePrompt;
