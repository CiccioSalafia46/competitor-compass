import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Step04ActSceneProps {
  progress: number;
  active: boolean;
}

export default function Step04ActScene({ progress, active }: Step04ActSceneProps) {
  const [showKPIs, setShowKPIs] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  useEffect(() => {
    if (!active) { setShowKPIs(false); setShowAlert(false); setShowTasks(false); return; }
    if (progress > 0.1) setShowKPIs(true);
    if (progress > 0.35) setShowAlert(true);
    if (progress > 0.65) setShowTasks(true);
  }, [progress, active]);

  return (
    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col gap-2.5">
      {/* KPI row */}
      <div className={cn(
        "grid grid-cols-3 gap-2 transition-all duration-300",
        showKPIs ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}>
        {[
          { label: "Signals today", value: "23", trend: "+5" },
          { label: "Critical changes", value: "4", trend: "+2" },
          { label: "Opportunities", value: "7", trend: "+3" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-md border border-border/40 bg-card/60 px-2 py-2">
            <p className="text-[8px] text-muted-foreground/50 mb-0.5">{kpi.label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-foreground">{kpi.value}</span>
              <span className="text-[8px] text-emerald-600 dark:text-emerald-400">{kpi.trend}</span>
            </div>
            {/* Mini sparkline */}
            <svg viewBox="0 0 40 12" className="w-full h-2 mt-0.5 text-primary/30">
              <polyline points="0,10 8,8 16,9 24,5 32,6 40,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        ))}
      </div>

      {/* Alert card */}
      <div className={cn(
        "rounded-lg border border-primary/25 bg-primary/[0.03] p-3 transition-all duration-400",
        showAlert ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3",
      )}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/70">Alert · Acme Corp</span>
        </div>
        <p className="text-xs font-medium text-foreground mb-0.5">Pricing change detected</p>
        <p className="text-[10px] text-muted-foreground">Pro plan: $49 → $39 (-20%)</p>
        <p className="text-[9px] text-muted-foreground/60 mt-1.5 italic">Suggested: review your pricing within 48h</p>
        <button className="mt-2 text-[9px] font-medium text-primary bg-primary/[0.08] hover:bg-primary/[0.12] px-2.5 py-1 rounded-md transition-colors demo-cta-pulse">
          Open recommendation →
        </button>
      </div>

      {/* Tasks */}
      <div className={cn(
        "flex flex-col gap-1 transition-all duration-300",
        showTasks ? "opacity-100" : "opacity-0",
      )}>
        {["Review competitor pricing page", "Update positioning deck"].map((task) => (
          <div key={task} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm border border-border/50 shrink-0" />
            <span className="text-[10px] text-muted-foreground/60">{task}</span>
          </div>
        ))}
      </div>

      {/* Sync status */}
      <div className="mt-auto flex items-center gap-1.5 text-[8px] text-muted-foreground/30">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
        Synced 12s ago · Next scan in 3 min
      </div>
    </div>
  );
}
