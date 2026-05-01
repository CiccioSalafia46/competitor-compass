import { cn } from "@/lib/utils";

interface DemoStageProps {
  children: React.ReactNode;
  totalProgress: number;
  className?: string;
}

export default function DemoStage({ children, totalProgress, className }: DemoStageProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Progress bar above frame */}
      <div className="h-1 bg-muted/60 rounded-full mb-2 overflow-hidden" role="progressbar" aria-valuenow={Math.round(totalProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full bg-primary/50 rounded-full transition-[width] duration-200 ease-linear"
          style={{ width: `${totalProgress * 100}%` }}
        />
      </div>

      {/* Browser frame */}
      <div className="rounded-xl border border-border/60 bg-card shadow-lg shadow-black/[0.03] overflow-hidden">
        {/* macOS title bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/40 bg-muted/20">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
          <div className="flex-1 text-center">
            <span className="text-[9px] text-muted-foreground/40 font-medium">app.tracklyze.com</span>
          </div>
        </div>

        {/* Stage content */}
        <div className="relative h-[300px] sm:h-[320px] lg:h-[340px] overflow-hidden bg-background/50">
          {children}
        </div>
      </div>
    </div>
  );
}
