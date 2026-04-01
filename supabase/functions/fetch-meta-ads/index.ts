import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_AD_LIBRARY_API = "https://graph.facebook.com/v21.0/ads_archive";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[FETCH-META-ADS] ${step}${d}`);
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;
    logStep("User authenticated");

    const { workspaceId, competitorId, pageId, searchTerms, adType, limit } = await req.json();
    if (!workspaceId) throw new Error("workspaceId is required");

    const metaToken = Deno.env.get("META_ACCESS_TOKEN");
    if (!metaToken) {
      return new Response(
        JSON.stringify({ error: "META_ACCESS_TOKEN not configured. Add a Meta App access token to fetch ads." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: `Meta API error: ${resp.status}`, details: errBody }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiData = await resp.json();
    const ads = apiData.data || [];
    logStep("Fetched ads", { count: ads.length });

    let imported = 0;
    let skipped = 0;

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

      const { error: insertErr } = await supabase.from("meta_ads").insert({
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
      });

      if (insertErr) {
        logStep("Insert error", { error: insertErr.message, adId: ad.id });
      } else {
        imported++;
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

    logStep("Complete", { imported, skipped });

    return new Response(
      JSON.stringify({ success: true, imported, skipped, total: ads.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
