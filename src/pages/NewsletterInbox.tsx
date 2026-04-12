import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useNewsletterInbox, useNewsletterCompetitorSuggestions } from "@/hooks/useNewsletterInbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { inferCompetitorName, normalizeDomain, mergeCompetitorDomains } from "@/lib/domains";
import { syncCompetitorInboxAttribution, syncWorkspaceInboxAttribution, type CompetitorSuggestion } from "@/lib/competitor-attribution";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox as InboxIcon,
  Info,
  Lightbulb,
  Link2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { DEMO_NEWSLETTERS } from "@/lib/demo-data";
import { useDebounce } from "@/hooks/useDebounce";
import type { GmailSyncResult, NewsletterInboxItem } from "@/types/gmail";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

const UNASSIGNED_FILTER = "__unassigned__";
const NO_COMPETITOR_ASSIGNMENT = "__none__";

export default function NewsletterInbox() {
  const { t } = useTranslation("inbox");
  const { currentWorkspace } = useWorkspace();
  const { canManageCompetitors } = useRoles();
  const { isConnected, sync, syncing } = useGmailConnection();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [competitorFilter, setCompetitorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("newsletters");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [creatingSuggestionDomain, setCreatingSuggestionDomain] = useState<string | null>(null);
  const [matchingInbox, setMatchingInbox] = useState(false);
  const [assigningInboxId, setAssigningInboxId] = useState<string | null>(null);
  const autoMatchKeyRef = useRef<string | null>(null);

  const fetchCompetitors = useCallback(async () => {
    if (!currentWorkspace) {
      setCompetitors([]);
      return;
    }

    const { data } = await supabase
      .from("competitors")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("name");

    setCompetitors(data || []);
  }, [currentWorkspace]);

  useEffect(() => {
    void fetchCompetitors();
  }, [fetchCompetitors]);

  const debouncedSearch = useDebounce(search, 300);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      competitorId:
        competitorFilter !== "all" && competitorFilter !== UNASSIGNED_FILTER
          ? competitorFilter
          : undefined,
      unassignedOnly: competitorFilter === UNASSIGNED_FILTER,
      isNewsletter: typeFilter === "newsletters" ? true : typeFilter === "all" ? undefined : false,
      isArchived: typeFilter === "archived" ? true : false,
    }),
    [debouncedSearch, competitorFilter, typeFilter],
  );

  const {
    items,
    loading,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPrevPage,
    markRead,
    toggleStar,
    archive,
    assignCompetitor,
    refetch,
  } = useNewsletterInbox(filters);

  const { suggestions, loading: loadingSuggestions, refetch: refetchSuggestions } =
    useNewsletterCompetitorSuggestions(canManageCompetitors && !loading && !showingDemoFallback(items, isConnected));

  const [demoItems, setDemoItems] = useState<NewsletterInboxItem[]>([]);
  const [showDemo, setShowDemo] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<GmailSyncResult | null>(null);

  useEffect(() => {
    if (!isConnected && items.length === 0 && !loading) {
      setShowDemo(true);
      setDemoItems(
        DEMO_NEWSLETTERS.map((demo, index) => ({
          ...demo,
          id: `demo-${index}`,
          workspace_id: currentWorkspace?.id || "",
          created_at: new Date().toISOString(),
          imported_at: new Date().toISOString(),
        })),
      );
    } else {
      setShowDemo(false);
    }
  }, [isConnected, items.length, loading, currentWorkspace]);

  const displayItems = showDemo ? demoItems : items;
  const competitorMap = useMemo(
    () => new Map(competitors.map((competitor) => [competitor.id, competitor])),
    [competitors],
  );
  const autoMatchKey = useMemo(() => {
    if (!currentWorkspace || !canManageCompetitors || !isConnected || competitors.length === 0) {
      return null;
    }

    return `${currentWorkspace.id}:${competitors
      .map((competitor) => competitor.id)
      .sort()
      .join(",")}`;
  }, [currentWorkspace, canManageCompetitors, competitors, isConnected]);

  useEffect(() => {
    if (!autoMatchKey || showDemo || !currentWorkspace) {
      return;
    }

    if (autoMatchKeyRef.current === autoMatchKey) {
      return;
    }

    autoMatchKeyRef.current = autoMatchKey;

    void (async () => {
      try {
        const result = await syncWorkspaceInboxAttribution(currentWorkspace.id);
        if (result.matched > 0) {
          await Promise.all([refetch(), refetchSuggestions()]);
          toast({
            title: t("inboxAutoMatched"),
            description: t("autoMatchedDesc", { count: result.matched }),
          });
        }
      } catch (error) {
        console.error("Inbox auto-match failed:", error);
        autoMatchKeyRef.current = null;
      }
    })();
  }, [autoMatchKey, currentWorkspace, refetch, refetchSuggestions, showDemo, t, toast]);

  const handleRowClick = (item: NewsletterInboxItem) => {
    if (!item.is_demo && !item.is_read) {
      void markRead(item.id);
    }
    navigate(`/inbox/${item.id}${item.is_demo ? "?demo=true" : ""}`);
  };

  const handleSync = async () => {
    try {
      const result = await sync();
      if (!result) return;

      setLastSyncResult(result);

      await refetch();

      if (currentWorkspace && competitors.length > 0) {
        const attribution = await syncWorkspaceInboxAttribution(currentWorkspace.id);
        if (attribution.matched > 0) {
          toast({
            title: t("attributionUpdated"),
            description: `Matched ${attribution.matched} existing ${attribution.matched === 1 ? "email" : "emails"} to tracked competitors.`,
          });
        }
      }

      await Promise.all([fetchCompetitors(), refetchSuggestions()]);

      toast({
        title: result.status === "completed_with_issues" ? t("syncWithIssues") : t("syncComplete"),
        description: result.message,
        variant: result.status === "completed_with_issues" ? "destructive" : "default",
      });
    } catch (error) {
      toast({
        title: t("syncFailed"),
        description: getErrorMessage(error, "Gmail sync failed."),
        variant: "destructive",
      });
    }
  };

  const handleAttributionSync = async () => {
    if (!currentWorkspace) return;

    setMatchingInbox(true);
    try {
      const result = await syncWorkspaceInboxAttribution(currentWorkspace.id);
      await Promise.all([refetch(), refetchSuggestions(), fetchCompetitors()]);
      toast({
        title: t("competitorMatchingRefreshed"),
        description:
          result.matched > 0
            ? `Matched ${result.matched} existing inbox ${result.matched === 1 ? "email" : "emails"} across ${result.competitorsProcessed || competitors.length} competitors.`
            : "No additional inbox emails matched the current competitor domains.",
      });
    } catch (error) {
      toast({
        title: t("attributionSyncFailed"),
        description: getErrorMessage(error, "Unable to refresh competitor attribution."),
        variant: "destructive",
      });
    } finally {
      setMatchingInbox(false);
    }
  };

  const handleCreateSuggestion = async (suggestion: CompetitorSuggestion) => {
    if (!currentWorkspace) return;

    // Client-side duplicate guard: check if any existing competitor already covers this domain
    const normalizedSenderDomain = normalizeDomain(suggestion.senderDomain);
    if (normalizedSenderDomain) {
      const alreadyCovered = competitors.some((c) =>
        mergeCompetitorDomains({ website: c.website, domains: c.domains as string[] | null }).includes(normalizedSenderDomain),
      );
      if (alreadyCovered) {
        toast({
          title: t("alreadyTracked"),
          description: t("alreadyTrackedDesc", { domain: suggestion.senderDomain }),
        });
        return;
      }
    }

    setCreatingSuggestionDomain(suggestion.senderDomain);
    try {
      const inferredName =
        suggestion.suggestedName ||
        inferCompetitorName({
          senderName: suggestion.senderName,
          senderDomain: suggestion.senderDomain,
        });

      const { data, error } = await supabase
        .from("competitors")
        .insert({
          workspace_id: currentWorkspace.id,
          name: inferredName,
          website: suggestion.suggestedWebsite,
          domains: [suggestion.senderDomain],
          is_monitored: true,
          description: `Created from Inbox suggestion based on ${suggestion.sampleFromEmail ?? suggestion.senderDomain}.`,
        })
        .select("*")
        .single();

      if (error) throw error;

      const attribution = await syncCompetitorInboxAttribution(data.id);
      await Promise.all([refetch(), refetchSuggestions(), fetchCompetitors()]);

      toast({
        title: t("competitorCreated"),
        description:
          attribution.matched > 0
            ? `${data.name} created and ${attribution.matched} inbox ${attribution.matched === 1 ? "email was" : "emails were"} linked automatically.`
            : `${data.name} created. Future Gmail syncs will now auto-attribute this sender domain.`,
      });
    } catch (error) {
      toast({
        title: t("suggestionFailed"),
        description: getErrorMessage(error, "Unable to create competitor from this sender."),
        variant: "destructive",
      });
    } finally {
      setCreatingSuggestionDomain(null);
    }
  };

  const handleAssignCompetitor = async (item: NewsletterInboxItem, competitorId: string | null) => {
    setAssigningInboxId(item.id);
    try {
      await assignCompetitor(item.id, competitorId);
      await Promise.all([refetch(), refetchSuggestions()]);

      const competitorName = competitorId ? competitorMap.get(competitorId)?.name ?? "competitor" : null;

      toast({
        title: competitorId ? t("competitorAssigned") : t("competitorCleared"),
        description: competitorId
          ? `This email is now attributed to ${competitorName}.`
          : "This email now needs competitor review.",
      });
    } catch (error) {
      toast({
        title: t("assignmentFailed"),
        description: getErrorMessage(error, "Unable to update competitor attribution."),
        variant: "destructive",
      });
    } finally {
      setAssigningInboxId(null);
    }
  };

  return (
    <div className="max-w-6xl space-y-4 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="-mx-4 -mt-4 mb-0 h-1 w-[calc(100%+2rem)] bg-gradient-to-r from-primary via-primary/50 to-transparent sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]" />
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("competitorInbox")}</h1>
          <p className="page-description">
            {showDemo
              ? t("demoModeSubtitle")
              : t("itemsTracked", { count: totalCount })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!showDemo && competitors.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAttributionSync}
              disabled={matchingInbox}
              className="h-8 gap-1.5 text-xs"
            >
              <Link2 className={cn("h-3.5 w-3.5", matchingInbox && "animate-pulse")} />
              {t("matchCompetitors")}
            </Button>
          )}
          {isConnected ? (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="h-8 gap-1.5 text-xs">
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
              {t("syncButton")}
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate("/settings")} className="h-8 gap-1.5 text-xs">
              <Mail className="h-3.5 w-3.5" />
              {t("connectGmail")}
            </Button>
          )}
        </div>
      </div>

      {!showDemo && !loading && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card/60 px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <InboxIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[13px] font-semibold tabular-nums text-foreground">{totalCount}</span>
            <span className="text-xs text-muted-foreground">{t("totalItems")}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">{t("unreadItemsTracked")}</span>
          </div>
          {isConnected && (
            <>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-muted-foreground">{t("gmailConnected")}</span>
              </div>
            </>
          )}
        </div>
      )}

      {showDemo && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm">
          <Lightbulb className="h-4 w-4 shrink-0 text-warning" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t("demoModeTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("demoModeDesc")}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {t("demoSample")}
          </Badge>
        </div>
      )}

      {canManageCompetitors && !showDemo && suggestions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t("competitorSuggestionsTitle")}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t("competitorSuggestionsDesc")}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="h-fit text-[10px] font-medium">
                {t("suggestionCount", { count: suggestions.length })}
              </Badge>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {suggestions.slice(0, 6).map((suggestion) => (
                <div key={suggestion.senderDomain} className="rounded-xl border border-l-[3px] border-l-primary/40 bg-background px-4 py-3 shadow-sm transition-colors hover:border-l-primary/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">
                        {(suggestion.suggestedName || suggestion.senderDomain).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {suggestion.suggestedName ||
                              inferCompetitorName({
                                senderName: suggestion.senderName,
                                senderDomain: suggestion.senderDomain,
                              })}
                          </p>
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {t("emailBadge", { count: suggestion.newsletterCount })}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{suggestion.senderDomain}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {suggestion.latestReceivedAt
                            ? t("latestSeen", { date: new Date(suggestion.latestReceivedAt).toLocaleString() })
                            : t("latestSeenUnknown")}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={creatingSuggestionDomain === suggestion.senderDomain}
                      onClick={() => {
                        void handleCreateSuggestion(suggestion);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {creatingSuggestionDomain === suggestion.senderDomain ? t("creating") : t("createCompetitor")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {lastSyncResult && (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-start sm:justify-between",
            lastSyncResult.status === "completed_with_issues"
              ? "border-destructive/30 bg-destructive/5"
              : lastSyncResult.status === "imported"
                ? "border-primary/20 bg-primary/5"
                : "border-border bg-muted/20",
          )}
        >
          <div className="flex min-w-0 gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                lastSyncResult.status === "completed_with_issues"
                  ? "bg-destructive/10 text-destructive"
                  : lastSyncResult.status === "imported"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {lastSyncResult.status === "completed_with_issues" ? (
                <Info className="h-4 w-4" />
              ) : lastSyncResult.status === "imported" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {lastSyncResult.status === "completed_with_issues"
                  ? t("syncWithIssues")
                  : lastSyncResult.status === "imported"
                    ? t("newEmailsImported")
                    : t("syncCompleted")}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{lastSyncResult.message}</p>
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                {lastSyncResult.sync_mode === "full" ? t("fullSync") : t("incrementalSync")} · {new Date(lastSyncResult.synced_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[11px]">
              {t("checked", { count: lastSyncResult.total })}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {t("imported", { count: lastSyncResult.imported })}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {t("matched", { count: lastSyncResult.attributed })}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {t("needsReview", { count: lastSyncResult.needs_review })}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {t("skipped", { count: lastSyncResult.skipped })}
            </Badge>
            {lastSyncResult.errors > 0 && (
              <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-[11px] text-destructive">
                {t("errors", { count: lastSyncResult.errors })}
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-2 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-8 pl-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented type control — 3 options, no point in a dropdown */}
          <div className="flex rounded-lg border bg-muted/40 p-0.5 gap-0.5">
            {(["newsletters", "all", "archived"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={cn(
                  "h-7 rounded-md px-3 text-xs font-medium transition-colors",
                  typeFilter === value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "newsletters" ? t("newslettersFilter") : value === "all" ? t("allFilter") : t("archivedFilter")}
              </button>
            ))}
          </div>

          {/* Competitor filter — keep as select since it has many options */}
          <Select value={competitorFilter} onValueChange={setCompetitorFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder={t("filterByCompetitor")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCompetitors")}</SelectItem>
              <SelectItem value={UNASSIGNED_FILTER}>{t("needsCompetitorFilter")}</SelectItem>
              {competitors.map((competitor) => (
                <SelectItem key={competitor.id} value={competitor.id}>
                  {competitor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
              <Skeleton className="h-3.5 w-3.5 shrink-0" />
              <Skeleton className="h-1.5 w-1.5 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 w-32 shrink-0" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-5 w-24 shrink-0" />
              <Skeleton className="h-3.5 w-12 shrink-0" />
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card/80 py-20 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40">
            <InboxIcon className="h-8 w-8 text-muted-foreground/20" />
          </div>
          <p className="text-sm font-medium text-foreground">{t("noActivityFound")}</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {isConnected
              ? t("noActivityFoundConnected")
              : t("noActivityFoundDisconnected")}
          </p>
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
          {displayItems.map((item) => {
            const competitor = item.competitor_id ? competitorMap.get(item.competitor_id) : null;

            return (
              <div
                key={item.id}
                onClick={() => handleRowClick(item)}
                className={cn(
                  "group flex cursor-pointer items-center gap-2.5 px-4 py-2.5 transition-colors duration-100 sm:gap-3",
                  "hover:bg-muted/30",
                  !item.is_read && "bg-primary/[0.04] dark:bg-primary/[0.06]",
                )}
              >
                {/* Star — always shown, faded unless active */}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!item.is_demo) void toggleStar(item.id);
                  }}
                  className={cn(
                    "shrink-0 rounded p-2 transition-colors",
                    item.is_starred
                      ? "text-warning"
                      : "text-transparent group-hover:text-muted-foreground/40 hover:!text-muted-foreground/70",
                  )}
                  aria-label={t("toggleStar")}
                >
                  <Star className={cn("h-3.5 w-3.5", item.is_starred && "fill-current")} />
                </button>

                {/* Unread dot */}
                <div className="w-1.5 shrink-0">
                  {!item.is_read && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </div>

                {/* Avatar */}
                <div className={cn(
                  "hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold",
                  !item.is_read ? "bg-primary/12 text-primary" : "bg-muted/60 text-muted-foreground",
                )}>
                  {(item.from_name || item.from_email || "?").charAt(0).toUpperCase()}
                </div>

                {/* Sender — fixed width, primary info */}
                <div className="w-32 shrink-0 truncate sm:w-40">
                  <p className={cn(
                    "truncate text-[13px] leading-snug",
                    !item.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80",
                  )}>
                    {item.from_name || item.from_email || t("unknownSender")}
                  </p>
                </div>

                {/* Subject + competitor assignment */}
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "truncate text-[13px] leading-snug",
                    !item.is_read ? "font-medium text-foreground" : "text-foreground/70",
                  )}>
                    {item.subject || t("noSubject")}
                  </p>
                  {!item.is_demo && item.is_newsletter && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {canManageCompetitors ? (
                        <div
                          className="min-w-[160px] max-w-[220px]"
                          onClick={(event) => event.stopPropagation()}
                          onPointerDownCapture={(event) => event.stopPropagation()}
                        >
                          <Select
                            value={item.competitor_id ?? NO_COMPETITOR_ASSIGNMENT}
                            onValueChange={(value) => {
                              void handleAssignCompetitor(item, value === NO_COMPETITOR_ASSIGNMENT ? null : value);
                            }}
                            disabled={assigningInboxId === item.id}
                          >
                            <SelectTrigger className={cn(
                              "h-6 px-2 text-[10px] font-medium",
                              item.competitor_id
                                ? "border-primary/20 bg-primary/5 text-primary"
                                : "border-dashed text-muted-foreground",
                            )}>
                              <SelectValue placeholder={t("assignCompetitorPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_COMPETITOR_ASSIGNMENT}>{t("noCompetitorOption")}</SelectItem>
                              {competitors.map((availableCompetitor) => (
                                <SelectItem key={availableCompetitor.id} value={availableCompetitor.id}>
                                  {availableCompetitor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : competitor ? (
                        <Badge variant="secondary" className="h-5 text-[10px] font-medium">
                          <Users className="mr-1 h-3 w-3" />
                          {competitor.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-5 border-warning/30 bg-warning/5 text-[10px] font-medium text-warning">
                          {t("needsCompetitorBadge")}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Type badges — hidden on mobile */}
                <div className="hidden shrink-0 items-center gap-1 md:flex">
                  {item.is_demo && (
                    <Badge variant="outline" className="h-4 px-1.5 py-0 text-[9px]">{t("demoBadge")}</Badge>
                  )}
                  {item.is_newsletter && (
                    <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[9px]">{t("newsletterBadge")}</Badge>
                  )}
                </div>

                {/* Date */}
                <span className="w-12 shrink-0 text-right tabular-nums text-[11px] text-muted-foreground sm:w-16">
                  {item.received_at
                    ? new Date(item.received_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    : "—"}
                </span>

                {/* Archive — visible on hover only */}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!item.is_demo) void archive(item.id);
                  }}
                  className="shrink-0 rounded p-2 text-transparent transition-colors group-hover:text-muted-foreground/40 hover:!text-muted-foreground"
                  title={t("archiveAction")}
                  aria-label={t("archiveAction")}
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!showDemo && (hasNextPage || hasPreviousPage) && (
        <div className="flex items-center justify-between">
          <p className="tabular-nums text-xs text-muted-foreground">
            {totalCount > 0 && (
              <span className="text-muted-foreground/50">{totalCount} total</span>
            )}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={!hasPreviousPage}
              onClick={goToPrevPage}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={!hasNextPage}
              onClick={goToNextPage}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {canManageCompetitors && !showDemo && loadingSuggestions && (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="border">
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function showingDemoFallback(items: NewsletterInboxItem[], isConnected: boolean) {
  return !isConnected && items.length === 0;
}
