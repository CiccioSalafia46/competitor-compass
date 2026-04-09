import { describe, expect, it } from "vitest";
import {
  getInsightPriorityLevel,
  parseRecommendedResponseSections,
} from "@/lib/insight-priority";

describe("getInsightPriorityLevel", () => {
  it("classifies evidence-rich high-confidence insights as high", () => {
    expect(
      getInsightPriorityLevel({
        confidence: 0.93,
        supporting_evidence: [{}, {}, {}, {}, {}],
        affected_competitors: ["A", "B", "C"],
        source_type: "cross_channel",
        impact_area: "conversion",
        why_it_matters: "Urgent pricing pressure creates margin risk.",
        strategic_implication: "If the team does nothing, share of voice and conversion rate may decline.",
      }),
    ).toBe("high");
  });

  it("keeps weak signals in low priority", () => {
    expect(
      getInsightPriorityLevel({
        confidence: 0.44,
        supporting_evidence: [{}],
        affected_competitors: [],
        why_it_matters: "Interesting but still early.",
      }),
    ).toBe("low");
  });
});

describe("parseRecommendedResponseSections", () => {
  it("extracts the structured response sections", () => {
    expect(
      parseRecommendedResponseSections(
        "Immediate: Refresh the hero offer\nNext 30 days: Run a challenger test\nMeasure: CTR, CVR, and revenue/session",
      ),
    ).toEqual({
      immediate: "Refresh the hero offer",
      next30Days: "Run a challenger test",
      measure: "CTR, CVR, and revenue/session",
    });
  });

  it("returns null when the response is unstructured", () => {
    expect(parseRecommendedResponseSections("Do a few experiments next month.")).toBeNull();
  });
});
