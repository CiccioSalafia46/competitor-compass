import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useDemoOrchestrator } from "./useDemoOrchestrator";
import DemoStage from "./DemoStage";
import StepNavigator from "./StepNavigator";
import Step01ConnectScene from "./Step01ConnectScene";
import Step02CompetitorsScene from "./Step02CompetitorsScene";
import Step03AnalyzeScene from "./Step03AnalyzeScene";
import Step04ActScene from "./Step04ActScene";

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
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0, rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { visRef: ref, visible };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function HowItWorksSection() {
  const { t } = useTranslation("home");
  const { user } = useAuth();
  const navigate = useNavigate();
  const cta = user ? "/dashboard" : "/auth";

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

  const { activeStep, isPlaying, stepProgress, totalProgress, goToStep, togglePlay } =
    useDemoOrchestrator(visible && entered, reducedMotion);

  const scenes = [
    <Step01ConnectScene progress={stepProgress} active={activeStep === 0} />,
    <Step02CompetitorsScene progress={stepProgress} active={activeStep === 1} />,
    <Step03AnalyzeScene progress={stepProgress} active={activeStep === 2} />,
    <Step04ActScene progress={stepProgress} active={activeStep === 3} />,
  ];

  return (
    <section id="how" className="bg-muted/20 border-y border-border/40">
      <div ref={mergedRef} className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* Header */}
        <div className={cn(
          "text-center mb-10 sm:mb-14 transition-all duration-500",
          entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-4">{t("howItWorks.badge")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            {t("howItWorks.headline")}
          </h2>
          <p className="text-base text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
            {t("howItWorks.desc")}
          </p>
          {/* Time booster */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/50">
            <span className="font-medium text-primary/70">Setup totale: ~ 4 min 12 sec</span>
            <span>·</span>
            <span>Nessuna carta</span>
            <span>·</span>
            <span>Cancellazione anytime</span>
          </div>
        </div>

        {/* Demo layout: navigator + stage */}
        <div className={cn(
          "flex flex-col lg:flex-row gap-5 lg:gap-6 max-w-5xl mx-auto transition-all duration-500",
          entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        )} style={{ transitionDelay: entered ? "200ms" : "0ms" }}>

          {/* Step navigator — left on desktop, below on mobile */}
          <StepNavigator
            activeStep={activeStep}
            isPlaying={isPlaying}
            onStepClick={goToStep}
            onTogglePlay={togglePlay}
            className="lg:w-[38%] order-2 lg:order-1"
          />

          {/* Demo stage — right on desktop, above on mobile */}
          <div className="lg:w-[62%] order-1 lg:order-2">
            <DemoStage totalProgress={totalProgress}>
              {/* Cross-fade between scenes */}
              <div className="relative w-full h-full">
                {scenes.map((scene, i) => (
                  <div
                    key={i}
                    id={`demo-panel-${i}`}
                    role="tabpanel"
                    aria-hidden={activeStep !== i}
                    className={cn(
                      "absolute inset-0 transition-all duration-200",
                      activeStep === i
                        ? "opacity-100 translate-x-0"
                        : i < activeStep
                          ? "opacity-0 -translate-x-3"
                          : "opacity-0 translate-x-3",
                    )}
                  >
                    {scene}
                  </div>
                ))}
              </div>
            </DemoStage>

            {/* Social proof under stage */}
            <p className={cn(
              "text-center text-[10px] text-muted-foreground/35 mt-2 transition-opacity duration-500",
              entered ? "opacity-100" : "opacity-0",
            )} style={{ transitionDelay: "800ms" }}>
              Configured by 1,847 teams in the last 30 days
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className={cn(
          "text-center mt-12 sm:mt-16 transition-all duration-500",
          entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )} style={{ transitionDelay: entered ? "400ms" : "0ms" }}>
          <p className="text-sm text-primary/60 font-medium mb-3">
            {t("howItWorks.ctaAbove", { defaultValue: "Ready in less than 5 minutes." })}
          </p>
          <Button
            size="lg"
            className="h-12 px-8 text-sm gap-2 font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 group"
            onClick={() => navigate(cta)}
          >
            {user ? t("nav.dashboard", { defaultValue: "Dashboard" }) : t("hero.ctaStart", { defaultValue: "Start free" })}
            <svg viewBox="0 0 16 16" className="w-4 h-4 transition-transform duration-[2000ms] ease-in-out group-hover:translate-x-0.5 demo-arrow-nudge">
              <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
          {/* Reassurances */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-4 text-[11px] text-muted-foreground/50">
            {["Free forever plan", "No credit card", "Setup in 5 min"].map((r) => (
              <span key={r} className="flex items-center gap-1">
                <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-emerald-500/60"><path d="M2 5 L4 7 L8 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
