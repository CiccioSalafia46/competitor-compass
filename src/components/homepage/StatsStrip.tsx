import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PROOF_LINES } from "./statsData";
import LiveTicker from "./LiveTicker";

// ─── IntersectionObserver hook (fires once) ─────────────────────────────────

function useInViewOnce(threshold = 0.2) {
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

// ─── Micro-visuals ──────────────────────────────────────────────────────────

function SpeedBars({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 80 32"
      className="w-full h-10"
      aria-hidden="true"
    >
      {/* Manual bar background */}
      <rect x="0" y="4" width="80" height="10" rx="5" fill="hsl(var(--muted))" />
      {/* Manual bar fill */}
      <rect
        x="0" y="4" width="0" height="10" rx="5"
        fill="hsl(var(--muted-foreground))"
        opacity="0.3"
        className={cn(active && "stats-bar-manual")}
      />
      <text x="2" y="12" className="fill-muted-foreground/50 text-[5px] font-medium">Manual</text>

      {/* Tracklyze bar background */}
      <rect x="0" y="20" width="80" height="10" rx="5" fill="hsl(var(--muted))" />
      {/* Tracklyze bar fill */}
      <rect
        x="0" y="20" width="0" height="10" rx="5"
        fill="hsl(var(--primary))"
        opacity="0.7"
        className={cn(active && "stats-bar-fast")}
      />
      <text x="2" y="28" className="fill-primary text-[5px] font-semibold">Tracklyze</text>
    </svg>
  );
}

function AutoRing({ active }: { active: boolean }) {
  const r = 14;
  const circumference = 2 * Math.PI * r;

  return (
    <svg
      viewBox="0 0 40 40"
      className="w-10 h-10 mx-auto"
      aria-hidden="true"
    >
      {/* Background ring */}
      <circle cx="20" cy="20" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
      {/* Animated fill ring */}
      <circle
        cx="20" cy="20" r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        className={cn(active && "stats-ring-fill")}
        style={{ "--ring-circumference": circumference } as React.CSSProperties}
        transform="rotate(-90 20 20)"
      />
      {/* Data points flowing in */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle
          key={i}
          cx="20" cy="20" r="1.5"
          fill="hsl(var(--primary))"
          opacity="0"
          className={cn(active && "stats-dot-flow")}
          style={{ animationDelay: `${2 + i * 0.6}s` }}
        />
      ))}
    </svg>
  );
}

function HeartbeatLine({ active }: { active: boolean }) {
  // ECG-style path
  const path = "M0,16 L12,16 L15,16 L17,6 L19,26 L21,12 L23,16 L35,16 L38,16 L40,6 L42,26 L44,12 L46,16 L58,16 L61,16 L63,6 L65,26 L67,12 L69,16 L80,16";

  return (
    <div className="relative w-full h-10 overflow-hidden" aria-hidden="true">
      {/* Day/night gradient */}
      <div className={cn("absolute inset-0 rounded-md", active && "stats-daynight")} />
      <svg viewBox="0 0 80 32" className="relative w-full h-full" preserveAspectRatio="none">
        <path
          d={path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="200"
          strokeDashoffset="200"
          className={cn(active && "stats-ecg-draw")}
        />
      </svg>
    </div>
  );
}

function StepsSequence({ active }: { active: boolean }) {
  const steps = ["Connect", "Scan", "Analyze", "Insight"];

  return (
    <div className="flex items-center gap-0.5 w-full h-10 px-1" aria-hidden="true">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-col items-center flex-1 relative">
          {/* Step circle */}
          <div
            className={cn(
              "w-4 h-4 rounded-full border-[1.5px] border-primary/30 flex items-center justify-center transition-all duration-300",
              active && "stats-step-activate",
            )}
            style={{ animationDelay: `${i * 0.6}s` }}
          >
            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 opacity-0 stats-step-check" style={{ animationDelay: `${i * 0.6 + 0.2}s` }}>
              <path d="M2 6 L5 9 L10 3" fill="none" stroke="hsl(160 84% 39%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Label */}
          <span className="text-[7px] text-muted-foreground/50 mt-0.5 font-medium">{step}</span>
          {/* Connector line */}
          {i < steps.length - 1 && (
            <div className="absolute top-2 left-[60%] w-[80%] h-[1.5px] bg-primary/15">
              <div
                className={cn("h-full bg-primary/50 w-0", active && "stats-step-line")}
                style={{ animationDelay: `${i * 0.6 + 0.3}s` }}
              />
            </div>
          )}
        </div>
      ))}
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full bg-primary/60 w-0", active && "stats-progress-fill")} />
      </div>
    </div>
  );
}

// ─── Single Tile ────────────────────────────────────────────────────────────

interface TileProps {
  value: string;
  label: string;
  proof: string;
  index: number;
  entered: boolean;
  active: boolean;
  visual: React.ReactNode;
}

function StatTile({ value, label, proof, index, entered, active, visual }: TileProps) {
  const [focused, setFocused] = useState(false);
  const showProof = focused;

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center justify-center px-4 py-5 sm:py-6 text-center transition-all duration-300",
        "hover:-translate-y-0.5 hover:bg-primary/[0.03] focus-within:-translate-y-0.5 focus-within:bg-primary/[0.03]",
        // Borders
        index < 2 && "border-b border-border/50 sm:border-b-0",
        index % 2 === 0 && "border-r border-border/50",
        index === 1 && "sm:border-r sm:border-border/50",
        index === 2 && "sm:border-r sm:border-border/50",
        // Scroll-in animation
        entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
      )}
      style={{
        transitionDelay: entered ? `${index * 100}ms` : "0ms",
        transitionProperty: "opacity, transform, background-color",
      }}
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseEnter={() => setFocused(true)}
      onMouseLeave={() => setFocused(false)}
      aria-label={`${value} — ${label}`}
    >
      {/* Micro-visual */}
      <div className="w-full max-w-[80px] sm:max-w-[100px] mb-2">
        {visual}
      </div>

      {/* Number */}
      <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{value}</p>

      {/* Label */}
      <p className="text-caption font-medium text-muted-foreground/60 mt-1">{label}</p>

      {/* Proof line (hover/focus reveal on desktop, always visible on mobile) */}
      <div
        className={cn(
          "mt-2 text-[11px] leading-tight text-muted-foreground/70 max-w-[180px] transition-all duration-300",
          // Desktop: show on hover/focus
          "sm:opacity-0 sm:translate-y-1 sm:max-h-0 sm:overflow-hidden",
          showProof && "sm:opacity-100 sm:translate-y-0 sm:max-h-20",
          // Mobile: always visible but compact
          "opacity-80 translate-y-0",
        )}
        aria-hidden={!showProof}
      >
        {proof}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface StatsStripProps {
  className?: string;
}

export default function StatsStrip({ className }: StatsStripProps) {
  const { t } = useTranslation("home");
  const { ref, inView } = useInViewOnce(0.2);
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

  // Trigger entered state once in view
  useEffect(() => {
    if (inView) setEntered(true);
  }, [inView]);

  // Animations active = entered + visible + no reduced motion
  const animActive = entered && isVisible && !reducedMotion;

  const tiles = [
    { value: "10×", label: t("metrics.fasterLabel"), proof: PROOF_LINES[0] },
    { value: "100%", label: t("metrics.automatedLabel"), proof: PROOF_LINES[1] },
    { value: "24/7", label: t("metrics.monitoringLabel"), proof: PROOF_LINES[2] },
    { value: "< 5 min", label: t("metrics.insightLabel"), proof: PROOF_LINES[3] },
  ];

  const visuals = [
    <SpeedBars active={animActive} />,
    <AutoRing active={animActive} />,
    <HeartbeatLine active={animActive} />,
    <StepsSequence active={animActive} />,
  ];

  // Merge refs
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      (visRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref, visRef],
  );

  return (
    <div
      ref={mergedRef}
      className={cn("mt-12 sm:mt-16 max-w-3xl mx-auto", className)}
    >
      {/* Tiles grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
        {tiles.map((tile, i) => (
          <StatTile
            key={tile.value}
            value={tile.value}
            label={tile.label}
            proof={tile.proof}
            index={i}
            entered={entered}
            active={animActive}
            visual={visuals[i]}
          />
        ))}
      </div>

      {/* Live Activity Ticker */}
      <div
        className={cn(
          "transition-opacity duration-500",
          entered ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDelay: entered ? "500ms" : "0ms" }}
      >
        <LiveTicker visible={entered} />
      </div>
    </div>
  );
}
