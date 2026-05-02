import { cn } from "@/lib/utils";

type Severity = "high" | "medium" | "low";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

const severityStyles: Record<Severity, string> = {
  high: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200",
  medium: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium uppercase px-2 py-0.5 rounded-md tracking-wide",
        severityStyles[severity],
        className,
      )}
    >
      {severity}
    </span>
  );
}
