import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Signal {
  id: number;
  x: number; // 0-100 along timeline
  state: "active" | "captured" | "missed";
  birth: number; // timestamp
}

interface MissedSignalsSceneProps {
  active: boolean;
  hovered: boolean;
}

export default function MissedSignalsScene({ active, hovered }: MissedSignalsSceneProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [eyeX, setEyeX] = useState(10);
  const [missedCount, setMissedCount] = useState(0);
  const nextId = useRef(0);
  const frameRef = useRef<number>(0);
  const lastSpawn = useRef(0);

  const spawnInterval = hovered ? 600 : 1100;
  const signalLifespan = 1500;

  const loop = useCallback(
    (now: number) => {
      // Spawn new signals
      if (now - lastSpawn.current > spawnInterval) {
        lastSpawn.current = now;
        const x = 10 + Math.random() * 80;
        setSignals((prev) => [
          ...prev,
          { id: nextId.current++, x, state: "active", birth: now },
        ]);
      }

      // Move eye slowly left to right
      setEyeX((prev) => {
        const speed = 0.015;
        const next = prev + speed * 16; // ~16ms per frame
        return next > 95 ? 5 : next;
      });

      // Process signals: check captures and expirations
      setSignals((prev) => {
        let newMissed = 0;
        const updated = prev
          .map((s) => {
            if (s.state !== "active") return s;
            // Check if eye is close enough to capture
            const eyePos = eyeX;
            if (Math.abs(s.x - eyePos) < 5) {
              return { ...s, state: "captured" as const };
            }
            // Check expiration
            if (now - s.birth > signalLifespan) {
              newMissed++;
              return { ...s, state: "missed" as const };
            }
            return s;
          })
          // Remove old missed/captured signals
          .filter((s) => now - s.birth < 3000);

        if (newMissed > 0) {
          setMissedCount((c) => c + newMissed);
        }
        return updated;
      });

      frameRef.current = requestAnimationFrame(loop);
    },
    [eyeX, spawnInterval, signalLifespan],
  );

  useEffect(() => {
    if (!active) return;
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, loop]);

  return (
    <div className="relative w-full h-[120px] sm:h-[120px] px-2" aria-hidden="true">
      {/* Missed counter */}
      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-muted-foreground/50 tabular-nums">
        Missed: <span className="text-destructive/60">{missedCount}</span>
      </div>

      {/* Timeline */}
      <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Timeline line */}
        <line
          x1="10" y1="50" x2="190" y2="50"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        {/* Signals */}
        {signals.map((signal) => {
          const cx = 10 + (signal.x / 100) * 180;
          const cy = 50;

          if (signal.state === "active") {
            return (
              <g key={signal.id}>
                <circle cx={cx} cy={cy} r="4" fill="hsl(var(--primary))" opacity="0.8" className="problem-signal-pulse" />
                <circle cx={cx} cy={cy} r="4" fill="hsl(var(--primary))" opacity="0.3" className="problem-signal-ring" />
              </g>
            );
          }

          if (signal.state === "captured") {
            return (
              <circle key={signal.id} cx={cx} cy={cy} r="3.5" fill="hsl(160 84% 39%)" opacity="0.9" />
            );
          }

          // missed — falls down and fades
          return (
            <circle
              key={signal.id}
              cx={cx}
              cy={cy}
              r="3"
              fill="hsl(var(--muted-foreground))"
              opacity="0.2"
              className="problem-signal-fall"
            />
          );
        })}

        {/* Eye icon (observer) */}
        <g
          style={{ transform: `translateX(${10 + (eyeX / 100) * 180 - 8}px)` }}
          className="transition-transform duration-100"
        >
          {/* Eye shape */}
          <ellipse cx="8" cy="28" rx="7" ry="4.5" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.2" opacity="0.5" />
          {/* Pupil */}
          <circle cx="8" cy="28" r="2" fill="hsl(var(--muted-foreground))" opacity="0.4" />
          {/* Scan line from eye to timeline */}
          <line x1="8" y1="33" x2="8" y2="46" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
        </g>
      </svg>
    </div>
  );
}
