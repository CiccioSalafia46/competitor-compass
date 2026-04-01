import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BarChart3, Sparkles, Shield, Zap, ArrowRight } from "lucide-react";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">Newsletter Intel</span>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
          >
            {user ? "Dashboard" : "Get started"}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground mb-6">
          <Sparkles className="h-3 w-3" />
          AI-powered competitive intelligence
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground max-w-2xl mx-auto leading-tight">
          Competitive intelligence
          <br />
          <span className="text-primary">from newsletters & ads</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground text-sm sm:text-base leading-relaxed">
          Track competitor newsletters and paid ads. Extract positioning signals, pricing changes,
          and messaging themes — all analyzed by AI.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button
            size="lg"
            className="h-10 px-6 text-sm gap-1.5"
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
          >
            {user ? "Go to dashboard" : "Start free"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "AI-Powered Analysis",
              desc: "Extract positioning, messaging, product launches, and pricing signals automatically.",
            },
            {
              icon: Zap,
              title: "Instant Insights",
              desc: "Paste a newsletter and get structured competitive intelligence in under 30 seconds.",
            },
            {
              icon: Shield,
              title: "Team Workspaces",
              desc: "Collaborate with your team on competitive research with role-based access.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent mb-3">
                <f.icon className="h-4 w-4 text-accent-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 sm:px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Newsletter Intel
        </div>
      </footer>
    </div>
  );
}
