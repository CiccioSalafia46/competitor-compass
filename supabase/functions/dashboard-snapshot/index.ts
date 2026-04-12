import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { HttpError, assertWorkspaceMember, requireAuthenticatedUser } from "../_shared/auth.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";
import { PLAN_LIMITS, type PlanTier } from "../../../src/lib/plan-limits.ts";
import {
  buildDashboardDecisionModel,
  type DashboardAlert,
  type DashboardAnalytics,
  type DashboardInsight,
  type DashboardLimits,
  type DashboardStats,
  type DashboardUsageSummary,
} from "../../../src/lib/dashboard-decision-engine.ts";
import { normalizeInsights } from "../../../src/lib/insight-normalization.ts";

type WorkspaceRow = {
  id: string;
  name: string;
};

type BillingRow = {
  plan_key?: string | null;
};

type AnalyticsRpcResult = Partial<DashboardAnalytics> | null;

type CompetitorPreview = {
  id: string;
  name: string;
  website: string | null;
  is_monitored: boolean;
};

type InboxPreview = {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string | null;
  received_at: string | null;
  is_read: boolean;
  competitor_id: string | null;
};

function normalizePlanTier(planKey: string | null | undefined): PlanTier {
  if (planKey === "starter" || planKey === "premium" || planKey === "free") {
    return planKey;
  }

  return "free";
}

function normalizeAnalytics(result: AnalyticsRpcResult): DashboardAnalytics {
  const data = result ?? {};

  return {
    newslettersByWeek: data.newslettersByWeek ?? [],
    adsByWeek: data.adsByWeek ?? [],
    promotionFrequency: data.promotionFrequency ?? [],
    ctaDistribution: data.ctaDistribution ?? [],
    categoryDistribution: data.categoryDistribution ?? [],
    urgencyFrequency: data.urgencyFrequency ?? [],
    campaignTypes: data.campaignTypes ?? [],
    competitorActivity: data.competitorActivity ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const { user } = await requireAuthenticatedUser(supabase, req);
    const { workspaceId } = await req.json();

    if (!workspaceId || typeof workspaceId !== "string") {
      throw new HttpError(400, "workspaceId is required.");
    }

    await assertWorkspaceMember(supabase, user.id, workspaceId);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthIso = startOfMonth.toISOString();

    // Counts consolidated into a single RPC (was 8 separate COUNT queries).
    // Remaining parallel queries: workspace meta, billing, list previews,
    // usage-this-month counts, seats, and the analytics RPC.
    const [
      workspaceResult,
      billingResult,
      statsResult,
      recentInboxResult,
      competitorsResult,
      alertsResult,
      insightsResult,
      gmailConnectionResult,
      newsletterUsageCount,
      analysesUsageCount,
      seatsCount,
      analyticsResult,
    ] = await Promise.all([
      supabase.from("workspaces").select("id, name").eq("id", workspaceId).maybeSingle(),
      supabase.from("workspace_billing").select("plan_key").eq("workspace_id", workspaceId).maybeSingle(),
      supabase.rpc("get_dashboard_stats", { _workspace_id: workspaceId }),
      supabase
        .from("newsletter_inbox")
        .select("id, subject, from_name, from_email, received_at, is_read, competitor_id")
        .eq("workspace_id", workspaceId)
        .eq("is_newsletter", true)
        .is("deleted_at", null)
        .order("received_at", { ascending: false })
        .limit(8),
      supabase
        .from("competitors")
        .select("id, name, website, is_monitored")
        .eq("workspace_id", workspaceId)
        .eq("is_monitored", true)
        .is("deleted_at", null)
        .order("name")
        .limit(8),
      supabase
        .from("alerts")
        .select("id, workspace_id, title, description, severity, category, is_read, is_dismissed, created_at, competitor_id, alert_rule_id, metadata")
        .eq("workspace_id", workspaceId)
        .eq("is_read", false)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("insights")
        .select(
          "id, workspace_id, category, title, campaign_type, main_message, what_is_happening, why_it_matters, strategic_implication, strategic_takeaway, recommended_response, confidence, offer_discount_percentage, offer_coupon_code, offer_urgency, cta_primary, cta_analysis, product_categories, positioning_angle, supporting_evidence, affected_competitors, source_type, priority_level, impact_area, created_at",
        )
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("gmail_connections")
        .select("id")
        .eq("workspace_id", workspaceId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("newsletter_entries")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", startOfMonthIso),
      supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", startOfMonthIso),
      supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase.rpc("get_workspace_analytics", { _workspace_id: workspaceId }),
    ]);

    const firstError =
      workspaceResult.error ||
      billingResult.error ||
      statsResult.error ||
      recentInboxResult.error ||
      competitorsResult.error ||
      alertsResult.error ||
      insightsResult.error ||
      gmailConnectionResult.error ||
      newsletterUsageCount.error ||
      analysesUsageCount.error ||
      seatsCount.error;

    if (firstError) {
      throw firstError;
    }

    if (!workspaceResult.data) {
      throw new HttpError(404, "Workspace not found.");
    }

    if (analyticsResult.error) {
      console.error("[dashboard-snapshot] analytics RPC failed", analyticsResult.error);
    }

    const planTier = normalizePlanTier((billingResult.data as BillingRow | null)?.plan_key);
    const limits = PLAN_LIMITS[planTier] satisfies DashboardLimits;

    // Counts from the consolidated RPC (replaces 8 individual COUNT queries).
    type DashboardCounts = {
      newsletter_sources: number;
      competitors: number;
      analyses_completed: number;
      meta_ads_total: number;
      meta_ads_active: number;
      inbox_newsletters: number;
      insights: number;
      alerts_unread: number;
    };
    const counts = (statsResult.data ?? {}) as DashboardCounts;

    const stats: DashboardStats = {
      newsletters: counts.newsletter_sources ?? 0,
      competitors: counts.competitors ?? 0,
      completedAnalyses: counts.analyses_completed ?? 0,
      metaAds: counts.meta_ads_total ?? 0,
      activeAds: counts.meta_ads_active ?? 0,
      inboxItems: counts.inbox_newsletters ?? 0,
      insightCount: counts.insights ?? 0,
    };

    const usage: DashboardUsageSummary = {
      competitors: counts.competitors ?? 0,
      newsletters_this_month: newsletterUsageCount.count ?? 0,
      analyses_this_month: analysesUsageCount.count ?? 0,
      seats_used: seatsCount.count ?? 0,
    };

    const normalizedInsights = normalizeInsights(insightsResult.data) as DashboardInsight[];
    const analytics = normalizeAnalytics((analyticsResult.data as AnalyticsRpcResult) ?? null);
    const alerts = ((alertsResult.data ?? []) as DashboardAlert[]);

    const decisionModel = buildDashboardDecisionModel({
      stats,
      alerts,
      insights: normalizedInsights,
      analytics,
      gmailConnected: Boolean(gmailConnectionResult.data?.id),
      usage,
      limits,
    });

    return jsonResponse({
      workspaceId: workspaceResult.data.id,
      workspaceName: (workspaceResult.data as WorkspaceRow).name,
      gmailConnected: Boolean(gmailConnectionResult.data?.id),
      unreadAlertCount: counts.alerts_unread ?? 0,
      stats,
      usage,
      limits,
      recentInbox: ((recentInboxResult.data ?? []) as InboxPreview[]),
      competitors: ((competitorsResult.data ?? []) as CompetitorPreview[]),
      decisionModel,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    if (error instanceof HttpError) {
      return jsonResponse({ error: message }, error.status);
    }

    console.error("[dashboard-snapshot] unhandled error", error);
    return jsonResponse({ error: message }, 500);
  }
});
