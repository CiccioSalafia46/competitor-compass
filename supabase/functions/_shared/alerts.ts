import { createClient } from "npm:@supabase/supabase-js@2.57.2";

type SupabaseClient = ReturnType<typeof createClient>;

export type AlertEvaluationSource =
  | "manual"
  | "scheduled"
  | "gmail_sync"
  | "newsletter_extraction"
  | "meta_ads";

export type AlertEvaluationTrigger = {
  workspaceId: string;
  source: AlertEvaluationSource;
  triggeredBy?: string | null;
  newsletterIds?: string[];
  extractionIds?: string[];
  metaAdIds?: string[];
};

type AlertRuleRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  rule_type: string;
  config: unknown;
  evaluation_mode: string;
  is_active: boolean;
};

type NewsletterRow = {
  id: string;
  workspace_id: string;
  competitor_id: string | null;
  subject: string | null;
  text_content: string | null;
  from_name: string | null;
  from_email: string | null;
  received_at: string | null;
  created_at: string;
  is_newsletter: boolean;
};

type ExtractionRow = {
  id: string;
  workspace_id: string;
  newsletter_inbox_id: string;
  discount_percentage: number | null;
  campaign_type: string | null;
  product_categories: string[] | null;
  main_message: string | null;
  coupon_code: string | null;
  created_at: string;
};

type MetaAdRow = {
  id: string;
  workspace_id: string;
  competitor_id: string | null;
  page_name: string | null;
  ad_creative_bodies: string[] | null;
  ad_creative_link_titles: string[] | null;
  first_seen_at: string | null;
  created_at: string;
};

type CompetitorRow = {
  id: string;
  name: string;
};

type AlertInsert = {
  workspace_id: string;
  alert_rule_id: string;
  recipient_user_id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  metadata: Record<string, unknown>;
  competitor_id: string | null;
};

type TriggerLogInsert = {
  workspace_id: string;
  alert_rule_id: string;
  recipient_user_id: string;
  competitor_id: string | null;
  event_source: string;
  event_type: string;
  status: "triggered" | "suppressed" | "failed";
  dedupe_key: string;
  title: string;
  message: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  alert_id?: string | null;
};

type AlertCandidate = {
  rule: AlertRuleRow;
  title: string;
  description: string;
  severity: string;
  category: string;
  competitorId: string | null;
  recipientUserId: string;
  metadata: Record<string, unknown>;
  dedupeKey: string;
  entityId: string | null;
  eventType: string;
  message: string;
};

export type EvaluatedAlert = {
  ruleId: string;
  title: string;
  status: "triggered" | "suppressed" | "failed";
  alertId?: string | null;
};

export type AlertEvaluationSummary = {
  created: number;
  suppressed: number;
  failed: number;
  evaluatedRules: number;
  alerts: EvaluatedAlert[];
};

type Actor = {
  key: string;
  label: string;
  competitorId: string | null;
};

type EdgeRuntimeGlobal = typeof globalThis & {
  EdgeRuntime?: {
    waitUntil: (promise: Promise<unknown>) => void;
  };
};

function log(step: string, details?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      module: "shared-alerts",
      step,
      ts: new Date().toISOString(),
      ...(details || {}),
    }),
  );
}

export function scheduleBackgroundAlertEvaluation(task: Promise<unknown>) {
  const edgeRuntime = globalThis as EdgeRuntimeGlobal;

  if (edgeRuntime.EdgeRuntime?.waitUntil) {
    edgeRuntime.EdgeRuntime.waitUntil(task);
    return;
  }

  void task.catch((error) => {
    console.error("[shared-alerts] background task failed", error);
  });
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function compactText(value: string, maxLength = 220) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function getRuleCooldownHours(rule: AlertRuleRow) {
  const config = asObject(rule.config);
  return Math.max(1, Math.min(168, getNumber(config.cooldown_hours) ?? 24));
}

function normalizeRuleType(ruleType: string) {
  switch (ruleType) {
    case "keyword_match":
      return "keyword_detection";
    default:
      return ruleType;
  }
}

function allowsTriggerMode(rule: AlertRuleRow, source: AlertEvaluationSource) {
  const mode = rule.evaluation_mode || "both";
  const expectedMode = source === "manual" || source === "scheduled" ? "scheduled" : "event";

  return mode === "both" || mode === expectedMode;
}

async function loadRules(supabase: SupabaseClient, workspaceId: string, source: AlertEvaluationSource) {
  const { data, error } = await supabase
    .from("alert_rules")
    .select("id, workspace_id, created_by, name, rule_type, config, evaluation_mode, is_active")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .returns<AlertRuleRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).filter((rule) => allowsTriggerMode(rule, source));
}

async function loadNewsletters(
  supabase: SupabaseClient,
  workspaceId: string,
  since: string,
  ids: string[],
  eventScoped: boolean,
) {
  if (eventScoped && ids.length === 0) {
    return [];
  }

  let query = supabase
    .from("newsletter_inbox")
    .select("id, workspace_id, competitor_id, subject, text_content, from_name, from_email, received_at, created_at, is_newsletter")
    .eq("workspace_id", workspaceId)
    .eq("is_newsletter", true);

  if (ids.length > 0) {
    query = query.in("id", ids);
  } else {
    query = query.gte("created_at", since);
  }

  const { data, error } = await query.returns<NewsletterRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function loadExtractions(
  supabase: SupabaseClient,
  workspaceId: string,
  since: string,
  ids: string[],
  eventScoped: boolean,
) {
  if (eventScoped && ids.length === 0) {
    return [];
  }

  let query = supabase
    .from("newsletter_extractions")
    .select("id, workspace_id, newsletter_inbox_id, discount_percentage, campaign_type, product_categories, main_message, coupon_code, created_at")
    .eq("workspace_id", workspaceId);

  if (ids.length > 0) {
    query = query.in("id", ids);
  } else {
    query = query.gte("created_at", since);
  }

  const { data, error } = await query.returns<ExtractionRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function loadMetaAds(
  supabase: SupabaseClient,
  workspaceId: string,
  since: string,
  ids: string[],
  eventScoped: boolean,
) {
  if (eventScoped && ids.length === 0) {
    return [];
  }

  let query = supabase
    .from("meta_ads")
    .select("id, workspace_id, competitor_id, page_name, ad_creative_bodies, ad_creative_link_titles, first_seen_at, created_at")
    .eq("workspace_id", workspaceId);

  if (ids.length > 0) {
    query = query.in("id", ids);
  } else {
    query = query.gte("created_at", since);
  }

  const { data, error } = await query.returns<MetaAdRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function loadCompetitors(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from("competitors")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .returns<CompetitorRow[]>();

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((competitor) => [competitor.id, competitor.name]));
}

function getNewsletterActor(newsletter: NewsletterRow, competitors: Map<string, string>): Actor {
  if (newsletter.competitor_id) {
    return {
      key: `competitor:${newsletter.competitor_id}`,
      label: competitors.get(newsletter.competitor_id) || newsletter.from_name || newsletter.from_email || "Tracked competitor",
      competitorId: newsletter.competitor_id,
    };
  }

  const label = newsletter.from_name || newsletter.from_email || "Unattributed sender";
  return {
    key: `sender:${label.toLowerCase()}`,
    label,
    competitorId: null,
  };
}

function getMetaAdActor(metaAd: MetaAdRow, competitors: Map<string, string>): Actor {
  if (metaAd.competitor_id) {
    return {
      key: `competitor:${metaAd.competitor_id}`,
      label: competitors.get(metaAd.competitor_id) || metaAd.page_name || "Tracked competitor",
      competitorId: metaAd.competitor_id,
    };
  }

  const label = metaAd.page_name || "Unattributed advertiser";
  return {
    key: `page:${label.toLowerCase()}`,
    label,
    competitorId: null,
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

async function hasTriggeredRecently(
  supabase: SupabaseClient,
  workspaceId: string,
  alertRuleId: string,
  recipientUserId: string,
  dedupeKey: string,
  since: string,
) {
  const { count, error } = await supabase
    .from("alert_trigger_logs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("alert_rule_id", alertRuleId)
    .eq("recipient_user_id", recipientUserId)
    .eq("dedupe_key", dedupeKey)
    .eq("status", "triggered")
    .gte("created_at", since);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

async function insertTriggerLog(supabase: SupabaseClient, payload: TriggerLogInsert) {
  const { error } = await supabase.from("alert_trigger_logs").insert(payload);
  if (error) {
    throw error;
  }
}

async function persistAlertCandidate(
  supabase: SupabaseClient,
  trigger: AlertEvaluationTrigger,
  candidate: AlertCandidate,
): Promise<EvaluatedAlert> {
  const cooldownSince = new Date(Date.now() - getRuleCooldownHours(candidate.rule) * 60 * 60 * 1000).toISOString();
  const duplicate = await hasTriggeredRecently(
    supabase,
    trigger.workspaceId,
    candidate.rule.id,
    candidate.recipientUserId,
    candidate.dedupeKey,
    cooldownSince,
  );

  const baseLog = {
    workspace_id: trigger.workspaceId,
    alert_rule_id: candidate.rule.id,
    recipient_user_id: candidate.recipientUserId,
    competitor_id: candidate.competitorId,
    event_source: trigger.source,
    event_type: candidate.eventType,
    dedupe_key: candidate.dedupeKey,
    title: candidate.title,
    message: candidate.message,
    entity_id: candidate.entityId,
    details: {
      ...candidate.metadata,
      rule_type: candidate.rule.rule_type,
      triggered_by: trigger.triggeredBy ?? null,
    },
  } satisfies Omit<TriggerLogInsert, "status">;

  if (duplicate) {
    await insertTriggerLog(supabase, {
      ...baseLog,
      status: "suppressed",
      alert_id: null,
    });

    return {
      ruleId: candidate.rule.id,
      title: candidate.title,
      status: "suppressed",
      alertId: null,
    };
  }

  try {
    const { data: alert, error } = await supabase
      .from("alerts")
      .insert({
        workspace_id: trigger.workspaceId,
        alert_rule_id: candidate.rule.id,
        recipient_user_id: candidate.recipientUserId,
        title: candidate.title,
        description: candidate.description,
        severity: candidate.severity,
        category: candidate.category,
        metadata: {
          ...candidate.metadata,
          source: trigger.source,
        },
        competitor_id: candidate.competitorId,
      } satisfies AlertInsert)
      .select("id")
      .single<{ id: string }>();

    if (error || !alert) {
      throw error || new Error("Unable to insert alert");
    }

    await insertTriggerLog(supabase, {
      ...baseLog,
      status: "triggered",
      alert_id: alert.id,
    });

    return {
      ruleId: candidate.rule.id,
      title: candidate.title,
      status: "triggered",
      alertId: alert.id,
    };
  } catch (error) {
    await insertTriggerLog(supabase, {
      ...baseLog,
      status: "failed",
      alert_id: null,
      message: error instanceof Error ? error.message : candidate.message,
      details: {
        ...baseLog.details,
        error: error instanceof Error ? error.message : "unknown_error",
      },
    });

    return {
      ruleId: candidate.rule.id,
      title: candidate.title,
      status: "failed",
      alertId: null,
    };
  }
}

function buildDiscountCandidates(
  rule: AlertRuleRow,
  extractions: ExtractionRow[],
  newslettersById: Map<string, NewsletterRow>,
  competitors: Map<string, string>,
): AlertCandidate[] {
  const threshold = getNumber(asObject(rule.config).threshold) ?? 30;

  return extractions
    .filter((extraction) => typeof extraction.discount_percentage === "number" && extraction.discount_percentage >= threshold)
    .map((extraction) => {
      const newsletter = newslettersById.get(extraction.newsletter_inbox_id);
      const actor = newsletter
        ? getNewsletterActor(newsletter, competitors)
        : { key: "unknown", label: "Tracked competitor", competitorId: null };
      const discount = extraction.discount_percentage ?? threshold;
      const campaignType = extraction.campaign_type || "campaign";
      const headline = `${actor.label} reached ${discount}% off`;

      return {
        rule,
        title: headline,
        description: compactText(
          `${actor.label} is running a ${campaignType.replace(/_/g, " ")} campaign with ${discount}% discount${extraction.coupon_code ? ` using code ${extraction.coupon_code}` : ""}.`,
        ),
        severity: discount >= 40 ? "high" : "medium",
        category: "promotions",
        competitorId: actor.competitorId,
        recipientUserId: rule.created_by,
        dedupeKey: `${rule.id}:discount:${extraction.id}`,
        entityId: extraction.id,
        eventType: "discount_threshold",
        message: `Discount threshold triggered at ${discount}% against a threshold of ${threshold}%.`,
        metadata: {
          extraction_id: extraction.id,
          newsletter_inbox_id: extraction.newsletter_inbox_id,
          discount_percentage: discount,
          threshold,
          campaign_type: extraction.campaign_type,
          main_message: extraction.main_message,
        },
      };
    });
}

function buildKeywordCandidates(
  rule: AlertRuleRow,
  newsletters: NewsletterRow[],
  competitors: Map<string, string>,
): AlertCandidate[] {
  const keywords = uniqueStrings(getStringArray(asObject(rule.config).keywords));
  if (keywords.length === 0) {
    return [];
  }

  return newsletters.flatMap((newsletter) => {
    const searchableText = normalizeText(
      `${newsletter.subject || ""} ${newsletter.text_content || ""} ${newsletter.from_name || ""} ${newsletter.from_email || ""}`,
    ).toLowerCase();
    const matched = keywords.filter((keyword) => searchableText.includes(keyword.toLowerCase()));
    if (matched.length === 0) {
      return [];
    }

    const actor = getNewsletterActor(newsletter, competitors);
    return [
      {
        rule,
        title: `${actor.label} mentioned ${matched.join(", ")}`,
        description: compactText(
          `${actor.label} triggered keyword detection in "${newsletter.subject || "Untitled newsletter"}".`,
        ),
        severity: matched.length >= 2 ? "medium" : "info",
        category: "content",
        competitorId: actor.competitorId,
        recipientUserId: rule.created_by,
        dedupeKey: `${rule.id}:keyword:${newsletter.id}:${matched.map((value) => value.toLowerCase()).sort().join("|")}`,
        entityId: newsletter.id,
        eventType: "keyword_detection",
        message: `Keyword detection matched ${matched.join(", ")}.`,
        metadata: {
          newsletter_id: newsletter.id,
          matched_keywords: matched,
          subject: newsletter.subject,
        },
      },
    ];
  });
}

function buildCampaignLaunchCandidates(
  rule: AlertRuleRow,
  extractions: ExtractionRow[],
  newslettersById: Map<string, NewsletterRow>,
  metaAds: MetaAdRow[],
  competitors: Map<string, string>,
): AlertCandidate[] {
  const config = asObject(rule.config);
  const allowedCampaignTypes = uniqueStrings(getStringArray(config.campaign_types));
  const dateBucket = new Date().toISOString().slice(0, 10);
  const extractionGroups = new Map<
    string,
    { extraction: ExtractionRow; actor: Actor; count: number; campaignType: string }
  >();

  for (const extraction of extractions) {
    const campaignType = extraction.campaign_type || "";
    if (!campaignType) {
      continue;
    }
    if (allowedCampaignTypes.length > 0 && !allowedCampaignTypes.includes(campaignType)) {
      continue;
    }

    const newsletter = newslettersById.get(extraction.newsletter_inbox_id);
    const actor = newsletter
      ? getNewsletterActor(newsletter, competitors)
      : { key: "unknown", label: "Tracked competitor", competitorId: null };
    const groupKey = `${actor.key}:${campaignType}`;
    const current = extractionGroups.get(groupKey);
    if (current) {
      current.count += 1;
      continue;
    }
    extractionGroups.set(groupKey, { extraction, actor, count: 1, campaignType });
  }

  const extractionCandidates = Array.from(extractionGroups.values()).map(({ extraction, actor, count, campaignType }) => ({
    rule,
    title: `New ${campaignType.replace(/_/g, " ")} campaign from ${actor.label}`,
    description: compactText(
      `${actor.label} launched a new ${campaignType.replace(/_/g, " ")} campaign${extraction.main_message ? ` with message "${extraction.main_message}"` : ""}${count > 1 ? ` across ${count} new newsletters.` : "."}`,
    ),
    severity: ["product_launch", "announcement", "event"].includes(campaignType) ? "high" : "medium",
    category: "campaigns",
    competitorId: actor.competitorId,
    recipientUserId: rule.created_by,
    dedupeKey: `${rule.id}:campaign:${actor.key}:${campaignType}:${dateBucket}`,
    entityId: extraction.id,
    eventType: "new_campaign_launch",
    message: `Detected a newly imported ${campaignType.replace(/_/g, " ")} campaign.`,
    metadata: {
      extraction_id: extraction.id,
      newsletter_inbox_id: extraction.newsletter_inbox_id,
      campaign_type: campaignType,
      main_message: extraction.main_message,
      product_categories: extraction.product_categories ?? [],
      matching_newsletter_count: count,
    },
  }));

  const adGroups = new Map<string, { metaAd: MetaAdRow; actor: Actor; count: number }>();
  for (const metaAd of metaAds) {
    const actor = getMetaAdActor(metaAd, competitors);
    const current = adGroups.get(actor.key);
    if (current) {
      current.count += 1;
      continue;
    }
    adGroups.set(actor.key, { metaAd, actor, count: 1 });
  }

  const adCandidates = Array.from(adGroups.values()).map(({ metaAd, actor, count }) => {
    const adHeadline =
      metaAd.ad_creative_link_titles?.find((value) => normalizeText(value).length > 0) ||
      metaAd.ad_creative_bodies?.find((value) => normalizeText(value).length > 0) ||
      "New paid campaign creative observed";

    return {
      rule,
      title: `New paid campaign from ${actor.label}`,
      description: compactText(
        `${actor.label} launched a new paid campaign${count > 1 ? ` with ${count} new creatives` : ""}. ${adHeadline}`,
      ),
      severity: "medium",
      category: "paid_ads",
      competitorId: actor.competitorId,
      recipientUserId: rule.created_by,
      dedupeKey: `${rule.id}:meta-ad:${actor.key}:${dateBucket}`,
      entityId: metaAd.id,
      eventType: "new_campaign_launch",
      message: "Detected a newly imported competitor ad.",
      metadata: {
        meta_ad_id: metaAd.id,
        page_name: metaAd.page_name,
        headline: adHeadline,
        matching_ad_count: count,
      },
    } satisfies AlertCandidate;
  });

  return [...extractionCandidates, ...adCandidates];
}

async function buildActivitySpikeCandidates(
  supabase: SupabaseClient,
  rule: AlertRuleRow,
  workspaceId: string,
  newsletters: NewsletterRow[],
  metaAds: MetaAdRow[],
  competitors: Map<string, string>,
) {
  const config = asObject(rule.config);
  const spikeMultiplier = getNumber(config.spike_multiplier) ?? 2;
  const minimumEvents = getNumber(config.minimum_events) ?? 3;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const eventScoped = trigger.source !== "manual" && trigger.source !== "scheduled";
  const baselineStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const currentCounts = new Map<string, { actor: Actor; count: number }>();

  for (const newsletter of newsletters) {
    const actor = getNewsletterActor(newsletter, competitors);
    if (!actor.competitorId) {
      continue;
    }
    const current = currentCounts.get(actor.key) || { actor, count: 0 };
    current.count += 1;
    currentCounts.set(actor.key, current);
  }

  for (const metaAd of metaAds) {
    const actor = getMetaAdActor(metaAd, competitors);
    if (!actor.competitorId) {
      continue;
    }
    const current = currentCounts.get(actor.key) || { actor, count: 0 };
    current.count += 1;
    currentCounts.set(actor.key, current);
  }

  const candidates: AlertCandidate[] = [];

  for (const { actor, count } of currentCounts.values()) {
    const [newsletterBaseline, metaAdBaseline] = await Promise.all([
      supabase
        .from("newsletter_inbox")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("competitor_id", actor.competitorId)
        .eq("is_newsletter", true)
        .gte("created_at", baselineStart)
        .lt("created_at", since),
      supabase
        .from("meta_ads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("competitor_id", actor.competitorId)
        .gte("created_at", baselineStart)
        .lt("created_at", since),
    ]);

    const previousCount = (newsletterBaseline.count ?? 0) + (metaAdBaseline.count ?? 0);
    const dailyAverage = previousCount / 7;
    const threshold = Math.max(minimumEvents, dailyAverage > 0 ? dailyAverage * spikeMultiplier : minimumEvents);

    if (count < threshold) {
      continue;
    }

    const roundedAverage = Number(dailyAverage.toFixed(1));
    candidates.push({
      rule,
      title: `Activity spike from ${actor.label}`,
      description: compactText(
        `${actor.label} generated ${count} tracked actions in the last 24 hours versus a baseline of ${roundedAverage} per day.`,
      ),
      severity: count >= threshold * 1.5 ? "high" : "medium",
      category: "activity",
      competitorId: actor.competitorId,
      recipientUserId: rule.created_by,
      dedupeKey: `${rule.id}:activity:${actor.competitorId}:${new Date().toISOString().slice(0, 10)}`,
      entityId: actor.competitorId,
      eventType: "activity_spike",
      message: `Observed ${count} actions against a baseline threshold of ${threshold.toFixed(1)}.`,
      metadata: {
        competitor_id: actor.competitorId,
        current_count: count,
        baseline_daily_average: roundedAverage,
        spike_multiplier: spikeMultiplier,
        minimum_events: minimumEvents,
      },
    });
  }

  return candidates;
}

function buildLegacyNewCompetitorAdCandidates(
  rule: AlertRuleRow,
  metaAds: MetaAdRow[],
  competitors: Map<string, string>,
) {
  const minAds = getNumber(asObject(rule.config).min_ads) ?? 1;
  if (metaAds.length < minAds) {
    return [];
  }

  const pages = uniqueStrings(
    metaAds.map((metaAd) => getMetaAdActor(metaAd, competitors).label),
  );

  return [
    {
      rule,
      title: `${metaAds.length} new competitor ads detected`,
      description: compactText(`New ads were imported from ${pages.join(", ")}.`),
      severity: metaAds.length >= 5 ? "high" : "medium",
      category: "paid_ads",
      competitorId: null,
      recipientUserId: rule.created_by,
      dedupeKey: `${rule.id}:legacy-ads:${new Date().toISOString().slice(0, 10)}:${metaAds.length}`,
      entityId: metaAds[0]?.id ?? null,
      eventType: "new_competitor_ad",
      message: `Detected ${metaAds.length} new ads in the evaluation window.`,
      metadata: {
        ad_count: metaAds.length,
        pages,
      },
    },
  ];
}

function buildLegacyNewCategoryCandidates(
  rule: AlertRuleRow,
  extractions: ExtractionRow[],
  newslettersById: Map<string, NewsletterRow>,
  competitors: Map<string, string>,
) {
  const knownCategories = uniqueStrings(getStringArray(asObject(rule.config).known_categories));

  return extractions.flatMap((extraction) => {
    const categories = uniqueStrings(extraction.product_categories ?? []);
    const newCategories = knownCategories.length > 0
      ? categories.filter((category) => !knownCategories.includes(category))
      : categories;

    if (newCategories.length === 0) {
      return [];
    }

    const newsletter = newslettersById.get(extraction.newsletter_inbox_id);
    const actor = newsletter
      ? getNewsletterActor(newsletter, competitors)
      : { key: "unknown", label: "Tracked competitor", competitorId: null };

    return [
      {
        rule,
        title: `New category detected for ${actor.label}`,
        description: compactText(`${actor.label} is now promoting ${newCategories.join(", ")}.`),
        severity: "medium",
        category: "product_focus",
        competitorId: actor.competitorId,
        recipientUserId: rule.created_by,
        dedupeKey: `${rule.id}:category:${extraction.id}:${newCategories.join("|")}`,
        entityId: extraction.id,
        eventType: "new_category",
        message: `Detected new categories: ${newCategories.join(", ")}.`,
        metadata: {
          extraction_id: extraction.id,
          new_categories: newCategories,
          known_categories: knownCategories,
        },
      },
    ];
  });
}

export async function evaluateAlertRules(
  supabase: SupabaseClient,
  trigger: AlertEvaluationTrigger,
): Promise<AlertEvaluationSummary> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const newsletterIds = Array.from(new Set(trigger.newsletterIds ?? []));
  const extractionIds = Array.from(new Set(trigger.extractionIds ?? []));
  const metaAdIds = Array.from(new Set(trigger.metaAdIds ?? []));

  const rules = await loadRules(supabase, trigger.workspaceId, trigger.source);
  if (rules.length === 0) {
    return {
      created: 0,
      suppressed: 0,
      failed: 0,
      evaluatedRules: 0,
      alerts: [],
    };
  }

  const [newsletters, extractions, metaAds, competitors] = await Promise.all([
    loadNewsletters(supabase, trigger.workspaceId, since, newsletterIds, eventScoped),
    loadExtractions(supabase, trigger.workspaceId, since, extractionIds, eventScoped),
    loadMetaAds(supabase, trigger.workspaceId, since, metaAdIds, eventScoped),
    loadCompetitors(supabase, trigger.workspaceId),
  ]);

  const newslettersById = new Map(newsletters.map((newsletter) => [newsletter.id, newsletter]));
  const candidates: AlertCandidate[] = [];

  for (const rule of rules) {
    switch (normalizeRuleType(rule.rule_type)) {
      case "discount_threshold":
        candidates.push(...buildDiscountCandidates(rule, extractions, newslettersById, competitors));
        break;
      case "keyword_detection":
        candidates.push(...buildKeywordCandidates(rule, newsletters, competitors));
        break;
      case "new_campaign_launch":
        candidates.push(...buildCampaignLaunchCandidates(rule, extractions, newslettersById, metaAds, competitors));
        break;
      case "activity_spike":
        candidates.push(...(await buildActivitySpikeCandidates(supabase, rule, trigger.workspaceId, newsletters, metaAds, competitors)));
        break;
      case "new_competitor_ad":
        candidates.push(...buildLegacyNewCompetitorAdCandidates(rule, metaAds, competitors));
        break;
      case "new_category":
        candidates.push(...buildLegacyNewCategoryCandidates(rule, extractions, newslettersById, competitors));
        break;
      default:
        break;
    }
  }

  const uniqueCandidates = Array.from(
    candidates.reduce((map, candidate) => {
      const key = `${candidate.rule.id}:${candidate.dedupeKey}`;
      if (!map.has(key)) {
        map.set(key, candidate);
      }
      return map;
    }, new Map<string, AlertCandidate>()),
  ).map(([, value]) => value);

  const results: EvaluatedAlert[] = [];

  for (const candidate of uniqueCandidates) {
    results.push(await persistAlertCandidate(supabase, trigger, candidate));
  }

  const now = new Date().toISOString();
  const evaluatedRuleIds = rules.map((rule) => rule.id);
  if (evaluatedRuleIds.length > 0) {
    const { error } = await supabase
      .from("alert_rules")
      .update({ last_evaluated_at: now })
      .in("id", evaluatedRuleIds);
    if (error) {
      log("last_evaluated_at_update_failed", { error: error.message });
    }
  }

  const triggeredRuleIds = Array.from(
    new Set(results.filter((result) => result.status === "triggered").map((result) => result.ruleId)),
  );
  if (triggeredRuleIds.length > 0) {
    const { error } = await supabase
      .from("alert_rules")
      .update({ last_triggered_at: now })
      .in("id", triggeredRuleIds);
    if (error) {
      log("last_triggered_at_update_failed", { error: error.message });
    }
  }

  return {
    created: results.filter((result) => result.status === "triggered").length,
    suppressed: results.filter((result) => result.status === "suppressed").length,
    failed: results.filter((result) => result.status === "failed").length,
    evaluatedRules: rules.length,
    alerts: results,
  };
}
