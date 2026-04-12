import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Dashboard banner showing onboarding progress. Dismissable. */
const OnboardingChecklist = memo(function OnboardingChecklist() {
  const { checklist, progress, isComplete, dismiss, dismissed } = useOnboarding();
  const navigate = useNavigate();

  if (dismissed || isComplete) return null;

  const nextIncomplete = checklist.find((c) => !c.done);

  const stepRoutes: Record<string, string> = {
    workspace: "/onboarding",
    competitors: "/competitors",
    gmail: "/settings",
    import: "/inbox",
    insights: "/insights",
  };

  return (
    <Card className="border bg-accent/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Complete your setup</p>
            <p className="text-xs text-muted-foreground mt-0.5">{progress}% complete</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={dismiss} aria-label="Dismiss setup checklist">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Progress value={progress} className="h-1.5 mb-3" />

        <div className="space-y-1">
          {checklist.map((item) => (
            <button
              key={item.key}
              onClick={() => !item.done && navigate(stepRoutes[item.key] || "/onboarding")}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors",
                item.done
                  ? "text-muted-foreground"
                  : "hover:bg-accent cursor-pointer"
              )}
            >
              <div
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border shrink-0 transition-colors",
                  item.done ? "bg-primary border-primary" : "border-muted-foreground/40"
                )}
              >
                {item.done && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
              <span className={cn("text-xs", item.done && "line-through")}>{item.label}</span>
              {!item.done && <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground/50" />}
            </button>
          ))}
        </div>

        {nextIncomplete && (
          <Button
            size="sm"
            className="mt-3 w-full gap-1.5 text-xs"
            onClick={() => navigate(stepRoutes[nextIncomplete.key] || "/onboarding")}
          >
            Continue setup <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

export default OnboardingChecklist;
