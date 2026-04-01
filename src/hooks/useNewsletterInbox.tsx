import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { NewsletterInboxItem, NewsletterExtraction } from "@/types/gmail";

interface InboxFilters {
  competitorId?: string;
  isNewsletter?: boolean;
  isArchived?: boolean;
  search?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

const PAGE_SIZE = 20;

export function useNewsletterInbox(filters: InboxFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const [items, setItems] = useState<NewsletterInboxItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchInbox = useCallback(async () => {
    if (!currentWorkspace) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase
      .from("newsletter_inbox")
      .select("*", { count: "exact" })
      .eq("workspace_id", currentWorkspace.id)
      .order("received_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

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
    }

    if (filters.search) {
      query = query.or(`subject.ilike.%${filters.search}%,from_email.ilike.%${filters.search}%,from_name.ilike.%${filters.search}%`);
    }

    if (filters.dateFrom) {
      query = query.gte("received_at", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("received_at", filters.dateTo);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Inbox fetch error:", error);
    }

    setItems((data as NewsletterInboxItem[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [currentWorkspace, page, filters.competitorId, filters.isNewsletter, filters.isArchived, filters.search, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const markRead = async (id: string) => {
    await supabase.from("newsletter_inbox").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
  };

  const toggleStar = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    await supabase.from("newsletter_inbox").update({ is_starred: !item.is_starred }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_starred: !i.is_starred } : i)));
  };

  const archive = async (id: string) => {
    await supabase.from("newsletter_inbox").update({ is_archived: true }).eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotalCount((prev) => prev - 1);
  };

  const updateTags = async (id: string, tags: string[]) => {
    await supabase.from("newsletter_inbox").update({ tags }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, tags } : i)));
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return {
    items,
    loading,
    page,
    setPage,
    totalCount,
    totalPages,
    markRead,
    toggleStar,
    archive,
    updateTags,
    refetch: fetchInbox,
  };
}

export function useNewsletterExtraction(newsletterInboxId: string | null) {
  const [extraction, setExtraction] = useState<NewsletterExtraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (!newsletterInboxId) {
      setExtraction(null);
      setLoading(false);
      return;
    }
    supabase
      .from("newsletter_extractions")
      .select("*")
      .eq("newsletter_inbox_id", newsletterInboxId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setExtraction(data as NewsletterExtraction | null);
        setLoading(false);
      });
  }, [newsletterInboxId]);

  const extract = async () => {
    if (!newsletterInboxId) return;
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-newsletter-intel", {
        body: { newsletterInboxId },
      });
      if (error) throw error;
      if (data?.extraction) {
        setExtraction(data.extraction as NewsletterExtraction);
      }
      return data;
    } finally {
      setExtracting(false);
    }
  };

  return { extraction, loading, extracting, extract };
}
