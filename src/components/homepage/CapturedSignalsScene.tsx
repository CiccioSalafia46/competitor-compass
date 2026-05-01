import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Signal {
  id: number;
  x: number; // 0-100 along timeline
  capturedAt: number;
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
      if (now - lastSpawn.current > spawnInterval) {
        lastSpawn.current = now;
        // SAME spawn range as MissedSignalsScene: 10 + random * 80
        const x = 10 + Math.random() * 80;
        setSignals((prev) => {
          const next = [...prev, { id: nextId.current++, x, capturedAt: now }];
          return next.length > 10 ? next.slice(-10) : next;
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

  // SAME sensor positions as MissedSignalsScene eye range
  const SENSORS = [10, 25, 40, 55, 70, 85];

  return (
    <div className="relative w-full h-[120px] sm:h-[120px] px-2" aria-hidden="true">
      {/* Counter — mirrors Problem's "Missed: N" but shows captured instead */}
      <div className="absolute bottom-2 right-2 text-[10px] font-mono tabular-nums flex items-center gap-3">
        <span className="text-muted-foreground/40 line-through">Missed: 0</span>
        <span className="text-muted-foreground/50">Captured: <span className="text-primary/70">{count}</span></span>
      </div>

      {/* SAME viewBox and timeline as MissedSignalsScene */}
      <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">

        {/* Timeline line — same position y=50, same x range 10-190 */}
        <line
          x1="10" y1="50" x2="190" y2="50"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          strokeOpacity="0.3"
        />

        {/* Ghost of the old eye — crossed out, at left side, showing it's no longer needed */}
        <g opacity="0.15">
          <ellipse cx="20" cy="28" rx="7" ry="4.5" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.2" />
          <circle cx="20" cy="28" r="2" fill="hsl(var(--muted-foreground))" />
          {/* Strike-through line */}
          <line x1="12" y1="32" x2="28" y2="24" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
        </g>

        {/* Sensor network — replaces the slow eye */}
        {SENSORS.map((pos, i) => {
          const cx = 10 + (pos / 100) * 180;
          return (
            <g key={`sensor-${i}`}>
              {/* Sensor triangle (antenna shape) */}
              <path
                d={`M${cx},44 L${cx - 3},38 L${cx + 3},38 Z`}
                fill="hsl(var(--primary))"
                fillOpacity={hovered ? 0.5 : 0.3}
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.4"
              />
              {/* Scan line down to timeline — mirrors the eye's scan line but from sensor */}
              <line
                x1={cx} y1={44} x2={cx} y2={48}
                stroke="hsl(var(--primary))"
                strokeWidth="0.8"
                strokeOpacity="0.3"
                strokeDasharray="1.5 1"
              />
              {/* Sensor detection radius (subtle circle) */}
              <circle
                cx={cx} cy={50} r="12"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity={hovered ? 0.15 : 0.08}
                strokeDasharray="2 3"
              />
              {/* Sensor active dot */}
              <circle
                cx={cx} cy={36}
                r="1.5"
                fill="hsl(var(--primary))"
                fillOpacity={hovered ? 0.8 : 0.5}
                className={cn(active && "solution-sensor-pulse")}
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            </g>
          );
        })}

        {/* Captured signals — SAME r=4 as Problem's active signals, but all stay captured */}
        {signals.map((signal) => {
          const cx = 10 + (signal.x / 100) * 180;
          return (
            <g key={signal.id} className="solution-signal-appear">
              {/* Signal dot — same r=4 as Problem's active state, full primary */}
              <circle
                cx={cx}
                cy={50}
                r="4"
                fill="hsl(var(--primary))"
                opacity="0.8"
              />
              {/* Capture flash ring — same size as Problem's pulse ring */}
              <circle
                cx={cx}
                cy={50}
                r="4"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                className="solution-capture-ring"
              />
              {/* Tag label above — shows it's been catalogued */}
              <rect
                x={cx - 5}
                y={26}
                width="10"
                height="6"
                rx="2"
                fill="hsl(var(--primary))"
                fillOpacity="0.12"
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.25"
                className="solution-tag-rise"
              />
              {/* Connection line from signal to tag */}
              <line
                x1={cx} y1={46} x2={cx} y2={33}
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeOpacity="0.15"
                strokeDasharray="1 1.5"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
