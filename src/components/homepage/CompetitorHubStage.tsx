import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { COMPETITOR_CARDS } from "./platformData";

interface CompetitorHubStageProps { active: boolean }

export default function CompetitorHubStage({ active }: CompetitorHubStageProps) {
  const [glowIdx, setGlowIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setGlowIdx((i) => (i + 1) % COMPETITOR_CARDS.length), 2500);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Filters */}
      <div className="flex gap-1.5 mb-3">
        {["All", "Direct", "Adjacent", "Watchlist"].map((f, i) => (
          <span key={f} className={cn(
            "text-[9px] px-2 py-0.5 rounded-full border transition-colors",
            i === 0 ? "bg-primary/[0.08] border-primary/25 text-primary font-medium" : "border-border/40 text-muted-foreground/50",
          )}>{f}</span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
        {COMPETITOR_CARDS.map((c, i) => (
          <div
            key={c.name}
            className={cn(
              "rounded-lg border p-2.5 transition-all duration-500",
              glowIdx === i && active
                ? "border-primary/30 bg-primary/[0.04] shadow-sm shadow-primary/5"
                : "border-border/40 bg-card/40",
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary/70">
                {c.letter}
              </div>
              <span className="text-[10px] font-medium text-foreground truncate">{c.name}</span>
            </div>
            {/* Trend line */}
            <svg viewBox="0 0 50 16" className="w-full h-3 mb-1">
              <polyline
                points={c.trend === "up" ? "0,14 12,10 25,11 37,6 50,3" : c.trend === "down" ? "0,3 12,6 25,8 37,11 50,14" : "0,8 12,9 25,7 37,8 50,8"}
                fill="none"
                stroke={c.trend === "up" ? "hsl(var(--primary))" : c.trend === "down" ? "hsl(0 84% 60%)" : "hsl(var(--muted-foreground))"}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.5"
              />
            </svg>
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-muted-foreground/50">{c.signals} signals</span>
              <span className="text-[7px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground/40">{c.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
