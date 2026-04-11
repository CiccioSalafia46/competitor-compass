import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import type { NewsletterInboxItem, NewsletterExtraction } from "@/types/gmail";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { fetchNewsletterCompetitorSuggestions, type CompetitorSuggestion } from "@/lib/competitor-attribution";

interface InboxFilters {
  competitorId?: string;
  unassignedOnly?: boolean;
  isNewsletter?: boolean;
  isArchived?: boolean;
  search?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// useNewsletterInbox
// ---------------------------------------------------------------------------

export function useNewsletterInbox(filters: InboxFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Cursor stack: each entry is the received_at of the last item on that page.
  // Empty = we are on the first page (no cursor needed).
  const [cursors, setCursors] = useState<string[]>([]);
  // Current cursor: the received_at value used as an upper bound for the query.
  const [cursor, setCursor] = useState<string | null>(null);

  const workspaceId = currentWorkspace?.id ?? null;

  // Stable query key — individual filter values so the key doesn't change on
  // object identity churn from useMemo in the parent.
  const queryKey = [
    "newsletter-inbox",
    workspaceId,
    cursor,
    filters.competitorId ?? null,
    filters.unassignedOnly ?? false,
    filters.isNewsletter ?? null,
    filters.isArchived ?? null,
    filters.search ?? "",
    filters.dateFrom ?? "",
    filters.dateTo ?? "",
  ] as const;

  // ── main data query ───────────────────────────────────────────────────────

  const { data, isFetching, refetch: refetchQuery } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!workspaceId) return { items: [] as NewsletterInboxItem[] };

      let query = supabase
        .from("newsletter_inbox")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("received_at", { ascending: false })
        .limit(PAGE_SIZE);

      // Cursor-based pagination: skip rows with received_at >= cursor
      if (cursor) {
        query = query.lt("received_at", cursor);
      }

      if (filters.isArchived !== undefined) {
        query = query.eq("is_archived", filters.isArchived);
      } else {
        query = query.eq("is_archived", false);
      }

      if (filters.isNewsletter !== undefined) {
        query = query.eq("is_newsletter", filters.isNewsletter);
      }

      if (filters.competitorId) {
        query = query.eq("competitor_id", filters.competitorId);
      } else if (filters.unassignedOnly) {
        query = query.is("competitor_id", null);
      }

      if (filters.search) {
        const safe = filters.search.replace(/[%_\\]/g, "\\$&").slice(0, 200);
        query = query.or(
          `subject.ilike.%${safe}%,from_email.ilike.%${safe}%,from_name.ilike.%${safe}%`,
        );
      }

      if (filters.dateFrom) {
        query = query.gte("received_at", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("received_at", filters.dateTo);
      }

      const { data: rows, error } = await query;

      if (error) {
        console.error("Inbox fetch error:", error);
        toast.error(getErrorMessage(error, "Failed to load inbox."));
        return { items: [] as NewsletterInboxItem[] };
      }

      return { items: (rows as NewsletterInboxItem[]) || [] };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
  });

  // ── count query (separate, cheaper) ──────────────────────────────────────

  const countQueryKey = [
    "newsletter-inbox-count",
    workspaceId,
    filters.competitorId ?? null,
    filters.unassignedOnly ?? false,
    filters.isNewsletter ?? null,
    filters.isArchived ?? null,
    filters.search ?? "",
    filters.dateFrom ?? "",
    filters.dateTo ?? "",
  ] as const;

  const { data: countData } = useQuery({
    queryKey: countQueryKey,
    queryFn: async () => {
      if (!workspaceId) return { totalCount: 0 };

      let query = supabase
        .from("newsletter_inbox")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

      if (filters.isArchived !== undefined) {
        query = query.eq("is_archived", filters.isArchived);
      } else {
        query = query.eq("is_archived", false);
      }

      if (filters.isNewsletter !== undefined) {
        query = query.eq("is_newsletter", filters.isNewsletter);
      }

      if (filters.competitorId) {
        query = query.eq("competitor_id", filters.competitorId);
      } else if (filters.unassignedOnly) {
        query = query.is("competitor_id", null);
      }

      if (filters.search) {
        const safe = filters.search.replace(/[%_\\]/g, "\\$&").slice(0, 200);
        query = query.or(
          `subject.ilike.%${safe}%,from_email.ilike.%${safe}%,from_name.ilike.%${safe}%`,
        );
      }

      if (filters.dateFrom) {
        query = query.gte("received_at", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("received_at", filters.dateTo);
      }

      const { count, error } = await query;

      if (error) {
        console.error("Inbox count error:", error);
        return { totalCount: 0 };
      }

      return { totalCount: count ?? 0 };
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: !!workspaceId,
  });

  const items = data?.items ?? [];
  const totalCount = countData?.totalCount ?? 0;
  const hasNextPage = items.length === PAGE_SIZE;
  const hasPreviousPage = cursors.length > 0;

  // ── pagination helpers ────────────────────────────────────────────────────

  const goToNextPage = () => {
    const lastItem = items[items.length - 1];
    if (!lastItem?.received_at) return;
    // Push the current cursor (or "" for first page) so we can go back
    setCursors((prev) => [...prev, cursor ?? ""]);
    setCursor(lastItem.received_at);
  };

  const goToPrevPage = () => {
    setCursors((prev) => {
      const next = [...prev];
      const previous = next.pop();
      setCursor(previous ?? null);
      return next;
    });
  };

  // ── mutations ─────────────────────────────────────────────────────────────

  const invalidateInbox = () => {
    void queryClient.invalidateQueries({ queryKey: ["newsletter-inbox", workspaceId] });
    void queryClient.invalidateQueries({ queryKey: ["newsletter-inbox-count", workspaceId] });
  };

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("newsletter_inbox").update({ is_read: true }).eq("id", id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: { items: NewsletterInboxItem[] } | undefined) => {
        if (!old) return old;
        return { items: old.items.map((item) => (item.id === id ? { ...item, is_read: true } : item)) };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: invalidateInbox,
  });

  const toggleStarMutation = useMutation({
    mutationFn: async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      await supabase.from("newsletter_inbox").update({ is_starred: !item.is_starred }).eq("id", id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: { items: NewsletterInboxItem[] } | undefined) => {
        if (!old) return old;
        return { items: old.items.map((i) => (i.id === id ? { ...i, is_starred: !i.is_starred } : i)) };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: invalidateInbox,
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("newsletter_inbox").update({ is_archived: true }).eq("id", id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousItems = queryClient.getQueryData(queryKey);
      const previousCount = queryClient.getQueryData(countQueryKey);
      queryClient.setQueryData(queryKey, (old: { items: NewsletterInboxItem[] } | undefined) => {
        if (!old) return old;
        return { items: old.items.filter((i) => i.id !== id) };
      });
      queryClient.setQueryData(countQueryKey, (old: { totalCount: number } | undefined) => {
        if (!old) return old;
        return { totalCount: Math.max(0, old.totalCount - 1) };
      });
      return { previousItems, previousCount };
    },
    onError: (_err, _id, context) => {
      if (context?.previousItems !== undefined) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(countQueryKey, context.previousCount);
      }
    },
    onSuccess: invalidateInbox,
  });

  const updateTagsMutation = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      await supabase.from("newsletter_inbox").update({ tags }).eq("id", id);
    },
    onMutate: async ({ id, tags }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: { items: NewsletterInboxItem[] } | undefined) => {
        if (!old) return old;
        return { items: old.items.map((i) => (i.id === id ? { ...i, tags } : i)) };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: invalidateInbox,
  });

  const assignCompetitorMutation = useMutation({
    mutationFn: async ({ id, competitorId }: { id: string; competitorId: string | null }) => {
      const { error } = await supabase
        .from("newsletter_inbox")
        .update({ competitor_id: competitorId })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, competitorId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: { items: NewsletterInboxItem[] } | undefined) => {
        if (!old) return old;
        return { items: old.items.map((item) => (item.id === id ? { ...item, competitor_id: competitorId } : item)) };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: invalidateInbox,
  });

  // ── public interface ──────────────────────────────────────────────────────

  return {
    items,
    loading: isFetching,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPrevPage,
    markRead: (id: string) => markReadMutation.mutateAsync(id),
    toggleStar: (id: string) => toggleStarMutation.mutateAsync(id),
    archive: (id: string) => archiveMutation.mutateAsync(id),
    updateTags: (id: string, tags: string[]) => updateTagsMutation.mutateAsync({ id, tags }),
    assignCompetitor: (id: string, competitorId: string | null) =>
      assignCompetitorMutation.mutateAsync({ id, competitorId }),
    refetch: () => {
      void refetchQuery();
    },
  };
}

// ---------------------------------------------------------------------------
// useNewsletterExtraction
// ---------------------------------------------------------------------------

export function useNewsletterExtraction(newsletterInboxId: string | null) {
  const queryClient = useQueryClient();

  const { data: extraction = null, isLoading: loading } = useQuery({
    queryKey: ["newsletter-extraction", newsletterInboxId],
    queryFn: async () => {
      if (!newsletterInboxId) return null;
      const { data } = await supabase
        .from("newsletter_extractions")
        .select("*")
        .eq("newsletter_inbox_id", newsletterInboxId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as NewsletterExtraction | null) ?? null;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!newsletterInboxId,
  });

  const extractMutation = useMutation({
    mutationFn: async () => {
      if (!newsletterInboxId) return null;
      const result = await invokeEdgeFunction<{ extraction?: NewsletterExtraction }>(
        "extract-newsletter-intel",
        { body: { newsletterInboxId } },
      );
      return result;
    },
    onSuccess: (result) => {
      if (result?.extraction) {
        queryClient.setQueryData(
          ["newsletter-extraction", newsletterInboxId],
          result.extraction as NewsletterExtraction,
        );
      }
      void queryClient.invalidateQueries({
        queryKey: ["newsletter-extraction", newsletterInboxId],
      });
    },
  });

  const extract = async () => {
    return extractMutation.mutateAsync();
  };

  return {
    extraction,
    loading,
    extracting: extractMutation.isPending,
    extract,
  };
}

// ---------------------------------------------------------------------------
// useNewsletterCompetitorSuggestions
// ---------------------------------------------------------------------------

export function useNewsletterCompetitorSuggestions(enabled = true) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? null;

  const { data: suggestions = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["newsletter-competitor-suggestions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [] as CompetitorSuggestion[];
      try {
        return await fetchNewsletterCompetitorSuggestions(workspaceId);
      } catch (error) {
        console.error("Newsletter competitor suggestions fetch error:", error);
        return [] as CompetitorSuggestion[];
      }
    },
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !!workspaceId && enabled,
  });

  return {
    suggestions,
    loading,
    refetch: () => {
      void refetch();
    },
  };
}
