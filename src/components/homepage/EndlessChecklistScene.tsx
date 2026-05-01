import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  checked: boolean;
  width: number; // % width of the "text bar"
}

const INITIAL_TASKS: Task[] = [
  { id: 1, checked: false, width: 72 },
  { id: 2, checked: false, width: 58 },
  { id: 3, checked: false, width: 84 },
  { id: 4, checked: false, width: 66 },
  { id: 5, checked: false, width: 78 },
  { id: 6, checked: false, width: 52 },
  { id: 7, checked: false, width: 70 },
];

const TASK_WIDTHS = [55, 62, 74, 68, 80, 56, 72, 64, 76, 60];

interface EndlessChecklistSceneProps {
  active: boolean;
  hovered: boolean;
}

export default function EndlessChecklistScene({ active, hovered }: EndlessChecklistSceneProps) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [openCount, setOpenCount] = useState(7);
  const nextId = useRef(8);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tickSpeed = hovered ? 600 : 1200;

  const tick = useCallback(() => {
    setTasks((prev) => {
      const uncheckedIdx = prev.findIndex((t) => !t.checked);
      if (uncheckedIdx === -1) return prev;

      // Check one task
      const updated = prev.map((t, i) => (i === uncheckedIdx ? { ...t, checked: true } : t));

      // Add 2 new tasks at top
      const newTasks: Task[] = [
        { id: nextId.current++, checked: false, width: TASK_WIDTHS[nextId.current % TASK_WIDTHS.length] },
        { id: nextId.current++, checked: false, width: TASK_WIDTHS[nextId.current % TASK_WIDTHS.length] },
      ];

      // Keep only last 7 visible
      const combined = [...newTasks, ...updated].slice(0, 7);
      return combined;
    });

    setOpenCount((c) => {
      const next = c + 1;
      // Oscillate between 5-12
      return next > 12 ? 5 : next;
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(tick, tickSpeed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, tick, tickSpeed]);

  return (
    <div className="relative w-full h-[120px] sm:h-[120px] px-2" aria-hidden="true">
      {/* Open task counter */}
      <div className="absolute top-1 right-2 text-[10px] font-mono text-muted-foreground/50 tabular-nums">
        Open: <span className={cn("transition-colors duration-300", openCount > 9 && "text-destructive/60")}>{openCount}</span>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-1.5 pt-5 overflow-hidden h-full">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 h-4 animate-in fade-in slide-in-from-top-1 duration-300"
          >
            {/* Checkbox */}
            <div
              className={cn(
                "w-3 h-3 rounded-sm border border-border/60 shrink-0 flex items-center justify-center transition-all duration-300",
                task.checked && "bg-muted-foreground/20 border-muted-foreground/30",
              )}
            >
              {task.checked && (
                <svg viewBox="0 0 10 10" className="w-2 h-2 text-muted-foreground/50">
                  <path d="M2 5 L4 7 L8 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>

            {/* Text bar */}
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                task.checked ? "bg-muted-foreground/10" : "bg-muted-foreground/20",
              )}
              style={{ width: `${task.width}%` }}
            />
          </div>
        ))}
      </div>

      {/* Overflow fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
    </div>
  );
}
