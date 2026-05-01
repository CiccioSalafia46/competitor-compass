import { cn } from "@/lib/utils";

interface ReportsAnalyticsStageProps { active: boolean }

export default function ReportsAnalyticsStage({ active: _active }: ReportsAnalyticsStageProps) {
  // Static bar chart data (12 weeks)
  const bars = [4, 6, 5, 8, 7, 9, 11, 10, 13, 12, 15, 14];
  const maxBar = Math.max(...bars);

  return (
    <div className="p-4 h-full flex flex-col">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Total signals", value: "1,247", trend: "+12%" },
          { label: "Avg/week", value: "89", trend: "+8%" },
          { label: "Actions taken", value: "34", trend: "+22%" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-md border border-border/30 bg-card/40 p-2">
            <p className="text-[7px] text-muted-foreground/40">{kpi.label}</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs font-bold text-foreground">{kpi.value}</span>
              <span className="text-[7px] text-emerald-600 dark:text-emerald-400">{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 rounded-lg border border-border/30 bg-card/30 p-3 mb-3">
        <p className="text-[8px] text-muted-foreground/40 mb-2">Competitor activity · 12 weeks</p>
        <div className="flex items-end gap-1 h-[80px]">
          {bars.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-primary/30 transition-all duration-700"
              style={{ height: `${(v / maxBar) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Mini tables */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border/30 bg-card/30 p-2">
          <p className="text-[7px] font-semibold text-muted-foreground/40 mb-1">Top categories</p>
          {["Pricing (31%)", "Content (24%)", "Hiring (18%)"].map((r) => (
            <p key={r} className="text-[8px] text-muted-foreground/50 leading-relaxed">{r}</p>
          ))}
        </div>
        <div className="rounded-md border border-border/30 bg-card/30 p-2">
          <p className="text-[7px] font-semibold text-muted-foreground/40 mb-1">Top by activity</p>
          {["Acme Corp (23)", "Globex (18)", "Wonka (15)"].map((r) => (
            <p key={r} className="text-[8px] text-muted-foreground/50 leading-relaxed">{r}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
