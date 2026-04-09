import { memo } from "react";
import type { ComponentType } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  /** Short all-caps label shown above the value */
  label: string;
  /** Primary metric value — displayed large */
  value: string | number;
  /** Secondary descriptive line below the value */
  subtitle?: string;
  /** Icon rendered in the colored square on the right */
  icon: ComponentType<{ className?: string }>;
  /** Optional percentage change shown as a trend chip */
  trend?: number;
  /** Controls icon background / accent color */
  tone?: "default" | "positive" | "warning" | "negative";
  className?: string;
}

/**
 * StatCard — reusable premium KPI tile used across Analytics, Dashboard, and Insights.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │ LABEL              [  icon square  ]│
 *   │ 1,234  +4.2%                        │
 *   │ Subtitle text                       │
 *   └─────────────────────────────────────┘
 */
export const StatCard = memo(function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  tone = "default",
  className,
}: StatCardProps) {
  const iconClass = cn(
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
    tone === "positive" && "bg-primary/10 text-primary",
    tone === "warning"  && "bg-warning/10 text-warning",
    tone === "negative" && "bg-destructive/10 text-destructive",
    tone === "default"  && "bg-muted/80 text-muted-foreground",
  );

  const trendPositive = typeof trend === "number" && trend >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-shadow duration-150",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: label + value + trend + subtitle */}
        <div className="min-w-0 space-y-1.5">
          <p className="section-label truncate">{label}</p>

          <div className="flex items-end gap-2">
            <p className="stat-value text-2xl font-semibold leading-none tracking-tight text-foreground">
              {value}
            </p>

            {typeof trend === "number" && (
              <span
                className={cn(
                  "pill mb-0.5",
                  trendPositive
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {trendPositive ? (
                  <ArrowUpRight className="h-2.5 w-2.5" />
                ) : (
                  <ArrowDownRight className="h-2.5 w-2.5" />
                )}
                {trendPositive ? "+" : ""}
                {trend.toFixed(1)}%
              </span>
            )}
          </div>

          {subtitle && (
            <p className="text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Right: icon */}
        <div className={iconClass}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
});
