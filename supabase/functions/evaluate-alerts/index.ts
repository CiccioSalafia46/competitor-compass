import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, d?: any) => console.log(`[EVALUATE-ALERTS] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { workspaceId } = await req.json();
    if (!workspaceId) throw new Error("workspaceId required");

    // Rate limit: 5 evaluations per hour per user
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _user_id: userData.user.id,
      _workspace_id: workspaceId,
      _endpoint: "evaluate-alerts",
      _max_per_hour: 5,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit reached. You can evaluate alerts up to 5 times per hour." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get active rules
    const { data: rules } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ alerts: [], message: "No active rules" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log("Evaluating rules", { count: rules.length });

    // Fetch recent data for evaluation (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [recentExtractions, recentAds, recentNewsletters] = await Promise.all([
      supabase.from("newsletter_extractions").select("*").eq("workspace_id", workspaceId).gte("created_at", since),
      supabase.from("meta_ads").select("*").eq("workspace_id", workspaceId).gte("created_at", since),
      supabase.from("newsletter_inbox").select("*").eq("workspace_id", workspaceId).eq("is_newsletter", true).gte("created_at", since),
    ]);

    const triggeredAlerts: any[] = [];

    for (const rule of rules) {
      const config = rule.config as any;
      const ruleType = rule.rule_type;

      if (ruleType === "discount_threshold") {
        const threshold = config.threshold || 20;
        for (const ext of recentExtractions.data || []) {
          if ((ext as any).discount_percentage && (ext as any).discount_percentage >= threshold) {
            triggeredAlerts.push({
              workspace_id: workspaceId,
              alert_rule_id: rule.id,
              title: `Discount threshold reached: ${(ext as any).discount_percentage}% off`,
              description: `A competitor is offering ${(ext as any).discount_percentage}% discount (threshold: ${threshold}%). Campaign: ${(ext as any).campaign_type || "Unknown"}`,
              severity: (ext as any).discount_percentage >= 40 ? "high" : "medium",
              category: "promotions",
              metadata: { extraction_id: ext.id, discount: (ext as any).discount_percentage },
            });
          }
        }
      }

      if (ruleType === "keyword_match") {
        const keywords = (config.keywords || []) as string[];
        for (const nl of recentNewsletters.data || []) {
          const text = `${(nl as any).subject || ""} ${(nl as any).text_content || ""}`.toLowerCase();
          const matched = keywords.filter(k => text.includes(k.toLowerCase()));
          if (matched.length > 0) {
            triggeredAlerts.push({
              workspace_id: workspaceId,
              alert_rule_id: rule.id,
              title: `Keyword detected: ${matched.join(", ")}`,
              description: `Found keywords in "${(nl as any).subject}" from ${(nl as any).from_name || (nl as any).from_email}`,
              severity: "info",
              category: "content",
              metadata: { newsletter_id: nl.id, keywords: matched },
            });
          }
        }
      }

      if (ruleType === "new_competitor_ad") {
        const minAds = config.min_ads || 1;
        if ((recentAds.data || []).length >= minAds) {
          const pages = [...new Set((recentAds.data || []).map((a: any) => a.page_name).filter(Boolean))];
          triggeredAlerts.push({
            workspace_id: workspaceId,
            alert_rule_id: rule.id,
            title: `${(recentAds.data || []).length} new competitor ads detected`,
            description: `New ads from: ${pages.join(", ")}`,
            severity: (recentAds.data || []).length >= 5 ? "high" : "medium",
            category: "paid_ads",
            metadata: { ad_count: (recentAds.data || []).length, pages },
          });
        }
      }

      if (ruleType === "activity_spike") {
        const spikeThreshold = config.spike_multiplier || 2;
        // Compare last 24h vs previous week daily average
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: weekCount } = await supabase
          .from("newsletter_inbox").select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("is_newsletter", true)
          .gte("created_at", weekAgo).lt("created_at", since);
        
        const dailyAvg = (weekCount || 0) / 7;
        const todayCount = (recentNewsletters.data || []).length;
        if (dailyAvg > 0 && todayCount >= dailyAvg * spikeThreshold) {
          triggeredAlerts.push({
            workspace_id: workspaceId,
            alert_rule_id: rule.id,
            title: `Activity spike: ${todayCount} newsletters (${spikeThreshold}x normal)`,
            description: `Received ${todayCount} newsletters in 24h vs daily average of ${dailyAvg.toFixed(1)}`,
            severity: "high",
            category: "activity",
            metadata: { today: todayCount, daily_avg: dailyAvg },
          });
        }
      }

      if (ruleType === "new_category") {
        const knownCategories = (config.known_categories || []) as string[];
        for (const ext of recentExtractions.data || []) {
          const cats = (ext as any).product_categories || [];
          const newCats = cats.filter((c: string) => !knownCategories.includes(c));
          if (newCats.length > 0) {
            triggeredAlerts.push({
              workspace_id: workspaceId,
              alert_rule_id: rule.id,
              title: `New category detected: ${newCats.join(", ")}`,
              description: `Competitor is now promoting in categories not previously seen.`,
              severity: "medium",
              category: "product_focus",
              metadata: { new_categories: newCats },
            });
          }
        }
      }
    }

    // Deduplicate by title+rule combo (in-batch)
    const seen = new Set<string>();
    const dedupedAlerts = triggeredAlerts.filter(a => {
      const key = `${a.alert_rule_id}-${a.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Deduplicate against existing alerts from last 24h to prevent re-triggering
    const finalAlerts: any[] = [];
    for (const a of dedupedAlerts) {
      const { count } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("alert_rule_id", a.alert_rule_id)
        .eq("title", a.title)
        .gte("created_at", since);
      if ((count || 0) === 0) finalAlerts.push(a);
    }

    // Insert alerts
    if (finalAlerts.length > 0) {
      const { error } = await supabase.from("alerts").insert(finalAlerts);
      if (error) log("Insert error", { error: error.message });
    }

    log("Done", { triggered: finalAlerts.length });

    return new Response(JSON.stringify({ success: true, alerts: finalAlerts }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
