import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstimatedMetric } from "./EstimatedMetric";
import type { MetaAd } from "@/hooks/useMetaAds";
import { ExternalLink, Sparkles, Calendar, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MetaAdCardProps {
  ad: MetaAd | Partial<MetaAd>;
  onAnalyze?: (id: string) => void;
  onSelect?: (id: string) => void;
  analyzing?: boolean;
  isDemo?: boolean;
}

const platformColors: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  messenger: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  audience_network: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export function MetaAdCard({ ad, onAnalyze, onSelect, analyzing, isDemo }: MetaAdCardProps) {
  const primaryBody = ad.ad_creative_bodies?.[0] || "";
  const linkTitle = ad.ad_creative_link_titles?.[0] || "";
  const startDate = ad.ad_delivery_start_time ? new Date(ad.ad_delivery_start_time) : null;
  const daysSinceStart = startDate ? formatDistanceToNow(startDate, { addSuffix: true }) : null;

  return (
    <Card
      className="border hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => ad.id && onSelect?.(ad.id)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-foreground truncate">{ad.page_name || "Unknown Page"}</span>
              {isDemo && (
                <Badge variant="outline" className="text-[10px] shrink-0">Demo</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ad.is_active ? (
                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
              )}
              {(ad.publisher_platforms || []).map((p) => (
                <Badge key={p} variant="outline" className={`text-[10px] border-0 ${platformColors[p] || ""}`}>
                  {p}
                </Badge>
              ))}
              {ad.cta_type && (
                <Badge variant="outline" className="text-[10px]">{ad.cta_type.replace(/_/g, " ")}</Badge>
              )}
            </div>
          </div>
          {ad.ad_snapshot_url && (
            <a
              href={ad.ad_snapshot_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Ad Copy */}
        <div className="space-y-1.5">
          {linkTitle && (
            <p className="text-sm font-medium text-foreground line-clamp-1">{linkTitle}</p>
          )}
          {primaryBody && (
            <p className="text-sm text-muted-foreground line-clamp-3">{primaryBody}</p>
          )}
        </div>

        {/* Estimated Metrics */}
        <div className="space-y-1 pt-1 border-t border-border">
          <EstimatedMetric label="Spend" range={ad.spend_range} prefix="$" methodology="Range reported by Meta Ad Library for political/social ads. For other ads, this may be a modeled range." />
          <EstimatedMetric label="Impressions" range={ad.impressions_range} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {daysSinceStart && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {daysSinceStart}
              </span>
            )}
            {ad.media_type && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {ad.media_type}
              </span>
            )}
          </div>
          {onAnalyze && ad.id && !isDemo && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(ad.id!);
              }}
              disabled={analyzing}
            >
              <Sparkles className="h-3 w-3" />
              Analyze
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
