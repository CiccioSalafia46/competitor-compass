import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useUsage } from "@/hooks/useUsage";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

export default function NewNewsletter() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [competitorId, setCompetitorId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!currentWorkspace) return;
    supabase
      .from("competitors")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("name")
      .then(({ data }) => setCompetitors(data || []));
  }, [currentWorkspace]);

  const handleSubmit = async (analyze: boolean) => {
    if (!currentWorkspace || !user || !content.trim()) return;

    setIsSubmitting(true);
    if (analyze) setIsAnalyzing(true);

    try {
      const { data: entry, error } = await supabase
        .from("newsletter_entries")
        .insert({
          workspace_id: currentWorkspace.id,
          competitor_id: competitorId || null,
          subject: subject || null,
          content: content.trim(),
          sender_email: senderEmail || null,
          source: "paste" as const,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (analyze && entry) {
        // Create analysis record and trigger edge function
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

        // Trigger the analysis edge function
        const { error: fnError } = await supabase.functions.invoke("analyze-newsletter", {
          body: { analysisId: analysis.id, newsletterEntryId: entry.id },
        });

        if (fnError) {
          console.error("Analysis trigger failed:", fnError);
          toast({
            title: "Newsletter saved",
            description: "Saved but analysis failed to start. You can retry from the newsletter view.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Analysis started", description: "Your newsletter is being analyzed. Results will appear shortly." });
        }

        navigate(`/analyses/${analysis.id}`);
      } else {
        toast({ title: "Newsletter saved", description: "Content saved successfully." });
        navigate("/newsletters");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-semibold text-foreground">Add Newsletter</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Paste newsletter content for competitive intelligence analysis
      </p>

      <Card className="shadow-card border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Newsletter Content</CardTitle>
          <CardDescription>Paste the newsletter email content below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject line</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Newsletter subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender">Sender email</Label>
              <Input
                id="sender"
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="newsletter@competitor.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="competitor">Competitor (optional)</Label>
            <Select value={competitorId} onValueChange={setCompetitorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a competitor" />
              </SelectTrigger>
              <SelectContent>
                {competitors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {competitors.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No competitors added yet.{" "}
                <button onClick={() => navigate("/competitors")} className="text-primary hover:underline">
                  Add one
                </button>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Newsletter content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the full newsletter content here..."
              className="min-h-[200px] font-mono text-sm"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || !content.trim()}
            >
              Save only
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !content.trim()}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isAnalyzing ? "Analyzing..." : "Save & Analyze"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
