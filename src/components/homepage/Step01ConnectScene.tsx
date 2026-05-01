import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { INTEGRATIONS } from "./howItWorksData";

interface Step01ConnectSceneProps {
  progress: number; // 0-1
  active: boolean;
}

export default function Step01ConnectScene({ progress, active }: Step01ConnectSceneProps) {
  const [connected, setConnected] = useState<number[]>([]);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!active) { setConnected([]); setShowBanner(false); return; }
    // Connect first at 30%, second at 60%, banner at 80%
    if (progress > 0.3 && !connected.includes(1)) setConnected((c) => [...c, 1]);
    if (progress > 0.6 && !connected.includes(3)) setConnected((c) => [...c, 3]);
    if (progress > 0.8) setShowBanner(true);
  }, [progress, active]);

  return (
    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col">
      {/* Banner */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30 mb-3 transition-all duration-300",
        showBanner ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
      )}>
        <svg viewBox="0 0 12 12" className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M3.5 6 L5.5 8 L8.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
        <span className="text-[10px] text-emerald-700 dark:text-emerald-300">2 sources connected · 0 data sent</span>
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-3 gap-2 flex-1">
        {INTEGRATIONS.map((item, i) => {
          const isConnected = connected.includes(i);
          return (
            <div
              key={item.label}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border p-2 sm:p-3 transition-all duration-300",
                isConnected
                  ? "border-emerald-300/50 dark:border-emerald-700/40 bg-emerald-50/30 dark:bg-emerald-950/20"
                  : "border-border/50 bg-muted/20",
              )}
            >
              {/* Logo placeholder */}
              <div className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-colors duration-300",
                isConnected
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted/60 text-muted-foreground/40",
              )}>
                {item.letter}
              </div>
              <span className="text-[8px] sm:text-[9px] text-muted-foreground/50 mt-1 text-center leading-tight">{item.label}</span>

              {/* Connected badge */}
              {isConnected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white"><path d="M2 5 L4 7 L8 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-1.5 mt-2 self-end">
        <svg viewBox="0 0 12 14" className="w-3 h-3.5 text-muted-foreground/30"><path d="M6 1L1 3.5v4c0 3.5 5 5.5 5 5.5s5-2 5-5.5v-4L6 1z" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M4 7l1.5 1.5L8 5.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>
        <span className="text-[9px] text-muted-foreground/30">Read-only · OAuth · Revocable</span>
      </div>
    </div>
  );
}
