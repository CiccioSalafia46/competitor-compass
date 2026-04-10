import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Sparkles, Zap, ArrowRight, Check, Users,
  Lightbulb, TrendingUp, Bell, ChevronDown, Brain, LineChart,
  Target, Search, ShieldCheck, Clock, Eye, Layers, BarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "@/components/DarkModeToggle";

const TYPEWRITER_PHRASES = [
  "before it impacts your growth",
  "in real time, every single day",
  "faster than they can react",
  "with zero manual research",
  "while you focus on winning",
];

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cta = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? "Go to Dashboard" : "Start Free — No Card Required";
  const ctaShort = user ? "Dashboard" : "Get Started Free";

  // ── Typewriter ──────────────────────────────────────────────────────────────
  const [typeText, setTypeText] = useState(TYPEWRITER_PHRASES[0]);
  const [typePhrase, setTypePhrase] = useState(0);
  const [typeMode, setTypeMode] = useState<"typing" | "waiting" | "deleting">("waiting");
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const phrase = TYPEWRITER_PHRASES[typePhrase];
    if (typeMode === "waiting") {
      const id = setTimeout(() => setTypeMode("deleting"), 2000);
      return () => clearTimeout(id);
    }
    if (typeMode === "deleting") {
      if (typeText.length === 0) {
        setTypePhrase((i) => (i + 1) % TYPEWRITER_PHRASES.length);
        setTypeMode("typing");
        return;
      }
      const id = setTimeout(() => setTypeText((t) => t.slice(0, -1)), 30);
      return () => clearTimeout(id);
    }
    if (typeMode === "typing") {
      if (typeText.length === phrase.length) {
        setTypeMode("waiting");
        return;
      }
      const id = setTimeout(() => setTypeText(phrase.slice(0, typeText.length + 1)), 50);
      return () => clearTimeout(id);
    }
  }, [typeText, typeMode, typePhrase]);

  return (
    <div className="min-h-screen bg-background">

      {/* ─── Header ─── */}
      <header className="border-b bg-background/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/30">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground tracking-tight">Tracklyze</span>
          </div>
          <nav className="hidden md:flex items-center gap-0.5 text-sm">
            {[
              { href: "#why", label: "Why Tracklyze" },
              { href: "#how", label: "How it Works" },
              { href: "#platform", label: "Platform" },
              { href: "#pricing", label: "Pricing" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <DarkModeToggle />
            {user ? (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate("/dashboard")}>
                Dashboard <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="h-8 text-xs hidden sm:inline-flex" onClick={() => navigate("/auth")}>
                  Sign in
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1.5 shadow-sm" onClick={() => navigate("/auth")}>
                  Start free <ArrowRight className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.05] via-primary/[0.02] to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[560px] w-[900px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-32 pb-20 sm:pb-28 relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary tracking-wide">AI-Powered Competitor Intelligence</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-bold tracking-tight text-foreground leading-[1.06]">
              Know what your competitors<br className="hidden sm:block" /> are doing —{" "}
              <span className="text-primary inline-block min-h-[1.15em]">
                {typeText}
                <span
                  className="text-primary"
                  style={{ opacity: cursorOn ? 1 : 0, transition: "opacity 0.1s" }}
                >|</span>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-7 max-w-[520px] text-muted-foreground text-base sm:text-[1.05rem] leading-[1.75]">
              One platform to track campaigns, decode strategies, and surface competitive signals automatically — before they impact your business.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="h-12 px-9 text-sm gap-2 w-full sm:w-auto font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                onClick={() => navigate(cta)}
              >
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-sm gap-2 w-full sm:w-auto hover:bg-accent/60"
                onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
              >
                See how it works <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Trust signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {["Free plan available", "Setup in 5 minutes", "No credit card", "Cancel anytime"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-primary/80" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Metrics strip */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
              {[
                { value: "10×", label: "Faster than manual" },
                { value: "100%", label: "Automated collection" },
                { value: "24/7", label: "Continuous monitoring" },
                { value: "< 5 min", label: "Time to first insight" },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center justify-center px-4 py-6 text-center">
                  <p className="text-3xl font-black text-primary tracking-tight tabular-nums">{m.value}</p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-1.5 leading-tight">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Built For ─── */}
      <section className="border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest shrink-0">Built for</p>
            {[
              { icon: TrendingUp, label: "Growth teams" },
              { icon: Target, label: "Marketing teams" },
              { icon: BarChart3, label: "E-commerce brands" },
              { icon: Users, label: "DTC companies" },
              { icon: Lightbulb, label: "Product strategists" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Problem / Solution ─── */}
      <section id="why" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* Problem */}
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-5 text-[10px] border-destructive/30 bg-destructive/5 text-destructive font-semibold tracking-wide px-3 py-1">
            The problem
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
            Your competitors are moving fast.<br className="hidden sm:block" />
            <span className="text-muted-foreground font-normal">You're still tracking them manually.</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { icon: Layers, title: "Intelligence is scattered", desc: "Competitor campaigns sit across inboxes, spreadsheets, and tools. No central view of what's happening in the market." },
            { icon: Clock, title: "Manual work doesn't scale", desc: "Reading every competitor email, comparing it to last month, spotting changes — it's a full-time job nobody has time for." },
            { icon: Eye, title: "Critical signals get missed", desc: "A pricing change, a new campaign, a messaging shift. By the time you notice, you're reacting — not leading." },
          ].map((p) => (
            <div key={p.title} className="rounded-xl border border-destructive/20 bg-destructive/[0.035] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 mb-4">
                <p.icon className="h-4 w-4 text-destructive/70" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{p.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Problem → Solution transition */}
        <div className="flex items-center gap-4 my-14 max-w-sm mx-auto">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-destructive/20 to-border/40" />
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 shrink-0">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/20 to-border/40" />
        </div>

        {/* Solution */}
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-5 text-[10px] border-primary/30 bg-primary/5 text-primary font-semibold tracking-wide px-3 py-1">
            The solution
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
            Automate competitive intelligence.<br className="hidden sm:block" />
            Focus on strategy, not data collection.
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-4 leading-relaxed">
            Tracklyze connects to your data sources, monitors competitor activity continuously,
            and uses AI to surface the signals that actually matter to your business.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { icon: Zap, title: "Centralized collection", desc: "All competitor communications, campaigns, and signals in one searchable, organized platform. No more scattered tracking." },
            { icon: Brain, title: "AI-powered analysis", desc: "Advanced models extract pricing signals, promotional strategies, messaging angles, and competitive positioning — automatically." },
            { icon: Target, title: "Strategic action", desc: "Get alerts when competitors make moves. Receive AI-generated recommendations your team can act on immediately." },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border border-primary/20 bg-primary/[0.035] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how" className="bg-accent/30 border-y">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-5 text-[10px] font-semibold tracking-wide px-3 py-1">How it works</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              From setup to competitive advantage in minutes
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
              No complex configuration. Connect your sources, add competitors, and let the AI do the rest.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {[
              { step: "01", icon: Search, title: "Connect your sources", desc: "One-click OAuth for data sources. Read-only access. We never send, delete, or modify anything." },
              { step: "02", icon: Users, title: "Define your competitors", desc: "Add competitor names and domains. Tracklyze automatically matches and classifies incoming data." },
              { step: "03", icon: Sparkles, title: "AI analyzes everything", desc: "Every piece of competitor activity is analyzed for pricing, offers, CTAs, messaging patterns, and strategy." },
              { step: "04", icon: TrendingUp, title: "Act with confidence", desc: "View dashboards, set custom alerts, and use strategic insights to stay ahead of the competition." },
            ].map((s, i) => (
              <div
                key={s.step}
                className="relative rounded-xl border bg-card p-6 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="absolute top-4 right-4 text-[10px] font-bold tabular-nums text-muted-foreground/25">
                  {s.step}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25 mb-5">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < 3 && (
                  <div className="absolute -right-3 top-10 hidden lg:flex items-center justify-center z-10">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/20" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Button
              size="lg"
              className="h-12 px-9 text-sm gap-2 font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
              onClick={() => navigate(cta)}
            >
              {ctaShort} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Platform Features ─── */}
      <section id="platform" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-14">
          <Badge variant="outline" className="mb-5 text-[10px] font-semibold tracking-wide px-3 py-1">Platform</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Everything you need to outsmart the competition
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
            From automated collection to strategic recommendations — one platform replaces hours of manual competitive research.
          </p>
        </div>

        <div className="space-y-16">
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-5">
                <BarChart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                Centralized competitor activity tracking
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Every competitor campaign, promotion, and communication — organized, searchable, and
                classified automatically. Stop switching between tools and inboxes to understand what your competitors are doing.
              </p>
              <ul className="space-y-3">
                {["Automatic data collection from connected sources", "Smart classification by competitor and campaign type", "Full-text search across all competitor content", "Clean reader view with AI annotations"].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-gradient-to-br from-accent/70 to-accent/30 p-8 min-h-[280px] flex items-center justify-center">
              <div className="w-full max-w-[280px] space-y-3">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Competitor Activity</p>
                </div>
                {["Competitor A", "Competitor B", "Competitor C"].map((name, i) => (
                  <div key={name} className="flex items-center justify-between rounded-lg bg-card border px-3.5 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {name.charAt(11)}
                      </div>
                      <span className="text-xs font-medium text-foreground">{name}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-background">{[12, 7, 5][i]} signals</Badge>
                  </div>
                ))}
                <div className="flex gap-1.5 pt-1 flex-wrap">
                  <Badge variant="outline" className="text-[9px] bg-card">3 price changes</Badge>
                  <Badge variant="outline" className="text-[9px] bg-card">8 promotions</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 rounded-2xl border bg-gradient-to-br from-accent/70 to-accent/30 p-8 min-h-[280px] flex items-center justify-center">
              <div className="w-full max-w-[260px] space-y-3">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI Extraction</p>
                </div>
                {[
                  { label: "Pricing signal", conf: "94%", w: "94%" },
                  { label: "Campaign type", conf: "89%", w: "89%" },
                  { label: "Urgency level", conf: "91%", w: "91%" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-card border px-3.5 py-2.5 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{item.label}</span>
                      <span className="text-[11px] font-bold text-primary">{item.conf}</span>
                    </div>
                    <div className="h-1 rounded-full bg-primary/10 overflow-hidden">
                      <div className="h-full rounded-full bg-primary/50 transition-all" style={{ width: item.w }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                Turn competitor activity into actionable insights
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                AI doesn't just summarize — it extracts structured intelligence. Pricing changes, promotional patterns,
                messaging strategies, and competitive positioning are identified and scored with confidence levels.
              </p>
              <ul className="space-y-3">
                {["Pricing and discount signal detection", "Campaign type and strategy classification", "CTA analysis and urgency scoring", "Confidence scores on every data point"].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-5">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                Never miss a competitive move
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Set custom alert rules based on what matters to your strategy — pricing shifts, new campaign launches,
                keyword mentions, or competitor activity spikes. AI synthesizes patterns into strategic recommendations.
              </p>
              <ul className="space-y-3">
                {["Custom rules: price drops, keywords, new campaigns", "AI-generated strategic recommendations", "Activity dashboards with trend visualization", "Team notifications and collaboration"].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-gradient-to-br from-accent/70 to-accent/30 p-8 min-h-[280px] flex items-center justify-center">
              <div className="w-full max-w-[280px] space-y-3">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-2 w-2 rounded-full bg-destructive/50 animate-pulse" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Live Alerts</p>
                </div>
                {[
                  { text: "Competitor A dropped prices by 15%", sev: "High", dot: "bg-destructive", badge: "border-destructive/30 text-destructive" },
                  { text: "New campaign detected from Competitor B", sev: "Medium", dot: "bg-warning", badge: "border-warning/30 text-warning" },
                  { text: "Messaging shift in Competitor C emails", sev: "Low", dot: "bg-primary", badge: "border-primary/30 text-primary" },
                ].map((a) => (
                  <div key={a.text} className="rounded-lg bg-card border px-3.5 py-2.5 shadow-sm flex items-start gap-2.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", a.dot)} />
                    <div>
                      <p className="text-[11px] text-foreground font-medium leading-snug">{a.text}</p>
                      <Badge variant="outline" className={cn("text-[8px] mt-1.5", a.badge)}>{a.sev}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary features grid */}
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: LineChart, title: "Analytics Dashboard", desc: "Visualize campaign frequency, promotion patterns, and competitor strategy shifts over time." },
            { icon: Users, title: "Team Collaboration", desc: "Invite your team with Admin, Analyst, or Viewer roles. Full audit trail on every action." },
            { icon: ShieldCheck, title: "Enterprise Security", desc: "Read-only data access, encryption at rest, role-based permissions, and full data isolation." },
            { icon: Lightbulb, title: "Ad Intelligence", desc: "Analyze competitor ad creative and targeting from Meta's Ad Library.", tag: "Coming soon" },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-5 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                {f.tag && <Badge variant="outline" className="text-[9px] font-medium">{f.tag}</Badge>}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="border-y bg-accent/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-5 text-[10px] font-semibold tracking-wide px-3 py-1">What teams are saying</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Built for teams that compete on intelligence
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { quote: "We finally have a single source of truth for everything our competitors are doing. The AI extraction saves us hours every week.", role: "Head of Growth", company: "E-Commerce Brand" },
              { quote: "The alerts caught a competitor's pricing change 48 hours before our team would have noticed. That alone justified the investment.", role: "Marketing Director", company: "DTC Company" },
              { quote: "What used to take a full-time analyst now runs automatically. The insights are structured, actionable, and always up to date.", role: "VP of Marketing", company: "SaaS Company" },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-xl border bg-card p-6 flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <div key={si} className="h-3.5 w-3.5 rounded-sm bg-primary/15 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-[2px] bg-primary/50" />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {t.role.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t.role}</p>
                    <p className="text-[10px] text-muted-foreground">{t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-6 italic">
            Representative feedback from beta users. Named testimonials coming post-launch.
          </p>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-5 text-[10px] font-semibold tracking-wide px-3 py-1">Pricing</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Start free. Scale as your intelligence needs grow.
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
            Every plan includes core intelligence features. Upgrade for deeper analysis, more competitors, and team collaboration.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          <PricingCard
            name="Free"
            price="$0"
            period="forever"
            desc="Explore competitive intelligence with core features"
            features={[
              "3 competitors",
              "200 data imports / month",
              "50 AI analyses / month",
              "Basic alerts",
              "Content reader",
              "1 user",
            ]}
            cta={ctaShort}
            onCta={() => navigate(cta)}
          />
          <PricingCard
            name="Starter"
            price="$29"
            period="/month"
            desc="For teams actively monitoring the competitive landscape"
            features={[
              "10 competitors",
              "2,000 data imports / month",
              "500 AI analyses / month",
              "Full AI extraction pipeline",
              "Custom alert rules",
              "Auto-sync from sources",
              "3 team members",
              "CSV export",
            ]}
            cta={ctaShort}
            onCta={() => navigate(cta)}
            highlighted
          />
          <PricingCard
            name="Premium"
            price="$99"
            period="/month"
            desc="Full strategic intelligence for competitive teams"
            features={[
              "Unlimited competitors",
              "20,000 data imports / month",
              "5,000 AI analyses / month",
              "Advanced strategic insights",
              "Ad Intelligence ✦",
              "Webhook & Slack alerts",
              "10 team members",
              "Priority support",
              "Analytics dashboards",
            ]}
            cta={ctaShort}
            onCta={() => navigate(cta)}
          />
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-6">
          ✦ Ad Intelligence — coming soon exclusively on Premium
        </p>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="bg-accent/20 border-y">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-5 text-[10px] font-semibold tracking-wide px-3 py-1">FAQ</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Common questions
            </h2>
          </div>
          <div className="space-y-2">
            {[
              { q: "What data sources does Tracklyze support?", a: "Currently, Tracklyze supports Gmail OAuth for automated collection of competitor communications. You can also manually import any competitor content. We're expanding to additional data sources in upcoming releases." },
              { q: "Is my data safe?", a: "Yes. We request read-only access and never modify, delete, or send anything on your behalf. All data is encrypted in transit and at rest. Each workspace is fully isolated. You can disconnect sources anytime." },
              { q: "How does the AI analysis work?", a: "Advanced language models extract structured intelligence from competitor content — pricing signals, promotions, CTAs, messaging angles, and campaign patterns. Each insight includes a confidence score so you know how reliable it is." },
              { q: "What makes this different from doing it manually?", a: "Manual tracking doesn't scale. Tracklyze automatically collects, classifies, and analyzes every competitor communication. It detects patterns over time, surfaces pricing changes, and generates strategic recommendations — things you'd miss tracking one piece at a time." },
              { q: "Can I use it without connecting external sources?", a: "Absolutely. You can paste competitor content directly for instant analysis. Source integrations just automate the collection process." },
              { q: "What is Ad Intelligence?", a: "An upcoming Premium feature that will analyze competitor ad creative and targeting from Meta's Ad Library. It's currently in development — we'll announce when it launches." },
              { q: "How many people can use one workspace?", a: "Free includes 1 user. Starter includes 3 team members. Premium includes 10. Each user gets role-based access (Admin, Analyst, or Viewer)." },
              { q: "Can I cancel anytime?", a: "Yes. All plans are month-to-month. No contracts, no commitments. Your data remains accessible until the end of your billing period." },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border bg-card overflow-hidden">
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-foreground flex items-center justify-between list-none hover:bg-accent/40 transition-colors">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 shrink-0 ml-3" />
                </summary>
                <div className="border-t border-border/50 px-5 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed pt-3">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-primary/[0.02] to-background pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 mb-8 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[11px] font-semibold text-primary tracking-wide">Ready to get started?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-foreground tracking-tight mb-6 leading-tight">
            Stop tracking competitors manually.<br className="hidden sm:block" />
            <span className="text-primary">Start winning on intelligence.</span>
          </h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
            Join teams using Tracklyze to automate competitive intelligence
            and make faster, smarter marketing decisions.
          </p>
          <Button
            size="lg"
            className="h-12 px-10 text-sm gap-2 font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/35 transition-all"
            onClick={() => navigate(cta)}
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Button>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {["Free plan available", "Setup in 5 minutes", "No credit card", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-primary/80" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-4 gap-8">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary shadow-sm shadow-primary/30">
                  <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-bold text-foreground">Tracklyze</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                AI-powered competitor intelligence platform for marketing and growth teams.
                Monitor campaigns, extract insights, make better decisions.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-4">Product</p>
              <div className="space-y-2.5">
                {[
                  { label: "Features", href: "#platform" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "FAQ", href: "#faq" },
                ].map((l) => (
                  <a key={l.label} href={l.href} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-4">Account</p>
              <div className="space-y-2.5">
                <a href="/auth" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Sign in</a>
                <a href="/auth" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Create account</a>
              </div>
            </div>
          </div>
          <div className="border-t mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} Tracklyze. All rights reserved.</p>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Pricing Card ─── */
function PricingCard({
  name, price, period, desc, features, cta, onCta, highlighted,
}: {
  name: string; price: string; period: string; desc: string;
  features: string[]; cta: string; onCta: () => void; highlighted?: boolean;
}) {
  return (
    <div className={cn(
      "relative rounded-xl border flex flex-col transition-all duration-200",
      highlighted
        ? "border-primary shadow-xl ring-1 ring-primary/20 scale-[1.02] bg-card"
        : "bg-card hover:border-primary/20 hover:shadow-md",
    )}>
      {highlighted && (
        <>
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <Badge className="text-[10px] px-3 py-1 shadow-md">Most Popular</Badge>
          </div>
        </>
      )}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-base font-bold text-foreground">{name}</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-5">{desc}</p>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-3xl font-black text-foreground tabular-nums">{price}</span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        <Button
          className={cn("w-full mb-6 gap-1.5 font-semibold", highlighted && "shadow-md shadow-primary/20")}
          variant={highlighted ? "default" : "outline"}
          onClick={onCta}
        >
          {cta} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <ul className="space-y-2.5 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                <Check className="h-2.5 w-2.5 text-primary" />
              </div>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
