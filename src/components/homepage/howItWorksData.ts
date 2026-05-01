// Constants for HowItWorksSection

export const STEP_DURATIONS = [3000, 3500, 4000, 5000] as const; // ms per step
export const AUTOPLAY_RESUME_DELAY = 8000; // ms after manual click to resume
export const MOBILE_SPEED_FACTOR = 1.3; // 30% slower on mobile

export interface StepConfig {
  number: string;
  titleKey: string;
  descKey: string;
}

export const STEPS: StepConfig[] = [
  { number: "01", titleKey: "howItWorks.step1Title", descKey: "howItWorks.step1Desc" },
  { number: "02", titleKey: "howItWorks.step2Title", descKey: "howItWorks.step2Desc" },
  { number: "03", titleKey: "howItWorks.step3Title", descKey: "howItWorks.step3Desc" },
  { number: "04", titleKey: "howItWorks.step4Title", descKey: "howItWorks.step4Desc" },
];

export const INTEGRATIONS = [
  { label: "Email Provider", letter: "E" },
  { label: "Google Workspace", letter: "G" },
  { label: "Slack", letter: "S" },
  { label: "Notion", letter: "N" },
  { label: "LinkedIn", letter: "L" },
  { label: "Custom Domain", letter: "C" },
] as const;

export const COMPETITORS_TO_TYPE = [
  { name: "Acme Corp", domain: "acme.com", tag: "SaaS" },
  { name: "Globex Inc", domain: "globex.io", tag: "Enterprise" },
  { name: "Initech", domain: "initech.co", tag: "Mid-market" },
] as const;

export const AI_SIGNALS = [
  { tag: "Pricing", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40", competitor: "Acme Corp", text: "Nuovo piano Enterprise a $499/mese" },
  { tag: "Hiring", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40", competitor: "Globex Inc", text: "Hiring 3 SDR su LinkedIn" },
  { tag: "Content", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40", competitor: "Initech", text: "Pubblicato whitepaper su AI agents" },
  { tag: "Ad", color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/40", competitor: "Acme Corp", text: "Campagna LinkedIn B2B rilevata" },
  { tag: "Product", color: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40", competitor: "Globex Inc", text: "Aggiornamento pagina comparativa" },
  { tag: "Pricing", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40", competitor: "Initech", text: "Rimosso piano Free dalla pagina" },
] as const;
