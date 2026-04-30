import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Lucide icon rendered before the title */
  icon?: LucideIcon;
  /** Actions rendered on the right side */
  actions?: ReactNode;
  /** Additional className */
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
          {subtitle && (
            <p className="text-caption text-muted-foreground/70 hidden sm:block truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
