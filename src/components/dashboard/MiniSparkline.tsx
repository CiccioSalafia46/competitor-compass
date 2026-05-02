import { cn } from "@/lib/utils";

interface MiniSparklineProps {
  values: number[];
  className?: string;
  title?: string;
  /** Viewport height in SVG units. Default 20 (standard), use 12 for inline. */
  height?: number;
  /** Bar width in SVG units. Default 6 (standard), use 4 for compact. */
  barWidth?: number;
  /** When true, renders a flat dashed line to indicate no data. */
  empty?: boolean;
  /** Active bar fill class (default: fill-primary/70) */
  colorActive?: string;
  /** Muted bar fill class (default: fill-primary/35) */
  colorMuted?: string;
  /** Enable left-to-right drawing animation on mount */
  animate?: boolean;
}

export function MiniSparkline({
  values,
  className,
  title,
  height = 20,
  barWidth = 6,
  empty,
  colorActive,
  colorMuted,
  animate,
}: MiniSparklineProps) {
  const barCount = 8;
  const gap = barWidth < 5 ? 7 : 10;
  const svgWidth = barCount * gap;
  const maxBarH = height - 4;

  if (empty) {
    return (
      <svg
        className={cn(height <= 14 ? "h-3.5 w-14" : "h-5 w-20", "overflow-visible", className)}
        viewBox={`0 0 ${svgWidth} ${height}`}
        role="presentation"
        focusable="false"
      >
        <line
          x1="1"
          y1={height / 2}
          x2={svgWidth - 1}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          className="text-muted-foreground/30"
        />
      </svg>
    );
  }

  const normalized = values.length > 0 ? values.slice(-barCount) : Array(barCount).fill(0);
  const max = Math.max(...normalized, 1);

  return (
    <svg
      className={cn(height <= 14 ? "h-3.5 w-14" : "h-5 w-20", "overflow-visible", className)}
      viewBox={`0 0 ${svgWidth} ${height}`}
      role={title ? "img" : "presentation"}
      aria-label={title}
      focusable="false"
    >
      {normalized.map((value, index) => {
        const barH = Math.max(2, Math.round((value / max) * maxBarH));
        const x = index * gap + 1;
        const y = height - 2 - barH;
        const active = index === normalized.length - 1;
        return (
          <rect
            key={`${index}-${value}`}
            x={x}
            y={y}
            width={barWidth}
            height={barH}
            rx="1.5"
            className={active ? (colorActive ?? "fill-primary/70") : (colorMuted ?? "fill-primary/35")}
            style={animate ? { animation: `sparkline-bar-in 600ms ease-out ${index * 60}ms both` } : undefined}
          />
        );
      })}
    </svg>
  );
}
