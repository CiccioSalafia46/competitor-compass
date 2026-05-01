import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SOLUTION_EVIDENCE } from "./solutionData";
import OrganizedGridScene from "./OrganizedGridScene";
import AutoCompletingChecklistScene from "./AutoCompletingChecklistScene";
import CapturedSignalsScene from "./CapturedSignalsScene";

// ─── Hooks ──────────────────────────────────────────────────────────────────

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

// ─── Single Solution Card ───────────────────────────────────────────────────

interface SolutionCardProps {
  title: string;
  desc: string;
  evidence: string;
  index: number;
  entered: boolean;
  active: boolean;
  scene: (props: { active: boolean; hovered: boolean }) => React.ReactNode;
}

function SolutionCard({ title, desc, evidence, index, entered, active, scene }: SolutionCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-primary/15 bg-card/60 p-6 transition-all duration-500 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm hover:shadow-primary/5",
        "focus-within:-translate-y-0.5 focus-within:border-primary/30 focus-within:shadow-sm",
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
      {/* Micro-scene */}
      <div className="mb-4 -mx-2">
        {scene({ active, hovered })}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>

      {/* Evidence line */}
      <div
        className={cn(
          "mt-3 pt-2 border-t border-primary/15 text-[11px] text-primary/70 font-medium flex items-center gap-1 transition-all duration-300",
          "sm:opacity-0 sm:translate-y-1 sm:max-h-0 sm:pt-0 sm:mt-0 sm:border-t-0 sm:overflow-hidden",
          hovered && "sm:opacity-100 sm:translate-y-0 sm:max-h-10 sm:pt-2 sm:mt-3 sm:border-t sm:border-primary/15",
          "opacity-70",
        )}
      >
        <span className="text-primary">→</span> {evidence}
      </div>
    </div>
  );
}

// ─── Main Section ───────────────────────────────────────────────────────────

interface SolutionSectionProps {
  className?: string;
}

export default function SolutionSection({ className }: SolutionSectionProps) {
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

  const mergedRef = (node: HTMLDivElement | null) => {
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    (visRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  const cards = [
    { title: t("solution.card1Title"), desc: t("solution.card1Desc"), evidence: SOLUTION_EVIDENCE[0] },
    { title: t("solution.card2Title"), desc: t("solution.card2Desc"), evidence: SOLUTION_EVIDENCE[1] },
    { title: t("solution.card3Title"), desc: t("solution.card3Desc"), evidence: SOLUTION_EVIDENCE[2] },
  ];

  const scenes = [
    (props: { active: boolean; hovered: boolean }) => <OrganizedGridScene {...props} />,
    (props: { active: boolean; hovered: boolean }) => <AutoCompletingChecklistScene {...props} />,
    (props: { active: boolean; hovered: boolean }) => <CapturedSignalsScene {...props} />,
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
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/60 mb-4">
          {t("solution.badge")}
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.15]">
          {t("solution.headline")}<br className="hidden sm:block" />
          {t("solution.headlineSub")}
        </h2>
        <p className="text-base text-muted-foreground max-w-lg mx-auto mt-5 leading-relaxed">
          {t("solution.desc")}
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {cards.map((card, i) => (
          <SolutionCard
            key={card.title}
            title={card.title}
            desc={card.desc}
            evidence={card.evidence}
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
