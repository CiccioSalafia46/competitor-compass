import {
  getInsightPriorityLevel,
  normalizeImpactArea,
  type InsightImpactArea,
  type InsightPriorityLevel,
} from "./insight-priority.ts";

export interface NormalizedInsightEvidence {
  label: string;
  detail: string;
  metric?: string;
  source?: string;
  competitor?: string;
  timeframe?: string;
}

export interface NormalizedInsight {
  id: string;
  workspace_id: string;
  category: string;
  title: string;
  campaign_type: string;
  main_message: string;
  what_is_happening: string;
  why_it_matters: string;
  strategic_implication: string;
  strategic_takeaway: string;
  recommended_response: string;
  confidence: number | null;
  offer_discount_percentage: number | null;
  offer_coupon_code: string | null;
  offer_urgency: string[];
  cta_primary: string | null;
  cta_analysis: string;
  product_categories: string[];
  positioning_angle: string;
  supporting_evidence: NormalizedInsightEvidence[];
  affected_competitors: string[];
  source_type: string;
  priority_level: InsightPriorityLevel;
  impact_area: InsightImpactArea;
  created_at: string;
  actioned_at: string | null;
  actioned_by: string | null;
}

type InsightLike = Omit<
  NormalizedInsight,
  | "priority_level"
  | "supporting_evidence"
  | "affected_competitors"
  | "offer_urgency"
  | "product_categories"
  | "impact_area"
> & {
  priority_level?: string | null;
  supporting_evidence?: unknown;
  affected_competitors?: unknown;
  offer_urgency?: unknown;
  product_categories?: unknown;
  impact_area?: string | null;
};

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeEvidenceList(value: unknown): NormalizedInsightEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const detail = typeof row.detail === "string" ? row.detail.trim() : "";

      if (!label || !detail) {
        return null;
      }

      return {
        label,
        detail,
        metric: typeof row.metric === "string" && row.metric.trim() ? row.metric.trim() : undefined,
        source: typeof row.source === "string" && row.source.trim() ? row.source.trim() : undefined,
        competitor:
          typeof row.competitor === "string" && row.competitor.trim() ? row.competitor.trim() : undefined,
        timeframe:
          typeof row.timeframe === "string" && row.timeframe.trim() ? row.timeframe.trim() : undefined,
      };
    })
    .filter((item): item is NormalizedInsightEvidence => Boolean(item));
}

function normalizeImpact(input: InsightLike): InsightImpactArea {
  const explicitImpact = normalizeImpactArea(input.impact_area);
  if (explicitImpact) {
    return explicitImpact;
  }

  if (input.category === "pricing" || input.category === "promotions" || input.category === "paid_ads") {
    return "conversion";
  }

  if (input.category === "email_strategy" || input.category === "cadence_frequency") {
    return "traffic";
  }

  return "branding";
}

export function normalizeInsightRecord(row: InsightLike): NormalizedInsight {
  const supportingEvidence = normalizeEvidenceList(row.supporting_evidence);
  const affectedCompetitors = normalizeStringList(row.affected_competitors);
  const offerUrgency = normalizeStringList(row.offer_urgency);
  const productCategories = normalizeStringList(row.product_categories);
  const impactArea = normalizeImpact(row);

  return {
    id: row.id,
    workspace_id: row.workspace_id,
    category: row.category,
    title: row.title,
    campaign_type:
      typeof row.campaign_type === "string" && row.campaign_type.trim() ? row.campaign_type.trim() : row.category,
    main_message:
      typeof row.main_message === "string" && row.main_message.trim() ? row.main_message.trim() : row.title,
    what_is_happening: row.what_is_happening,
    why_it_matters: row.why_it_matters,
    strategic_implication: row.strategic_implication,
    strategic_takeaway:
      typeof row.strategic_takeaway === "string" && row.strategic_takeaway.trim()
        ? row.strategic_takeaway.trim()
        : row.strategic_implication,
    recommended_response: row.recommended_response,
    confidence: typeof row.confidence === "number" ? row.confidence : null,
    offer_discount_percentage:
      typeof row.offer_discount_percentage === "number" ? row.offer_discount_percentage : null,
    offer_coupon_code:
      typeof row.offer_coupon_code === "string" && row.offer_coupon_code.trim()
        ? row.offer_coupon_code.trim()
        : null,
    offer_urgency: offerUrgency,
    cta_primary:
      typeof row.cta_primary === "string" && row.cta_primary.trim() ? row.cta_primary.trim() : null,
    cta_analysis:
      typeof row.cta_analysis === "string" && row.cta_analysis.trim()
        ? row.cta_analysis.trim()
        : row.why_it_matters,
    product_categories: productCategories,
    positioning_angle:
      typeof row.positioning_angle === "string" && row.positioning_angle.trim()
        ? row.positioning_angle.trim()
        : row.strategic_implication,
    supporting_evidence: supportingEvidence,
    affected_competitors: affectedCompetitors,
    source_type: row.source_type,
    priority_level: getInsightPriorityLevel({
      ...row,
      supporting_evidence: supportingEvidence,
      affected_competitors: affectedCompetitors,
      impact_area: impactArea,
      strategic_takeaway: row.strategic_takeaway,
    }),
    impact_area: impactArea,
    created_at: row.created_at,
    actioned_at: (row as Record<string, unknown>).actioned_at as string | null ?? null,
    actioned_by: (row as Record<string, unknown>).actioned_by as string | null ?? null,
  };
}

export function normalizeInsights(data: unknown): NormalizedInsight[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => normalizeInsightRecord(item as InsightLike));
}
