import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useNewsletterInbox } from "@/hooks/useNewsletterInbox";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail, Star, Archive, Search, ChevronLeft, ChevronRight,
  Inbox as InboxIcon, AlertTriangle, RefreshCw,
} from "lucide-react";
import { DEMO_NEWSLETTERS } from "@/lib/demo-data";
import type { NewsletterInboxItem } from "@/types/gmail";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

export default function NewsletterInbox() {
  const { currentWorkspace } = useWorkspace();
  const { isConnected, sync, syncing } = useGmailConnection();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [competitorFilter, setCompetitorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("newsletters");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  useEffect(() => {
    if (!currentWorkspace) return;
    supabase.from("competitors").select("*").eq("workspace_id", currentWorkspace.id).order("name")
      .then(({ data }) => setCompetitors(data || []));
  }, [currentWorkspace]);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      competitorId: competitorFilter !== "all" ? competitorFilter : undefined,
      isNewsletter: typeFilter === "newsletters" ? true : typeFilter === "all" ? undefined : false,
      isArchived: typeFilter === "archived" ? true : false,
    }),
    [search, competitorFilter, typeFilter]
  );

  const { items, loading, page, setPage, totalCount, totalPages, markRead, toggleStar, archive } = useNewsletterInbox(filters);

  const [demoItems, setDemoItems] = useState<NewsletterInboxItem[]>([]);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (!isConnected && items.length === 0 && !loading) {
      setShowDemo(true);
      setDemoItems(
        DEMO_NEWSLETTERS.map((d, i) => ({
          ...d,
          id: `demo-${i}`,
          workspace_id: currentWorkspace?.id || "",
          created_at: new Date().toISOString(),
          imported_at: new Date().toISOString(),
        }))
      );
    } else {
      setShowDemo(false);
    }
  }, [isConnected, items.length, loading, currentWorkspace]);

  const displayItems = showDemo ? demoItems : items;

  const handleRowClick = (item: NewsletterInboxItem) => {
    if (!item.is_demo && !item.is_read) markRead(item.id);
    navigate(`/inbox/${item.id}${item.is_demo ? "?demo=true" : ""}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Newsletter Inbox</h1>
          <p className="page-description">
            {showDemo ? "Demo mode — connect Gmail to import real newsletters" : `${totalCount} newsletters`}
          </p>
        </div>
        <div className="flex gap-2">
          {isConnected ? (
            <Button variant="outline" size="sm" onClick={() => sync()} disabled={syncing} className="gap-1.5 h-8 text-xs">
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
              Sync
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate("/settings")} className="gap-1.5 h-8 text-xs">
              <Mail className="h-3.5 w-3.5" />
              Connect Gmail
            </Button>
          )}
        </div>
      </div>

      {/* Demo banner */}
      {showDemo && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Demo Mode</p>
            <p className="text-xs text-muted-foreground">Sample newsletters for preview. Connect Gmail to import real data.</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">Sample</Badge>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject or sender…"
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newsletters">Newsletters</SelectItem>
              <SelectItem value="all">All emails</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={competitorFilter} onValueChange={setCompetitorFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All competitors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All competitors</SelectItem>
              {competitors.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-1 rounded-lg border overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
              <Skeleton className="h-4 w-4 rounded-full shrink-0" />
              <Skeleton className="h-4 w-2 shrink-0" />
              <Skeleton className="h-4 w-28 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <Card className="border">
          <CardContent className="py-16 text-center">
            <InboxIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">No newsletters found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isConnected ? "Try syncing or adjusting your filters" : "Connect Gmail to start importing"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden bg-card divide-y">
          {displayItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleRowClick(item)}
              className={cn(
                "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 cursor-pointer transition-colors",
                "hover:bg-muted/40 active:bg-muted/60",
                !item.is_read && "bg-accent/20"
              )}
            >
              {/* Star */}
              <button
                onClick={(e) => { e.stopPropagation(); if (!item.is_demo) toggleStar(item.id); }}
                className={cn(
                  "shrink-0 p-0.5 rounded transition-colors",
                  item.is_starred ? "text-warning" : "text-muted-foreground/20 hover:text-muted-foreground/50"
                )}
                aria-label="Toggle star"
              >
                <Star className={cn("h-3.5 w-3.5", item.is_starred && "fill-current")} />
              </button>

              {/* Unread indicator */}
              <div className="w-1.5 shrink-0">
                {!item.is_read && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </div>

              {/* Sender */}
              <div className="w-28 sm:w-36 shrink-0 truncate">
                <p className={cn("text-[13px] truncate", !item.is_read ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                  {item.from_name || item.from_email || "Unknown"}
                </p>
              </div>

              {/* Subject */}
              <div className="flex-1 min-w-0">
                <p className={cn("text-[13px] truncate", !item.is_read ? "font-semibold text-foreground" : "text-foreground")}>
                  {item.subject || "No subject"}
                </p>
              </div>

              {/* Tags - hidden on mobile */}
              <div className="hidden md:flex items-center gap-1 shrink-0">
                {item.is_demo && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Demo</Badge>}
                {item.is_newsletter && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Newsletter</Badge>}
                {(item.tags || []).slice(0, 1).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 h-4 capitalize">{tag.replace(/-/g, " ")}</Badge>
                ))}
              </div>

              {/* Date */}
              <span className="text-[11px] text-muted-foreground shrink-0 w-14 sm:w-16 text-right tabular-nums">
                {item.received_at
                  ? new Date(item.received_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  : "—"}
              </span>

              {/* Archive */}
              <button
                onClick={(e) => { e.stopPropagation(); if (!item.is_demo) archive(item.id); }}
                className="shrink-0 p-0.5 text-transparent hover:text-muted-foreground transition-colors"
                title="Archive"
                aria-label="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!showDemo && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
