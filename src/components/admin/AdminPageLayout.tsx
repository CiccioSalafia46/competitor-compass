import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPageLayoutProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Tailwind max-width class applied to both header and content, default max-w-7xl */
  maxWidth?: string;
}

/**
 * Consistent admin page frame: sticky header with border-bottom + padded content area.
 * All admin sub-pages should use this instead of an inline `<div className="p-6 ...">`.
 */
export function AdminPageLayout({
  title,
  description,
  actions,
  children,
  maxWidth = "max-w-7xl",
}: AdminPageLayoutProps) {
  return (
    <div className="flex min-h-full flex-col">
      {/* ── Sticky page header ──────────────────────────────────────── */}
      <div className="sticky top-0 z-10 shrink-0 border-b bg-background/95 backdrop-blur-sm">
        <div className={cn("flex items-center justify-between gap-4 px-6 py-[14px]", maxWidth)}>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold leading-tight tracking-tight text-foreground">
              {title}
            </h1>
            {description != null && (
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────── */}
      <div className={cn("flex-1 space-y-5 px-6 py-5", maxWidth)}>
        {children}
      </div>
    </div>
  );
}
