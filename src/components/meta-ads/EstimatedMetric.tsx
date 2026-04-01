import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface EstimatedMetricProps {
  label: string;
  range: { lower?: number; upper?: number } | null | undefined;
  prefix?: string;
  suffix?: string;
  methodology?: string;
}

export function EstimatedMetric({ label, range, prefix = "", suffix = "", methodology }: EstimatedMetricProps) {
  if (!range || (range.lower === undefined && range.upper === undefined)) {
    return (
      <div className="text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="ml-2 text-muted-foreground italic">Unavailable</span>
      </div>
    );
  }

  const lower = range.lower !== undefined ? `${prefix}${range.lower.toLocaleString()}${suffix}` : "?";
  const upper = range.upper !== undefined ? `${prefix}${range.upper.toLocaleString()}${suffix}` : "?";

  return (
    <div className="text-sm flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{lower} – {upper}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 gap-0.5 cursor-help text-warning border-warning/30">
            <Info className="h-2.5 w-2.5" />
            Est.
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs font-medium mb-1">Estimated Metric</p>
          <p className="text-xs text-muted-foreground">
            {methodology || "Range provided by Meta Ad Library. Actual values may differ. Do not use for precise budgeting."}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
