import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { subDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CompetitorHeatmapRow {
  name: string;
  /** 30 values, index 0 = 29 days ago, index 29 = today */
  dailySignals: number[];
}

interface ActivityHeatmapProps {
  competitors: CompetitorHeatmapRow[];
  className?: string;
}

const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;
const DAYS = 30;
const LABEL_W = 80;

const LEVELS = [
  "fill-primary/0",      // 0 — empty
  "fill-primary/10",     // 1
  "fill-primary/25",     // 2
  "fill-primary/50",     // 3
  "fill-primary/75",     // 4
  "fill-primary",        // 5
] as const;

function getLevel(value: number, max: number): number {
  if (value === 0 || max === 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.6) return 3;
  if (ratio <= 0.8) return 4;
  return 5;
}

export function ActivityHeatmap({ competitors, className }: ActivityHeatmapProps) {
  const { t } = useTranslation("dashboard");

  const today = useMemo(() => new Date(), []);
  const dates = useMemo(() => Array.from({ length: DAYS }, (_, i) => subDays(today, DAYS - 1 - i)), [today]);

  const globalMax = useMemo(
    () => Math.max(...competitors.flatMap((c) => c.dailySignals), 0),
    [competitors],
  );

  const hasData = globalMax > 0;
  const rows = competitors.length;
  const svgW = LABEL_W + DAYS * STEP;
  const svgH = rows * STEP + 16; // 16px for date labels at bottom

  if (competitors.length === 0) return null;

  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>
      <h2 className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("heatmapTitle")}
      </h2>

      {!hasData ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {/* FIXME: populate with real per-day-per-competitor data once the dashboard-snapshot endpoint exposes it */}
          {t("heatmapEmpty")}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto scrollbar-thin">
          <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="min-w-[600px]"
            role="img"
            aria-label={t("heatmapTitle")}
          >
            {competitors.map((competitor, rowIndex) => (
              <g key={competitor.name}>
                {/* Competitor name label */}
                <text
                  x={LABEL_W - 6}
                  y={rowIndex * STEP + CELL / 2 + 1}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="fill-muted-foreground text-[9px]"
                >
                  {competitor.name.length > 12 ? `${competitor.name.slice(0, 11)}…` : competitor.name}
                </text>

                {/* Cells */}
                {competitor.dailySignals.slice(-DAYS).map((value, dayIndex) => {
                  const level = getLevel(value, globalMax);
                  const x = LABEL_W + dayIndex * STEP;
                  const y = rowIndex * STEP;
                  const date = dates[dayIndex];
                  const dateStr = date ? format(date, "MMM d") : "";

                  return (
                    <Tooltip key={dayIndex}>
                      <TooltipTrigger asChild>
                        <rect
                          x={x}
                          y={y}
                          width={CELL}
                          height={CELL}
                          rx={2}
                          className={cn(
                            level === 0 ? "fill-muted/40" : LEVELS[level],
                            "transition-opacity",
                          )}
                          style={{
                            animationDelay: `${dayIndex * 25}ms`,
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {t("heatmapTooltip", { name: competitor.name, date: dateStr, count: value })}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </g>
            ))}

            {/* Bottom date labels — every 5th day */}
            {dates.map((date, index) =>
              index % 7 === 0 ? (
                <text
                  key={index}
                  x={LABEL_W + index * STEP + CELL / 2}
                  y={rows * STEP + 12}
                  textAnchor="middle"
                  className="fill-muted-foreground/60 text-[8px]"
                >
                  {format(date, "d")}
                </text>
              ) : null,
            )}
          </svg>
        </div>
      )}
    </section>
  );
}
