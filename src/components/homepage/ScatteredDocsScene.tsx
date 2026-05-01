import { cn } from "@/lib/utils";

// Document fragments — positioned pseudo-randomly
const DOCS = [
  { x: 8, y: 12, w: 28, h: 20, rot: -3, icon: "email" },
  { x: 52, y: 8, w: 24, h: 18, rot: 4, icon: "sheet" },
  { x: 32, y: 55, w: 26, h: 22, rot: -2, icon: "chat" },
  { x: 68, y: 48, w: 22, h: 16, rot: 5, icon: "doc" },
  { x: 14, y: 62, w: 20, h: 14, rot: -4, icon: "bookmark" },
  { x: 62, y: 72, w: 24, h: 18, rot: 2, icon: "email" },
  { x: 40, y: 28, w: 18, h: 14, rot: -1, icon: "sheet" },
] as const;

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

interface ScatteredDocsSceneProps {
  active: boolean;
  hovered: boolean;
}

export default function ScatteredDocsScene({ active, hovered }: ScatteredDocsSceneProps) {
  return (
    <div className="relative w-full h-[120px] sm:h-[120px] overflow-hidden" aria-hidden="true">
      {DOCS.map((doc, i) => {
        // On hover, push docs toward corners
        const hoverX = hovered ? (doc.x < 50 ? doc.x - 8 : doc.x + 8) : doc.x;
        const hoverY = hovered ? (doc.y < 50 ? doc.y - 6 : doc.y + 6) : doc.y;
        const hoverRot = hovered ? doc.rot * 2 : doc.rot;

        return (
          <div
            key={i}
            className={cn(
              "absolute rounded border border-border/60 bg-muted/40 flex items-center justify-center transition-all duration-700 ease-in-out",
              active && !hovered && "problem-doc-float",
              hovered && "opacity-60",
            )}
            style={{
              left: `${hoverX}%`,
              top: `${hoverY}%`,
              width: `${doc.w}%`,
              height: `${doc.h}%`,
              transform: `rotate(${hoverRot}deg)`,
              animationDelay: active ? `${i * 0.4}s` : undefined,
              transitionProperty: "left, top, transform, opacity",
            }}
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-muted-foreground/40">
              <DocIcon type={doc.icon} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
