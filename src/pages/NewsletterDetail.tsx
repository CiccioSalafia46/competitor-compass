import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/errors";
import { enqueueNewsletterAnalysis } from "@/lib/newsletter-analysis";

type NewsletterEntry = Database["public"]["Tables"]["newsletter_entries"]["Row"];
type Analysis = Database["public"]["Tables"]["analyses"]["Row"];
type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

export default function NewsletterDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entry, setEntry] = useState<NewsletterEntry | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!id || !currentWorkspace) return;
    const workspaceId = currentWorkspace.id;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: entryData, error } = await supabase
          .from("newsletter_entries")
          .select("*")
          .eq("id", id)
          .eq("workspace_id", workspaceId)
          .single();

        if (error || !entryData) {
          toast({ title: "Not found", description: "Newsletter entry not found", variant: "destructive" });
          navigate("/newsletters");
          return;
        }

        setEntry(entryData);

        const [analysesRes, competitorRes] = await Promise.all([
          supabase
            .from("analyses")
            .select("*")
            .eq("newsletter_entry_id", id)
            .order("created_at", { ascending: false }),
          entryData.competitor_id
            ? supabase.from("competitors").select("*").eq("id", entryData.competitor_id).single()
            : Promise.resolve({ data: null }),
        ]);

        setAnalyses(analysesRes.data || []);
        setCompetitor(competitorRes.data);
        setLoading(false);
      } catch (err) {
        console.error("[NewsletterDetail] failed to load entry", err);
        setLoading(false);
      }
    };
    void fetch();
  }, [id, currentWorkspace, navigate, toast]);

  const handleAnalyze = async () => {
    if (!entry || !currentWorkspace) return;
    setAnalyzing(true);
    try {
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .insert({
          workspace_id: currentWorkspace.id,
          newsletter_entry_id: entry.id,
          analysis_type: "full",
          status: "pending",
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      try {
        await enqueueNewsletterAnalysis({ analysisId: analysis.id });
        navigate(`/analyses/${analysis.id}`);
      } catch (error) {
        toast({
          title: "Analysis queue failed",
          description: `${getErrorMessage(error)} Raw content is still available in this entry.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div className="p-6 lg:p-8 max-w-3xl animate-fade-in">
      <button
        onClick={() => navigate("/newsletters")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to newsletters
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {entry.subject || "Untitled newsletter"}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {entry.sender_email && <span>{entry.sender_email}</span>}
            {entry.sender_email && <span>·</span>}
            <span>{new Date(entry.created_at).toLocaleDateString()}</span>
            <span>·</span>
            <Badge variant="outline" className="text-xs">{entry.source}</Badge>
            {competitor && (
              <>
                <span>·</span>
                <span>{competitor.name}</span>
              </>
            )}
          </div>
        </div>
        <Button onClick={handleAnalyze} disabled={analyzing} className="gap-2 shrink-0">
          <Sparkles className="h-4 w-4" />
          {analyzing ? "Starting..." : "Analyze"}
        </Button>
      </div>

      {/* Analyses for this newsletter */}
      {analyses.length > 0 && (
        <Card className="shadow-raised border mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Analyses ({analyses.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analyses.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/analyses/${a.id}`)}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {a.analysis_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : "In progress"}
                    </p>
                  </div>
                </div>
                <Badge variant={
                  a.status === "completed" ? "default" :
                  a.status === "failed" ? "destructive" :
                  "secondary"
                }>
                  {a.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Newsletter content */}
      <Card className="shadow-raised border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Content</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono leading-relaxed">
            {entry.content}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
