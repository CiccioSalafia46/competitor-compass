import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: ReactNode;
  /** Page title displayed in the header */
  title?: string;
  /** Short description below the title */
  description?: string;
  /** Actions rendered on the right side of the header */
  actions?: ReactNode;
  /** Max-width constraint — defaults to 7xl */
  maxWidth?: "4xl" | "5xl" | "6xl" | "7xl" | "full";
  /** Additional className on the root wrapper */
  className?: string;
}

const MAX_WIDTH_MAP = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
} as const;

export function PageShell({
  children,
  title,
  description,
  actions,
  maxWidth = "7xl",
  className,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full animate-fade-in",
        "p-4 sm:p-6 lg:p-8",
        MAX_WIDTH_MAP[maxWidth],
        className,
      )}
    >
      {(title || actions) && (
        <div className="page-header mb-6">
          <div className="min-w-0">
            {title && <h1 className="page-title">{title}</h1>}
            {description && <p className="page-description mt-1">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
