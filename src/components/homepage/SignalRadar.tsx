import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ── Node data (9 competitor signals) ────────────────────────────────────────

interface RadarNode {
  id: string;
  /** Distance from center, 0–1 */
  r: number;
  /** Angle in degrees */
  angle: number;
  label: string;
  signal: string;
  /** Which other node IDs this connects to */
  connections: string[];
}

const NODES: RadarNode[] = [
  { id: "n1", r: 0.32, angle: 35,  label: "Acme Corp",     signal: "Pricing change",     connections: ["n2", "n4"] },
  { id: "n2", r: 0.55, angle: 85,  label: "Globex Inc",    signal: "New hire (VP Sales)", connections: ["n1", "n3"] },
  { id: "n3", r: 0.72, angle: 140, label: "Initech",       signal: "Content drop",       connections: ["n2", "n5"] },
  { id: "n4", r: 0.45, angle: 200, label: "Umbrella Co",   signal: "Series B closed",    connections: ["n1", "n6"] },
  { id: "n5", r: 0.65, angle: 260, label: "Wonka Labs",    signal: "Feature launch",     connections: ["n3", "n7"] },
  { id: "n6", r: 0.38, angle: 310, label: "Stark Ind",     signal: "Ad campaign surge",  connections: ["n4", "n8"] },
  { id: "n7", r: 0.80, angle: 50,  label: "Wayne Ent",     signal: "Partnership announced", connections: ["n5"] },
  { id: "n8", r: 0.58, angle: 175, label: "Oscorp",        signal: "Team restructuring", connections: ["n6", "n9"] },
  { id: "n9", r: 0.48, angle: 340, label: "Pied Piper",    signal: "Pricing page removed", connections: ["n8"] },
];

const CX = 300;
const CY = 300;
const MAX_R = 240;
const RINGS = [0.25, 0.5, 0.75, 1.0];

function nodeXY(node: RadarNode): { x: number; y: number } {
  const rad = (node.angle * Math.PI) / 180;
  return {
    x: CX + Math.cos(rad) * node.r * MAX_R,
    y: CY + Math.sin(rad) * node.r * MAX_R,
  };
}

// ── Component ───────────────────────────────────────────────────────────────

interface SignalRadarProps {
  className?: string;
}

export default function SignalRadar({ className }: SignalRadarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [clickedNode, setClickedNode] = useState<string | null>(null);
  const [sweepAngle, setSweepAngle] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect mobile + reduced motion
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const rmql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsMobile(mql.matches);
    setPrefersReducedMotion(rmql.matches);
    const handler = () => setIsMobile(mql.matches);
    const rhandler = () => setPrefersReducedMotion(rmql.matches);
    mql.addEventListener("change", handler);
    rmql.addEventListener("change", rhandler);
    return () => { mql.removeEventListener("change", handler); rmql.removeEventListener("change", rhandler); };
  }, []);

  // Sweep rotation (6s per revolution)
  useEffect(() => {
    if (prefersReducedMotion) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      setSweepAngle(((ts - start) / 6000) * 360 % 360);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [prefersReducedMotion]);

  // Mouse tilt (desktop only)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ rx: -ny * 16, ry: nx * 16 });
    },
    [isMobile],
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ rx: 0, ry: 0 });
    setHoveredNode(null);
  }, []);

  const handleNodeClick = useCallback((id: string) => {
    setClickedNode(id);
    setTimeout(() => setClickedNode(null), 600);
  }, []);

  // Check if sweep is near a node (within ±15°)
  const isSweptNode = useCallback(
    (node: RadarNode) => {
      const diff = Math.abs(((sweepAngle - node.angle) % 360 + 360) % 360);
      return diff < 15 || diff > 345;
    },
    [sweepAngle],
  );

  const hoveredData = hoveredNode ? NODES.find((n) => n.id === hoveredNode) : null;
  const hoveredConnections = hoveredData ? new Set(hoveredData.connections) : new Set<string>();

  return (
    <div
      ref={containerRef}
      className={cn("relative select-none", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: "800px",
      }}
    >
      <div
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: "transform 0.15s ease-out",
          willChange: "transform",
        }}
      >
        <svg
          viewBox="0 0 600 600"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            {/* Sweep gradient */}
            <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="nodeGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Ripple animation */}
            <radialGradient id="rippleGrad">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ── Concentric rings ── */}
          {RINGS.map((r, i) => (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={r * MAX_R}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeOpacity={0.12 - i * 0.02}
              strokeWidth="1"
            />
          ))}

          {/* ── Cross lines ── */}
          <line x1={CX - MAX_R} y1={CY} x2={CX + MAX_R} y2={CY} stroke="hsl(var(--primary))" strokeOpacity="0.06" strokeWidth="0.5" />
          <line x1={CX} y1={CY - MAX_R} x2={CX} y2={CY + MAX_R} stroke="hsl(var(--primary))" strokeOpacity="0.06" strokeWidth="0.5" />

          {/* ── Sweep ray ── */}
          {!prefersReducedMotion && (
            <g style={{ transform: `rotate(${sweepAngle}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
              <line
                x1={CX}
                y1={CY}
                x2={CX + MAX_R}
                y2={CY}
                stroke="hsl(var(--primary))"
                strokeOpacity="0.2"
                strokeWidth="1.5"
              />
              {/* Trailing wedge */}
              <path
                d={`M${CX},${CY} L${CX + MAX_R},${CY} A${MAX_R},${MAX_R} 0 0,0 ${CX + Math.cos(-30 * Math.PI / 180) * MAX_R},${CY + Math.sin(-30 * Math.PI / 180) * MAX_R} Z`}
                fill="url(#sweepGrad)"
                opacity="0.5"
              />
            </g>
          )}

          {/* ── Connection lines ── */}
          {NODES.map((node) =>
            node.connections.map((targetId) => {
              const target = NODES.find((n) => n.id === targetId);
              if (!target) return null;
              // Avoid drawing duplicate lines
              if (node.id > targetId) return null;
              const from = nodeXY(node);
              const to = nodeXY(target);
              const isHighlighted =
                hoveredNode === node.id ||
                hoveredNode === targetId ||
                clickedNode === node.id ||
                clickedNode === targetId;
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={isHighlighted ? 0.5 : 0.1}
                  strokeWidth={isHighlighted ? 1.5 : 0.8}
                  style={{ transition: "stroke-opacity 0.3s, stroke-width 0.3s" }}
                />
              );
            }),
          )}

          {/* ── Center-to-node lines ── */}
          {NODES.filter((n) => n.r < 0.5).map((node) => {
            const pos = nodeXY(node);
            const isHighlighted = hoveredNode === node.id || clickedNode === node.id;
            return (
              <line
                key={`center-${node.id}`}
                x1={CX}
                y1={CY}
                x2={pos.x}
                y2={pos.y}
                stroke="hsl(var(--primary))"
                strokeOpacity={isHighlighted ? 0.35 : 0.06}
                strokeWidth={isHighlighted ? 1 : 0.5}
                strokeDasharray="4 4"
                style={{ transition: "stroke-opacity 0.3s" }}
              />
            );
          })}

          {/* ── Nodes ── */}
          {NODES.map((node, i) => {
            const pos = nodeXY(node);
            const isHovered = hoveredNode === node.id;
            const isClicked = clickedNode === node.id;
            const isSwept = isSweptNode(node);
            const baseR = isHovered ? 7 : isSwept && !prefersReducedMotion ? 6 : 4.5;

            return (
              <g key={node.id}>
                {/* Ripple on sweep */}
                {isSwept && !prefersReducedMotion && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="20"
                    fill="url(#rippleGrad)"
                    className="animate-ping"
                    style={{ animationDuration: "0.8s", animationIterationCount: "1" }}
                  />
                )}

                {/* Click ripple */}
                {isClicked && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="35"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeOpacity="0.4"
                    strokeWidth="2"
                    className="animate-ping"
                    style={{ animationDuration: "0.6s", animationIterationCount: "1" }}
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={baseR}
                  fill="hsl(var(--primary))"
                  fillOpacity={isHovered ? 1 : 0.7}
                  filter={isHovered ? "url(#nodeGlow)" : undefined}
                  className={cn(!isMobile && "cursor-pointer")}
                  style={{
                    transition: "r 0.2s, fill-opacity 0.2s",
                    opacity: prefersReducedMotion ? 0.8 : undefined,
                    // Breathing animation via CSS
                    animation: prefersReducedMotion
                      ? "none"
                      : `node-breathe 3s ease-in-out ${i * 0.35}s infinite`,
                  }}
                  onMouseEnter={() => !isMobile && setHoveredNode(node.id)}
                  onMouseLeave={() => !isMobile && setHoveredNode(null)}
                  onClick={() => !isMobile && handleNodeClick(node.id)}
                />
              </g>
            );
          })}

          {/* ── Center dot ("you") ── */}
          <circle cx={CX} cy={CY} r="3" fill="hsl(var(--primary))" fillOpacity="0.9" />
          <circle cx={CX} cy={CY} r="8" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.15" strokeWidth="1" />
        </svg>
      </div>

      {/* ── Tooltip (desktop only) ── */}
      {hoveredData && !isMobile && (() => {
        const pos = nodeXY(hoveredData);
        // Position tooltip relative to SVG coordinates → % of container
        const leftPct = (pos.x / 600) * 100;
        const topPct = (pos.y / 600) * 100;
        return (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: "translate(-50%, -120%)",
            }}
          >
            <div className="rounded-lg border border-border/40 bg-card px-3 py-2 shadow-md text-center whitespace-nowrap">
              <p className="text-xs font-semibold text-foreground">{hoveredData.label}</p>
              <p className="text-[11px] text-muted-foreground">{hoveredData.signal}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
