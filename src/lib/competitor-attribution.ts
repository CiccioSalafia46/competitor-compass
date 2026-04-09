import { supabase } from "@/integrations/supabase/client";

export interface CompetitorAttributionSyncResult {
  matched: number;
  domains?: string[];
  competitorsProcessed?: number;
}

export interface CompetitorSuggestion {
  senderDomain: string;
  senderName: string | null;
  sampleFromEmail: string | null;
  newsletterCount: number;
  latestReceivedAt: string | null;
  suggestedName: string;
  suggestedWebsite: string | null;
}

export async function syncCompetitorInboxAttribution(competitorId: string) {
  const { data, error } = await supabase.rpc("sync_competitor_newsletter_attribution", {
    _competitor_id: competitorId,
  });

  if (error) throw error;
  return (data ?? { matched: 0 }) as CompetitorAttributionSyncResult;
}

export async function syncWorkspaceInboxAttribution(workspaceId: string) {
  const { data, error } = await supabase.rpc("sync_workspace_newsletter_attribution", {
    _workspace_id: workspaceId,
  });

  if (error) throw error;
  return (data ?? { matched: 0, competitorsProcessed: 0 }) as CompetitorAttributionSyncResult;
}

type RawSuggestionRow = {
  sender_domain: string;
  sender_name: string | null;
  sample_from_email: string | null;
  newsletter_count: number;
  latest_received_at: string | null;
  suggested_name: string;
  suggested_website: string | null;
};

export async function fetchNewsletterCompetitorSuggestions(workspaceId: string) {
  const { data, error } = await supabase.rpc("get_newsletter_competitor_suggestions", {
    _workspace_id: workspaceId,
  });

  if (error) throw error;
  return ((data ?? []) as RawSuggestionRow[]).map((row) => ({
    senderDomain: row.sender_domain,
    senderName: row.sender_name,
    sampleFromEmail: row.sample_from_email,
    newsletterCount: Number(row.newsletter_count ?? 0),
    latestReceivedAt: row.latest_received_at,
    suggestedName: row.suggested_name,
    suggestedWebsite: row.suggested_website,
  } satisfies CompetitorSuggestion));
}
