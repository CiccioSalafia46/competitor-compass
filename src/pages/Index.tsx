import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Sparkles, Shield, Zap, ArrowRight, Check, Mail, Users,
  Lightbulb, TrendingUp, Bell, Megaphone, ChevronDown, Eye, Newspaper,
  Clock, Target, AlertTriangle, X, Brain, LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "@/components/DarkModeToggle";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cta = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? "Go to Dashboard" : "Start Free — No Card Required";
  const ctaShort = user ? "Go to Dashboard" : "Get Started Free";

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sticky Header ─── */}
      <header className="border-b bg-card/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">Newsletter Intel</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#problem" className="hover:text-foreground transition-colors">Why</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
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
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate("/auth")}>
                  Get started <ArrowRight className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-16 sm:pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 gap-1.5 px-3 py-1 text-xs font-normal">
            <Sparkles className="h-3 w-3" /> AI-powered competitive intelligence for marketing teams
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.12]">
            Know what your competitors
            <br className="hidden sm:block" />
            are doing <span className="text-primary">before they do it</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground text-base sm:text-lg leading-relaxed">
            Automatically track competitor newsletters and ads. AI extracts pricing changes,
            positioning shifts, and campaign strategies — so your team always stays one step ahead.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-sm gap-2 w-full sm:w-auto font-medium" onClick={() => navigate(cta)}>
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-sm gap-2 w-full sm:w-auto" onClick={() => {
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
            }}>
              See how it works <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          {/* Trust bar */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {["Read-only Gmail access", "No credit card required", "Data encrypted at rest", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-primary" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof / Logos placeholder ─── */}
      <section className="border-y bg-accent/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <p className="text-center text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-5">
            Built for marketing, growth, and e-commerce teams
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
            {["Your Brand", "Partner Co", "Growth Inc", "Market Pro", "Scale HQ"].map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground select-none">
                <div className="h-8 w-8 rounded-md bg-muted" />
                {name}
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-4 italic">
            Logo section — will feature real customer logos after launch
          </p>
        </div>
      </section>

      {/* ─── Problem → Solution ─── */}
      <section id="problem" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-destructive uppercase tracking-widest mb-2">The Problem</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Your competitors are sending signals every day.
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">You're probably missing most of them.</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { icon: AlertTriangle, title: "Scattered across inboxes", desc: "Competitor newsletters sit unread in shared inboxes. There's no structure, no history, no searchable archive." },
            { icon: Clock, title: "Hours of manual work", desc: "Someone has to read every email, compare it to last month, spot the differences. It doesn't scale." },
            { icon: X, title: "Missed strategic signals", desc: "A pricing change, a new product launch, a shift in messaging — by the time you notice, you're reacting, not leading." },
          ].map((p) => (
            <div key={p.title} className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
              <p.icon className="h-5 w-5 text-destructive mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{p.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Solution */}
        <div className="mt-14 text-center">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">The Solution</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-4">
            Automate competitive intelligence.
            <br className="hidden sm:block" />
            Focus on strategy, not data collection.
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8">
            Newsletter Intel connects to your inbox, imports competitor emails automatically,
            and uses AI to extract the signals that matter — pricing, promotions, positioning, campaign patterns.
          </p>
          <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { icon: Zap, title: "Automatic collection", desc: "Gmail integration imports and classifies competitor newsletters without manual effort." },
              { icon: Brain, title: "AI-powered extraction", desc: "Advanced models extract pricing, offers, CTAs, and strategic themes from every email." },
              { icon: Target, title: "Actionable insights", desc: "Get alerts on competitor moves and strategic recommendations your team can act on immediately." },
            ].map((s) => (
              <div key={s.title} className="rounded-lg border bg-primary/5 border-primary/20 p-6">
                <s.icon className="h-5 w-5 text-primary mb-3" />
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="bg-accent/30 border-y">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">How It Works</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              From inbox to intelligence in under 5 minutes
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              No complex setup. No API keys. Just connect and start getting insights.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "1", icon: Mail, title: "Connect your Gmail", desc: "One-click OAuth. Read-only access. We never send, delete, or modify emails. Disconnect anytime." },
              { step: "2", icon: Users, title: "Add your competitors", desc: "Enter competitor names and domains. We automatically match incoming newsletters to the right brands." },
              { step: "3", icon: Sparkles, title: "AI extracts intelligence", desc: "Every newsletter is analyzed for pricing signals, promotional strategies, messaging angles, and CTAs." },
              { step: "4", icon: Lightbulb, title: "Act on insights", desc: "View competitor dashboards, receive alerts on key changes, and use strategic insights to inform your decisions." },
            ].map((s, i) => (
              <div key={s.step} className="relative text-center">
                {i < 3 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px border-t border-dashed border-primary/30" />
                )}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-semibold mx-auto mb-4 relative z-10">
                  {s.step}
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button size="lg" className="h-11 px-7 text-sm gap-2" onClick={() => navigate(cta)}>
              {ctaShort} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Platform</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Everything you need to monitor competitors
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
            From automated collection to strategic insights — one platform for your entire competitive intelligence workflow.
          </p>
        </div>

        {/* Feature highlight rows */}
        <div className="space-y-16">
          {/* Row 1 */}
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="outline" className="mb-3 text-[10px]">Data Collection</Badge>
              <h3 className="text-xl font-semibold text-foreground mb-2">Automated newsletter inbox</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Connect Gmail with read-only access. We classify, organize, and archive every competitor
                newsletter automatically. No more forwarding emails or copy-pasting content.
              </p>
              <ul className="space-y-2">
                {["Gmail OAuth — one-click connection", "Automatic sender classification", "Searchable archive with filters", "Read newsletters in a clean reader view"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-accent/40 p-8 flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <Mail className="h-12 w-12 text-primary/30 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">Newsletter inbox preview</p>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="order-2 lg:order-1 rounded-xl border bg-accent/40 p-8 flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <Sparkles className="h-12 w-12 text-primary/30 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">AI analysis dashboard preview</p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Badge variant="outline" className="mb-3 text-[10px]">Intelligence</Badge>
              <h3 className="text-xl font-semibold text-foreground mb-2">AI-powered analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Every newsletter is analyzed by advanced AI models that extract structured intelligence —
                pricing signals, promotion strategies, messaging angles, CTAs, and competitive positioning.
              </p>
              <ul className="space-y-2">
                {["Pricing and discount detection", "Campaign type classification", "CTA and urgency analysis", "Confidence scores on every insight"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="outline" className="mb-3 text-[10px]">Monitoring</Badge>
              <h3 className="text-xl font-semibold text-foreground mb-2">Alerts & strategic insights</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Set custom rules to get notified when competitors change pricing, launch campaigns,
                or shift messaging. AI synthesizes patterns into strategic recommendations.
              </p>
              <ul className="space-y-2">
                {["Custom alert rules (price drops, keywords, new ads)", "AI-generated strategic insights", "Competitor activity dashboards", "Trend analysis over time"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-accent/40 p-8 flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <Bell className="h-12 w-12 text-primary/30 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">Alerts & insights preview</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional features grid */}
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: LineChart, title: "Analytics Dashboard", desc: "Visualize newsletter frequency, promotion patterns, and campaign types across all competitors." },
            { icon: Users, title: "Team Workspaces", desc: "Invite your team with role-based access. Admin, Analyst, and Viewer roles with full audit trail." },
            { icon: Eye, title: "Newsletter Reader", desc: "Read competitor emails in a clean, distraction-free view with AI intelligence displayed alongside." },
            { icon: Megaphone, title: "Ad Intelligence", desc: "Track competitor ad creative and messaging from Meta's Ad Library. Coming soon to Premium.", tag: "Coming soon" },
          ].map((f) => (
            <Card key={f.title} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                    <f.icon className="h-4 w-4 text-accent-foreground" />
                  </div>
                  {f.tag && <Badge variant="outline" className="text-[9px] font-normal">{f.tag}</Badge>}
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Use Cases ─── */}
      <section className="bg-accent/30 border-y">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Who It's For</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              Built for teams that compete on intelligence
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { title: "Marketing Teams", desc: "Monitor competitor messaging, campaign cadence, and promotional strategies to sharpen your own positioning and find gaps in the market.", icon: Megaphone, outcome: "→ React faster to competitor campaigns" },
              { title: "Growth & Product Teams", desc: "Identify competitor pricing changes, new feature launches, and expansion signals before they impact your pipeline or market share.", icon: TrendingUp, outcome: "→ Spot pricing threats early" },
              { title: "E-Commerce & DTC Brands", desc: "Track competitor promotions, discount patterns, seasonal strategies, and product focus areas to optimize your own calendar.", icon: Newspaper, outcome: "→ Never miss a competitor sale" },
            ].map((uc) => (
              <Card key={uc.title} className="border">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <uc.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{uc.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{uc.desc}</p>
                  <p className="text-xs font-medium text-primary">{uc.outcome}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials Placeholder ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">What Teams Say</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Trusted by competitive intelligence professionals
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-dashed bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div>
                  <div className="h-3 w-24 rounded bg-muted mb-1.5" />
                  <div className="h-2.5 w-16 rounded bg-muted" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded bg-muted" />
                <div className="h-2.5 w-full rounded bg-muted" />
                <div className="h-2.5 w-3/4 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-5 italic">
          Testimonial section — will feature real customer feedback after launch
        </p>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="bg-accent/30 border-y">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              Simple pricing. Start free, grow as you scale.
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Every plan includes core intelligence features. Upgrade when you need more volume,
              deeper analysis, or team collaboration.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              period="forever"
              desc="For individuals exploring competitive intelligence"
              features={[
                "1 workspace",
                "3 competitors",
                "200 newsletters / month",
                "50 AI analyses / month",
                "Basic email alerts",
                "Newsletter reader",
              ]}
              cta={ctaShort}
              onCta={() => navigate(cta)}
            />
            <PricingCard
              name="Starter"
              price="$29"
              period="/month"
              desc="For teams actively monitoring competitors"
              features={[
                "10 competitors",
                "2,000 newsletters / month",
                "500 AI analyses / month",
                "Full AI extraction",
                "Custom alert rules",
                "Gmail auto-sync",
                "3 team seats",
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
              desc="Full strategic intelligence platform"
              features={[
                "Unlimited competitors",
                "20,000 newsletters / month",
                "5,000 AI analyses / month",
                "Advanced AI insights",
                "Meta Ads Intelligence ✦",
                "Slack / webhook alerts",
                "10 team seats",
                "Priority support",
                "Analytics dashboard",
              ]}
              cta={ctaShort}
              onCta={() => navigate(cta)}
            />
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-5">
            ✦ Meta Ads Intelligence — coming soon exclusively on Premium
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">FAQ</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Frequently asked questions
          </h2>
        </div>
        <div className="max-w-2xl mx-auto space-y-3">
          {[
            { q: "Is my Gmail data safe?", a: "Yes. We request read-only access and never modify, delete, or send emails. All data is encrypted in transit and at rest. You can disconnect Gmail anytime from your settings." },
            { q: "How does the AI analysis work?", a: "We use advanced language models to extract structured intelligence from newsletter content — including positioning, pricing signals, promotions, CTAs, and campaign patterns. Results include confidence scores so you know how reliable each insight is." },
            { q: "Can I use this without connecting Gmail?", a: "Absolutely. You can manually paste newsletter content for analysis. Gmail integration just automates the import process." },
            { q: "What makes this different from just reading competitor emails?", a: "Manual reading doesn't scale. Newsletter Intel automatically archives, classifies, and analyzes every email using AI. It detects pricing changes, tracks campaign patterns over time, and generates strategic insights your team can act on — things you'd miss reading one email at a time." },
            { q: "How accurate are the AI insights?", a: "Each insight includes a confidence score. Our AI models achieve high accuracy on structured data extraction (pricing, promotions, CTAs). Strategic insights are labeled as 'AI-derived' to distinguish from directly observed data." },
            { q: "What is Meta Ads Intelligence?", a: "It's an upcoming Premium feature that will analyze competitor ad creative, messaging, and targeting from Meta's Ad Library. It's not yet active — we'll announce when it launches." },
            { q: "Can I invite my team?", a: "Yes. Starter plans include 3 seats and Premium includes 10 seats. You can assign Admin, Analyst, or Viewer roles with appropriate access levels." },
            { q: "Can I cancel anytime?", a: "Yes. All plans are month-to-month with no long-term commitment. Your data remains accessible until the end of your billing period." },
          ].map((faq, i) => (
            <details key={i} className="group rounded-lg border bg-card">
              <summary className="cursor-pointer p-4 text-sm font-medium text-foreground flex items-center justify-between list-none">
                {faq.q}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 shrink-0 ml-2" />
              </summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="border-t bg-primary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Stop guessing what your competitors are doing.
          </h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto mb-8">
            Start getting automated competitive intelligence today.
            Free plan available — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="h-12 px-8 text-sm gap-2 font-medium" onClick={() => navigate(cta)}>
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {["Free plan available", "Setup in under 5 minutes", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-primary" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid sm:grid-cols-4 gap-8">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                  <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-semibold text-foreground">Newsletter Intel</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                AI-powered competitive intelligence platform. Track competitor newsletters and ads,
                extract strategic insights, and stay ahead of market shifts.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Product</p>
              <div className="space-y-2">
                {[
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "FAQ", href: "#faq" },
                ].map(l => (
                  <a key={l.label} href={l.href} className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Account</p>
              <div className="space-y-2">
                <a href="/auth" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Sign in</a>
                <a href="/auth" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Create account</a>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} Newsletter Intel. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
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
    <Card className={cn(
      "border relative flex flex-col",
      highlighted && "border-primary shadow-md ring-1 ring-primary/20"
    )}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="text-[10px] px-2.5">Recommended</Badge>
        </div>
      )}
      <CardContent className="p-6 flex flex-col flex-1">
        <h3 className="text-base font-semibold text-foreground">{name}</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">{desc}</p>
        <div className="flex items-baseline gap-1 mb-5">
          <span className="text-3xl font-semibold text-foreground">{price}</span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        <Button
          className="w-full mb-5 gap-1.5"
          variant={highlighted ? "default" : "outline"}
          onClick={onCta}
        >
          {cta} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <ul className="space-y-2.5 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
