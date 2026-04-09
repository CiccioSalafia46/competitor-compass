import { normalizeInsights } from "../../../src/lib/insight-normalization.ts";
import {
  buildReportPayload,
  getDefaultRangeDays,
  getNextScheduledRun,
  isReportTemplateKey,
  type CustomReportConfig,
  type GeneratedReportPayload,
  type ReportAnalyticsData,
  type ReportAnalyticsSummary,
  type ReportBuilderContext,
  type ReportRunRecord,
  type ReportScheduleInput,
  type ReportScheduleRecord,
  type ReportTemplateKey,
} from "../../../src/lib/reports.ts";
import { fetchCompetitorIntelligenceSnapshots } from "./competitor-intelligence.ts";

type SupabaseQueryResult<T> = Promise<{ data: T[] | null; error: unknown }> | Promise<{ data: T | null; error: unknown }>;

type ChainableQuery<T> = Promise<{ data: T[] | null; error: unknown }> & {
  eq: (column: string, value: string | boolean | null) => ChainableQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => ChainableQuery<T>;
  limit: (value: number) => ChainableQuery<T>;
  lte: (column: string, value: string) => ChainableQuery<T>;
};

type SupabaseClientLike = {
  from: <T extends Record<string, unknown>>(table: string) => {
    select: (columns: string, options?: { count?: string; head?: boolean }) => ChainableQuery<T> & {
      maybeSingle: () => Promise<{ data: T | null; error: unknown }>;
      insert: (value: Record<string, unknown>) => {
        select: (columns?: string) => {
          maybeSingle: () => Promise<{ data: T | null; error: unknown }>;
        };
      };
      update: (value: Record<string, unknown>) => {
        eq: (column: string, value: string) => {
          select: (columns?: string) => {
            maybeSingle: () => Promise<{ data: T | null; error: unknown }>;
          };
        };
      };
      delete: () => {
        eq: (column: string, value: string) => Promise<{ error: unknown }>;
      };
    };
    insert: (value: Record<string, unknown>) => {
      select: (columns?: string) => {
        maybeSingle: () => Promise<{ data: T | null; error: unknown }>;
      };
    };
  };
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

type WorkspaceRow = {
  id: string;
  name: string;
};

type InsightRow = {
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
  offer_urgency: unknown;
  cta_primary: string | null;
  cta_analysis: string;
  product_categories: unknown;
  positioning_angle: string;
  supporting_evidence: unknown;
  affected_competitors: unknown;
  source_type: string;
  priority_level: string;
  impact_area: string;
  created_at: string;
};

type ReportScheduleRow = {
  id: string;
  name: string;
  template_key: string;
  frequency: string;
  day_of_week: number | null;
  hour_of_day: number;
  minute_of_hour: number;
  timezone: string;
  range_days: number;
  is_active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReportRunRow = {
  id: string;
  schedule_id: string | null;
  template_key: string;
  title: string;
  status: string;
  generated_at: string;
  created_at: string;
  error_message: string | null;
  payload: GeneratedReportPayload | null;
};

type AnalyticsRpcResult = Partial<ReportAnalyticsData> | null;

const EMPTY_SUMMARY: ReportAnalyticsSummary = {
  rangeDays: 7,
  totalNewslettersInRange: 0,
  totalAdsInRange: 0,
  totalInsightsInRange: 0,
  activeCompetitorsInRange: 0,
  totalCompetitors: 0,
  attributedNewslettersInRange: 0,
  unattributedNewslettersInRange: 0,
  promotionRate: 0,
  urgencyRate: 0,
  newsletterGrowthRate: 0,
  adGrowthRate: 0,
  averageDiscount: 0,
  maxDiscount: 0,
  freeShippingRate: 0,
  lastInboxActivity: null,
  lastAdActivity: null,
};

function normalizeRangeDays(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(value), 1), 180);
}

function normalizeAnalytics(result: AnalyticsRpcResult, rangeDays: number): ReportAnalyticsData {
  const data = result ?? {};

  return {
    summary: { ...EMPTY_SUMMARY, ...(data.summary ?? {}), rangeDays },
    weeklyActivity: data.weeklyActivity ?? [],
    promotionFrequency: data.promotionFrequency ?? [],
    ctaDistribution: data.ctaDistribution ?? [],
    categoryDistribution: data.categoryDistribution ?? [],
    urgencyFrequency: data.urgencyFrequency ?? [],
    campaignTypes: data.campaignTypes ?? [],
    shareOfVoice: data.shareOfVoice ?? [],
    discountDistribution: data.discountDistribution ?? [],
  };
}

export type { CustomReportConfig };
export { getDefaultRangeDays, getNextScheduledRun };

export function validateReportTemplateKey(value: unknown): ReportTemplateKey {
  if (typeof value === "string" && isReportTemplateKey(value)) {
    return value;
  }

  throw new Error("Invalid report template.");
}

export function mapReportScheduleRow(row: ReportScheduleRow): ReportScheduleRecord {
  const templateKey = validateReportTemplateKey(row.template_key);

  return {
    id: row.id,
    name: row.name,
    templateKey,
    frequency: row.frequency === "weekly" ? "weekly" : "daily",
    dayOfWeek: row.day_of_week,
    hourOfDay: row.hour_of_day,
    minuteOfHour: row.minute_of_hour,
    timezone: row.timezone,
    rangeDays: row.range_days,
    isActive: row.is_active,
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReportRunRow(row: ReportRunRow): ReportRunRecord {
  const templateKey = validateReportTemplateKey(row.template_key);

  return {
    id: row.id,
    scheduleId: row.schedule_id,
    templateKey,
    title: row.title,
    status: row.status === "failed" ? "failed" : "completed",
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    errorMessage: row.error_message,
    payload: row.payload ?? null,
  };
}

export function validateScheduleInput(input: Record<string, unknown>): ReportScheduleInput {
  const templateKey = validateReportTemplateKey(input.templateKey);
  const frequency = input.frequency === "weekly" ? "weekly" : "daily";
  const dayOfWeek =
    frequency === "weekly" && typeof input.dayOfWeek === "number"
      ? Math.min(Math.max(Math.round(input.dayOfWeek), 0), 6)
      : frequency === "weekly"
        ? 1
        : null;

  return {
    id: typeof input.id === "string" && input.id ? input.id : undefined,
    name:
      typeof input.name === "string" && input.name.trim()
        ? input.name.trim()
        : `${templateKey.replaceAll("_", " ")} report`,
    templateKey,
    frequency,
    dayOfWeek,
    hourOfDay:
      typeof input.hourOfDay === "number" && Number.isFinite(input.hourOfDay)
        ? Math.min(Math.max(Math.round(input.hourOfDay), 0), 23)
        : 9,
    minuteOfHour:
      typeof input.minuteOfHour === "number" && Number.isFinite(input.minuteOfHour)
        ? Math.min(Math.max(Math.round(input.minuteOfHour), 0), 59)
        : 0,
    timezone:
      typeof input.timezone === "string" && input.timezone.trim() ? input.timezone.trim() : "UTC",
    rangeDays: normalizeRangeDays(input.rangeDays, getDefaultRangeDays(templateKey)),
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
  };
}

export async function fetchReportContext(
  supabase: SupabaseClientLike,
  workspaceId: string,
  rangeDays: number,
): Promise<ReportBuilderContext> {
  const normalizedRangeDays = normalizeRangeDays(rangeDays, 7);

  const [workspaceResult, analyticsResult, insightsResult, competitorSnapshots] = await Promise.all([
    supabase.from<WorkspaceRow>("workspaces").select("id, name").eq("id", workspaceId).maybeSingle(),
    supabase.rpc("get_workspace_analytics", {
      _workspace_id: workspaceId,
      _range_days: normalizedRangeDays,
    }),
    supabase
      .from<InsightRow>("insights")
      .select(
        "id, workspace_id, category, title, campaign_type, main_message, what_is_happening, why_it_matters, strategic_implication, strategic_takeaway, recommended_response, confidence, offer_discount_percentage, offer_coupon_code, offer_urgency, cta_primary, cta_analysis, product_categories, positioning_angle, supporting_evidence, affected_competitors, source_type, priority_level, impact_area, created_at",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(150),
    fetchCompetitorIntelligenceSnapshots(supabase, workspaceId, normalizedRangeDays),
  ]);

  if (workspaceResult.error) {
    throw workspaceResult.error;
  }

  if (!workspaceResult.data) {
    throw new Error("Workspace not found.");
  }

  if (insightsResult.error) {
    throw insightsResult.error;
  }

  if (analyticsResult.error) {
    console.error("[reports] analytics RPC failed, falling back to empty analytics", analyticsResult.error);
  }

  return {
    workspaceId: workspaceResult.data.id,
    workspaceName: workspaceResult.data.name,
    generatedAt: new Date().toISOString(),
    rangeDays: normalizedRangeDays,
    analytics: normalizeAnalytics((analyticsResult.data as AnalyticsRpcResult) ?? null, normalizedRangeDays),
    insights: normalizeInsights((insightsResult.data ?? []) as InsightRow[]),
    competitorSnapshots,
  };
}

export async function insertReportRun(
  supabase: SupabaseClientLike,
  params: {
    workspaceId: string;
    scheduleId?: string | null;
    createdBy?: string | null;
    templateKey: ReportTemplateKey;
    rangeDays: number;
    payload?: GeneratedReportPayload | null;
    errorMessage?: string | null;
  },
): Promise<ReportRunRecord> {
  const title =
    params.payload?.title ??
    `${params.templateKey.replaceAll("_", " ")} · ${new Date().toLocaleDateString("en-US")}`;

  const insertResult = await supabase
    .from<ReportRunRow>("report_runs")
    .insert({
      workspace_id: params.workspaceId,
      schedule_id: params.scheduleId ?? null,
      created_by: params.createdBy ?? null,
      template_key: params.templateKey,
      title,
      status: params.payload ? "completed" : "failed",
      range_days: normalizeRangeDays(params.rangeDays, getDefaultRangeDays(params.templateKey)),
      generated_at: new Date().toISOString(),
      payload: params.payload ?? null,
      error_message: params.errorMessage ?? null,
    })
    .select("id, schedule_id, template_key, title, status, generated_at, created_at, error_message, payload")
    .maybeSingle();

  if (insertResult.error || !insertResult.data) {
    throw insertResult.error ?? new Error("Failed to persist report run.");
  }

  return mapReportRunRow(insertResult.data);
}

export async function generateReportRun(
  supabase: SupabaseClientLike,
  params: {
    workspaceId: string;
    templateKey: ReportTemplateKey;
    rangeDays?: number;
    createdBy?: string | null;
    scheduleId?: string | null;
    customConfig?: CustomReportConfig;
  },
): Promise<ReportRunRecord> {
  const rangeDays = normalizeRangeDays(params.rangeDays, getDefaultRangeDays(params.templateKey));

  try {
    const context = await fetchReportContext(supabase, params.workspaceId, rangeDays);
    const payload = buildReportPayload(context, params.templateKey, params.customConfig);
    return await insertReportRun(supabase, {
      workspaceId: params.workspaceId,
      createdBy: params.createdBy,
      scheduleId: params.scheduleId,
      templateKey: params.templateKey,
      rangeDays,
      payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed.";
    return await insertReportRun(supabase, {
      workspaceId: params.workspaceId,
      createdBy: params.createdBy,
      scheduleId: params.scheduleId,
      templateKey: params.templateKey,
      rangeDays,
      errorMessage: message,
    });
  }
}

export async function updateScheduleNextRun(
  supabase: SupabaseClientLike,
  schedule: ReportScheduleRecord,
  from = new Date(),
) {
  const nextRunAt = schedule.isActive
    ? getNextScheduledRun(
        {
          id: schedule.id,
          name: schedule.name,
          templateKey: schedule.templateKey,
          frequency: schedule.frequency,
          dayOfWeek: schedule.dayOfWeek,
          hourOfDay: schedule.hourOfDay,
          minuteOfHour: schedule.minuteOfHour,
          timezone: schedule.timezone,
          rangeDays: schedule.rangeDays,
          isActive: schedule.isActive,
        },
        from,
      )
    : null;

  const updateResult = await supabase
    .from<ReportScheduleRow>("report_schedules")
    .update({
      last_run_at: from.toISOString(),
      next_run_at: nextRunAt,
    })
    .eq("id", schedule.id)
    .select("id, name, template_key, frequency, day_of_week, hour_of_day, minute_of_hour, timezone, range_days, is_active, next_run_at, last_run_at, created_at, updated_at")
    .maybeSingle();

  if (updateResult.error || !updateResult.data) {
    throw updateResult.error ?? new Error("Failed to update report schedule.");
  }

  return mapReportScheduleRow(updateResult.data);
}
