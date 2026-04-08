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
import { getErrorMessage } from "@/lib/errors";
import { enqueueNewsletterAnalysis } from "@/lib/newsletter-analysis";

type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

export default function NewNewsletter() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { canAnalyze } = useRoles();
  const { isAtLimit, trackUsage } = useUsage();
  const { log } = useAuditLog();
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

  const handleSubmit = async (openAnalysis: boolean) => {
    if (!currentWorkspace || !user || !content.trim()) return;

    if (isAtLimit("newsletters_this_month")) {
      toast({ title: "Limit reached", description: "You've reached your newsletter limit for this month. Upgrade your plan to continue.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setIsAnalyzing(true);

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

      await trackUsage("newsletter_imported");
      await log("created", "newsletter_entry", entry.id, { subject: entry.subject });

      try {
        const queued = await enqueueNewsletterAnalysis({ newsletterEntryIds: [entry.id] });
        const analysis = queued.analyses[0];

        toast({
          title: "Import saved",
          description: "AI analysis was queued in the background. Raw content is already stored.",
        });

        if (openAnalysis && analysis) {
          navigate(`/analyses/${analysis.id}`);
        } else {
          navigate("/newsletters");
        }
      } catch (queueError) {
        console.error("Analysis queue failed:", queueError);
        toast({
          title: "Import saved",
          description: "Raw content was saved, but the AI analysis job could not be queued. You can retry from the newsletter detail view.",
          variant: "destructive",
        });
        navigate("/newsletters");
      }
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
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

      <h1 className="text-2xl font-semibold text-foreground">Import Competitor Data</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Paste competitor content. Every saved import is queued automatically for AI analysis.
      </p>

      <Card className="shadow-card border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Competitor Content</CardTitle>
          <CardDescription>Paste the competitor email or campaign content below</CardDescription>
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
              disabled={isSubmitting || !content.trim() || !canAnalyze}
            >
              {isAnalyzing ? "Queueing..." : "Save & queue"}
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !content.trim() || !canAnalyze}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isAnalyzing ? "Queueing..." : "Save & open analysis"}
            </Button>
          </div>
          {!canAnalyze && (
            <p className="text-xs text-destructive">
              You need analyst access to import and queue newsletter analysis jobs.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
