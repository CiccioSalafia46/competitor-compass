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
import {
  Mail, Star, Archive, Search, ChevronLeft, ChevronRight,
  Inbox as InboxIcon, Filter, AlertTriangle, Sparkles, RefreshCw,
} from "lucide-react";
import { DEMO_NEWSLETTERS } from "@/lib/demo-data";
import type { NewsletterInboxItem } from "@/types/gmail";
import type { Database } from "@/integrations/supabase/types";

type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

export default function NewsletterInbox() {
  const { currentWorkspace } = useWorkspace();
  const { isConnected, connection, sync, syncing } = useGmailConnection();
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState("");
  const [competitorFilter, setCompetitorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("newsletters");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  // Fetch competitors for filter
  useEffect(() => {
    if (!currentWorkspace) return;
    supabase
      .from("competitors")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("name")
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

  const {
    items,
    loading,
    page,
    setPage,
    totalCount,
    totalPages,
    markRead,
    toggleStar,
    archive,
  } = useNewsletterInbox(filters);

  // Use demo data if not connected and no real items
  const [demoItems, setDemoItems] = useState<NewsletterInboxItem[]>([]);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (!isConnected && items.length === 0 && !loading) {
      setShowDemo(true);
      // Create fake demo items with IDs
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
    if (!item.is_demo && !item.is_read) {
      markRead(item.id);
    }
    navigate(`/inbox/${item.id}${item.is_demo ? "?demo=true" : ""}`);
  };

  const handleSync = async () => {
    try {
      await sync();
    } catch { /* handled in hook */ }
  };

  return (
    <div className="p-6 lg:p-8 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Newsletter Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {showDemo ? "Demo mode — connect Gmail to import real newsletters" : `${totalCount} newsletters`}
          </p>
        </div>
        <div className="flex gap-2">
          {isConnected && (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sync
            </Button>
          )}
          {!isConnected && (
            <Button size="sm" onClick={() => navigate("/settings")} className="gap-2">
              <Mail className="h-3.5 w-3.5" />
              Connect Gmail
            </Button>
          )}
        </div>
      </div>

      {/* Demo banner */}
      {showDemo && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Demo Mode</p>
            <p className="text-xs text-muted-foreground">
              These are sample newsletters to preview the experience. Connect Gmail to import real data.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">Sample Data</Badge>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject or sender..."
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newsletters">Newsletters</SelectItem>
            <SelectItem value="all">All emails</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={competitorFilter} onValueChange={setCompetitorFilter}>
          <SelectTrigger className="w-40">
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

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : displayItems.length === 0 ? (
        <Card className="shadow-raised border">
          <CardContent className="py-12 text-center">
            <InboxIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No newsletters found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isConnected ? "Try syncing or adjusting your filters" : "Connect Gmail to start importing"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-0.5 rounded-lg border overflow-hidden">
          {displayItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleRowClick(item)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 border-b last:border-b-0 ${
                !item.is_read ? "bg-primary/[0.02]" : ""
              }`}
            >
              {/* Star */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!item.is_demo) toggleStar(item.id);
                }}
                className={`shrink-0 ${item.is_starred ? "text-warning" : "text-muted-foreground/30 hover:text-muted-foreground"}`}
              >
                <Star className={`h-4 w-4 ${item.is_starred ? "fill-current" : ""}`} />
              </button>

              {/* Unread dot */}
              <div className="w-2 shrink-0">
                {!item.is_read && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>

              {/* Sender */}
              <div className="w-36 shrink-0 truncate">
                <p className={`text-sm truncate ${!item.is_read ? "font-semibold" : "font-medium"} text-foreground`}>
                  {item.from_name || item.from_email || "Unknown"}
                </p>
              </div>

              {/* Subject + preview */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${!item.is_read ? "font-semibold" : ""} text-foreground`}>
                  {item.subject || "No subject"}
                </p>
              </div>

              {/* Tags */}
              <div className="hidden md:flex items-center gap-1 shrink-0">
                {item.is_demo && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Demo</Badge>
                )}
                {item.is_newsletter && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Newsletter</Badge>
                )}
                {(item.tags || []).slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                    {tag.replace(/-/g, " ")}
                  </Badge>
                ))}
              </div>

              {/* Date */}
              <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">
                {item.received_at
                  ? new Date(item.received_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  : "—"}
              </span>

              {/* Archive */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!item.is_demo) archive(item.id);
                }}
                className="shrink-0 text-muted-foreground/0 hover:text-muted-foreground transition-colors group-hover:text-muted-foreground/50"
                title="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!showDemo && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
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
    </div>
  );
}
