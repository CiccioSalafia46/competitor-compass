import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AUTO_LABELS } from "./solutionData";

interface Task {
  id: number;
  checked: boolean;
  width: number;
}

// SAME widths as EndlessChecklistScene's INITIAL_TASKS — pixel-identical rows
const INITIAL_WIDTHS = [72, 58, 84, 66, 78, 52, 70];

function createBatch(startId: number): Task[] {
  return INITIAL_WIDTHS.map((w, i) => ({ id: startId + i, checked: false, width: w }));
}

interface AutoCompletingChecklistSceneProps {
  active: boolean;
  hovered: boolean;
}

export default function AutoCompletingChecklistScene({ active, hovered }: AutoCompletingChecklistSceneProps) {
  const [tasks, setTasks] = useState<Task[]>(createBatch(1));
  const [labelIdx, setLabelIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const nextBatch = useRef(8);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tickSpeed = hovered ? 200 : 400;

  const tick = useCallback(() => {
    setTasks((prev) => {
      const unchecked = prev.findIndex((t) => !t.checked);
      if (unchecked === -1) return prev;
      return prev.map((t, i) => (i === unchecked ? { ...t, checked: true } : t));
    });
  }, []);

  // All done → fade, reset with same widths
  useEffect(() => {
    const allDone = tasks.every((t) => t.checked);
    if (!allDone || !active) return;

    setFading(true);
    const timeout = setTimeout(() => {
      setFading(false);
      setTasks(createBatch(nextBatch.current));
      nextBatch.current += 7;
      setLabelIdx((i) => (i + 1) % AUTO_LABELS.length);
    }, 800);

    return () => clearTimeout(timeout);
  }, [tasks, active]);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(tick, tickSpeed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, tick, tickSpeed]);

  const checkedCount = tasks.filter((t) => t.checked).length;
  const openCount = tasks.length - checkedCount;

  return (
    <div className="relative w-full h-[120px] sm:h-[120px] px-2" aria-hidden="true">
      {/* Counter — mirrors Problem's "Open: N" but shows it staying at 0 */}
      <div className="absolute top-1 right-2 flex items-center gap-3">
        <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums">
          Open: <span className={cn("transition-colors duration-300", openCount === 0 ? "text-primary/70" : "text-muted-foreground/50")}>{openCount}</span>
        </span>
        {/* AUTO indicator — replaces the human effort */}
        <span className={cn(
          "flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-all duration-300",
          hovered ? "text-primary" : "text-primary/60",
        )}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          AUTO
        </span>
      </div>

      {/* Task list — SAME structure as EndlessChecklistScene */}
      <div className={cn(
        "flex flex-col gap-1.5 pt-5 overflow-hidden h-[90px] transition-opacity duration-700",
        fading && "opacity-0",
      )}>
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2 h-4">
            {/* Checkbox — same w-3 h-3 rounded-sm as Problem */}
            <div
              className={cn(
                "w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center transition-all duration-300",
                task.checked
                  ? "bg-primary/15 border-primary/40"
                  : "border-border/60 bg-transparent",
              )}
            >
              {task.checked && (
                <svg viewBox="0 0 10 10" className="w-2 h-2 text-primary">
                  <path d="M2 5 L4 7 L8 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>

            {/* Text bar — same h-2 rounded-full as Problem */}
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                task.checked ? "bg-primary/20" : "bg-muted-foreground/20",
              )}
              style={{ width: `${task.width}%` }}
            />
          </div>
        ))}
      </div>

      {/* Bottom label — cycling context */}
      <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground/50 italic transition-opacity duration-500">
        {AUTO_LABELS[labelIdx]}
      </div>

      {/* NO overflow fade — list completes cleanly, unlike Problem's endless overflow */}
    </div>
  );
}
