import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MacWindowProps {
  children: ReactNode;
  title?: string;
  className?: string;
  bodyClassName?: string;
}

export function MacWindow({ children, title, className, bodyClassName }: MacWindowProps) {
  return (
    <div
      role="presentation"
      className={cn("overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm", className)}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border/30 bg-muted/20 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/60 sm:h-3 sm:w-3" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60 sm:h-3 sm:w-3" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400/60 sm:h-3 sm:w-3" />
        </div>
        {title && (
          <p className="hidden flex-1 text-center text-xs text-muted-foreground/60 select-none sm:block">
            {title}
          </p>
        )}
      </div>
      {/* Body */}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
