// ── Mock data for the interactive dashboard preview on the homepage ──────────

export interface MockCompetitor {
  id: string;
  name: string;
  initial: string;
  signalCount: number;
  deltaPercent: number;
  activitySeries: number[];
  aiInsight: string;
}

export interface MockSignal {
  id: string;
  category: "Pricing" | "Hiring" | "Product" | "Content" | "Funding";
  competitor: string;
  description: string;
  timeAgo: string;
}

export interface MockInsightCard {
  id: string;
  title: string;
  body: string;
  tag: string;
  tagColor: "primary" | "warning" | "success";
}

export const COMPETITORS: MockCompetitor[] = [
  {
    id: "acme",
    name: "Acme Corp",
    initial: "A",
    signalCount: 14,
    deltaPercent: 23,
    activitySeries: [40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 72],
    aiInsight:
      "Acme Corp ha intensificato l'attività su LinkedIn (+23% nelle ultime 4 settimane), con focus sulle feature di automazione. Probabile lancio prodotto nel Q2.",
  },
  {
    id: "globex",
    name: "Globex Inc",
    initial: "G",
    signalCount: 9,
    deltaPercent: 8,
    activitySeries: [30, 42, 38, 50, 45, 55, 48, 60, 52, 58, 62, 55],
    aiInsight:
      "Globex Inc sta pubblicando contenuti su AI agents a ritmo sostenuto. L'engagement è in crescita dell'8%. Strategia di thought leadership evidente.",
  },
  {
    id: "initech",
    name: "Initech",
    initial: "I",
    signalCount: 5,
    deltaPercent: -3,
    activitySeries: [55, 50, 48, 45, 40, 38, 35, 42, 30, 28, 32, 25],
    aiInsight:
      "Initech mostra segnali di rallentamento: -3% di attività e nessuna nuova campagna nelle ultime 2 settimane. Possibile finestra di posizionamento competitivo.",
  },
];

export const SIGNALS: MockSignal[] = [
  { id: "s1", category: "Pricing", competitor: "Acme Corp", description: "Ha aggiornato il pricing del piano Pro (+15%)", timeAgo: "2h fa" },
  { id: "s2", category: "Content", competitor: "Globex Inc", description: "Pubblicati 3 articoli su AI agents in una settimana", timeAgo: "4h fa" },
  { id: "s3", category: "Hiring", competitor: "Initech", description: "Sta cercando 2 SDR su LinkedIn", timeAgo: "ieri" },
  { id: "s4", category: "Product", competitor: "Acme Corp", description: "Nuova integrazione con Salesforce in beta", timeAgo: "ieri" },
  { id: "s5", category: "Funding", competitor: "Globex Inc", description: "Chiuso round Series B da $12M", timeAgo: "2 giorni fa" },
  { id: "s6", category: "Content", competitor: "Acme Corp", description: "Webinar su competitive intelligence con 400+ iscritti", timeAgo: "3 giorni fa" },
];

export const INSIGHT_CARDS: MockInsightCard[] = [
  {
    id: "i1",
    title: "Trend di mercato",
    body: "4 competitor su 5 stanno investendo su AI. L'automazione è il tema dominante del trimestre.",
    tag: "Trend",
    tagColor: "primary",
  },
  {
    id: "i2",
    title: "Opportunità competitiva",
    body: "Initech in calo (-3%) — finestra di posizionamento aperta nel segmento enterprise.",
    tag: "Opportunità",
    tagColor: "success",
  },
  {
    id: "i3",
    title: "Rischio pricing",
    body: "Acme Corp ha alzato i prezzi del 15%. Possibile churn verso alternative più economiche.",
    tag: "Attenzione",
    tagColor: "warning",
  },
];

const CATEGORY_COLORS: Record<MockSignal["category"], string> = {
  Pricing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Hiring: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Product: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Content: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Funding: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

export function getCategoryColor(cat: MockSignal["category"]): string {
  return CATEGORY_COLORS[cat];
}

const TAG_COLORS: Record<MockInsightCard["tagColor"], string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export function getTagColor(color: MockInsightCard["tagColor"]): string {
  return TAG_COLORS[color];
}

/** Simulate a small random update to competitor data (signal count ± 1, last bar ± 5) */
export function simulateUpdate(competitors: MockCompetitor[]): MockCompetitor[] {
  const idx = Math.floor(Math.random() * competitors.length);
  return competitors.map((c, i) => {
    if (i !== idx) return c;
    const delta = Math.random() > 0.4 ? 1 : -1;
    const newCount = Math.max(1, c.signalCount + delta);
    const newSeries = [...c.activitySeries];
    const lastBar = newSeries[newSeries.length - 1];
    newSeries[newSeries.length - 1] = Math.min(100, Math.max(10, lastBar + (Math.random() > 0.5 ? 3 : -2)));
    return { ...c, signalCount: newCount, activitySeries: newSeries };
  });
}
