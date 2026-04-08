import {
  buildCompetitorIntelligenceSnapshots,
  type CompetitorDirectoryEntry,
  type CompetitorInsightSignal,
  type CompetitorIntelligenceSnapshot,
  type CompetitorMetaAdSignal,
  type CompetitorNewsletterSignal,
} from "../../../src/lib/competitor-intelligence.ts";

/** Minimal chainable query builder shape used by edge functions to avoid importing full Supabase types. */
type QueryBuilder<T> = Promise<{ data: T[] | null; error: unknown }> & {
  eq: (column: string, value: string | boolean) => QueryBuilder<T>;
  not: (column: string, operator: string, value: string | null) => QueryBuilder<T>;
  gte: (column: string, value: string) => QueryBuilder<T>;
  or: (filters: string) => QueryBuilder<T>;
  in: (column: string, values: string[]) => QueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  limit: (value: number) => QueryBuilder<T>;
};

type SupabaseClientLike = {
  from: <T extends Record<string, unknown>>(table: string) => {
    select: (columns: string) => QueryBuilder<T>;
  };
};

type CompetitorRow = {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  domains: string[] | null;
  is_monitored: boolean;
};

type InboxRow = {
  id: string;
  competitor_id: string | null;
  subject: string | null;
  from_name: string | null;
  from_email: string | null;
  received_at: string | null;
};

type ExtractionRow = {
  newsletter_inbox_id: string;
  created_at: string;
  campaign_type: string | null;
  main_message: string | null;
  discount_percentage: number | null;
  coupon_code: string | null;
  free_shipping: boolean | null;
  product_categories: string[] | null;
  urgency_signals: unknown;
  strategy_takeaways: unknown;
  calls_to_action: unknown;
};

type MetaAdRow = {
  id: string;
  competitor_id: string | null;
  page_name: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  is_active: boolean | null;
  cta_type: string | null;
  ad_creative_bodies: string[] | null;
  ad_creative_link_titles: string[] | null;
};

type InsightRow = {
  id: string;
  title: string;
  campaign_type: string;
  main_message: string;
  positioning_angle: string;
  strategic_takeaway: string;
  priority_level: string;
  impact_area: string;
  product_categories: string[];
  created_at: string;
  affected_competitors: string[] | null;
};

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function firstString(values: string[] | null | undefined) {
  return values?.find((value) => typeof value === "string" && value.trim().length > 0) ?? null;
}

function mapCompetitorRows(rows: CompetitorRow[]): CompetitorDirectoryEntry[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    website: row.website,
    description: row.description,
    domains: row.domains ?? [],
    is_monitored: row.is_monitored,
  }));
}

function mapNewsletterSignals(inboxRows: InboxRow[], extractionRows: ExtractionRow[]): CompetitorNewsletterSignal[] {
  const extractionByInboxId = new Map<string, ExtractionRow>();

  for (const row of extractionRows) {
    const existing = extractionByInboxId.get(row.newsletter_inbox_id);
    if (!existing || new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
      extractionByInboxId.set(row.newsletter_inbox_id, row);
    }
  }

  return inboxRows
    .filter((row): row is InboxRow & { competitor_id: string } => typeof row.competitor_id === "string")
    .map((row) => {
      const extraction = extractionByInboxId.get(row.id);

      return {
        id: row.id,
        competitorId: row.competitor_id,
        subject: row.subject,
        fromName: row.from_name,
        fromEmail: row.from_email,
        receivedAt: row.received_at,
        campaignType: extraction?.campaign_type ?? null,
        mainMessage: extraction?.main_message ?? null,
        discountPercentage: extraction?.discount_percentage ?? null,
        couponCode: extraction?.coupon_code ?? null,
        freeShipping: Boolean(extraction?.free_shipping),
        productCategories: extraction?.product_categories ?? [],
        urgencySignals: toStringArray(extraction?.urgency_signals),
        strategyTakeaways: toStringArray(extraction?.strategy_takeaways),
        callsToAction: toStringArray(extraction?.calls_to_action),
      };
    });
}

function mapMetaAds(rows: MetaAdRow[]): CompetitorMetaAdSignal[] {
  return rows
    .filter((row): row is MetaAdRow & { competitor_id: string } => typeof row.competitor_id === "string")
    .map((row) => ({
      id: row.id,
      competitorId: row.competitor_id,
      pageName: row.page_name,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      isActive: row.is_active,
      ctaType: row.cta_type,
      body: firstString(row.ad_creative_bodies),
      headline: firstString(row.ad_creative_link_titles),
    }));
}

function mapInsights(rows: InsightRow[]): CompetitorInsightSignal[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    campaignType: row.campaign_type,
    mainMessage: row.main_message,
    positioningAngle: row.positioning_angle,
    strategicTakeaway: row.strategic_takeaway,
    priorityLevel: row.priority_level,
    impactArea: row.impact_area,
    productCategories: row.product_categories ?? [],
    createdAt: row.created_at,
    affectedCompetitors: row.affected_competitors ?? [],
  }));
}

export async function fetchCompetitorIntelligenceSnapshots(
  supabase: SupabaseClientLike,
  workspaceId: string,
  windowDays = 180,
): Promise<CompetitorIntelligenceSnapshot[]> {
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  const sinceIso = since.toISOString();

  const competitorsResult = await supabase
    .from<CompetitorRow>("competitors")
    .select("id, name, website, description, domains, is_monitored")
    .eq("workspace_id", workspaceId)
    .order("name")
    .limit(500);

  if (competitorsResult.error) {
    throw competitorsResult.error;
  }

  const competitors = competitorsResult.data ?? [];

  if (competitors.length === 0) {
    return [];
  }

  const inboxResult = await supabase
    .from<InboxRow>("newsletter_inbox")
    .select("id, competitor_id, subject, from_name, from_email, received_at")
    .eq("workspace_id", workspaceId)
    .eq("is_newsletter", true)
    .not("competitor_id", "is", null)
    .gte("received_at", sinceIso)
    .order("received_at", { ascending: false })
    .limit(500);

  if (inboxResult.error) {
    throw inboxResult.error;
  }

  const inboxRows = inboxResult.data ?? [];
  const newsletterIds = inboxRows.map((row) => row.id);

  let extractionRows: ExtractionRow[] = [];
  if (newsletterIds.length > 0) {
    const extractionsResult = await supabase
      .from<ExtractionRow>("newsletter_extractions")
      .select("newsletter_inbox_id, created_at, campaign_type, main_message, discount_percentage, coupon_code, free_shipping, product_categories, urgency_signals, strategy_takeaways, calls_to_action")
      .in("newsletter_inbox_id", newsletterIds)
      .order("created_at", { ascending: false });

    const resolvedExtractions = await extractionsResult.limit(1000);
    if (resolvedExtractions.error) {
      throw resolvedExtractions.error;
    }

    extractionRows = resolvedExtractions.data ?? [];
  }

  const [metaAdsResult, insightsResult] = await Promise.all([
    supabase
      .from<MetaAdRow>("meta_ads")
      .select("id, competitor_id, page_name, first_seen_at, last_seen_at, is_active, cta_type, ad_creative_bodies, ad_creative_link_titles")
      .eq("workspace_id", workspaceId)
      .not("competitor_id", "is", null)
      .or(`last_seen_at.gte.${sinceIso},first_seen_at.gte.${sinceIso}`)
      .limit(300),
    supabase
      .from<InsightRow>("insights")
      .select("id, title, campaign_type, main_message, positioning_angle, strategic_takeaway, priority_level, impact_area, product_categories, created_at, affected_competitors")
      .eq("workspace_id", workspaceId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  if (metaAdsResult.error) {
    throw metaAdsResult.error;
  }

  if (insightsResult.error) {
    throw insightsResult.error;
  }

  return buildCompetitorIntelligenceSnapshots({
    competitors: mapCompetitorRows(competitors),
    newsletters: mapNewsletterSignals(inboxRows, extractionRows),
    metaAds: mapMetaAds(metaAdsResult.data ?? []),
    insights: mapInsights(insightsResult.data ?? []),
  });
}
