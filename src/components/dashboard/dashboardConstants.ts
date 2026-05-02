import type { InsightPriorityLevel } from "@/lib/insight-priority";

export const DASHBOARD_SECTION_KEYS = {
  header: "dashboardHeader",
  todayBrief: "todayBrief",
  actionQueue: "actionQueue",
  signalStream: "signalStream",
  competitorPulse: "competitorPulse",
  systemHealth: "systemHealth",
} as const;

export type SignalCategory = "pricing" | "hiring" | "content" | "campaign" | "inbox";

export const SIGNAL_CATEGORIES: SignalCategory[] = ["pricing", "hiring", "content", "campaign", "inbox"];

export const SIGNAL_CATEGORY_STYLES: Record<
  SignalCategory,
  { labelKey: string; dotClassName: string; badgeClassName: string }
> = {
  pricing: {
    labelKey: "signalCategoryPricing",
    dotClassName: "bg-emerald-500",
    badgeClassName: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  hiring: {
    labelKey: "signalCategoryHiring",
    dotClassName: "bg-blue-500",
    badgeClassName: "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400",
  },
  content: {
    labelKey: "signalCategoryContent",
    dotClassName: "bg-violet-500",
    badgeClassName: "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/40 dark:text-violet-400",
  },
  campaign: {
    labelKey: "signalCategoryCampaign",
    dotClassName: "bg-amber-500",
    badgeClassName: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400",
  },
  inbox: {
    labelKey: "signalCategoryInbox",
    dotClassName: "bg-muted-foreground",
    badgeClassName: "border-border bg-muted/60 text-muted-foreground",
  },
};

export const PRIORITY_STYLES: Record<
  InsightPriorityLevel,
  { dotClassName: string; badgeClassName: string; rowClassName: string; bgClassName: string; rowTint: string }
> = {
  high: {
    dotClassName: "bg-destructive",
    badgeClassName: "border-destructive/20 bg-destructive/10 text-destructive",
    rowClassName: "border-l-destructive",
    bgClassName: "bg-destructive/5",
    rowTint: "bg-red-50/40 dark:bg-red-950/15",
  },
  medium: {
    dotClassName: "bg-warning",
    badgeClassName: "border-warning/20 bg-warning/10 text-warning",
    rowClassName: "border-l-warning",
    bgClassName: "bg-warning/5",
    rowTint: "bg-amber-50/40 dark:bg-amber-950/15",
  },
  low: {
    dotClassName: "bg-primary",
    badgeClassName: "border-primary/20 bg-primary/10 text-primary",
    rowClassName: "border-l-primary",
    bgClassName: "",
    rowTint: "",
  },
};

/** Maps action-title keywords to a lucide icon name for ActionQueueRow */
export function getActionIconName(title: string): "target" | "alert-triangle" | "eye" | "zap" {
  const lower = title.toLowerCase();
  if (lower.includes("connect") || lower.includes("import") || lower.includes("add")) return "zap";
  if (lower.includes("limit") || lower.includes("capacity") || lower.includes("alert")) return "alert-triangle";
  if (lower.includes("review") || lower.includes("check") || lower.includes("investigate")) return "eye";
  return "target";
}
