import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  HttpError,
  assertWorkspaceAnalyst,
  requireAuthenticatedUser,
} from "../_shared/auth.ts";
import {
  evaluateAlertRules,
  scheduleBackgroundAlertEvaluation,
} from "../_shared/alerts.ts";
import { corsHeaders, getErrorMessage, jsonResponse } from "../_shared/http.ts";

const META_AD_LIBRARY_API = "https://graph.facebook.com/v21.0/ads_archive";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(JSON.stringify({ fn: "fetch-meta-ads", step, ts: new Date().toISOString(), ...(details || {}) }));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth check
    const { user } = await requireAuthenticatedUser(supabase, req);
    const userId = user.id;
    logStep("User authenticated");

    const { workspaceId, competitorId, pageId, searchTerms, adType, limit } = await req.json();
    if (!workspaceId) throw new Error("workspaceId is required");
    await assertWorkspaceAnalyst(supabase, userId, workspaceId);

    // Rate limit: 10 fetches per hour per user
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _user_id: userId,
      _workspace_id: workspaceId,
      _endpoint: "fetch-meta-ads",
      _max_per_hour: 10,
    });
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. You can fetch ads up to 10 times per hour." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metaToken = Deno.env.get("META_ACCESS_TOKEN");
    if (!metaToken) {
      return jsonResponse({ error: "META_ACCESS_TOKEN not configured. Add a Meta App access token to fetch ads." }, 400);
    }

    // Build API params
    const params = new URLSearchParams({
      access_token: metaToken,
      ad_reached_countries: "US",
      ad_active_status: "ALL",
      fields: "id,ad_snapshot_url,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_descriptions,ad_creative_link_captions,ad_delivery_start_time,ad_delivery_stop_time,page_id,page_name,publisher_platforms,estimated_audience_size,spend,impressions,currency,languages,bylines",
      limit: String(limit || 25),
    });

    if (searchTerms) {
      params.set("search_terms", searchTerms);
    }
    if (pageId) {
      params.set("search_page_ids", pageId);
    }
    if (adType) {
      params.set("ad_type", adType);
    }

    logStep("Fetching from Meta Ad Library", { searchTerms, pageId });

    const apiUrl = `${META_AD_LIBRARY_API}?${params.toString()}`;
    const resp = await fetch(apiUrl);

    if (!resp.ok) {
      const errBody = await resp.text();
      logStep("Meta API error", { status: resp.status, body: errBody });
      return jsonResponse({ error: `Meta API error: ${resp.status}`, details: errBody }, resp.status);
    }

    const apiData = await resp.json();
    const ads = apiData.data || [];
    logStep("Fetched ads", { count: ads.length });

    let imported = 0;
    let skipped = 0;
    const importedMetaAdIds: string[] = [];

    // Find competitor association
    let resolvedCompetitorId = competitorId || null;
    if (!resolvedCompetitorId && pageId) {
      const { data: comp } = await supabase
        .from("competitors")
        .select("id")
        .eq("workspace_id", workspaceId)
        .contains("meta_page_ids", [pageId])
        .limit(1)
        .maybeSingle();
      if (comp) resolvedCompetitorId = comp.id;
    }

    for (const ad of ads) {
      // Dedup check
      if (ad.id) {
        const { data: existing } = await supabase
          .from("meta_ads")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("meta_ad_id", ad.id)
          .maybeSingle();

        if (existing) {
          // Update last_seen and active status
          const isActive = !ad.ad_delivery_stop_time;
          await supabase.from("meta_ads").update({
            is_active: isActive,
            last_seen_at: new Date().toISOString(),
            ad_delivery_stop_time: ad.ad_delivery_stop_time || null,
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id);
          skipped++;
          continue;
        }
      }

      const isActive = !ad.ad_delivery_stop_time;
      const spendRange = ad.spend ? { lower: ad.spend.lower_bound, upper: ad.spend.upper_bound } : {};
      const impressionsRange = ad.impressions ? { lower: ad.impressions.lower_bound, upper: ad.impressions.upper_bound } : {};
      const audienceSize = ad.estimated_audience_size ? { lower: ad.estimated_audience_size.lower_bound, upper: ad.estimated_audience_size.upper_bound } : {};

      // Determine media type from snapshot
      let mediaType = "unknown";
      if (ad.ad_creative_bodies?.length > 0 && !ad.ad_snapshot_url?.includes("video")) {
        mediaType = "image";
      }

      const { data: insertedAd, error: insertErr } = await supabase
        .from("meta_ads")
        .insert({
          workspace_id: workspaceId,
          competitor_id: resolvedCompetitorId,
          meta_ad_id: ad.id,
          page_id: ad.page_id,
          page_name: ad.page_name,
          ad_snapshot_url: ad.ad_snapshot_url,
          ad_creative_bodies: ad.ad_creative_bodies || [],
          ad_creative_link_titles: ad.ad_creative_link_titles || [],
          ad_creative_link_descriptions: ad.ad_creative_link_descriptions || [],
          ad_creative_link_captions: ad.ad_creative_link_captions || [],
          cta_type: null,
          ad_delivery_start_time: ad.ad_delivery_start_time || null,
          ad_delivery_stop_time: ad.ad_delivery_stop_time || null,
          is_active: isActive,
          publisher_platforms: ad.publisher_platforms || [],
          platforms: ad.publisher_platforms || [],
          estimated_audience_size: audienceSize,
          spend_range: spendRange,
          impressions_range: impressionsRange,
          currency: ad.currency || null,
          languages: ad.languages || [],
          media_type: mediaType,
          raw_data: ad,
          first_seen_at: ad.ad_delivery_start_time || new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .select("id")
        .single<{ id: string }>();

      if (insertErr || !insertedAd) {
        logStep("Insert error", { error: insertErr?.message || "unknown_error", adId: ad.id });
      } else {
        imported++;
        importedMetaAdIds.push(insertedAd.id);
      }
    }

    // Track usage
    if (imported > 0) {
      await supabase.from("usage_events").insert({
        workspace_id: workspaceId,
        event_type: "meta_ads_fetched",
        quantity: imported,
      });
    }

    if (importedMetaAdIds.length > 0) {
      scheduleBackgroundAlertEvaluation(
        evaluateAlertRules(supabase, {
          workspaceId,
          source: "meta_ads",
          triggeredBy: userId,
          metaAdIds: importedMetaAdIds,
        }),
      );
    }

    logStep("Complete", { imported, skipped });

    return jsonResponse({ success: true, imported, skipped, total: ads.length });
  } catch (err) {
    const msg = getErrorMessage(err);
    logStep("ERROR", { message: msg });
    if (err instanceof HttpError) {
      return jsonResponse({ error: msg }, err.status);
    }
    return jsonResponse({ error: "An internal error occurred. Please try again." }, 500);
  }
});
