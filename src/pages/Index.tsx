import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Sparkles, Zap, ArrowRight, Check, Users,
  Lightbulb, TrendingUp, Bell, ChevronDown, Brain, LineChart,
  Target, Search, ShieldCheck, Clock, Eye, Layers, BarChart, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Index() {
  const { t } = useTranslation("home");
  const { user } = useAuth();
  const navigate = useNavigate();
  const cta = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? t("hero.ctaDashboard") : t("hero.ctaStart");
  const ctaShort = user ? t("nav.dashboard") : t("hero.ctaShort");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Typewriter ──────────────────────────────────────────────────────────────
  const rawPhrases = t("typewriter", { returnObjects: true });
  const typewriterPhrases = useMemo<string[]>(
    () => (Array.isArray(rawPhrases) ? rawPhrases : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawPhrases)],
  );
  const [typeText, setTypeText] = useState(typewriterPhrases[0] ?? "");
  const [typePhrase, setTypePhrase] = useState(0);
  const [typeMode, setTypeMode] = useState<"typing" | "waiting" | "deleting">("waiting");
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typewriterPhrases.length === 0) return;
    const phrase = typewriterPhrases[typePhrase];
    if (typeMode === "waiting") {
      const id = setTimeout(() => setTypeMode("deleting"), 2000);
      return () => clearTimeout(id);
    }
    if (typeMode === "deleting") {
      if (typeText.length === 0) {
        setTypePhrase((i) => (i + 1) % typewriterPhrases.length);
        setTypeMode("typing");
        return;
      }
      const id = setTimeout(() => setTypeText((txt) => txt.slice(0, -1)), 30);
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
  }, [typeText, typeMode, typePhrase, typewriterPhrases]);

  // ── Mouse parallax ─────────────────────────────────────────────────────────
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* ─── Header ─── */}
      <header className="border-b border-border/40 bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground tracking-tight">Tracklyze</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: "#why", label: t("nav.whyTracklyze") },
              { href: "#how", label: t("nav.howItWorks") },
              { href: "#platform", label: t("nav.platform") },
              { href: "#pricing", label: t("nav.pricing") },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-nav text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <LanguageSelector />
            <DarkModeToggle />
            {user ? (
              <Button size="sm" className="h-8 text-xs gap-1.5 hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/dashboard")}>
                {t("nav.dashboard")} <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="h-8 text-xs hidden md:inline-flex" onClick={() => navigate("/auth")}>
                  {t("nav.signIn")}
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1.5 hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/auth")}>
                  {t("nav.startFree")} <ArrowRight className="h-3 w-3" />
                </Button>
              </>
            )}
            <button
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background/98 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-0.5">
              {[
                { href: "#why", label: t("nav.whyTracklyze") },
                { href: "#how", label: t("nav.howItWorks") },
                { href: "#platform", label: t("nav.platform") },
                { href: "#pricing", label: t("nav.pricing") },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 pt-3 border-t border-border/40 flex flex-col gap-2">
                {user ? (
                  <Button className="gap-1.5 font-medium" onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }}>
                    {t("nav.dashboard")} <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                      {t("nav.signIn")}
                    </Button>
                    <Button className="gap-1.5 font-medium" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                      {t("nav.startFree")} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ─── */}
      <section ref={heroRef} onMouseMove={handleMouseMove} className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent)] pointer-events-none" />
        {/* Parallax floating elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-primary/[0.07] blur-3xl"
            style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 15}px)` }}
          />
          <div
            className="absolute top-[60%] right-[5%] w-96 h-96 rounded-full bg-primary/[0.05] blur-3xl"
            style={{ transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -10}px)` }}
          />
          <div
            className="absolute top-[30%] right-[25%] w-48 h-48 rounded-full bg-primary/[0.04] blur-2xl"
            style={{ transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 20}px)` }}
          />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20 relative">
          <div className="max-w-3xl mx-auto text-center animate-reveal">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/12 bg-primary/[0.04] px-3.5 py-1.5 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-xs font-medium text-primary/80 tracking-wide">{t("hero.badge")}</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] text-foreground leading-[1.05]">
              {t("hero.headline")}<br className="hidden sm:block" />{" "}
              <span className="text-primary inline-block min-h-[1.15em]">
                {typeText}
                <span
                  className="text-primary/30 font-light"
                  style={{ opacity: cursorOn ? 1 : 0, transition: "opacity 0.15s" }}
                >|</span>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-6 max-w-md text-muted-foreground text-[1.05rem] leading-[1.7] font-normal">
              {t("hero.subheadline")}
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="h-12 px-8 text-sm gap-2 w-full sm:w-auto font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => navigate(cta)}
              >
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-7 text-sm gap-2 w-full sm:w-auto rounded-full"
                onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t("hero.ctaSeeHow")} <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Trust signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground/70">
              {[
                t("hero.trustFreeplan"),
                t("hero.trustSetup"),
                t("hero.trustNoCard"),
                t("hero.trustCancel"),
              ].map((label) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-primary/50" /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Metrics strip */}
          <div className="mt-16 max-w-2xl mx-auto animate-reveal" style={{ animationDelay: "0.15s" }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
              {[
                { value: "10×", label: t("metrics.fasterLabel") },
                { value: "100%", label: t("metrics.automatedLabel") },
                { value: "24/7", label: t("metrics.monitoringLabel") },
                { value: "< 5 min", label: t("metrics.insightLabel") },
              ].map((m, i) => (
                <div key={m.label} className={cn(
                  "flex flex-col items-center justify-center px-4 py-5 text-center",
                  i < 2 && "border-b sm:border-b-0",
                  i % 2 === 0 && "border-r border-border/50",
                  i === 1 && "sm:border-r sm:border-border/50",
                  i === 2 && "sm:border-r sm:border-border/50",
                )}>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight stat-value">{m.value}</p>
                  <p className="text-caption font-medium text-muted-foreground/60 mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Dashboard preview mockup ─── */}
          <div className="mt-16 max-w-4xl mx-auto animate-reveal" style={{ animationDelay: "0.3s" }}>
            <div className="relative rounded-xl border border-border/40 bg-card shadow-lg overflow-hidden">
              {/* Mockup header bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/20">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="h-5 w-48 rounded-md bg-muted/40" />
                </div>
              </div>
              {/* Mockup content */}
              <div className="p-6 grid grid-cols-3 gap-4">
                {/* Left panel */}
                <div className="col-span-2 space-y-4">
                  <div className="flex gap-3">
                    {["Competitors", "Signals", "Insights"].map((label, i) => (
                      <div key={label} className={cn(
                        "rounded-lg px-4 py-2.5 text-xs font-medium",
                        i === 0 ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"
                      )}>
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { name: "Acme Corp", signals: 14, change: "+23%" },
                      { name: "Globex Inc", signals: 9, change: "+8%" },
                      { name: "Initech", signals: 5, change: "-3%" },
                    ].map((row) => (
                      <div key={row.name} className="flex items-center justify-between rounded-lg border border-border/30 px-4 py-3 bg-background/50">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {row.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{row.name}</p>
                            <p className="text-xs text-muted-foreground">{row.signals} signals</p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs font-semibold",
                          row.change.startsWith("+") ? "text-green-600 dark:text-green-400" : "text-red-500"
                        )}>{row.change}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right panel */}
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/30 p-4 bg-background/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">AI Insight</p>
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-full rounded bg-muted/50" />
                      <div className="h-2.5 w-4/5 rounded bg-muted/40" />
                      <div className="h-2.5 w-3/5 rounded bg-muted/30" />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/30 p-4 bg-background/50">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Activity</p>
                    <div className="flex items-end gap-1.5 h-16">
                      {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 65].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-primary/20"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trusted By (logo marquee) ─── */}
      <section className="border-y border-border/40 bg-muted/10 py-6 overflow-hidden">
        <p className="text-center text-xs font-semibold text-muted-foreground/40 uppercase tracking-[0.2em] mb-5">{t("builtFor.label")}</p>
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-muted/10 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-muted/10 to-transparent z-10 pointer-events-none" />
          {/* Scrolling logos */}
          <div className="flex animate-marquee gap-12 items-center">
            {[
              { icon: TrendingUp, label: t("builtFor.growthTeams") },
              { icon: Target, label: t("builtFor.marketingTeams") },
              { icon: BarChart3, label: t("builtFor.ecommerceBrands") },
              { icon: Users, label: t("builtFor.dtcCompanies") },
              { icon: Lightbulb, label: t("builtFor.productStrategists") },
              { icon: TrendingUp, label: t("builtFor.growthTeams") },
              { icon: Target, label: t("builtFor.marketingTeams") },
              { icon: BarChart3, label: t("builtFor.ecommerceBrands") },
              { icon: Users, label: t("builtFor.dtcCompanies") },
              { icon: Lightbulb, label: t("builtFor.productStrategists") },
            ].map(({ icon: Icon, label }, i) => (
              <div key={`${label}-${i}`} className="flex items-center gap-2 shrink-0 text-sm font-medium text-muted-foreground/40">
                <Icon className="h-4 w-4" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Problem / Solution ─── */}
      <section id="why" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">

        {/* Problem */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-4">{t("problem.badge")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.15]">
            {t("problem.headline")}<br className="hidden sm:block" />
            <span className="text-muted-foreground/60 font-normal">{t("problem.headlineSub")}</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {[
            { icon: Layers, title: t("problem.card1Title"), desc: t("problem.card1Desc") },
            { icon: Clock, title: t("problem.card2Title"), desc: t("problem.card2Desc") },
            { icon: Eye, title: t("problem.card3Title"), desc: t("problem.card3Desc") },
          ].map((p) => (
            <div key={p.title} className="rounded-lg border p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60 mb-5">
                <p.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Problem → Solution transition */}
        <div className="my-16 max-w-xs mx-auto">
          <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
        </div>

        {/* Solution */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/60 mb-4">{t("solution.badge")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.15]">
            {t("solution.headline")}<br className="hidden sm:block" />
            {t("solution.headlineSub")}
          </h2>
          <p className="text-base text-muted-foreground max-w-lg mx-auto mt-5 leading-relaxed">
            {t("solution.desc")}
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {[
            { icon: Zap, title: t("solution.card1Title"), desc: t("solution.card1Desc") },
            { icon: Brain, title: t("solution.card2Title"), desc: t("solution.card2Desc") },
            { icon: Target, title: t("solution.card3Title"), desc: t("solution.card3Desc") },
          ].map((s) => (
            <div key={s.title} className="rounded-lg border p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-5">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how" className="bg-muted/20 border-y border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-4">{t("howItWorks.badge")}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              {t("howItWorks.headline")}
            </h2>
            <p className="text-base text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
              {t("howItWorks.desc")}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { step: "01", icon: Search, title: t("howItWorks.step1Title"), desc: t("howItWorks.step1Desc") },
              { step: "02", icon: Users, title: t("howItWorks.step2Title"), desc: t("howItWorks.step2Desc") },
              { step: "03", icon: Sparkles, title: t("howItWorks.step3Title"), desc: t("howItWorks.step3Desc") },
              { step: "04", icon: TrendingUp, title: t("howItWorks.step4Title"), desc: t("howItWorks.step4Desc") },
            ].map((s, i) => (
              <div
                key={s.step}
                className="relative rounded-lg border bg-card p-6 hover:border-border hover:shadow-sm transition-all duration-200"
              >
                <div className="absolute top-4 right-4 text-caption font-bold tabular-nums text-muted-foreground/20">
                  {s.step}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-4">
                  <s.icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < 3 && (
                  <div className="absolute -right-2.5 top-9 hidden lg:flex items-center justify-center z-10">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Button
              size="lg"
              className="h-12 px-8 text-sm gap-2 font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate(cta)}
            >
              {ctaShort} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Platform Features ─── */}
      <section id="platform" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-4">{t("platform.badge")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            {t("platform.headline")}
          </h2>
          <p className="text-base text-muted-foreground mt-4 max-w-lg mx-auto leading-relaxed">
            {t("platform.desc")}
          </p>
        </div>

        <div className="space-y-20">
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-5">
                <BarChart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {t("platform.feature1Headline")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {t("platform.feature1Desc")}
              </p>
              <ul className="space-y-2.5">
                {[
                  t("platform.feature1Bullet1"),
                  t("platform.feature1Bullet2"),
                  t("platform.feature1Bullet3"),
                  t("platform.feature1Bullet4"),
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border/40 bg-gradient-to-br from-muted/40 to-background p-6 sm:p-8 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="w-full max-w-[280px] space-y-2.5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                  <p className="section-label text-muted-foreground/60">{t("platform.competitorActivityLabel")}</p>
                </div>
                {["Competitor A", "Competitor B", "Competitor C"].map((name, i) => (
                  <div key={name} className="flex items-center justify-between rounded-lg bg-card border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-caption font-bold text-primary">
                        {name.charAt(11)}
                      </div>
                      <span className="text-xs font-medium text-foreground">{name}</span>
                    </div>
                    <Badge variant="outline" className="text-caption bg-background">{[12, 7, 5][i]} {t("platform.signalSuffix")}</Badge>
                  </div>
                ))}
                <div className="flex gap-1.5 pt-1 flex-wrap">
                  <Badge variant="outline" className="text-caption bg-card">{t("platform.priceChanges")}</Badge>
                  <Badge variant="outline" className="text-caption bg-card">{t("platform.promotions")}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 rounded-xl border border-border/40 bg-gradient-to-br from-muted/40 to-background p-6 sm:p-8 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="w-full max-w-[260px] space-y-2.5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                  <p className="section-label text-muted-foreground/60">{t("platform.aiExtractionLabel")}</p>
                </div>
                {[
                  { label: t("platform.pricingSignal"), conf: "94%", w: "94%" },
                  { label: t("platform.campaignType"), conf: "89%", w: "89%" },
                  { label: t("platform.urgencyLevel"), conf: "91%", w: "91%" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-card border px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-muted-foreground">{item.label}</span>
                      <span className="text-caption font-bold text-primary">{item.conf}</span>
                    </div>
                    <div className="h-1 rounded-full bg-primary/10 overflow-hidden">
                      <div className="h-full rounded-full bg-primary/40 transition-all" style={{ width: item.w }} />
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
                {t("platform.feature2Headline")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {t("platform.feature2Desc")}
              </p>
              <ul className="space-y-2.5">
                {[
                  t("platform.feature2Bullet1"),
                  t("platform.feature2Bullet2"),
                  t("platform.feature2Bullet3"),
                  t("platform.feature2Bullet4"),
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
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
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-5">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {t("platform.feature3Headline")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {t("platform.feature3Desc")}
              </p>
              <ul className="space-y-2.5">
                {[
                  t("platform.feature3Bullet1"),
                  t("platform.feature3Bullet2"),
                  t("platform.feature3Bullet3"),
                  t("platform.feature3Bullet4"),
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border/40 bg-gradient-to-br from-muted/40 to-background p-6 sm:p-8 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="w-full max-w-[280px] space-y-2.5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive/50" />
                  <p className="section-label text-muted-foreground/60">{t("platform.liveAlertsLabel")}</p>
                </div>
                {[
                  { text: t("platform.alertHigh"), sev: t("platform.severityHigh"), dot: "bg-destructive", badge: "border-destructive/25 text-destructive" },
                  { text: t("platform.alertMedium"), sev: t("platform.severityMedium"), dot: "bg-warning", badge: "border-warning/25 text-warning" },
                  { text: t("platform.alertLow"), sev: t("platform.severityLow"), dot: "bg-primary", badge: "border-primary/25 text-primary" },
                ].map((a) => (
                  <div key={a.text} className="rounded-lg bg-card border px-3 py-2.5 flex items-start gap-2.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", a.dot)} />
                    <div>
                      <p className="text-caption text-foreground font-medium leading-snug">{a.text}</p>
                      <Badge variant="outline" className={cn("text-caption mt-1.5", a.badge)}>{a.sev}</Badge>
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
            { icon: LineChart, title: t("platform.miniFeature1Title"), desc: t("platform.miniFeature1Desc") },
            { icon: Users, title: t("platform.miniFeature2Title"), desc: t("platform.miniFeature2Desc") },
            { icon: ShieldCheck, title: t("platform.miniFeature3Title"), desc: t("platform.miniFeature3Desc") },
            { icon: Lightbulb, title: t("platform.miniFeature4Title"), desc: t("platform.miniFeature4Desc"), tag: t("platform.comingSoon") },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-lg border bg-card p-6 hover:border-border hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                {f.tag && <Badge variant="outline" className="text-caption font-medium">{f.tag}</Badge>}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="border-y border-border/40 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-4">{t("socialProof.badge")}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              {t("socialProof.headline")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { quote: t("socialProof.quote1"), role: t("socialProof.role1"), company: t("socialProof.company1") },
              { quote: t("socialProof.quote2"), role: t("socialProof.role2"), company: t("socialProof.company2") },
              { quote: t("socialProof.quote3"), role: t("socialProof.role3"), company: t("socialProof.company3") },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card p-6 flex flex-col hover:shadow-sm transition-all duration-200"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4 text-primary/50">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <span key={si} className="text-sm leading-none">★</span>
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed flex-1">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/40">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {testimonial.role.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{testimonial.role}</p>
                    <p className="text-caption text-muted-foreground">{testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-caption text-muted-foreground mt-6 italic">
            {t("socialProof.disclaimer")}
          </p>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-4">{t("pricing.badge")}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            {t("pricing.headline")}
          </h2>
          <p className="text-base text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
            {t("pricing.desc")}
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <PricingCard
            name={t("pricing.freeName")}
            price={t("pricing.freePrice")}
            period={t("pricing.freePeriod")}
            desc={t("pricing.freeDesc")}
            features={[
              t("pricing.free1"),
              t("pricing.free2"),
              t("pricing.free3"),
              t("pricing.free4"),
              t("pricing.free5"),
              t("pricing.free6"),
            ]}
            cta={ctaShort}
            onCta={() => navigate(cta)}
          />
          <PricingCard
            name={t("pricing.starterName")}
            price={t("pricing.starterPrice")}
            period={t("pricing.starterPeriod")}
            desc={t("pricing.starterDesc")}
            features={[
              t("pricing.starter1"),
              t("pricing.starter2"),
              t("pricing.starter3"),
              t("pricing.starter4"),
              t("pricing.starter5"),
              t("pricing.starter6"),
              t("pricing.starter7"),
              t("pricing.starter8"),
            ]}
            cta={ctaShort}
            onCta={() => navigate(cta)}
            highlighted
            mostPopularLabel={t("pricing.mostPopular")}
          />
          <PricingCard
            name={t("pricing.premiumName")}
            price={t("pricing.premiumPrice")}
            period={t("pricing.premiumPeriod")}
            desc={t("pricing.premiumDesc")}
            features={[
              t("pricing.premium1"),
              t("pricing.premium2"),
              t("pricing.premium3"),
              t("pricing.premium4"),
              t("pricing.premium5"),
              t("pricing.premium6"),
              t("pricing.premium7"),
              t("pricing.premium8"),
              t("pricing.premium9"),
            ]}
            cta={ctaShort}
            onCta={() => navigate(cta)}
          />
        </div>
        <p className="text-center text-caption text-muted-foreground mt-6">
          {t("pricing.adIntelligenceNote")}
        </p>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="bg-muted/10 border-y border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-4">{t("faq.badge")}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              {t("faq.headline")}
            </h2>
          </div>
          <div className="space-y-2">
            {[
              { q: t("faq.q1"), a: t("faq.a1") },
              { q: t("faq.q2"), a: t("faq.a2") },
              { q: t("faq.q3"), a: t("faq.a3") },
              { q: t("faq.q4"), a: t("faq.a4") },
              { q: t("faq.q5"), a: t("faq.a5") },
              { q: t("faq.q6"), a: t("faq.a6") },
              { q: t("faq.q7"), a: t("faq.a7") },
              { q: t("faq.q8"), a: t("faq.a8") },
            ].map((faq, i) => (
              <details key={i} className="group rounded-lg border bg-card overflow-hidden">
                <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium text-foreground flex items-center justify-between list-none hover:bg-accent/30 transition-colors">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 shrink-0 ml-3" />
                </summary>
                <div className="border-t border-border/40 px-5 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed pt-3">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-primary/[0.03] blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center relative">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/50 mb-4">{t("finalCta.badge")}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-6 leading-[1.1]">
            {t("finalCta.headline")}<br className="hidden sm:block" />
            <span className="text-primary">{t("finalCta.headlineSub")}</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
            {t("finalCta.desc")}
          </p>
          <Button
            size="lg"
            className="h-12 px-10 text-sm gap-2 font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate(cta)}
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Button>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {[
              t("hero.trustFreeplan"),
              t("hero.trustSetup"),
              t("hero.trustNoCard"),
              t("hero.trustCancel"),
            ].map((label) => (
              <span key={label} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-primary/70" /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="grid sm:grid-cols-4 gap-10">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <BarChart3 className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-base font-bold text-foreground tracking-tight">Tracklyze</span>
              </div>
              <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-xs">
                {t("footer.tagline")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-5">{t("footer.productLabel")}</p>
              <div className="space-y-3">
                {[
                  { label: t("footer.featuresLink"), href: "#platform" },
                  { label: t("footer.pricingLink"), href: "#pricing" },
                  { label: t("footer.faqLink"), href: "#faq" },
                ].map((l) => (
                  <a key={l.label} href={l.href} className="block text-sm text-muted-foreground/70 hover:text-foreground transition-colors">{l.label}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-5">{t("footer.accountLabel")}</p>
              <div className="space-y-3">
                <a href="/auth" className="block text-sm text-muted-foreground/70 hover:text-foreground transition-colors">{t("footer.signInLink")}</a>
                <a href="/auth" className="block text-sm text-muted-foreground/70 hover:text-foreground transition-colors">{t("footer.createAccountLink")}</a>
              </div>
            </div>
          </div>
          <div className="border-t border-border/30 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground/50">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
            <div className="flex items-center gap-5 text-xs text-muted-foreground/50">
              <a href="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacyPolicy")}</a>
              <a href="/terms" className="hover:text-foreground transition-colors">{t("footer.termsOfService")}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Pricing Card ─── */
interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  onCta: () => void;
  highlighted?: boolean;
  mostPopularLabel?: string;
}

function PricingCard({
  name, price, period, desc, features, cta, onCta, highlighted, mostPopularLabel,
}: PricingCardProps) {
  return (
    <div className={cn(
      "relative rounded-lg border flex flex-col transition-all duration-200",
      highlighted
        ? "border-primary/30 shadow-md bg-card"
        : "bg-card hover:border-border hover:shadow-sm",
    )}>
      {highlighted && (
        <>
          <div className="absolute inset-x-0 top-0 h-px rounded-t-lg bg-primary/50" />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="text-caption font-semibold px-2.5 py-0.5">{mostPopularLabel}</Badge>
          </div>
        </>
      )}
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <h3 className="text-base font-semibold text-foreground">{name}</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-5">{desc}</p>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-3xl font-bold text-foreground stat-value">{price}</span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        <Button
          className="w-full mb-6 gap-1.5 font-semibold"
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
