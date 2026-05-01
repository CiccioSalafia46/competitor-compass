import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PROBLEM_TRANSITIONS } from "./problemData";
import ScatteredDocsScene from "./ScatteredDocsScene";
import EndlessChecklistScene from "./EndlessChecklistScene";
import MissedSignalsScene from "./MissedSignalsScene";

// ─── IntersectionObserver: fires once ───────────────────────────────────────

function useInViewOnce(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// Pause animations when out of viewport
function useVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { visRef: ref, isVisible };
}

// ─── Single Problem Card ────────────────────────────────────────────────────

interface ProblemCardProps {
  title: string;
  desc: string;
  transition: string;
  index: number;
  entered: boolean;
  active: boolean;
  scene: (props: { active: boolean; hovered: boolean }) => React.ReactNode;
}

function ProblemCard({ title, desc, transition, index, entered, active, scene }: ProblemCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border/60 bg-card/60 p-6 transition-all duration-500 ease-out",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-sm",
        "focus-within:-translate-y-0.5 focus-within:border-border focus-within:shadow-sm",
        entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
      )}
      style={{
        transitionDelay: entered ? `${200 + index * 120}ms` : "0ms",
        transitionProperty: "opacity, transform, border-color, box-shadow",
      }}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Micro-scene visual */}
      <div className="mb-4 -mx-2">
        {scene({ active, hovered })}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>

      {/* Transition line — hover/focus on desktop, always visible on mobile */}
      <div
        className={cn(
          "mt-3 pt-2 border-t border-border/30 text-[11px] text-primary/70 font-medium flex items-center gap-1 transition-all duration-300",
          // Desktop: reveal on hover/focus
          "sm:opacity-0 sm:translate-y-1 sm:max-h-0 sm:pt-0 sm:mt-0 sm:border-t-0 sm:overflow-hidden",
          (hovered) && "sm:opacity-100 sm:translate-y-0 sm:max-h-10 sm:pt-2 sm:mt-3 sm:border-t",
          // Mobile: always visible
          "opacity-70",
        )}
      >
        <span className="text-primary">→</span> {transition}
      </div>
    </div>
  );
}

// ─── Main Section ───────────────────────────────────────────────────────────

interface ProblemSectionProps {
  className?: string;
}

export default function ProblemSection({ className }: ProblemSectionProps) {
  const { t } = useTranslation("home");
  const { ref, inView } = useInViewOnce(0.15);
  const { visRef, isVisible } = useVisibility();
  const [entered, setEntered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const handler = () => setReducedMotion(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (inView) setEntered(true);
  }, [inView]);

  const animActive = entered && isVisible && !reducedMotion;

  // Merge refs
  const mergedRef = (node: HTMLDivElement | null) => {
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    (visRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  const cards = [
    { title: t("problem.card1Title"), desc: t("problem.card1Desc"), transition: PROBLEM_TRANSITIONS[0] },
    { title: t("problem.card2Title"), desc: t("problem.card2Desc"), transition: PROBLEM_TRANSITIONS[1] },
    { title: t("problem.card3Title"), desc: t("problem.card3Desc"), transition: PROBLEM_TRANSITIONS[2] },
  ];

  const scenes = [
    (props: { active: boolean; hovered: boolean }) => <ScatteredDocsScene {...props} />,
    (props: { active: boolean; hovered: boolean }) => <EndlessChecklistScene {...props} />,
    (props: { active: boolean; hovered: boolean }) => <MissedSignalsScene {...props} />,
  ];

  return (
    <div ref={mergedRef} className={className}>
      {/* Header */}
      <div
        className={cn(
          "text-center mb-12 transition-all duration-500",
          entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-4">
          {t("problem.badge")}
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.15]">
          {t("problem.headline")}<br className="hidden sm:block" />
          <span className="text-muted-foreground/60 font-normal">{t("problem.headlineSub")}</span>
        </h2>
      </div>

      {/* Cards grid */}
      <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {cards.map((card, i) => (
          <ProblemCard
            key={card.title}
            title={card.title}
            desc={card.desc}
            transition={card.transition}
            index={i}
            entered={entered}
            active={animActive}
            scene={scenes[i]}
          />
        ))}
      </div>
    </div>
  );
}
