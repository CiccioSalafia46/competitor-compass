import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Sparkles, Shield, Zap, ArrowRight, Check, Mail, Users,
  Lightbulb, TrendingUp, Bell, Megaphone, ChevronDown, Eye, Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cta = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? "Go to Dashboard" : "Start Free";

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
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="outline" className="mb-5 gap-1.5 px-3 py-1 text-xs font-normal">
            <Sparkles className="h-3 w-3" /> AI-powered competitive intelligence
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-semibold tracking-tight text-foreground leading-[1.15]">
            Turn competitor newsletters
            <br className="hidden sm:block" />
            <span className="text-primary"> into strategic advantage</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
            Track competitor newsletters and paid ads. Extract positioning signals, pricing changes,
            and messaging themes — all analyzed by AI so your team stays ahead.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="h-11 px-7 text-sm gap-2 w-full sm:w-auto" onClick={() => navigate(cta)}>
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="h-11 px-7 text-sm gap-2 w-full sm:w-auto" onClick={() => {
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
            }}>
              See how it works <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {["Read-only Gmail access", "No credit card required", "SOC 2 compliant architecture", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-primary" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* ─── Problem → Solution ─── */}
      <section className="bg-accent/30 border-y">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">The Problem</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              Competitor tracking shouldn't be manual
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              Marketing teams waste hours sifting through competitor emails, missing key signals buried in inboxes.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: "Scattered data", desc: "Competitor newsletters sit unread in cluttered inboxes with no structure or analysis" },
              { title: "Missed signals", desc: "Pricing changes, new campaigns, and strategic shifts go unnoticed until it's too late" },
              { title: "Manual work", desc: "Teams spend hours manually reading and comparing competitor communications" },
            ].map((p) => (
              <div key={p.title} className="rounded-lg border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Features</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Everything you need for competitive intelligence
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Mail, title: "Gmail Integration", desc: "Connect Gmail to automatically import and classify competitor newsletters. Read-only, secure, disconnect anytime.", tag: "Core" },
            { icon: Sparkles, title: "AI Analysis", desc: "Extract positioning, messaging angles, pricing signals, and promotion strategies using advanced AI models.", tag: "Intelligence" },
            { icon: Users, title: "Competitor Tracking", desc: "Monitor multiple competitors across newsletters and paid ads. Track activity patterns and strategic shifts.", tag: "Core" },
            { icon: Megaphone, title: "Meta Ads Intelligence", desc: "Analyze competitor ad creative, messaging, and spend patterns from Meta's Ad Library.", tag: "Intelligence" },
            { icon: Lightbulb, title: "Strategic Insights", desc: "AI generates actionable insights about competitor behavior: pricing trends, campaign cadence, new initiatives.", tag: "AI" },
            { icon: Bell, title: "Smart Alerts", desc: "Set custom alert rules for discount thresholds, keyword matches, new ads, and unusual activity spikes.", tag: "Automation" },
            { icon: TrendingUp, title: "Analytics Dashboard", desc: "Visualize newsletter frequency, promotion intensity, CTA patterns, and campaign types across competitors.", tag: "Analytics" },
            { icon: Shield, title: "Team Workspaces", desc: "Collaborate with role-based access (Admin, Analyst, Viewer). Manage team members and audit all actions.", tag: "Team" },
            { icon: Eye, title: "Newsletter Reader", desc: "Read imported newsletters in a clean, distraction-free interface with AI-extracted intelligence alongside.", tag: "UX" },
          ].map((f) => (
            <Card key={f.title} className="border hover:shadow-sm transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent group-hover:bg-primary/10 transition-colors">
                    <f.icon className="h-4 w-4 text-accent-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-normal">{f.tag}</Badge>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="bg-accent/30 border-y">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">How It Works</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              From inbox to intelligence in minutes
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { step: "1", icon: Mail, title: "Connect Gmail", desc: "Link your inbox with read-only access. We identify and classify competitor newsletters automatically." },
              { step: "2", icon: Users, title: "Add Competitors", desc: "Tell us who to track. Add company names, websites, and Meta page IDs for comprehensive monitoring." },
              { step: "3", icon: Sparkles, title: "AI Analyzes", desc: "Our AI extracts positioning, pricing, promotions, and campaign patterns from every newsletter and ad." },
              { step: "4", icon: Lightbulb, title: "Get Insights", desc: "Receive strategic insights, automated alerts, and trend analysis to inform your competitive strategy." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-semibold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Use Cases ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Use Cases</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            Built for teams that compete on intelligence
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: "Marketing Teams", desc: "Monitor competitor messaging, campaign cadence, and promotional strategies to sharpen your own positioning.", icon: Megaphone },
            { title: "Growth Teams", desc: "Identify competitor pricing changes, new feature launches, and expansion signals before they impact your pipeline.", icon: TrendingUp },
            { title: "E-Commerce Brands", desc: "Track competitor promotions, discount patterns, seasonal strategies, and product focus areas.", icon: Newspaper },
          ].map((uc) => (
            <Card key={uc.title} className="border">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent mb-4">
                  <uc.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{uc.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{uc.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="bg-accent/30 border-y">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-muted-foreground mt-2">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              period="forever"
              desc="For individuals exploring competitor intelligence"
              features={["1 workspace", "3 competitors", "50 newsletters/mo", "Basic AI analysis", "Email alerts"]}
              cta={ctaLabel}
              onCta={() => navigate(cta)}
            />
            <PricingCard
              name="Starter"
              price="$29"
              period="/month"
              desc="For small teams starting competitive monitoring"
              features={["1 workspace", "10 competitors", "500 newsletters/mo", "Full AI analysis", "Meta Ads tracking", "Custom alert rules", "Team collaboration (3 seats)"]}
              cta={ctaLabel}
              onCta={() => navigate(cta)}
              highlighted
            />
            <PricingCard
              name="Premium"
              price="$99"
              period="/month"
              desc="For teams that need comprehensive intelligence"
              features={["Unlimited workspaces", "Unlimited competitors", "Unlimited newsletters", "Priority AI processing", "Advanced analytics", "API access", "Unlimited team seats", "Priority support"]}
              cta={ctaLabel}
              onCta={() => navigate(cta)}
            />
          </div>
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
        <div className="max-w-2xl mx-auto space-y-4">
          {[
            { q: "Is my Gmail data safe?", a: "Yes. We request read-only access and never modify, delete, or send emails. All data is encrypted in transit and at rest. You can disconnect Gmail anytime from settings." },
            { q: "How does the AI analysis work?", a: "We use advanced language models to extract structured intelligence from newsletter content — including positioning, pricing signals, promotions, CTAs, and campaign patterns. Results include confidence scores so you know how reliable each insight is." },
            { q: "Can I use this without connecting Gmail?", a: "Absolutely. You can manually paste newsletter content for analysis. Gmail integration just automates the import process." },
            { q: "What competitor data do you track?", a: "We track newsletter content, email frequency, promotional patterns, Meta ad creative, messaging themes, and strategic positioning changes across all your monitored competitors." },
            { q: "How accurate are the AI insights?", a: "Each insight includes a confidence score. Our AI models achieve high accuracy on structured data extraction (pricing, promotions, CTAs). Strategic insights are labeled as 'AI-derived' to distinguish from observed data." },
            { q: "Can I cancel anytime?", a: "Yes. All plans are month-to-month with no long-term commitment. Your data remains accessible until the end of your billing period." },
          ].map((faq, i) => (
            <details key={i} className="group rounded-lg border bg-card">
              <summary className="cursor-pointer p-4 text-sm font-medium text-foreground flex items-center justify-between list-none">
                {faq.q}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="border-t bg-accent/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Ready to outsmart your competition?
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
            Join teams using Newsletter Intel to turn competitor communications into strategic advantage.
          </p>
          <Button size="lg" className="h-11 px-8 text-sm gap-2" onClick={() => navigate(cta)}>
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">No credit card required · Free plan available</p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                <BarChart3 className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Newsletter Intel</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            </div>
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Newsletter Intel</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Pricing Card ─── */
const PricingCard = memo(function PricingCard({
  name, price, period, desc, features, cta, onCta, highlighted,
}: {
  name: string; price: string; period: string; desc: string;
  features: string[]; cta: string; onCta: () => void; highlighted?: boolean;
}) {
  return (
    <Card className={cn(
      "border relative",
      highlighted && "border-primary shadow-md ring-1 ring-primary/20"
    )}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="text-[10px] px-2.5">Most popular</Badge>
        </div>
      )}
      <CardContent className="p-6">
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
        <ul className="space-y-2">
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
});
