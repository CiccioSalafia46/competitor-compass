import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Newspaper, Mail, Upload, Globe, Webhook, Forward, PenLine, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MacWindow } from "@/components/ui/MacWindow";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type NewsletterEntry = Database["public"]["Tables"]["newsletter_entries"]["Row"];

export default function Newsletters() {
  const { currentWorkspace } = useWorkspace();
  const { isConnected } = useGmailConnection();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<NewsletterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    setLoading(true);
    supabase
      .from("newsletter_entries")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) {
          console.error("Newsletter entries fetch error:", error);
          toast({ title: "Failed to load data sources", variant: "destructive" });
        }
        setEntries(data || []);
        setLoading(false);
      });
  }, [currentWorkspace, toast]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Data Sources</h1>
          <p className="page-description">Connect your competitive intelligence sources</p>
        </div>
        <Button onClick={() => navigate("/newsletters/new")} className="gap-2 self-start sm:self-auto" size="sm">
          <Plus className="h-4 w-4" />
          Import data
        </Button>
      </div>

      {/* Active connections (only if there are entries or Gmail is connected) */}
      {(entries.length > 0 || isConnected) && (
        <MacWindow title="Active connections">
          <div className="p-4">
            {isConnected && (
              <div className="flex items-center gap-3 rounded-lg border bg-emerald-50/20 p-3 dark:bg-emerald-950/10">
                <Mail className="h-4 w-4 text-success" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Gmail</p>
                  <p className="text-xs text-muted-foreground">Connected · auto-syncing newsletters</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
            )}
            {entries.length > 0 && (
              <div className={cn("space-y-1.5", isConnected && "mt-3")}>
                <p className="text-xs text-muted-foreground">{entries.length} imported entries</p>
                <div className="max-h-[300px] divide-y overflow-y-auto rounded-lg border">
                  {entries.slice(0, 20).map((entry) => (
                    <button
                      key={entry.id}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent/5"
                      onClick={() => navigate(`/newsletters/${entry.id}`)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{entry.subject || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.sender_email && `${entry.sender_email} · `}{new Date(entry.created_at).toLocaleDateString()} · {entry.source}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </MacWindow>
      )}

      {/* Available sources — hero when no connections */}
      <MacWindow title="Available sources">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <SourceCard
            icon={Mail}
            title="Gmail"
            description="Auto-track competitor newsletters from your Gmail inbox"
            bullets={["Read-only access", "Auto-extract signals", "30+ competitors detected"]}
            cta={isConnected ? "Connected" : "Connect Gmail"}
            ctaVariant={isConnected ? "outline" : "default"}
            disabled={isConnected}
            onClick={() => navigate("/settings")}
          />
          <SourceCard
            icon={Upload}
            title="CSV import"
            description="Upload a CSV with competitor newsletter data or signals"
            bullets={["Bulk import", "One-time setup", "Template provided"]}
            cta="Upload CSV"
            onClick={() => navigate("/newsletters/new")}
          />
          <SourceCard
            icon={PenLine}
            title="Manual entry"
            description="Add a competitor signal manually"
            bullets={["Quick add", "Any signal type"]}
            cta="Add manually"
            onClick={() => navigate("/newsletters/new")}
          />
          <SourceCard
            icon={Globe}
            title="Outlook"
            description="Native Outlook integration"
            cta="Coming soon"
            disabled
            comingSoon
          />
          <SourceCard
            icon={Webhook}
            title="Zapier / Webhook"
            description="Push data from any tool via webhook"
            cta="Coming soon"
            disabled
            comingSoon
          />
          <SourceCard
            icon={Forward}
            title="Email forwarding"
            description="Forward newsletters to your dedicated Tracklyze address"
            cta="Coming soon"
            disabled
            comingSoon
          />
        </div>
      </MacWindow>
    </div>
  );
}

function SourceCard({
  icon: Icon,
  title,
  description,
  bullets,
  cta,
  ctaVariant = "outline",
  disabled,
  comingSoon,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  bullets?: string[];
  cta: string;
  ctaVariant?: "default" | "outline";
  disabled?: boolean;
  comingSoon?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className={cn("rounded-lg border p-4 transition-colors", disabled ? "opacity-60" : "hover:bg-accent/5")}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {comingSoon && <Badge variant="secondary" className="text-[10px]">Coming soon</Badge>}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      {bullets && (
        <ul className="mt-2 space-y-0.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-success" />{b}
            </li>
          ))}
        </ul>
      )}
      <Button
        size="sm"
        variant={ctaVariant}
        className="mt-3 h-7 text-[11px]"
        disabled={disabled}
        onClick={onClick}
      >
        {cta}
      </Button>
    </div>
  );
}
