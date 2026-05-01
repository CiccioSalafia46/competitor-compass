import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Signal {
  id: number;
  x: number; // 0-100 along timeline
  capturedAt: number; // timestamp when captured
}

interface CapturedSignalsSceneProps {
  active: boolean;
  hovered: boolean;
}

export default function CapturedSignalsScene({ active, hovered }: CapturedSignalsSceneProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [count, setCount] = useState(247);
  const nextId = useRef(0);
  const lastSpawn = useRef(0);
  const frameRef = useRef<number>(0);

  const spawnInterval = hovered ? 400 : 1000;

  const loop = useCallback(
    (now: number) => {
      // Spawn new signals
      if (now - lastSpawn.current > spawnInterval) {
        lastSpawn.current = now;
        const x = 5 + Math.random() * 90;
        setSignals((prev) => {
          // Keep max 12 visible
          const next = [...prev, { id: nextId.current++, x, capturedAt: now }];
          return next.length > 12 ? next.slice(-12) : next;
        });
        setCount((c) => c + 1);
      }

      frameRef.current = requestAnimationFrame(loop);
    },
    [spawnInterval],
  );

  useEffect(() => {
    if (!active) return;
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, loop]);

  // Sensor nodes along the timeline (fixed positions)
  const SENSORS = [10, 25, 40, 55, 70, 85];

  return (
    <div className="relative w-full h-[120px] px-2" aria-hidden="true">
      {/* Counter */}
      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-muted-foreground/50 tabular-nums">
        Captured: <span className="text-primary/70">{count}</span>
      </div>

      <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Timeline line */}
        <line
          x1="10" y1="50" x2="190" y2="50"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          strokeOpacity="0.3"
        />

        {/* Sensor nodes — always present along the line */}
        {SENSORS.map((pos, i) => {
          const cx = 10 + (pos / 100) * 180;
          return (
            <g key={`sensor-${i}`}>
              {/* Sensor diamond */}
              <rect
                x={cx - 3}
                y={47}
                width="6"
                height="6"
                transform={`rotate(45 ${cx} 50)`}
                fill="hsl(var(--primary))"
                fillOpacity="0.3"
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.5"
              />
              {/* Sensor antenna line */}
              <line
                x1={cx} y1={44} x2={cx} y2={38}
                stroke="hsl(var(--primary))"
                strokeWidth="0.8"
                strokeOpacity="0.25"
              />
              {/* Sensor dot */}
              <circle
                cx={cx} cy={37}
                r="1.5"
                fill="hsl(var(--primary))"
                fillOpacity={hovered ? 0.7 : 0.4}
                className={cn(active && "solution-sensor-pulse")}
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            </g>
          );
        })}

        {/* Captured signals — appear above the line */}
        {signals.map((signal) => {
          const cx = 10 + (signal.x / 100) * 180;
          return (
            <g key={signal.id} className="solution-signal-appear">
              {/* Signal dot (captured = solid primary) */}
              <circle
                cx={cx}
                cy={50}
                r="3.5"
                fill="hsl(var(--primary))"
                opacity="0.8"
              />
              {/* Capture flash */}
              <circle
                cx={cx}
                cy={50}
                r="3.5"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                className="solution-capture-ring"
              />
              {/* Tag rises above line */}
              <rect
                x={cx - 4}
                y={28}
                width="8"
                height="5"
                rx="1.5"
                fill="hsl(var(--primary))"
                fillOpacity="0.15"
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.3"
                className="solution-tag-rise"
              />
            </g>
          );
        })}

        {/* Connection lines from timeline to tags */}
        {signals.slice(-6).map((signal) => {
          const cx = 10 + (signal.x / 100) * 180;
          return (
            <line
              key={`line-${signal.id}`}
              x1={cx} y1={46} x2={cx} y2={34}
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              strokeOpacity="0.15"
              strokeDasharray="1 1"
            />
          );
        })}
      </svg>
    </div>
  );
}
