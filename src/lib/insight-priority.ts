export type InsightPriorityLevel = "high" | "medium" | "low";
export type InsightImpactArea = "traffic" | "conversion" | "branding";

type InsightPriorityInput = {
  confidence?: number | null;
  supporting_evidence?: Array<unknown> | null;
  affected_competitors?: string[] | null;
  source_type?: string | null;
  what_is_happening?: string | null;
  why_it_matters?: string | null;
  strategic_implication?: string | null;
  strategic_takeaway?: string | null;
  recommended_response?: string | null;
  priority_level?: string | null;
  impact_area?: string | null;
};

export const INSIGHT_PRIORITY_ORDER: InsightPriorityLevel[] = [
  "high",
  "medium",
  "low",
];

export const INSIGHT_PRIORITY_LABELS: Record<InsightPriorityLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const INSIGHT_IMPACT_LABELS: Record<InsightImpactArea, string> = {
  traffic: "Traffic",
  conversion: "Conversion",
  branding: "Branding",
};

function normalizePriorityLevel(value: unknown): InsightPriorityLevel | null {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  if (value === "critical") {
    return "high";
  }

  if (value === "monitor") {
    return "low";
  }

  return null;
}

export function normalizeImpactArea(value: unknown): InsightImpactArea | null {
  if (value === "traffic" || value === "conversion" || value === "branding") {
    return value;
  }

  return null;
}

function containsAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

// Scoring weights — each unit represents roughly one "signal of confidence" in the priority output.
const SCORE_CONFIDENCE_WEIGHT = 100; // confidence is 0–1, so this maps it to 0–100
const SCORE_PER_EVIDENCE = 6;        // each supporting evidence piece adds weight
const SCORE_PER_COMPETITOR = 4;      // each affected competitor adds weight
const SCORE_CROSS_CHANNEL_BONUS = 5; // cross-channel insights are higher-fidelity signals
const SCORE_CONVERSION_IMPACT = 8;   // conversion signals are highest-value impact area
const SCORE_TRAFFIC_IMPACT = 4;      // traffic signals are medium-value impact area
const SCORE_URGENCY_KEYWORDS = 10;   // strong urgency language signals time-sensitive risk
const SCORE_STRATEGIC_KEYWORDS = 6;  // strategic language signals business-relevant insight
const THRESHOLD_HIGH = 92;           // calibrated to surface ~top 20% of insights as high priority
const THRESHOLD_MEDIUM = 64;         // calibrated to surface ~next 40% as medium priority

export function getInsightPriorityLevel(input: InsightPriorityInput): InsightPriorityLevel {
  const explicitPriority = normalizePriorityLevel(input.priority_level);
  if (explicitPriority) {
    return explicitPriority;
  }

  const impactArea = normalizeImpactArea(input.impact_area);
  const confidence = typeof input.confidence === "number" ? input.confidence : 0;
  const evidenceCount = Array.isArray(input.supporting_evidence) ? input.supporting_evidence.length : 0;
  const competitorCount = Array.isArray(input.affected_competitors) ? input.affected_competitors.length : 0;
  const text = [
    input.what_is_happening,
    input.why_it_matters,
    input.strategic_implication,
    input.strategic_takeaway,
    input.recommended_response,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  let score = confidence * SCORE_CONFIDENCE_WEIGHT + evidenceCount * SCORE_PER_EVIDENCE + competitorCount * SCORE_PER_COMPETITOR;

  if (input.source_type === "cross_channel") {
    score += SCORE_CROSS_CHANNEL_BONUS;
  }

  if (impactArea === "conversion") {
    score += SCORE_CONVERSION_IMPACT;
  } else if (impactArea === "traffic") {
    score += SCORE_TRAFFIC_IMPACT;
  }

  if (
    containsAny(text, [
      /\burgent\b/,
      /\bimmediate\b/,
      /\bimmediately\b/,
      /\brisk\b/,
      /\berosion\b/,
      /\bdecline\b/,
      /\bspike\b/,
      /\bdrop\b/,
      /\bpressure\b/,
      /\bshare loss\b/,
      /\bconversion loss\b/,
    ])
  ) {
    score += SCORE_URGENCY_KEYWORDS;
  }

  if (
    containsAny(text, [
      /\bshare\b/,
      /\bmargin\b/,
      /\bpipeline\b/,
      /\bconversion\b/,
      /\brevenue\b/,
      /\bpositioning\b/,
      /\bpricing\b/,
      /\btraffic\b/,
      /\bbrand\b/,
    ])
  ) {
    score += SCORE_STRATEGIC_KEYWORDS;
  }

  if (score >= THRESHOLD_HIGH) return "high";
  if (score >= THRESHOLD_MEDIUM) return "medium";
  return "low";
}

export function compareInsightPriority(
  left: InsightPriorityInput,
  right: InsightPriorityInput,
) {
  const leftPriority = getInsightPriorityLevel(left);
  const rightPriority = getInsightPriorityLevel(right);

  const priorityDelta =
    INSIGHT_PRIORITY_ORDER.indexOf(leftPriority) - INSIGHT_PRIORITY_ORDER.indexOf(rightPriority);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const leftConfidence = typeof left.confidence === "number" ? left.confidence : 0;
  const rightConfidence = typeof right.confidence === "number" ? right.confidence : 0;
  if (leftConfidence !== rightConfidence) {
    return rightConfidence - leftConfidence;
  }

  const leftEvidenceCount = Array.isArray(left.supporting_evidence) ? left.supporting_evidence.length : 0;
  const rightEvidenceCount = Array.isArray(right.supporting_evidence) ? right.supporting_evidence.length : 0;
  return rightEvidenceCount - leftEvidenceCount;
}

export function parseRecommendedResponseSections(response: string | null | undefined) {
  const raw = typeof response === "string" ? response.trim() : "";
  if (!raw) {
    return null;
  }

  const sections: Record<"immediate" | "next30Days" | "measure", string> = {
    immediate: "",
    next30Days: "",
    measure: "",
  };

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("Immediate:")) {
      sections.immediate = line.replace("Immediate:", "").trim();
      continue;
    }
    if (line.startsWith("Next 30 days:")) {
      sections.next30Days = line.replace("Next 30 days:", "").trim();
      continue;
    }
    if (line.startsWith("Measure:")) {
      sections.measure = line.replace("Measure:", "").trim();
    }
  }

  if (sections.immediate || sections.next30Days || sections.measure) {
    return sections;
  }

  return null;
}
