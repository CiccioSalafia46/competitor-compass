import { cn } from "@/lib/utils";

interface MiniSparklineProps {
  values: number[];
  className?: string;
  title?: string;
}

export function MiniSparkline({ values, className, title }: MiniSparklineProps) {
  const normalized = values.length > 0 ? values.slice(-8) : [0, 0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...normalized, 1);

  return (
    <svg
      className={cn("h-5 w-20 overflow-visible", className)}
      viewBox="0 0 80 20"
      role={title ? "img" : "presentation"}
      aria-label={title}
      focusable="false"
    >
      {normalized.map((value, index) => {
        const height = Math.max(2, Math.round((value / max) * 16));
        const x = index * 10 + 1;
        const y = 18 - height;
        const active = index === normalized.length - 1;
        return (
          <rect
            key={`${index}-${value}`}
            x={x}
            y={y}
            width="6"
            height={height}
            rx="2"
            className={active ? "fill-primary" : "fill-primary/25"}
          />
        );
      })}
    </svg>
  );
}
