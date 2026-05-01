import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { STEPS } from "./howItWorksData";

interface StepNavigatorProps {
  activeStep: number;
  isPlaying: boolean;
  onStepClick: (step: number) => void;
  onTogglePlay: () => void;
  className?: string;
}

export default function StepNavigator({ activeStep, isPlaying, onStepClick, onTogglePlay, className }: StepNavigatorProps) {
  const { t } = useTranslation("home");

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Steps list */}
      <div className="flex flex-col gap-1" role="tablist" aria-label="Demo steps">
        {STEPS.map((step, i) => {
          const isActive = activeStep === i;
          return (
            <button
              key={step.number}
              role="tab"
              aria-selected={isActive}
              aria-controls={`demo-panel-${i}`}
              className={cn(
                "relative text-left rounded-lg px-4 py-3 transition-all duration-300 border border-transparent",
                isActive
                  ? "bg-primary/[0.06] border-primary/20"
                  : "hover:bg-muted/40 opacity-55 hover:opacity-80",
              )}
              onClick={() => onStepClick(i)}
            >
              {/* Active accent bar */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary" />
              )}

              {/* Step number */}
              <span className={cn(
                "text-[10px] font-mono font-bold tabular-nums block mb-0.5 transition-colors duration-300",
                isActive ? "text-primary" : "text-muted-foreground/40",
              )}>
                {step.number}
              </span>

              {/* Title */}
              <h4 className={cn(
                "text-sm transition-all duration-300",
                isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
              )}>
                {t(step.titleKey)}
              </h4>

              {/* Description — only visible when active */}
              <p className={cn(
                "text-xs text-muted-foreground leading-relaxed overflow-hidden transition-all duration-300",
                isActive ? "max-h-20 mt-1.5 opacity-100" : "max-h-0 mt-0 opacity-0",
              )}>
                {t(step.descKey)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Play/Pause control */}
      <div className="mt-3 px-4 flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label={isPlaying ? "Pause demo" : "Play demo"}
        >
          {isPlaying ? (
            <svg viewBox="0 0 12 12" className="w-3 h-3"><rect x="2" y="2" width="3" height="8" rx="0.5" fill="currentColor" /><rect x="7" y="2" width="3" height="8" rx="0.5" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M3 1.5v9l7-4.5z" fill="currentColor" /></svg>
          )}
          {isPlaying ? "Pause" : "Play"}
        </button>
        {!isPlaying && (
          <span className="text-[9px] text-muted-foreground/30">Auto-play in 8s…</span>
        )}
      </div>
    </div>
  );
}
