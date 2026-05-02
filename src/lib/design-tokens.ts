/**
 * Design Tokens — Semantic color system for Tracklyze
 *
 * 5 accent colors with fixed semantic meaning:
 * - Violet: brand primary, CTA, Today's Brief, high priority
 * - Blue: signals, inbox, communications
 * - Green: success, completed, healthy
 * - Orange: warning, medium priority, attention
 * - Pink: competitors, tracked entities, opportunities
 */

// ─── Semantic palette (Tailwind classes) ─────────────────────────────

export const SEMANTIC_COLORS = {
  violet: {
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-950/40",
    bgSubtle: "bg-violet-50/60 dark:bg-violet-950/20",
    border: "border-violet-200 dark:border-violet-800/40",
    borderLeft: "border-l-violet-500 dark:border-l-violet-400",
    dot: "bg-violet-500 dark:bg-violet-400",
    fill: "fill-violet-500/70 dark:fill-violet-400/70",
    fillMuted: "fill-violet-500/35 dark:fill-violet-400/35",
    icon: "text-violet-500 dark:text-violet-400",
  },
  blue: {
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-950/40",
    bgSubtle: "bg-blue-50/60 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800/40",
    borderLeft: "border-l-blue-500 dark:border-l-blue-400",
    dot: "bg-blue-500 dark:bg-blue-400",
    fill: "fill-blue-500/70 dark:fill-blue-400/70",
    fillMuted: "fill-blue-500/35 dark:fill-blue-400/35",
    icon: "text-blue-500 dark:text-blue-400",
  },
  green: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    bgSubtle: "bg-emerald-50/60 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800/40",
    borderLeft: "border-l-emerald-500 dark:border-l-emerald-400",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    fill: "fill-emerald-500/70 dark:fill-emerald-400/70",
    fillMuted: "fill-emerald-500/35 dark:fill-emerald-400/35",
    icon: "text-emerald-500 dark:text-emerald-400",
  },
  orange: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-950/40",
    bgSubtle: "bg-amber-50/60 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800/40",
    borderLeft: "border-l-amber-500 dark:border-l-amber-400",
    dot: "bg-amber-500 dark:bg-amber-400",
    fill: "fill-amber-500/70 dark:fill-amber-400/70",
    fillMuted: "fill-amber-500/35 dark:fill-amber-400/35",
    icon: "text-amber-500 dark:text-amber-400",
  },
  pink: {
    text: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-100 dark:bg-pink-950/40",
    bgSubtle: "bg-pink-50/60 dark:bg-pink-950/20",
    border: "border-pink-200 dark:border-pink-800/40",
    borderLeft: "border-l-pink-500 dark:border-l-pink-400",
    dot: "bg-pink-500 dark:bg-pink-400",
    fill: "fill-pink-500/70 dark:fill-pink-400/70",
    fillMuted: "fill-pink-500/35 dark:fill-pink-400/35",
    icon: "text-pink-500 dark:text-pink-400",
  },
} as const;

export type SemanticColor = keyof typeof SEMANTIC_COLORS;

// ─── Section → Color mapping ────────────────────────────────────────

export const SECTION_COLORS: Record<string, SemanticColor> = {
  signals: "blue",
  competitors: "pink",
  insights: "violet",
  health: "green",
  alerts: "orange",
  inbox: "blue",
  reports: "green",
  metaAds: "pink",
  dataSources: "orange",
  dashboard: "violet",
};

// ─── Competitor brand colors ────────────────────────────────────────
// Deterministic: each competitor always gets the same color based on name hash.

const COMPETITOR_PALETTE: SemanticColor[] = ["pink", "blue", "violet", "green", "orange"];

export function getCompetitorColor(name: string): SemanticColor {
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return COMPETITOR_PALETTE[hash % COMPETITOR_PALETTE.length];
}

// ─── Signal category → Semantic color ───────────────────────────────

export const SIGNAL_CATEGORY_COLORS: Record<string, SemanticColor> = {
  pricing: "green",
  hiring: "blue",
  content: "violet",
  campaign: "orange",
  inbox: "blue",
};

// ─── KPI card definitions ───────────────────────────────────────────

export const KPI_CARDS = [
  { key: "signals", color: "blue" as SemanticColor, eyebrow: "Signals" },
  { key: "competitors", color: "pink" as SemanticColor, eyebrow: "Competitors" },
  { key: "insights", color: "violet" as SemanticColor, eyebrow: "Insights" },
  { key: "health", color: "green" as SemanticColor, eyebrow: "Health" },
] as const;

// ─── Sidebar nav icon colors ────────────────────────────────────────

export const NAV_ICON_COLORS: Record<string, string> = {
  "/dashboard": "text-violet-500 dark:text-violet-400",
  "/inbox": "text-blue-500 dark:text-blue-400",
  "/competitors": "text-pink-500 dark:text-pink-400",
  "/newsletters": "text-amber-500 dark:text-amber-400",
  "/insights": "text-violet-500 dark:text-violet-400",
  "/reports": "text-emerald-500 dark:text-emerald-400",
  "/alerts": "text-amber-500 dark:text-amber-400",
  "/meta-ads": "text-pink-500 dark:text-pink-400",
};
