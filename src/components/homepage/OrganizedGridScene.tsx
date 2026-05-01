import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// SAME doc icons as ScatteredDocsScene — pixel-identical SVGs
function DocIcon({ type }: { type: string }) {
  switch (type) {
    case "email":
      return <path d="M2 3h12v9H2z M2 3l6 4.5L14 3" fill="none" stroke="currentColor" strokeWidth="1.2" />;
    case "sheet":
      return <><rect x="3" y="2" width="10" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" /><line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="0.8" /><line x1="5" y1="7.5" x2="11" y2="7.5" stroke="currentColor" strokeWidth="0.8" /><line x1="5" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="0.8" /></>;
    case "chat":
      return <path d="M2 3h12v7H6l-2 2v-2H2z" fill="none" stroke="currentColor" strokeWidth="1.2" />;
    case "bookmark":
      return <path d="M4 2h8v12l-4-2.5L4 14z" fill="none" stroke="currentColor" strokeWidth="1.2" />;
    case "doc":
      return <><rect x="3" y="2" width="10" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" /><line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="0.8" /><line x1="5" y1="9" x2="8" y2="9" stroke="currentColor" strokeWidth="0.8" /></>;
    default:
      return null;
  }
}

// SAME 7 documents from ScatteredDocsScene — identical icons, sizes, and chaos positions
const DOCS = [
  { icon: "email",    w: 28, h: 20, chaos: { x: 8,  y: 12, rot: -3 } },
  { icon: "sheet",    w: 24, h: 18, chaos: { x: 52, y: 8,  rot: 4  } },
  { icon: "chat",     w: 26, h: 22, chaos: { x: 32, y: 55, rot: -2 } },
  { icon: "doc",      w: 22, h: 16, chaos: { x: 68, y: 48, rot: 5  } },
  { icon: "bookmark", w: 20, h: 14, chaos: { x: 14, y: 62, rot: -4 } },
  { icon: "email",    w: 24, h: 18, chaos: { x: 62, y: 72, rot: 2  } },
  { icon: "sheet",    w: 18, h: 14, chaos: { x: 40, y: 28, rot: -1 } },
];

// Organized grid positions (3-col layout, evenly spaced)
const GRID = [
  { x: 4,  y: 10, rot: 0 },
  { x: 36, y: 10, rot: 0 },
  { x: 68, y: 10, rot: 0 },
  { x: 4,  y: 45, rot: 0 },
  { x: 36, y: 45, rot: 0 },
  { x: 68, y: 45, rot: 0 },
  { x: 36, y: 78, rot: 0 },
];

interface OrganizedGridSceneProps {
  active: boolean;
  hovered: boolean;
}

export default function OrganizedGridScene({ active, hovered }: OrganizedGridSceneProps) {
  const [phase, setPhase] = useState<"chaos" | "organizing" | "grid">("chaos");
  const [scanY, setScanY] = useState(-5);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  // Phase cycle: chaos (1.5s) → organizing (1.2s) → grid (4s) → chaos ...
  useEffect(() => {
    if (!active) {
      setPhase("grid");
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;

    function cycle() {
      setPhase("chaos");
      timeout = setTimeout(() => {
        setPhase("organizing");
        timeout = setTimeout(() => {
          setPhase("grid");
          timeout = setTimeout(cycle, 4000);
        }, 1200);
      }, 1500);
    }

    setPhase("grid");
    timeout = setTimeout(cycle, 3000);
    return () => clearTimeout(timeout);
  }, [active]);

  // Scan line
  useEffect(() => {
    if (!active || phase !== "grid") { setScanY(-5); return; }
    const interval = hovered ? 2000 : 4000;
    const id = setInterval(() => {
      setScanY(-5);
      requestAnimationFrame(() => setScanY(105));
    }, interval);
    requestAnimationFrame(() => setScanY(105));
    return () => clearInterval(id);
  }, [active, phase, hovered]);

  // Hover highlight sequence
  useEffect(() => {
    if (!hovered) { setHighlightIdx(-1); return; }
    let i = 0;
    const id = setInterval(() => { setHighlightIdx(i % 7); i++; }, 180);
    return () => { clearInterval(id); setHighlightIdx(-1); };
  }, [hovered]);

  return (
    <div className="relative w-full h-[120px] overflow-hidden" aria-hidden="true">
      {DOCS.map((doc, i) => {
        const pos = phase === "chaos" ? doc.chaos : GRID[i];
        const isHighlighted = highlightIdx === i;

        return (
          <div
            key={i}
            className={cn(
              "absolute rounded border flex items-center justify-center",
              "transition-all duration-[1200ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
              phase === "grid"
                ? "border-primary/30 bg-primary/[0.06]"
                : "border-border/60 bg-muted/40",
              isHighlighted && "border-primary/60 bg-primary/[0.12] scale-105",
            )}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: `${doc.w}%`,
              height: `${doc.h}%`,
              transform: `rotate(${pos.rot}deg)${isHighlighted ? " scale(1.05)" : ""}`,
            }}
          >
            <svg viewBox="0 0 16 16" className={cn(
              "w-4 h-4 transition-colors duration-500",
              phase === "grid" ? "text-primary/60" : "text-muted-foreground/40",
              isHighlighted && "text-primary",
            )}>
              <DocIcon type={doc.icon} />
            </svg>
          </div>
        );
      })}

      {/* Scan line — same style as timeline in signals scene */}
      {phase === "grid" && (
        <div
          className="absolute left-[3%] right-[3%] h-[1.5px] bg-primary/30 rounded-full pointer-events-none transition-[top] duration-[2000ms] ease-linear"
          style={{ top: `${scanY}%` }}
        />
      )}
    </div>
  );
}
