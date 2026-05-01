import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PLATFORM_FEATURES } from "./platformData";
import { usePlatformTour } from "./usePlatformTour";
import CompetitorHubStage from "./CompetitorHubStage";
import SignalStreamStage from "./SignalStreamStage";
import AIInsightsStage from "./AIInsightsStage";
import SmartAlertsStage from "./SmartAlertsStage";
import ReportsAnalyticsStage from "./ReportsAnalyticsStage";

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useInViewOnce(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0, rootMargin: "100px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { visRef: ref, visible };
}

// ─── Sidebar Icon ───────────────────────────────────────────────────────────

function FeatureIcon({ icon, className }: { icon: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" /><rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" /><rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" /><rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" /></>,
    activity: <polyline points="1,8 4,4 7,9 10,3 13,7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />,
    sparkle: <path d="M7 1l1.2 2.8h2.8l-2.2 1.8.8 2.8L7 6.8 4.4 8.4l.8-2.8L3 3.8h2.8z" fill="currentColor" />,
    bell: <><path d="M7 1.5c-2.5 0-4 2-4 4v3l-1 1.5h10l-1-1.5v-3c0-2-1.5-4-4-4z" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 11.5c0 1 .7 1.5 1.5 1.5s1.5-.5 1.5-1.5" fill="none" stroke="currentColor" strokeWidth="1" /></>,
    chart: <><rect x="2" y="7" width="2" height="5" rx="0.5" fill="currentColor" /><rect x="6" y="4" width="2" height="8" rx="0.5" fill="currentColor" /><rect x="10" y="2" width="2" height="10" rx="0.5" fill="currentColor" /></>,
  };
  return <svg viewBox="0 0 14 14" className={className}>{paths[icon]}</svg>;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PlatformExplorer() {
  const { t } = useTranslation("home");
  const { ref, inView } = useInViewOnce(0.1);
  const { visRef, visible } = useVisibility();
  const [entered, setEntered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const h = () => setReducedMotion(mql.matches);
    mql.addEventListener("change", h);
    return () => mql.removeEventListener("change", h);
  }, []);

  useEffect(() => { if (inView) setEntered(true); }, [inView]);

  const mergedRef = (node: HTMLDivElement | null) => {
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    (visRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  const { activeIdx, autoTour, goTo, stopAutoTour } = usePlatformTour(visible && entered, reducedMotion);

  const stages = [
    <CompetitorHubStage active={activeIdx === 0 && visible} />,
    <SignalStreamStage active={activeIdx === 1 && visible} />,
    <AIInsightsStage active={activeIdx === 2 && visible} />,
    <SmartAlertsStage active={activeIdx === 3 && visible} />,
    <ReportsAnalyticsStage active={activeIdx === 4 && visible} />,
  ];

  return (
    <section id="platform" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <div ref={mergedRef}>
        {/* Header */}
        <div className={cn(
          "text-center mb-10 transition-all duration-500",
          entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-4">
            {t("platform.badge")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Explore Tracklyze.
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto">
            Five areas, one platform, zero context-switching.
          </p>
        </div>

        {/* Explorer body */}
        <div className={cn(
          "flex flex-col lg:flex-row gap-0 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden shadow-sm transition-all duration-500",
          entered ? "opacity-100 scale-100" : "opacity-0 scale-[0.97]",
        )} style={{ transitionDelay: entered ? "200ms" : "0ms" }}>

          {/* Sidebar */}
          <nav className="lg:w-[28%] border-b lg:border-b-0 lg:border-r border-border/40 bg-muted/10 p-3 lg:p-4">
            {/* Mobile: horizontal scroll. Desktop: vertical list */}
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              {PLATFORM_FEATURES.map((feat, i) => (
                <button
                  key={feat.id}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg px-3 py-2 lg:py-2.5 text-left transition-all duration-200 shrink-0",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
                    activeIdx === i
                      ? "bg-primary/[0.07] lg:pl-4"
                      : "opacity-70 hover:opacity-100 hover:bg-muted/30",
                  )}
                  onClick={() => goTo(i)}
                  aria-current={activeIdx === i ? "page" : undefined}
                >
                  {/* Active bar (desktop only) */}
                  {activeIdx === i && (
                    <div className="hidden lg:block absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" />
                  )}
                  <FeatureIcon icon={feat.icon} className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-colors",
                    activeIdx === i ? "text-primary" : "text-muted-foreground/50",
                  )} />
                  <div className="min-w-0">
                    <p className={cn(
                      "text-[11px] whitespace-nowrap transition-all",
                      activeIdx === i ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                    )}>{feat.title}</p>
                    <p className="text-[9px] text-muted-foreground/40 hidden lg:block truncate">{feat.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Auto-tour indicator */}
            {autoTour && (
              <div className="hidden lg:flex items-center gap-1.5 mt-3 px-3">
                <button onClick={stopAutoTour} className="text-[9px] text-muted-foreground/40 hover:text-muted-foreground flex items-center gap-1" aria-label="Stop auto-tour">
                  <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><rect x="2" y="2" width="2.5" height="6" rx="0.5" fill="currentColor" /><rect x="5.5" y="2" width="2.5" height="6" rx="0.5" fill="currentColor" /></svg>
                  Auto-tour
                </button>
              </div>
            )}

            {/* Trust badge */}
            <div className="hidden lg:flex items-center gap-1.5 mt-4 pt-3 border-t border-border/30 px-3">
              <svg viewBox="0 0 12 14" className="w-3 h-3.5 text-muted-foreground/25 shrink-0"><path d="M6 1L1 3.5v4c0 3.5 5 5.5 5 5.5s5-2 5-5.5v-4L6 1z" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
              <span className="text-[8px] text-muted-foreground/30">SOC 2 · GDPR · Read-only</span>
            </div>
          </nav>

          {/* Stage */}
          <div className="lg:w-[72%] relative">
            {/* Live badge */}
            <div className="absolute top-2 right-3 z-10 flex items-center gap-1 text-[8px] font-medium text-primary/50 bg-primary/[0.05] px-1.5 py-0.5 rounded">
              <div className="w-1 h-1 rounded-full bg-primary/60" />
              Live preview
            </div>

            {/* Stage content */}
            <div className="h-[320px] sm:h-[360px] lg:h-[380px] relative overflow-hidden" aria-live="polite">
              {stages.map((stage, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute inset-0 transition-all duration-200",
                    activeIdx === i
                      ? "opacity-100 translate-x-0"
                      : i < activeIdx
                        ? "opacity-0 -translate-x-2"
                        : "opacity-0 translate-x-2",
                  )}
                  aria-hidden={activeIdx !== i}
                >
                  {stage}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile trust badge */}
        <div className="flex lg:hidden items-center justify-center gap-1.5 mt-3">
          <svg viewBox="0 0 12 14" className="w-3 h-3.5 text-muted-foreground/25"><path d="M6 1L1 3.5v4c0 3.5 5 5.5 5 5.5s5-2 5-5.5v-4L6 1z" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
          <span className="text-[9px] text-muted-foreground/30">SOC 2 · GDPR · Read-only access</span>
        </div>
      </div>
    </section>
  );
}
