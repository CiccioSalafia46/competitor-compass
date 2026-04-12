import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Newspaper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type NewsletterEntry = Database["public"]["Tables"]["newsletter_entries"]["Row"];

export default function Newsletters() {
  const { currentWorkspace } = useWorkspace();
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
          toast({ title: "Failed to load newsletters", variant: "destructive" });
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Data Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">Collected competitor communications</p>
        </div>
        <Button onClick={() => navigate("/newsletters/new")} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Import data
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card className="shadow-raised border">
          <CardContent className="py-12 text-center">
            <Newspaper className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground">No data imported yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Import your first competitor communication to start gathering intel
            </p>
            <Button onClick={() => navigate("/newsletters/new")} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Import data
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              className="shadow-raised border cursor-pointer hover:shadow-card transition-shadow"
              onClick={() => navigate(`/newsletters/${entry.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.subject || "Untitled newsletter"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.sender_email && `${entry.sender_email} · `}
                      {new Date(entry.created_at).toLocaleDateString()}
                      {` · ${entry.source}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {entry.content.length > 100 ? `${Math.round(entry.content.length / 100) * 100}+ chars` : "short"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
