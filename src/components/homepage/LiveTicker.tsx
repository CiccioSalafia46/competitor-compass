import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TICKER_EVENTS } from "./statsData";

interface LiveTickerProps {
  className?: string;
  visible?: boolean;
}

export default function LiveTicker({ className, visible = true }: LiveTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const handler = () => setReducedMotion(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  if (!visible) return null;

  // Double the events for seamless loop
  const items = [...TICKER_EVENTS, ...TICKER_EVENTS];

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center h-8 overflow-hidden rounded-lg border border-border/40 bg-card/30 backdrop-blur-sm mt-3",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="off"
      role="marquee"
    >
      {/* LIVE indicator */}
      <div className="flex items-center gap-1.5 px-3 shrink-0 border-r border-border/40 h-full z-10 bg-card/60 backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Live</span>
      </div>

      {/* Ticker track */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className={cn(
            "flex gap-8 whitespace-nowrap ticker-scroll",
            paused && "ticker-paused",
            reducedMotion && "ticker-static",
          )}
        >
          {items.map((event, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70"
            >
              <span className="h-1 w-1 rounded-full bg-primary/40 shrink-0" />
              {event}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
