import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Scale, TrendingUp, Target, Megaphone, AlertCircle } from "lucide-react";

interface CompetitorAdSummary {
  id: string;
  name: string;
  totalAds: number;
  activeAds: number;
  topCTAs: string[];
  topPlatforms: string[];
  avgDuration: number | null;
  recentAdCopy: string[];
}

export default function MetaAdsCompare() {
  const { currentWorkspace } = useWorkspace();
  const [summaries, setSummaries] = useState<CompetitorAdSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentWorkspace) return;
    loadSummaries();
  }, [currentWorkspace]);

  async function loadSummaries() {
    if (!currentWorkspace) return;
    setLoading(true);

    // Get all competitors
    const { data: comps } = await supabase
      .from("competitors")
      .select("id, name")
      .eq("workspace_id", currentWorkspace.id)
      .eq("is_monitored", true);

    if (!comps?.length) { setLoading(false); return; }

    // Get all ads for workspace
    const { data: allAds } = await supabase
      .from("meta_ads")
      .select("competitor_id, is_active, cta_type, publisher_platforms, ad_delivery_start_time, ad_delivery_stop_time, ad_creative_bodies")
      .eq("workspace_id", currentWorkspace.id);

    const adsByComp = new Map<string, typeof allAds>();
    for (const ad of allAds || []) {
      if (!ad.competitor_id) continue;
      const list = adsByComp.get(ad.competitor_id) || [];
      list.push(ad);
      adsByComp.set(ad.competitor_id, list);
    }

    const results: CompetitorAdSummary[] = comps.map((c) => {
      const ads = adsByComp.get(c.id) || [];
      const active = ads.filter((a) => a.is_active);

      // Top CTAs
      const ctaCounts = new Map<string, number>();
      for (const a of ads) {
        if (a.cta_type) ctaCounts.set(a.cta_type, (ctaCounts.get(a.cta_type) || 0) + 1);
      }
      const topCTAs = [...ctaCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

      // Top platforms
      const platCounts = new Map<string, number>();
      for (const a of ads) {
        for (const p of (a.publisher_platforms as string[]) || []) {
          platCounts.set(p, (platCounts.get(p) || 0) + 1);
        }
      }
      const topPlatforms = [...platCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

      // Recent ad copy
      const recentCopy = ads
        .filter((a) => (a.ad_creative_bodies as string[])?.length > 0)
        .slice(0, 3)
        .map((a) => (a.ad_creative_bodies as string[])[0]);

      return {
        id: c.id,
        name: c.name,
        totalAds: ads.length,
        activeAds: active.length,
        topCTAs,
        topPlatforms,
        avgDuration: null,
        recentAdCopy: recentCopy,
      };
    }).filter((s) => s.totalAds > 0);

    setSummaries(results);
    if (results.length >= 2) {
      setSelectedIds([results[0].id, results[1].id]);
    } else if (results.length === 1) {
      setSelectedIds([results[0].id]);
    }
    setLoading(false);
  }

  const selected = summaries.filter((s) => selectedIds.includes(s.id));

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading comparison…</span>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          Ad Comparison
        </h1>
        <Card className="border">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No competitor ads tracked yet. Fetch ads from the Meta Ads page first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          Ad Comparison
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Compare competitor ad strategies side by side</p>
      </div>

      {/* Selector */}
      <div className="flex gap-3 items-center flex-wrap">
        {[0, 1].map((idx) => (
          <Select
            key={idx}
            value={selectedIds[idx] || ""}
            onValueChange={(v) => {
              const newIds = [...selectedIds];
              newIds[idx] = v;
              setSelectedIds(newIds);
            }}
          >
            <SelectTrigger className="w-48 h-9 text-sm">
              <SelectValue placeholder={`Competitor ${idx + 1}`} />
            </SelectTrigger>
            <SelectContent>
              {summaries.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* Comparison Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {selected.map((comp) => (
          <Card key={comp.id} className="border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                {comp.name}
                <Badge variant="outline">{comp.totalAds} ads</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Active Ads
                  </p>
                  <p className="text-xl font-bold text-emerald-600">{comp.activeAds}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Active Rate</p>
                  <p className="text-xl font-bold text-foreground">
                    {comp.totalAds > 0 ? Math.round((comp.activeAds / comp.totalAds) * 100) : 0}%
                  </p>
                </div>
              </div>

              {/* Top CTAs */}
              {comp.topCTAs.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" /> Top CTAs
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {comp.topCTAs.map((cta) => (
                      <Badge key={cta} variant="secondary" className="text-xs">{cta.replace(/_/g, " ")}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Platforms */}
              {comp.topPlatforms.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Megaphone className="h-3 w-3" /> Platforms
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {comp.topPlatforms.map((p) => (
                      <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Copy Samples */}
              {comp.recentAdCopy.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Recent Ad Copy</p>
                  <div className="space-y-2">
                    {comp.recentAdCopy.map((copy, i) => (
                      <p key={i} className="text-xs text-muted-foreground bg-muted/50 rounded p-2 line-clamp-2">
                        "{copy}"
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selected.length === 2 && (
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base">Quick Observations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">{selected[0].name}</strong> has {selected[0].totalAds} tracked ads
              ({selected[0].activeAds} active) while <strong className="text-foreground">{selected[1].name}</strong> has {selected[1].totalAds} tracked ads
              ({selected[1].activeAds} active).
            </p>
            {selected[0].activeAds > selected[1].activeAds * 2 && (
              <p className="text-muted-foreground">
                → {selected[0].name} appears to be significantly more active in paid media currently.
              </p>
            )}
            {selected[1].activeAds > selected[0].activeAds * 2 && (
              <p className="text-muted-foreground">
                → {selected[1].name} appears to be significantly more active in paid media currently.
              </p>
            )}
            <p className="text-[10px] text-muted-foreground italic pt-2">
              These observations are based on tracked ads only and may not reflect full advertising activity.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
