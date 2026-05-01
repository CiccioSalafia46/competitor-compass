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

export const SIGNAL_CATEGORY_STYLES: Record<
  SignalCategory,
  { labelKey: string; dotClassName: string; badgeClassName: string }
> = {
  pricing: {
    labelKey: "signalCategoryPricing",
    dotClassName: "bg-warning",
    badgeClassName: "border-warning/20 bg-warning/10 text-warning",
  },
  hiring: {
    labelKey: "signalCategoryHiring",
    dotClassName: "bg-success",
    badgeClassName: "border-success/20 bg-success/10 text-success",
  },
  content: {
    labelKey: "signalCategoryContent",
    dotClassName: "bg-info",
    badgeClassName: "border-info/20 bg-info/10 text-info",
  },
  campaign: {
    labelKey: "signalCategoryCampaign",
    dotClassName: "bg-primary",
    badgeClassName: "border-primary/20 bg-primary/10 text-primary",
  },
  inbox: {
    labelKey: "signalCategoryInbox",
    dotClassName: "bg-muted-foreground",
    badgeClassName: "border-border bg-muted/60 text-muted-foreground",
  },
};

export const PRIORITY_STYLES: Record<
  InsightPriorityLevel,
  { dotClassName: string; badgeClassName: string; rowClassName: string }
> = {
  high: {
    dotClassName: "bg-destructive",
    badgeClassName: "border-destructive/20 bg-destructive/10 text-destructive",
    rowClassName: "border-l-destructive",
  },
  medium: {
    dotClassName: "bg-warning",
    badgeClassName: "border-warning/20 bg-warning/10 text-warning",
    rowClassName: "border-l-warning",
  },
  low: {
    dotClassName: "bg-primary",
    badgeClassName: "border-primary/20 bg-primary/10 text-primary",
    rowClassName: "border-l-primary",
  },
};
