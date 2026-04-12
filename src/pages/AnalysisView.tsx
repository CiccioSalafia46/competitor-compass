import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/errors";
import { enqueueNewsletterAnalysis } from "@/lib/newsletter-analysis";

type Analysis = Database["public"]["Tables"]["analyses"]["Row"];

interface AnalysisResult {
  summary?: string;
  positioning?: { observation: string; confidence: string; evidence: string }[];
  messaging?: { theme: string; examples: string[]; observation: string }[];
  product_launches?: { product: string; description: string; significance: string }[];
  pricing_signals?: { signal: string; detail: string; confidence: string }[];
  competitive_moves?: { move: string; impact: string; urgency: string }[];
  recommendations?: string[];
}

function readValidationErrors(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export default function AnalysisView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase.from("analyses").select("*").eq("id", id).single();
    if (error) {
      toast({ title: "Error", description: "Analysis not found", variant: "destructive" });
      navigate("/dashboard");
      return;
    }
    setAnalysis(data);
    setLoading(false);

    if (data.status === "pending" || data.status === "processing") {
      setPolling(true);
    } else {
      setPolling(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    void fetchAnalysis();
  }, [fetchAnalysis]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchAnalysis, 3000);
    return () => clearInterval(interval);
  }, [fetchAnalysis, polling]);

  const handleRetry = async () => {
    if (!analysis) return;
    try {
      await enqueueNewsletterAnalysis({ analysisId: analysis.id });
      setPolling(true);
      toast({ title: "Re-queued", description: "The AI analysis job was queued again in the background." });
    } catch (error) {
      toast({ title: "Retry failed", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!analysis) return null;

  const result = analysis.result as unknown as AnalysisResult | null;
  const validationErrors = readValidationErrors(analysis.validation_errors);

  const confidenceLabel = (conf: string) => {
    switch (conf) {
      case "high": return "Observed / directly stated";
      case "medium": return "Derived / reasonably inferred";
      case "low": return "Estimated / speculative";
      default: return conf;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors py-2 -ml-1 px-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground capitalize">
            {analysis.analysis_type.replace(/_/g, " ")} Analysis
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant={
              analysis.status === "completed" ? "default" :
              analysis.status === "failed" ? "destructive" :
              "secondary"
            }>
              {analysis.status}
            </Badge>
            {analysis.confidence && (
              <Badge variant="outline" className="capitalize" title={confidenceLabel(analysis.confidence)}>
                {analysis.confidence} confidence
              </Badge>
            )}
            {analysis.model_used && (
              <span className="text-xs text-muted-foreground">Model: {analysis.model_used}</span>
            )}
            {analysis.attempt_count > 0 && (
              <span className="text-xs text-muted-foreground">
                Attempt {analysis.attempt_count}/{analysis.max_attempts}
              </span>
            )}
          </div>
          {analysis.confidence && (
            <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wider">
              {confidenceLabel(analysis.confidence)}
            </p>
          )}
        </div>
        {analysis.status === "failed" && (
          <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </div>

      {(analysis.status === "pending" || analysis.status === "processing") && (
        <Card className="shadow-raised border">
          <CardContent className="py-12 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
            <p className="text-sm font-medium">Analyzing newsletter content...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take 15–30 seconds</p>
          </CardContent>
        </Card>
      )}

      {analysis.status === "failed" && (
        <Card className="shadow-raised border border-destructive/20">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive font-medium">Analysis failed</p>
            {analysis.error_message && (
              <p className="text-xs text-muted-foreground mt-1">{analysis.error_message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {validationErrors.length > 0 && (
        <Card className="shadow-raised border border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Validation notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {validationErrors.map((item) => (
                <li key={item} className="text-xs text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {analysis.status === "completed" && result && (
        <div className="space-y-4">
          {result.summary && (
            <Card className="shadow-raised border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
              </CardContent>
            </Card>
          )}

          {result.positioning && result.positioning.length > 0 && (
            <Card className="shadow-raised border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Positioning Signals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.positioning.map((p, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{p.observation}</p>
                    <p className="text-xs text-muted-foreground mt-1">Evidence: {p.evidence}</p>
                    <Badge variant="outline" className="mt-2 text-xs capitalize">{p.confidence}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.messaging && result.messaging.length > 0 && (
            <Card className="shadow-raised border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Messaging Themes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.messaging.map((m, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{m.theme}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.observation}</p>
                    {m.examples.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {m.examples.map((ex, j) => (
                          <p key={j} className="text-xs text-muted-foreground italic">"{ex}"</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.product_launches && result.product_launches.length > 0 && (
            <Card className="shadow-raised border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Product Launches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.product_launches.map((p, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{p.product}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Significance: {p.significance}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.pricing_signals && result.pricing_signals.length > 0 && (
            <Card className="shadow-raised border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pricing Signals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.pricing_signals.map((p, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{p.signal}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.detail}</p>
                    <Badge variant="outline" className="mt-2 text-xs capitalize">{p.confidence}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.competitive_moves && result.competitive_moves.length > 0 && (
            <Card className="shadow-raised border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Competitive Moves</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.competitive_moves.map((m, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{m.move}</p>
                    <p className="text-xs text-muted-foreground mt-1">Impact: {m.impact}</p>
                    <Badge variant={m.urgency === "high" ? "destructive" : "outline"} className="mt-2 text-xs capitalize">
                      {m.urgency} urgency
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <Card className="shadow-raised border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
