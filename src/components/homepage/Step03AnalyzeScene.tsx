import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AI_SIGNALS } from "./howItWorksData";

interface Step03AnalyzeSceneProps {
  progress: number;
  active: boolean;
}

export default function Step03AnalyzeScene({ progress, active }: Step03AnalyzeSceneProps) {
  const [visibleSignals, setVisibleSignals] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [thinking, setThinking] = useState(true);

  useEffect(() => {
    if (!active) { setVisibleSignals(0); setShowSummary(false); setThinking(true); return; }

    // Signals appear progressively 0-0.8
    const signalCount = Math.floor(progress * AI_SIGNALS.length / 0.75);
    setVisibleSignals(Math.min(signalCount, AI_SIGNALS.length));

    // Thinking disappears at 0.7, summary at 0.8
    setThinking(progress < 0.7);
    setShowSummary(progress > 0.8);
  }, [progress, active]);

  return (
    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col">
      {/* Thinking indicator */}
      <div className={cn(
        "flex items-center gap-2 mb-2 transition-opacity duration-300",
        thinking && active ? "opacity-100" : "opacity-0",
      )}>
        <div className="flex gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-[10px] text-muted-foreground/50">AI analyzing…</span>
      </div>

      {/* Signal cards flow */}
      <div className="flex-1 overflow-hidden relative">
        <div className="flex flex-col gap-1.5">
          {AI_SIGNALS.slice(0, visibleSignals).map((signal, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-border/30 bg-card/80 px-2.5 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Tag */}
              <span className={cn("text-[8px] font-semibold px-1.5 py-0.5 rounded", signal.color)}>
                {signal.tag}
              </span>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-foreground/80 truncate">{signal.text}</p>
                <p className="text-[8px] text-muted-foreground/40">{signal.competitor}</p>
              </div>
              {/* AI indicator */}
              <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary/40 shrink-0">
                <path d="M6 1l1.5 3h3l-2.5 2 1 3L6 7.5 3 9l1-3-2.5-2h3z" fill="currentColor" />
              </svg>
            </div>
          ))}
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
      </div>

      {/* Summary */}
      <div className={cn(
        "flex items-center gap-3 mt-2 pt-2 border-t border-border/30 transition-all duration-300",
        showSummary ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}>
        <div className="flex-1">
          <p className="text-[10px] font-medium text-foreground/70">147 signals extracted · 12 actionable</p>
        </div>
        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary/60 rounded-full w-full" />
        </div>
      </div>
    </div>
  );
}
