import { cn } from "@/lib/utils";
import { Info, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

export type NotificationLevel = "info" | "warning" | "error" | "success";

interface NotificationLevelBadgeProps {
  level: NotificationLevel;
  showIcon?: boolean;
  className?: string;
}

const levelStyles: Record<NotificationLevel, string> = {
  info: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  error: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
};

const levelIcons: Record<NotificationLevel, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
};

export function NotificationLevelBadge({
  level,
  showIcon = false,
  className,
}: NotificationLevelBadgeProps) {
  const Icon = levelIcons[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium capitalize px-2 py-0.5 rounded-md",
        levelStyles[level],
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3" strokeWidth={1.5} />}
      {level}
    </span>
  );
}

/**
 * Maps backend alert severity values (high/medium/info/low) to NotificationLevel.
 * Use in the presentation layer only — does NOT modify stored data.
 */
export function mapAlertSeverityToLevel(severity: string): NotificationLevel {
  switch (severity.toLowerCase()) {
    case "high":
    case "critical":
      return "error";
    case "medium":
      return "warning";
    case "success":
    case "resolved":
      return "success";
    case "low":
    case "info":
    default:
      return "info";
  }
}
