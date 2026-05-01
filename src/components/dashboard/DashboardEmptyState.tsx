import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardEmptyStateProps {
  title: string;
  description?: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function DashboardEmptyState({ title, description, cta, className }: DashboardEmptyStateProps) {
  return (
    <div className={cn("rounded-lg border border-dashed bg-muted/20 px-4 py-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {cta && (
          <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 text-xs" onClick={cta.onClick}>
            {cta.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
