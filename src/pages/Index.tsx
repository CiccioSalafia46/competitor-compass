import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BarChart3, Sparkles, Shield, Zap } from "lucide-react";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Newsletter Intel</span>
          </div>
          <Button
            variant={user ? "default" : "default"}
            size="sm"
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
          >
            {user ? "Dashboard" : "Get started"}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Competitive intelligence
          <br />
          <span className="text-primary">from newsletters</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Track competitor newsletters, extract positioning signals, product launches, pricing changes,
          and messaging themes — all analyzed by AI in seconds.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" onClick={() => navigate(user ? "/dashboard" : "/auth")}>
            {user ? "Go to dashboard" : "Start free"}
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
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
            <div key={f.title} className="rounded-lg border p-6">
              <f.icon className="h-5 w-5 text-primary mb-3" />
              <h3 className="font-medium text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Competitor Newsletter Intel
        </div>
      </footer>
    </div>
  );
}
