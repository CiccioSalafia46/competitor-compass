import { memo, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  COMPETITORS,
  SIGNALS,
  INSIGHT_CARDS,
  getCategoryColor,
  getTagColor,
  simulateUpdate,
  type MockCompetitor,
} from "./mockData";

type Tab = "Competitors" | "Signals" | "Insights";
const TABS: Tab[] = ["Competitors", "Signals", "Insights"];

// ─── Typing effect hook ──────────────────────────────────────────────────────

function useTypingEffect(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        setDone(true);
        clearInterval(id);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return { displayed, done };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const ActivityChart = memo(function ActivityChart({
  series,
  label,
}: {
  series: number[];
  label: string;
}) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <div className="rounded-lg border border-border/30 p-4 bg-background/50">
      <p className="text-xs font-medium text-muted-foreground mb-3">Activity</p>
      <div className="relative flex items-end gap-1.5 h-16">
        {series.map((h, i) => (
          <div
            key={i}
            className="relative flex-1 group cursor-default"
            style={{ height: "100%" }}
            onMouseEnter={() => setHoveredBar(i)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            {hoveredBar === i && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground text-background px-1.5 py-0.5 text-[10px] font-medium z-10">
                {h} · W{i + 1}
              </div>
            )}
            <div
              className="absolute bottom-0 inset-x-0 rounded-sm bg-primary/25 transition-all duration-500 ease-out hover:bg-primary/40"
              style={{ height: `${h}%` }}
            />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
        Last 12 weeks · {label}
      </p>
    </div>
  );
});

function AiInsightPanel({ text }: { text: string }) {
  const { displayed, done } = useTypingEffect(text, 14);

  return (
    <div className="rounded-lg border border-border/30 p-4 bg-background/50">
      <p className="text-xs font-medium text-muted-foreground mb-2">AI Insight</p>
      <p className="text-xs leading-relaxed text-foreground/80" aria-live="polite">
        {displayed}
        {!done && <span className="inline-block w-px h-3 bg-primary/60 ml-0.5 animate-pulse" />}
      </p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<Tab>("Competitors");
  const [selectedCompetitor, setSelectedCompetitor] = useState(0);
  const [competitors, setCompetitors] = useState(COMPETITORS);
  const [flash, setFlash] = useState<{ idx: number; dir: "up" | "down" } | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Live data simulation — every 4-5s bump a random competitor
  useEffect(() => {
    const interval = setInterval(() => {
      setCompetitors((prev) => {
        const next = simulateUpdate(prev);
        const changed = next.findIndex((c, i) => c.signalCount !== prev[i].signalCount);
        if (changed >= 0) {
          setFlash({ idx: changed, dir: next[changed].signalCount > prev[changed].signalCount ? "up" : "down" });
          setTimeout(() => setFlash(null), 900);
        }
        return next;
      });
    }, 4000 + Math.random() * 1500);
    return () => clearInterval(interval);
  }, []);

  // Tab keyboard navigation
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      let next = idx;
      if (e.key === "ArrowRight") next = (idx + 1) % TABS.length;
      else if (e.key === "ArrowLeft") next = (idx - 1 + TABS.length) % TABS.length;
      else return;
      e.preventDefault();
      setActiveTab(TABS[next]);
      tabRefs.current[next]?.focus();
    },
    [],
  );

  const current = competitors[selectedCompetitor];

  return (
    <div className="mt-16 max-w-4xl mx-auto animate-reveal" style={{ animationDelay: "0.3s" }}>
      <div className="relative rounded-xl border border-border/40 bg-card shadow-lg overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/20">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="h-5 w-48 rounded-md bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground/40 select-none">
              app.tracklyze.com
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Left panel — 2/3 */}
          <div className="sm:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2" role="tablist" aria-label="Dashboard preview tabs">
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  role="tab"
                  aria-selected={activeTab === tab}
                  tabIndex={activeTab === tab ? 0 : -1}
                  onClick={() => setActiveTab(tab)}
                  onKeyDown={(e) => handleTabKeyDown(e, i)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-xs font-medium cursor-pointer transition-all duration-150",
                    activeTab === tab
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content with fade transition */}
            <div key={activeTab} className="animate-fade-in min-h-[180px]">
              {activeTab === "Competitors" && (
                <CompetitorsView
                  competitors={competitors}
                  selected={selectedCompetitor}
                  onSelect={setSelectedCompetitor}
                  flash={flash}
                />
              )}
              {activeTab === "Signals" && <SignalsView />}
              {activeTab === "Insights" && <InsightsView />}
            </div>
          </div>

          {/* Right panel — 1/3 */}
          <div className="space-y-3">
            <AiInsightPanel
              key={`insight-${current.id}`}
              text={current.aiInsight}
            />
            <ActivityChart
              series={current.activitySeries}
              label={current.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab views ───────────────────────────────────────────────────────────────

function CompetitorsView({
  competitors,
  selected,
  onSelect,
  flash,
}: {
  competitors: MockCompetitor[];
  selected: number;
  onSelect: (i: number) => void;
  flash: { idx: number; dir: "up" | "down" } | null;
}) {
  return (
    <div className="space-y-2">
      {competitors.map((row, i) => {
        const isFlashing = flash?.idx === i;
        return (
          <button
            key={row.id}
            onClick={() => onSelect(i)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left cursor-pointer transition-all duration-200",
              selected === i
                ? "border-primary/30 bg-primary/[0.04] shadow-sm"
                : "border-border/30 bg-background/50 hover:border-border hover:shadow-sm hover:-translate-y-px",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {row.initial}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  <span
                    className={cn(
                      "inline-block transition-colors duration-500",
                      isFlashing && flash.dir === "up" && "text-green-600 dark:text-green-400",
                      isFlashing && flash.dir === "down" && "text-red-500",
                    )}
                  >
                    {row.signalCount}
                  </span>
                  {" "}signals
                </p>
              </div>
            </div>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                row.deltaPercent >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500",
              )}
            >
              {row.deltaPercent >= 0 ? "+" : ""}
              {row.deltaPercent}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SignalsView() {
  return (
    <div className="space-y-2">
      {SIGNALS.map((s) => (
        <div
          key={s.id}
          className="flex items-start gap-3 rounded-lg border border-border/30 bg-background/50 px-4 py-2.5"
        >
          <span
            className={cn(
              "shrink-0 mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none",
              getCategoryColor(s.category),
            )}
          >
            {s.category}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-foreground leading-snug">
              <span className="font-medium">{s.competitor}</span>{" "}
              <span className="text-muted-foreground">{s.description}</span>
            </p>
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground/50 whitespace-nowrap">
            {s.timeAgo}
          </span>
        </div>
      ))}
    </div>
  );
}

function InsightsView() {
  return (
    <div className="space-y-2.5">
      {INSIGHT_CARDS.map((card) => (
        <div
          key={card.id}
          className="rounded-lg border border-border/30 bg-background/50 px-4 py-3.5"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none",
                getTagColor(card.tagColor),
              )}
            >
              {card.tag}
            </span>
            <h4 className="text-sm font-medium text-foreground">{card.title}</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{card.body}</p>
        </div>
      ))}
    </div>
  );
}
