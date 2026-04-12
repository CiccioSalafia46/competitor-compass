import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNewsletterExtraction } from "@/hooks/useNewsletterInbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Sparkles, Star, Archive, Tag, Calendar, Mail,
  TrendingUp, ShoppingBag, Clock, Percent, Gift, Ticket,
  AlertTriangle, CheckCircle, Loader2,
} from "lucide-react";
import DOMPurify from "dompurify";
import type { NewsletterInboxItem } from "@/types/gmail";
import { DEMO_NEWSLETTERS } from "@/lib/demo-data";
import { getErrorMessage } from "@/lib/errors";

export default function NewsletterReader() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [item, setItem] = useState<NewsletterInboxItem | null>(null);
  const [loading, setLoading] = useState(true);

  const { extraction, loading: extractionLoading, extracting, extract } = useNewsletterExtraction(
    isDemo ? null : id || null
  );

  useEffect(() => {
    if (!id) return;

    if (isDemo) {
      const demoIndex = parseInt(id.replace("demo-", ""));
      const demoData = DEMO_NEWSLETTERS[demoIndex];
      if (demoData) {
        setItem({
          ...demoData,
          id: id,
          workspace_id: "",
          created_at: new Date().toISOString(),
          imported_at: new Date().toISOString(),
        });
      }
      setLoading(false);
      return;
    }

    supabase
      .from("newsletter_inbox")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: "Not found", variant: "destructive" });
          navigate("/inbox");
          return;
        }
        setItem(data as NewsletterInboxItem);
        // Mark as read (fire-and-forget — non-critical)
        if (!data.is_read) {
          void supabase
            .from("newsletter_inbox")
            .update({ is_read: true })
            .eq("id", id)
            .then(({ error }) => {
              if (error) console.error("Failed to mark newsletter as read:", error);
            });
        }
        setLoading(false);
      });
  }, [id, isDemo, navigate, toast]);

  const sanitizedHtml = useMemo(() => {
    if (!item?.html_content) return "";
    return DOMPurify.sanitize(item.html_content, {
      ALLOWED_TAGS: [
        "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "a", "img",
        "strong", "em", "b", "i", "u", "ul", "ol", "li", "div", "span",
        "table", "thead", "tbody", "tr", "td", "th", "code", "pre", "blockquote",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "style", "class", "width", "height", "target"],
      ALLOW_DATA_ATTR: false,
    });
  }, [item?.html_content]);

  const handleExtract = async () => {
    if (isDemo) {
      toast({ title: "Demo mode", description: "Connect Gmail to extract real intelligence." });
      return;
    }
    try {
      await extract();
      toast({ title: "Extraction complete" });
    } catch (error) {
      toast({ title: "Extraction failed", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!item) return null;

  const confidenceColor = (score: number) => {
    if (score >= 0.8) return "text-success";
    if (score >= 0.5) return "text-warning";
    return "text-destructive";
  };

  const confidenceBg = (score: number) => {
    if (score >= 0.8) return "bg-success/10";
    if (score >= 0.5) return "bg-warning/10";
    return "bg-destructive/10";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl animate-fade-in">
      <button
        onClick={() => navigate("/inbox")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors py-2 -ml-1 px-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inbox
      </button>

      {isDemo && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 mb-4">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          <span className="text-xs font-medium">Demo newsletter — not real imported data</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground leading-tight">
          {item.subject || "No subject"}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{item.from_name || "Unknown"}</span>
            {item.from_email && <span>&lt;{item.from_email}&gt;</span>}
          </div>
          <span>·</span>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {item.received_at ? new Date(item.received_at).toLocaleDateString(undefined, {
              weekday: "short", year: "numeric", month: "short", day: "numeric",
            }) : "Unknown date"}
          </div>
          {item.newsletter_score != null && (
            <>
              <span>·</span>
              <Badge variant="outline" className="text-xs">
                Newsletter confidence: {Math.round(item.newsletter_score * 100)}%
              </Badge>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {(item.tags || []).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs capitalize">
              {tag.replace(/-/g, " ")}
            </Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <Button
          onClick={handleExtract}
          disabled={extracting}
          className="gap-2"
          size="sm"
        >
          {extracting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {extracting ? "Extracting..." : extraction ? "Re-extract" : "Extract Intelligence"}
        </Button>
      </div>

      {/* Extraction Results */}
      {extraction && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Extracted Intelligence</h2>
            <Badge variant="outline" className={`${confidenceBg(extraction.overall_confidence || 0)}`}>
              {Math.round((extraction.overall_confidence || 0) * 100)}% overall confidence
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Campaign Type */}
            <Card className="shadow-raised border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Campaign Type</p>
                <Badge variant="default" className="capitalize">
                  {extraction.campaign_type?.replace(/_/g, " ") || "Unknown"}
                </Badge>
              </CardContent>
            </Card>

            {/* Discount */}
            {(extraction.discount_percentage || extraction.coupon_code) && (
              <Card className="shadow-raised border border-success/20">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Percent className="h-3 w-3" /> Discount
                  </p>
                  <div className="flex items-center gap-2">
                    {extraction.discount_percentage && (
                      <span className="text-lg font-bold text-success">{extraction.discount_percentage}% OFF</span>
                    )}
                    {extraction.coupon_code && (
                      <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono">
                        {extraction.coupon_code}
                      </code>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Free Shipping */}
            {extraction.free_shipping && (
              <Card className="shadow-raised border border-success/20">
                <CardContent className="p-3 flex items-center gap-2">
                  <Gift className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Free Shipping</span>
                </CardContent>
              </Card>
            )}

            {/* Expiry */}
            {extraction.expiry_date && (
              <Card className="shadow-raised border border-warning/20">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Expires
                  </p>
                  <span className="text-sm font-medium">{extraction.expiry_date}</span>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Message */}
          {extraction.main_message && (
            <Card className="shadow-raised border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Main Message</p>
                <p className="text-sm text-foreground">{extraction.main_message}</p>
              </CardContent>
            </Card>
          )}

          {/* Offers */}
          {(extraction.offers ?? []).length > 0 && (
            <Card className="shadow-raised border">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5" /> Offers
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {(extraction.offers ?? []).map((offer, i) => (
                  <div key={i} className="rounded-md border p-2 text-sm">
                    <p className="font-medium">{offer.description}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">{offer.type?.replace(/_/g, " ")}</Badge>
                      {offer.value && <span className="text-xs text-muted-foreground">{offer.value}</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* CTAs */}
          {(extraction.calls_to_action ?? []).length > 0 && (
            <Card className="shadow-raised border">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm">Calls to Action</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                {(extraction.calls_to_action ?? []).map((cta, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>{cta.text}</span>
                    {cta.urgency && (
                      <Badge variant={cta.urgency === "high" ? "destructive" : "outline"} className="text-xs capitalize">
                        {cta.urgency}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Urgency Signals */}
          {(extraction.urgency_signals ?? []).length > 0 && (
            <Card className="shadow-raised border border-destructive/20">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Urgency Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                {(extraction.urgency_signals ?? []).map((signal, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs capitalize">{signal.type?.replace(/_/g, " ")}</Badge>
                    <span>{signal.signal}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Strategy Takeaways */}
          {(extraction.strategy_takeaways ?? []).length > 0 && (
            <Card className="shadow-raised border">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Strategy Takeaways
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {(extraction.strategy_takeaways ?? []).map((takeaway, i) => (
                  <div key={i} className="rounded-md border p-2">
                    <p className="text-sm">{takeaway.insight}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">{takeaway.category}</Badge>
                      {takeaway.confidence != null && (
                        <span className={`text-xs ${confidenceColor(takeaway.confidence)}`}>
                          {Math.round(takeaway.confidence * 100)}% conf.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Product Categories & Events */}
          <div className="grid gap-3 sm:grid-cols-2">
            {extraction.product_categories && extraction.product_categories.length > 0 && (
              <Card className="shadow-raised border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Product Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {extraction.product_categories.map((cat, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{cat}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(extraction.event_mentions ?? []).length > 0 && (
              <Card className="shadow-raised border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Events</p>
                  {(extraction.event_mentions ?? []).map((event, i) => (
                    <div key={i} className="text-sm mb-1">
                      <span className="font-medium">{event.event}</span>
                      {event.date && <span className="text-muted-foreground"> — {event.date}</span>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <Tabs defaultValue="rendered" className="w-full">
        <TabsList>
          <TabsTrigger value="rendered">Rendered</TabsTrigger>
          <TabsTrigger value="text">Plain Text</TabsTrigger>
        </TabsList>
        <TabsContent value="rendered" className="mt-4">
          {sanitizedHtml ? (
            <Card className="shadow-raised border overflow-hidden">
              <CardContent className="p-0">
                <div
                  className="p-6 prose prose-sm max-w-none [&_img]:max-w-full [&_a]:text-primary"
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-raised border">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No HTML content available
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="text" className="mt-4">
          <Card className="shadow-raised border">
            <CardContent className="p-6">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono leading-relaxed">
                {item.text_content || "No plain text content available"}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Metadata */}
      <Card className="shadow-raised border mt-4">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Data Provenance</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Source</span>
            <span>{item.is_demo ? "Demo" : "Gmail import"}</span>
          </div>
          <div className="flex justify-between">
            <span>Imported</span>
            <span>{new Date(item.imported_at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Classification</span>
            <span>{item.classification_method || "N/A"}</span>
          </div>
          {extraction && (
            <>
              <div className="flex justify-between">
                <span>Extraction model</span>
                <span>{extraction.model_used || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Extracted at</span>
                <span>{new Date(extraction.extracted_at).toLocaleString()}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
