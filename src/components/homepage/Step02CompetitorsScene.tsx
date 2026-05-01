import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { COMPETITORS_TO_TYPE } from "./howItWorksData";

interface Step02CompetitorsSceneProps {
  progress: number;
  active: boolean;
}

export default function Step02CompetitorsScene({ progress, active }: Step02CompetitorsSceneProps) {
  const [typed, setTyped] = useState("");
  const [rows, setRows] = useState<typeof COMPETITORS_TO_TYPE[number][]>([]);
  const [showTags, setShowTags] = useState(false);

  useEffect(() => {
    if (!active) { setTyped(""); setRows([]); setShowTags(false); return; }

    // Progress 0-0.3: type first name
    // 0.3-0.6: type second name
    // 0.6-0.85: type third name
    // 0.85-1: show tags
    const thresholds = [0.3, 0.6, 0.85];
    const completedCount = thresholds.filter((t) => progress >= t).length;

    // Update rows
    const newRows = COMPETITORS_TO_TYPE.slice(0, completedCount);
    if (newRows.length !== rows.length) setRows(newRows);

    // Typing animation for current competitor
    if (completedCount < 3) {
      const currentComp = COMPETITORS_TO_TYPE[completedCount];
      const segStart = completedCount === 0 ? 0 : thresholds[completedCount - 1];
      const segEnd = thresholds[completedCount];
      const segProgress = (progress - segStart) / (segEnd - segStart);
      const chars = Math.floor(segProgress * currentComp.name.length);
      setTyped(currentComp.name.slice(0, chars));
    } else {
      setTyped("");
    }

    if (progress > 0.88) setShowTags(true);
  }, [progress, active]);

  return (
    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col">
      {/* Input field */}
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 mb-3">
        <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" /><line x1="10" y1="10" x2="13" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
        <span className="text-xs text-foreground/80 font-mono">
          {typed}
          {active && typed && <span className="inline-block w-px h-3.5 bg-foreground/60 ml-px animate-pulse" />}
        </span>
        {!typed && !rows.length && <span className="text-xs text-muted-foreground/30">Add competitor name...</span>}
      </div>

      {/* Competitor rows */}
      <div className="flex flex-col gap-1.5 flex-1">
        {rows.map((comp, i) => (
          <div
            key={comp.name}
            className="flex items-center gap-2.5 rounded-md border border-border/40 bg-card px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary/70 shrink-0">
              {comp.name[0]}
            </div>
            {/* Name + domain */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{comp.name}</p>
              <p className="text-[9px] text-muted-foreground/50">{comp.domain}</p>
            </div>
            {/* Category tag */}
            {showTags && (
              <span className="text-[9px] font-medium text-primary/60 bg-primary/[0.06] px-1.5 py-0.5 rounded animate-in fade-in duration-300">
                {comp.tag}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Scalability hint */}
      {rows.length === 3 && (
        <p className="text-[9px] text-muted-foreground/40 mt-2 text-center animate-in fade-in duration-500">
          + add up to 50 competitors
        </p>
      )}
    </div>
  );
}
