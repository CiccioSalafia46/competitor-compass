import { useState, useEffect } from "react";
import { useMetaAds, useMetaAdAnalysis } from "@/hooks/useMetaAds";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { MetaAdCard } from "@/components/meta-ads/MetaAdCard";
import { AdAnalysisPanel } from "@/components/meta-ads/AdAnalysisPanel";
import { EstimatedMetric } from "@/components/meta-ads/EstimatedMetric";
import { DEMO_META_ADS } from "@/lib/demo-meta-ads";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Megaphone, Search, RefreshCw, ChevronLeft, ChevronRight, BarChart3,
  Loader2, Sparkles, X, Filter, Download, Eye, AlertCircle, ExternalLink
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";

interface Competitor {
  id: string;
  name: string;
  meta_page_ids?: string[];
}

export default function MetaAdsPage() {
  const { currentWorkspace } = useWorkspace();
  const [filters, setFilters] = useState<{
    competitorId?: string;
    isActive?: boolean;
    search?: string;
  }>({});
  const { ads, loading, fetching, page, setPage, totalCount, totalPages, fetchFromMeta, analyzeAd, refetch } = useMetaAds(filters);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedAd, setSelectedAd] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [fetchSearch, setFetchSearch] = useState("");
  const { toast } = useToast();

  // Fetch competitors
  useEffect(() => {
    if (!currentWorkspace) return;
    supabase
      .from("competitors")
      .select("id, name, meta_page_ids")
      .eq("workspace_id", currentWorkspace.id)
      .eq("is_monitored", true)
      .then(({ data }) => setCompetitors((data as Competitor[]) || []));
  }, [currentWorkspace]);

  const selectedAdData = ads.find((a) => a.id === selectedAd);
  const { analysis } = useMetaAdAnalysis(selectedAd);

  const hasAds = ads.length > 0;
  const showDemo = !hasAds && !loading && !filters.competitorId && !filters.search;

  const handleFetch = async () => {
    try {
      const result = await fetchFromMeta({
        competitorId: filters.competitorId,
        searchTerms: fetchSearch || undefined,
      });
      if (result) {
        toast({
          title: "Ads fetched",
          description: `Imported ${result.imported} new ads, ${result.skipped} already tracked.`,
        });
      }
    } catch (err: any) {
      toast({ title: "Fetch failed", description: err.message, variant: "destructive" });
    }
  };

  const handleAnalyze = async (adId: string) => {
    setAnalyzingId(adId);
    try {
      const result = await analyzeAd(adId);
      if (result?.analysis) {
        setSelectedAd(adId);
        toast({ title: "Analysis complete" });
      }
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzingId(null);
    }
  };

  // Stats
  const activeAds = ads.filter((a) => a.is_active).length;
  const uniquePages = new Set(ads.map((a) => a.page_name).filter(Boolean)).size;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Meta Ads Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor competitor paid media across Facebook and Instagram
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Input
              placeholder="Search Meta Ad Library…"
              value={fetchSearch}
              onChange={(e) => setFetchSearch(e.target.value)}
              className="w-48 h-9 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            />
            <Button onClick={handleFetch} disabled={fetching} size="sm" className="gap-1.5">
              {fetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Fetch Ads
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Tracked</p>
            <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Now</p>
            <p className="text-2xl font-bold text-emerald-600">{activeAds}</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unique Pages</p>
            <p className="text-2xl font-bold text-foreground">{uniquePages}</p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">This Page</p>
            <p className="text-2xl font-bold text-foreground">{ads.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
        <Select
          value={filters.competitorId || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, competitorId: v === "all" ? undefined : v }))}
        >
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="All competitors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All competitors</SelectItem>
            {competitors.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.isActive === undefined ? "all" : filters.isActive ? "active" : "inactive"}
          onValueChange={(v) => setFilters((f) => ({ ...f, isActive: v === "all" ? undefined : v === "active" }))}
        >
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search ad copy…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setFilters((f) => ({ ...f, search: e.target.value || undefined }));
            }}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {(filters.competitorId || filters.isActive !== undefined || filters.search) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => {
              setFilters({});
              setSearchInput("");
            }}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : showDemo ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong>Demo Mode</strong> — These are sample ads to show the platform capabilities.
              Fetch real ads from Meta Ad Library using the search bar above.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_META_ADS.map((ad) => (
              <MetaAdCard
                key={ad.id}
                ad={ad as any}
                isDemo
              />
            ))}
          </div>
        </div>
      ) : !hasAds ? (
        <Card className="border">
          <CardContent className="p-12 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">No ads found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your filters or fetch new ads from Meta Ad Library.
            </p>
            <Button onClick={handleFetch} disabled={fetching} className="gap-2">
              <Download className="h-4 w-4" />
              Fetch Competitor Ads
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad) => (
              <MetaAdCard
                key={ad.id}
                ad={ad}
                onAnalyze={handleAnalyze}
                onSelect={setSelectedAd}
                analyzing={analyzingId === ad.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Showing {page * 20 + 1}–{Math.min((page + 1) * 20, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Ad Detail Sheet */}
      <Sheet open={!!selectedAd} onOpenChange={(open) => !open && setSelectedAd(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Ad Details
            </SheetTitle>
          </SheetHeader>

          {selectedAdData && (
            <div className="space-y-4 mt-4">
              {/* Page Info */}
              <div className="space-y-1">
                <p className="text-lg font-medium text-foreground">{selectedAdData.page_name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedAdData.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                  {(selectedAdData.publisher_platforms || []).map((p) => (
                    <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Full Ad Copy */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Ad Copy</h4>
                {selectedAdData.ad_creative_link_titles?.map((t, i) => (
                  <p key={i} className="text-sm font-semibold">{t}</p>
                ))}
                {selectedAdData.ad_creative_bodies?.map((b, i) => (
                  <p key={i} className="text-sm text-muted-foreground whitespace-pre-wrap">{b}</p>
                ))}
                {selectedAdData.ad_creative_link_descriptions?.map((d, i) => (
                  <p key={i} className="text-xs text-muted-foreground italic">{d}</p>
                ))}
              </div>

              <Separator />

              {/* Observed Metrics */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Observed Data</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">First seen</span>
                    <p className="font-medium">{selectedAdData.first_seen_at ? new Date(selectedAdData.first_seen_at).toLocaleDateString() : "Unknown"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last seen</span>
                    <p className="font-medium">{selectedAdData.last_seen_at ? new Date(selectedAdData.last_seen_at).toLocaleDateString() : "Unknown"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CTA</span>
                    <p className="font-medium">{selectedAdData.cta_type?.replace(/_/g, " ") || "None"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Media</span>
                    <p className="font-medium capitalize">{selectedAdData.media_type || "Unknown"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Estimated Metrics */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  Estimated Metrics
                  <Badge variant="outline" className="text-[10px] text-warning border-warning/30">Ranges from Meta</Badge>
                </h4>
                <EstimatedMetric label="Spend" range={selectedAdData.spend_range} prefix="$" />
                <EstimatedMetric label="Impressions" range={selectedAdData.impressions_range} />
                <EstimatedMetric label="Audience Size" range={selectedAdData.estimated_audience_size} />
              </div>

              {selectedAdData.ad_snapshot_url && (
                <>
                  <Separator />
                  <a
                    href={selectedAdData.ad_snapshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View on Meta Ad Library
                  </a>
                </>
              )}

              <Separator />

              {/* Analysis */}
              {analysis ? (
                <AdAnalysisPanel analysis={analysis} />
              ) : (
                <Button
                  onClick={() => handleAnalyze(selectedAdData.id)}
                  disabled={analyzingId === selectedAdData.id}
                  className="w-full gap-2"
                >
                  {analyzingId === selectedAdData.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {analyzingId === selectedAdData.id ? "Analyzing…" : "Analyze this Ad"}
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
