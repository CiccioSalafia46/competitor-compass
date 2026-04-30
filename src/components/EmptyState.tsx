import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Icon displayed above the message */
  icon: LucideIcon;
  /** Main heading */
  title: string;
  /** Supporting description */
  description?: string;
  /** CTA button label */
  actionLabel?: string;
  /** CTA click handler */
  onAction?: () => void;
  /** Additional className */
  className?: string;
  /** Compact variant for inline usage (inside cards) */
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-6",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-muted/40 mb-5",
          compact ? "h-11 w-11" : "h-14 w-14",
        )}
      >
        <Icon className={cn("text-muted-foreground/60", compact ? "h-5 w-5" : "h-7 w-7")} />
      </div>
      <h3 className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
