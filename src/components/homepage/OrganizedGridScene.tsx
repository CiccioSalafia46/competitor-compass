import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Same doc icons as ScatteredDocsScene — for visual continuity
function DocIcon({ type }: { type: string }) {
  switch (type) {
    case "email":
      return <path d="M2 3h12v9H2z M2 3l6 4.5L14 3" fill="none" stroke="currentColor" strokeWidth="1.2" />;
    case "sheet":
      return <><rect x="3" y="2" width="10" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" /><line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="0.8" /><line x1="5" y1="7.5" x2="11" y2="7.5" stroke="currentColor" strokeWidth="0.8" /></>;
    case "chat":
      return <path d="M2 3h12v7H6l-2 2v-2H2z" fill="none" stroke="currentColor" strokeWidth="1.2" />;
    case "bookmark":
      return <path d="M4 2h8v12l-4-2.5L4 14z" fill="none" stroke="currentColor" strokeWidth="1.2" />;
    case "doc":
      return <><rect x="3" y="2" width="10" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" /><line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="0.8" /></>;
    case "ads":
      return <><rect x="2" y="3" width="12" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" /><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="0.8" /></>;
    default:
      return null;
  }
}

const GRID_ITEMS = ["email", "sheet", "chat", "ads", "doc", "bookmark"];

// Scattered positions (chaos state)
const SCATTERED = [
  { x: 5, y: 8, rot: -4 },
  { x: 55, y: 5, rot: 5 },
  { x: 28, y: 60, rot: -3 },
  { x: 70, y: 50, rot: 4 },
  { x: 12, y: 70, rot: -5 },
  { x: 60, y: 75, rot: 2 },
];

// Grid positions (organized state) — 3×2 grid
const GRID = [
  { x: 8, y: 15, rot: 0 },
  { x: 37, y: 15, rot: 0 },
  { x: 66, y: 15, rot: 0 },
  { x: 8, y: 55, rot: 0 },
  { x: 37, y: 55, rot: 0 },
  { x: 66, y: 55, rot: 0 },
];

interface OrganizedGridSceneProps {
  active: boolean;
  hovered: boolean;
}

export default function OrganizedGridScene({ active, hovered }: OrganizedGridSceneProps) {
  const [phase, setPhase] = useState<"scattered" | "organizing" | "grid">("scattered");
  const [scanY, setScanY] = useState(-5);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  // Phase cycle: scattered → grid → (wobble) → scattered ...
  useEffect(() => {
    if (!active) {
      setPhase("grid"); // Default to organized when not animating
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;

    function cycle() {
      setPhase("scattered");
      timeout = setTimeout(() => {
        setPhase("organizing");
        timeout = setTimeout(() => {
          setPhase("grid");
          timeout = setTimeout(cycle, 4000); // Stay in grid, then reset
        }, 1200);
      }, 1500);
    }

    // Start in grid then begin cycle
    setPhase("grid");
    timeout = setTimeout(cycle, 3000);

    return () => clearTimeout(timeout);
  }, [active]);

  // Scan line animation
  useEffect(() => {
    if (!active || phase !== "grid") {
      setScanY(-5);
      return;
    }
    const interval = hovered ? 2000 : 4000;
    const id = setInterval(() => {
      setScanY(-5);
      requestAnimationFrame(() => setScanY(105));
    }, interval);
    // Start first scan
    requestAnimationFrame(() => setScanY(105));
    return () => clearInterval(id);
  }, [active, phase, hovered]);

  // Hover: sequential highlight
  useEffect(() => {
    if (!hovered) {
      setHighlightIdx(-1);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      setHighlightIdx(i % 6);
      i++;
    }, 200);
    return () => { clearInterval(id); setHighlightIdx(-1); };
  }, [hovered]);

  const positions = phase === "scattered" ? SCATTERED : GRID;

  return (
    <div className="relative w-full h-[120px] overflow-hidden" aria-hidden="true">
      {/* Grid items */}
      {GRID_ITEMS.map((icon, i) => {
        const pos = positions[i];
        const isHighlighted = highlightIdx === i;

        return (
          <div
            key={i}
            className={cn(
              "absolute w-[26%] h-[35%] rounded border flex items-center justify-center transition-all duration-[1200ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
              phase === "grid"
                ? "border-primary/30 bg-primary/5"
                : "border-border/50 bg-muted/30",
              isHighlighted && "border-primary/60 bg-primary/10",
            )}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `rotate(${pos.rot}deg)`,
            }}
          >
            <svg viewBox="0 0 16 16" className={cn(
              "w-4 h-4 transition-colors duration-500",
              phase === "grid" ? "text-primary/60" : "text-muted-foreground/40",
              isHighlighted && "text-primary",
            )}>
              <DocIcon type={icon} />
            </svg>
          </div>
        );
      })}

      {/* Scan line (only visible in grid phase) */}
      {phase === "grid" && (
        <div
          className="absolute left-[6%] right-[6%] h-[2px] bg-primary/30 rounded-full pointer-events-none transition-[top] duration-[2000ms] ease-linear"
          style={{ top: `${scanY}%` }}
        />
      )}
    </div>
  );
}
