// Constants for PlatformExplorer

export interface PlatformFeature {
  id: string;
  title: string;
  subtitle: string;
  icon: string; // SVG path identifier
}

export const PLATFORM_FEATURES: PlatformFeature[] = [
  { id: "hub", title: "Competitor Hub", subtitle: "All competitors at a glance", icon: "grid" },
  { id: "stream", title: "Signal Stream", subtitle: "Continuous AI-extracted feed", icon: "activity" },
  { id: "insights", title: "AI Insights", subtitle: "Patterns & recommendations", icon: "sparkle" },
  { id: "alerts", title: "Smart Alerts", subtitle: "Notifications on moves that matter", icon: "bell" },
  { id: "reports", title: "Reports & Analytics", subtitle: "Trends, comparisons, exports", icon: "chart" },
];

export const COMPETITOR_CARDS = [
  { name: "Acme Corp", letter: "A", signals: 23, trend: "up", category: "Direct" },
  { name: "Globex Inc", letter: "G", signals: 18, trend: "up", category: "Direct" },
  { name: "Initech", letter: "I", signals: 12, trend: "flat", category: "Adjacent" },
  { name: "Umbrella Co", letter: "U", signals: 9, trend: "down", category: "Watchlist" },
  { name: "Wonka Labs", letter: "W", signals: 15, trend: "up", category: "Adjacent" },
  { name: "Stark Ind", letter: "S", signals: 7, trend: "flat", category: "Direct" },
];

export const SIGNAL_FEED = [
  { tag: "Pricing", tagColor: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40", competitor: "Acme Corp", text: "Pro plan price changed: $49 → $39", time: "2m ago" },
  { tag: "Hiring", tagColor: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40", competitor: "Globex Inc", text: "3 new SDR positions on LinkedIn", time: "18m ago" },
  { tag: "Content", tagColor: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40", competitor: "Initech", text: "Published comparison page vs 4 competitors", time: "1h ago" },
  { tag: "Ad", tagColor: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/40", competitor: "Acme Corp", text: "New LinkedIn campaign targeting enterprise", time: "2h ago" },
  { tag: "Product", tagColor: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40", competitor: "Wonka Labs", text: "AI features added to all pricing tiers", time: "3h ago" },
  { tag: "Pricing", tagColor: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40", competitor: "Stark Ind", text: "Free trial extended from 7 to 14 days", time: "5h ago" },
];

export const INSIGHTS_DATA = [
  { title: "Acme Corp accelerating on LinkedIn", desc: "+47% posts in 30 days. Imminent launch signal detected." },
  { title: "Market pattern forming: AI features", desc: "3 of 5 competitors added AI to pricing. Category-wide shift." },
  { title: "Initech reducing prices (-3% QoQ)", desc: "Possible repositioning window for your mid-market tier." },
];

export const ALERT_RULES = [
  { label: "Price change > 10%", active: true },
  { label: "New feature launched", active: true },
  { label: "Leadership hiring", active: true },
];

export const RECENT_ALERTS = [
  { title: "Acme Corp pricing change", detail: "Pro: $49 → $39 (-20%)", time: "12m ago", channel: "slack" },
  { title: "Globex new VP Sales hire", detail: "LinkedIn profile matched", time: "2h ago", channel: "email" },
];

export const AUTO_TOUR_DELAY = 6000; // ms before auto-tour starts
export const AUTO_TOUR_INTERVAL = 5000; // ms per feature during auto-tour
