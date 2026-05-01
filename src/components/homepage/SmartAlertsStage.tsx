import { cn } from "@/lib/utils";
import { ALERT_RULES, RECENT_ALERTS } from "./platformData";

interface SmartAlertsStageProps { active: boolean }

export default function SmartAlertsStage({ active: _active }: SmartAlertsStageProps) {
  return (
    <div className="p-4 h-full flex flex-col">
      {/* Active rules */}
      <div className="mb-4">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-2">Active rules</p>
        <div className="flex flex-wrap gap-1.5">
          {ALERT_RULES.map((rule) => (
            <div key={rule.label} className="flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-2.5 py-1">
              <div className={cn("w-2 h-2 rounded-full", rule.active ? "bg-emerald-500" : "bg-muted-foreground/20")} />
              <span className="text-[9px] text-foreground/70">{rule.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent alerts */}
      <div className="flex-1">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-2">Recent alerts</p>
        <div className="flex flex-col gap-2">
          {RECENT_ALERTS.map((alert, i) => (
            <div key={i} className="rounded-lg border border-border/40 bg-card/60 p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-medium text-foreground">{alert.title}</span>
                <span className="text-[8px] text-muted-foreground/40 ml-auto">{alert.time}</span>
              </div>
              <p className="text-[9px] text-muted-foreground/60 pl-3.5">{alert.detail}</p>
              <div className="flex items-center gap-1.5 mt-1.5 pl-3.5">
                {alert.channel === "slack" ? (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-muted-foreground/30"><rect x="1" y="4" width="4" height="4" rx="1" fill="currentColor" /><rect x="7" y="4" width="4" height="4" rx="1" fill="currentColor" /><rect x="4" y="1" width="4" height="4" rx="1" fill="currentColor" /><rect x="4" y="7" width="4" height="4" rx="1" fill="currentColor" /></svg>
                ) : (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-muted-foreground/30"><rect x="1" y="2" width="10" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1" /><path d="M1 3l5 3.5L11 3" fill="none" stroke="currentColor" strokeWidth="0.8" /></svg>
                )}
                <span className="text-[8px] text-muted-foreground/30 capitalize">{alert.channel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-[8px] text-muted-foreground/30 mt-2 text-center">Alert via Email, Slack, Webhook · Routing per team</p>
    </div>
  );
}
