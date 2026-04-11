import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Index() {
  const { t } = useTranslation("home");
  const { user } = useAuth();
  const navigate = useNavigate();
  const cta = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? t("hero.ctaDashboard") : t("hero.ctaStart");
  const ctaShort = user ? t("nav.dashboard") : t("hero.ctaShort");

  // ── Typewriter ──────────────────────────────────────────────────────────────
  const typewriterPhrases = t("typewriter", { returnObjects: true }) as string[];
  const [typeText, setTypeText] = useState(typewriterPhrases[0]);
  const [typePhrase, setTypePhrase] = useState(0);
  const [typeMode, setTypeMode] = useState<"typing" | "waiting" | "deleting">("waiting");
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
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
              { href: "#why", label: t("nav.whyTracklyze") },
              { href: "#how", label: t("nav.howItWorks") },
              { href: "#platform", label: t("nav.platform") },
              { href: "#pricing", label: t("nav.pricing") },
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
            <LanguageSelector />
            <DarkModeToggle />
            {user ? (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate("/dashboard")}>
                {t("nav.dashboard")} <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="h-8 text-xs hidden sm:inline-flex" onClick={() => navigate("/auth")}>
                  {t("nav.signIn")}
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1.5 shadow-sm" onClick={() => navigate("/auth")}>
                  {t("nav.startFree")} <ArrowRight className="h-3 w-3" />
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
              <span className="text-xs font-semibold text-primary tracking-wide">{t("hero.badge")}</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-bold tracking-tight text-foreground leading-[1.06]">
              {t("hero.headline")}<br className="hidden sm:block" />{" "}
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
              {t("hero.subheadline")}
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
                {t("hero.ctaSeeHow")} <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Trust signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {[
                t("hero.trustFreeplan"),
                t("hero.trustSetup"),
                t("hero.trustNoCard"),
                t("hero.trustCancel"),
              ].map((label) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-primary/80" /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Metrics strip */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
              {[
                { value: "10×", label: t("metrics.fasterLabel") },
                { value: "100%", label: t("metrics.automatedLabel") },
                { value: "24/7", label: t("metrics.monitoringLabel") },
                { value: "< 5 min", label: t("metrics.insightLabel") },
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
            <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest shrink-0">{t("builtFor.label")}</p>
            {[
              { icon: TrendingUp, label: t("builtFor.growthTeams") },
              { icon: Target, label: t("builtFor.marketingTeams") },
              { icon: BarChart3, label: t("builtFor.ecommerceBrands") },
              { icon: Users, label: t("builtFor.dtcCompanies") },
              { icon: Lightbulb, label: t("builtFor.productStrategists") },
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
            {t("problem.badge")}
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
            {t("problem.headline")}<br className="hidden sm:block" />
            <span className="text-muted-foreground font-normal">{t("problem.headlineSub")}</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { icon: Layers, title: t("problem.card1Title"), desc: t("problem.card1Desc") },
            { icon: Clock, title: t("problem.card2Title"), desc: t("problem.card2Desc") },
            { icon: Eye, title: t("problem.card3Title"), desc: t("problem.card3Desc") },
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
            {t("solution.badge")}
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
            {t("solution.headline")}<br className="hidden sm:block" />
            {t("solution.headlineSub")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-4 leading-relaxed">
            {t("solution.desc")}
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { icon: Zap, title: t("solution.card1Title"), desc: t("solution.card1Desc") },
            { icon: Brain, title: t("solution.card2Title"), desc: t("solution.card2Desc") },
            { icon: Target, title: t("solution.card3Title"), desc: t("solution.card3Desc") },
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
            <Badge variant="outline" className="mb-5 text-[10px] font-semibold tracking-wide px-3 py-1">{t("howItWorks.badge")}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {t("howItWorks.headline")}
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
              {t("howItWorks.desc")}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {[
              { step: "01", icon: Search, title: t("howItWorks.step1Title"), desc: t("howItWorks.step1Desc") },
              { step: "02", icon: Users, title: t("howItWorks.step2Title"), desc: t("howItWorks.step2Desc") },
              { step: "03", icon: Sparkles, title: t("howItWorks.step3Title"), desc: t("howItWorks.step3Desc") },
              { step: "04", icon: TrendingUp, title: t("howItWorks.step4Title"), desc: t("howItWorks.step4Desc") },
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
          <Badge variant="outline" className="mb-5 text-[10px] font-semibold tracking-wide px-3 py-1">{t("platform.badge")}</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t("platform.headline")}
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
            {t("platform.desc")}
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
                {t("platform.feature1Headline")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {t("platform.feature1Desc")}
              </p>
              <ul className="space-y-3">
                {[
                  t("platform.feature1Bullet1"),
                  t("platform.feature1Bullet2"),
                  t("platform.feature1Bullet3"),
                  t("platform.feature1Bullet4"),
                ].map((f) => (
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
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("platform.competitorActivityLabel")}</p>
                </div>
                {["Competitor A", "Competitor B", "Competitor C"].map((name, i) => (
                  <div key={name} className="flex items-center justify-between rounded-lg bg-card border px-3.5 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {name.charAt(11)}
                      </div>
                      <span className="text-xs font-medium text-foreground">{name}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-background">{[12, 7, 5][i]} {t("platform.signalSuffix")}</Badge>
                  </div>
                ))}
                <div className="flex gap-1.5 pt-1 flex-wrap">
                  <Badge variant="outline" className="text-[9px] bg-card">{t("platform.priceChanges")}</Badge>
                  <Badge variant="outline" className="text-[9px] bg-card">{t("platform.promotions")}</Badge>
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
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("platform.aiExtractionLabel")}</p>
                </div>
                {[
                  { label: t("platform.pricingSignal"), conf: "94%", w: "94%" },
                  { label: t("platform.campaignType"), conf: "89%", w: "89%" },
                  { label: t("platform.urgencyLevel"), conf: "91%", w: "91%" },
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
                {t("platform.feature2Headline")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {t("platform.feature2Desc")}
              </p>
              <ul className="space-y-3">
                {[
                  t("platform.feature2Bullet1"),
                  t("platform.feature2Bullet2"),
                  t("platform.feature2Bullet3"),
                  t("platform.feature2Bullet4"),
                ].map((f) => (
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
                {t("platform.feature3Headline")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {t("platform.feature3Desc")}
              </p>
              <ul className="space-y-3">
                {[
                  t("platform.feature3Bullet1"),
                  t("platform.feature3Bullet2"),
                  t("platform.feature3Bullet3"),
                  t("platform.feature3Bullet4"),
                ].map((f) => (
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
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("platform.liveAlertsLabel")}</p>
                </div>
                {[
                  { text: t("platform.alertHigh"), sev: t("platform.severityHigh"), dot: "bg-destructive", badge: "border-destructive/30 text-destructive" },
                  { text: t("platform.alertMedium"), sev: t("platform.severityMedium"), dot: "bg-warning", badge: "border-warning/30 text-warning" },
                  { text: t("platform.alertLow"), sev: t("platform.severityLow"), dot: "bg-primary", badge: "border-primary/30 text-primary" },
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
            { icon: LineChart, title: t("platform.miniFeature1Title"), desc: t("platform.miniFeature1Desc") },
            { icon: Users, title: t("platform.miniFeature2Title"), desc: t("platform.miniFeature2Desc") },
            { icon: ShieldCheck, title: t("platform.miniFeature3Title"), desc: t("platform.miniFeature3Desc") },
            { icon: Lightbulb, title: t("platform.miniFeature4Title"), desc: t("platform.miniFeature4Desc"), tag: t("platform.comingSoon") },
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
            <Badge variant="outline" className="mb-5 text-[10px] font-semibold tracking-wide px-3 py-1">{t("socialProof.badge")}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {t("socialProof.headline")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { quote: t("socialProof.quote1"), role: t("socialProof.role1"), company: t("socialProof.company1") },
              { quote: t("socialProof.quote2"), role: t("socialProof.role2"), company: t("socialProof.company2") },
              { quote: t("socialProof.quote3"), role: t("socialProof.role3"), company: t("socialProof.company3") },
            ].map((testimonial, i) => (
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
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {testimonial.role.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{testimonial.role}</p>
                    <p className="text-[10px] text-muted-foreground">{testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-6 italic">
            {t("socialProof.disclaimer")}
          </p>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-5 text-[10px] font-semibold tracking-wide px-3 py-1">{t("pricing.badge")}</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t("pricing.headline")}
          </h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
            {t("pricing.desc")}
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
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
        <p className="text-center text-[10px] text-muted-foreground mt-6">
          {t("pricing.adIntelligenceNote")}
        </p>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="bg-accent/20 border-y">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-5 text-[10px] font-semibold tracking-wide px-3 py-1">{t("faq.badge")}</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
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
            <span className="text-[11px] font-semibold text-primary tracking-wide">{t("finalCta.badge")}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-foreground tracking-tight mb-6 leading-tight">
            {t("finalCta.headline")}<br className="hidden sm:block" />
            <span className="text-primary">{t("finalCta.headlineSub")}</span>
          </h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
            {t("finalCta.desc")}
          </p>
          <Button
            size="lg"
            className="h-12 px-10 text-sm gap-2 font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/35 transition-all"
            onClick={() => navigate(cta)}
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Button>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {[
              t("hero.trustFreeplan"),
              t("hero.trustSetup"),
              t("hero.trustNoCard"),
              t("hero.trustCancel"),
            ].map((label) => (
              <span key={label} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-primary/80" /> {label}
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
                {t("footer.tagline")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-4">{t("footer.productLabel")}</p>
              <div className="space-y-2.5">
                {[
                  { label: t("footer.featuresLink"), href: "#platform" },
                  { label: t("footer.pricingLink"), href: "#pricing" },
                  { label: t("footer.faqLink"), href: "#faq" },
                ].map((l) => (
                  <a key={l.label} href={l.href} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-4">{t("footer.accountLabel")}</p>
              <div className="space-y-2.5">
                <a href="/auth" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">{t("footer.signInLink")}</a>
                <a href="/auth" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">{t("footer.createAccountLink")}</a>
              </div>
            </div>
          </div>
          <div className="border-t mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
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
      "relative rounded-xl border flex flex-col transition-all duration-200",
      highlighted
        ? "border-primary shadow-xl ring-1 ring-primary/20 scale-[1.02] bg-card"
        : "bg-card hover:border-primary/20 hover:shadow-md",
    )}>
      {highlighted && (
        <>
          <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <Badge className="text-[10px] px-3 py-1 shadow-md">{mostPopularLabel}</Badge>
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
