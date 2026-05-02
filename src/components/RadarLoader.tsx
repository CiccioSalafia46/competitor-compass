import { cn } from "@/lib/utils";

const CX = 60;
const CY = 60;
const RINGS = [18, 34, 50];

/** Lightweight dot positions (angle degrees, radius fraction of outer ring) */
const DOTS = [
  { angle: 40, r: 0.55 },
  { angle: 155, r: 0.78 },
  { angle: 260, r: 0.42 },
  { angle: 320, r: 0.88 },
];

function dotXY(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + Math.cos(rad) * r * RINGS[2], y: CY + Math.sin(rad) * r * RINGS[2] };
}

interface RadarLoaderProps {
  label?: string;
  className?: string;
}

export function RadarLoader({ label = "Loading…", className }: RadarLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative h-[120px] w-[120px]">
        <svg
          viewBox="0 0 120 120"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            {/* Sweep cone gradient */}
            <linearGradient id="radarSweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
            {/* Dot glow */}
            <radialGradient id="radarDotGlow">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Concentric rings */}
          {RINGS.map((r) => (
            <circle
              key={r}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              opacity="0.6"
            />
          ))}

          {/* Cross hairs */}
          <line x1={CX} y1={CY - RINGS[2]} x2={CX} y2={CY + RINGS[2]} stroke="hsl(var(--border))" strokeWidth="0.3" opacity="0.4" />
          <line x1={CX - RINGS[2]} y1={CY} x2={CX + RINGS[2]} y2={CY} stroke="hsl(var(--border))" strokeWidth="0.3" opacity="0.4" />

          {/* Sweep ray — rotates via CSS */}
          <g className="origin-center motion-safe:animate-[radar-sweep_4s_linear_infinite]" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            {/* Cone fill */}
            <path
              d={`M ${CX} ${CY} L ${CX + RINGS[2]} ${CY} A ${RINGS[2]} ${RINGS[2]} 0 0 1 ${CX + Math.cos(Math.PI / 6) * RINGS[2]} ${CY + Math.sin(Math.PI / 6) * RINGS[2]} Z`}
              fill="url(#radarSweep)"
              opacity="0.7"
            />
            {/* Leading edge line */}
            <line x1={CX} y1={CY} x2={CX + RINGS[2]} y2={CY} stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.6" />
          </g>

          {/* Signal dots — staggered pulse */}
          {DOTS.map((dot, i) => {
            const { x, y } = dotXY(dot.angle, dot.r);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="6" fill="url(#radarDotGlow)" className="motion-safe:animate-[radar-dot-ping_4s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.9}s` }} />
                <circle cx={x} cy={y} r="2" fill="hsl(var(--primary))" className="motion-safe:animate-[radar-dot-pulse_3s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.7}s` }} />
              </g>
            );
          })}

          {/* Center dot */}
          <circle cx={CX} cy={CY} r="2.5" fill="hsl(var(--primary))" opacity="0.9" />
          <circle cx={CX} cy={CY} r="5" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.4" />
        </svg>
      </div>
      {label && (
        <p className="text-xs font-medium tracking-wide text-muted-foreground motion-safe:animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}
