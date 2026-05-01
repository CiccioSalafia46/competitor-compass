import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SIGNAL_FEED } from "./platformData";

interface SignalStreamStageProps { active: boolean }

export default function SignalStreamStage({ active }: SignalStreamStageProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setOffset((o) => (o + 1) % SIGNAL_FEED.length);
    }, 4500);
    return () => clearInterval(id);
  }, [active]);

  // Rotate feed based on offset
  const visible = [...SIGNAL_FEED.slice(offset), ...SIGNAL_FEED.slice(0, offset)].slice(0, 5);

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 mb-3">
        <svg viewBox="0 0 14 14" className="w-3 h-3 text-muted-foreground/30 shrink-0"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" /><line x1="10" y1="10" x2="13" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
        <span className="text-[10px] text-muted-foreground/30">Search: &apos;pricing change&apos;, &apos;new hire&apos;…</span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1 mb-2.5">
        {["All", "Pricing", "Hiring", "Content", "Product"].map((f, i) => (
          <span key={f} className={cn(
            "text-[8px] px-1.5 py-0.5 rounded border",
            i === 0 ? "bg-primary/[0.08] border-primary/20 text-primary" : "border-border/30 text-muted-foreground/40",
          )}>{f}</span>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
        {visible.map((signal, i) => (
          <div
            key={`${signal.text}-${offset}-${i}`}
            className={cn(
              "flex items-start gap-2 rounded-md border border-border/30 bg-card/60 px-2.5 py-2 transition-all duration-300",
              i === 0 && active && "animate-in fade-in slide-in-from-top-1 duration-300",
            )}
          >
            <span className={cn("text-[7px] font-semibold px-1.5 py-0.5 rounded shrink-0 mt-0.5", signal.tagColor)}>
              {signal.tag}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-foreground/80 truncate">{signal.text}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8px] text-muted-foreground/40">{signal.competitor}</span>
                <span className="text-[8px] text-muted-foreground/30">{signal.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
