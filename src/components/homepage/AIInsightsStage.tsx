import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { INSIGHTS_DATA } from "./platformData";

interface AIInsightsStageProps { active: boolean }

export default function AIInsightsStage({ active }: AIInsightsStageProps) {
  const [highlightIdx, setHighlightIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setHighlightIdx((i) => (i + 1) % INSIGHTS_DATA.length), 3000);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 text-primary/50">
          <path d="M7 1l1.8 3.6h3.8l-3 2.4 1.2 3.6L7 8.5 3.2 10.6l1.2-3.6-3-2.4h3.8z" fill="currentColor" />
        </svg>
        <span className="text-[10px] font-medium text-muted-foreground/60">AI-generated insights · Updated 4h ago</span>
      </div>

      <div className="flex flex-col gap-2.5 flex-1">
        {INSIGHTS_DATA.map((insight, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg border p-3 transition-all duration-500",
              highlightIdx === i && active
                ? "border-primary/25 bg-primary/[0.03]"
                : "border-border/30 bg-card/40",
            )}
          >
            <div className="flex items-start gap-2">
              <svg viewBox="0 0 12 12" className={cn(
                "w-3 h-3 mt-0.5 shrink-0 transition-colors duration-500",
                highlightIdx === i ? "text-primary" : "text-muted-foreground/30",
              )}>
                <path d="M6 1l1.2 2.4h2.5l-2 1.6.8 2.4L6 5.7 3.5 7.4l.8-2.4-2-1.6h2.5z" fill="currentColor" />
              </svg>
              <div className="flex-1">
                <h4 className="text-[11px] font-semibold text-foreground mb-0.5">{insight.title}</h4>
                <p className="text-[9px] text-muted-foreground/60 leading-relaxed">{insight.desc}</p>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <span className="text-[8px] text-primary/50 font-medium cursor-default">Details →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
