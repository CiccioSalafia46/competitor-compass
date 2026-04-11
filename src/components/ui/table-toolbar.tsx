import { type ReactNode, type ComponentType } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * TableToolbar — reusable search + action bar above a data table.
 */
interface TableToolbarProps {
  /** Controlled search value */
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  /** Right-side slot: extra filter controls, action buttons */
  actions?: ReactNode;
  className?: string;
}

export function TableToolbar({
  search,
  onSearch,
  placeholder = "Search…",
  actions,
  className,
}: TableToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="h-8 pl-8 text-sm"
        />
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * TablePagination — reusable prev/next pagination row beneath a data table.
 */
interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  /** page is 1-based */
  onPageChange: (page: number) => void;
  className?: string;
}

export function TablePagination({
  page,
  totalPages,
  totalCount,
  perPage,
  onPageChange,
  className,
}: TablePaginationProps) {
  const from = Math.min((page - 1) * perPage + 1, totalCount);
  const to = Math.min(page * perPage, totalCount);

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <p className="text-xs text-muted-foreground tabular-nums">
        {totalCount === 0 ? "No results" : `${from}–${to} of ${totalCount}`}
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * TableShell — consistent bordered container for all data tables.
 * Replaces the <Card><CardContent className="p-0"> pattern.
 */
export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden",
      "[&_thead_tr]:border-b [&_thead_tr]:bg-muted/30",
      "[&_thead_th]:text-[11px] [&_thead_th]:font-medium [&_thead_th]:tracking-wide [&_thead_th]:text-muted-foreground/70",
      className,
    )}>
      {children}
    </div>
  );
}

/**
 * TableEmptyRow — reusable "no data" row with optional icon.
 */
export function TableEmptyRow({
  colSpan,
  message = "No data found",
  icon: Icon,
}: {
  colSpan: number;
  message?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        {Icon && <Icon className="mx-auto mb-2.5 h-8 w-8 text-muted-foreground/25" />}
        <p className="text-sm text-muted-foreground">{message}</p>
      </td>
    </tr>
  );
}
