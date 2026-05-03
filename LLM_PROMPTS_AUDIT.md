# LLM Prompts Audit — Tracklyze

**Date:** 2026-05-03
**Scope:** Supabase Edge Functions that call OpenAI

---

## Summary

| Function | LLM? | Model | Temp | Max Tokens | Validation | Retry |
|----------|-------|-------|------|------------|------------|-------|
| `generate-insights` | Yes | gpt-4.1 / gpt-4.1-mini | 0.25 | 6500 | None (parse only) | Heuristic fallback |
| `analyze-newsletter` | Yes | gpt-4.1 / gpt-4.1-mini | 0.2 | default | Tool schema | 3x retry with backoff |
| `analyze-meta-ad` | Yes | gpt-4.1 / gpt-4.1-mini | 0.3 | default | None (parse only) | No |
| `extract-newsletter-intel` | Yes | gpt-4.1 / gpt-4.1-mini | 0.2 | default | Tool schema | Heuristic fallback |
| `enqueue-newsletter-analysis` | No | — | — | — | — | — |
| `evaluate-alerts` | No | — | — | — | — | — |
| `competitor-intelligence` | No | — | — | — | — | — |
| `dashboard-snapshot` | No | — | — | — | — | — |
| `reports-center` | No | — | — | — | — | — |

**Key finding:** `reports-center` does NOT call an LLM — it builds weekly briefs from pre-computed `insights` rows. The redundancy in weekly reports originates from `generate-insights` producing repetitive content across its 24-field output schema.

---

## Shared AI Client

**File:** `supabase/functions/_shared/openai.ts`
- Default temperature: 0.2
- Default timeout: 90s
- Model fallback pattern: primary → fallback on model-related errors
- HTTP endpoint: OpenAI chat/completions

---

## Function 1: generate-insights

**File:** `supabase/functions/generate-insights/index.ts`
**LLM call:** Lines 1448-1516
**DB output:** `insights` table (24 fields), `usage_events`

### Current System Prompt (lines 1456-1463)

Already contains field differentiation rules:
- `title`: max 8 words, Subject+Verb+Object
- `why_it_matters`: strategic implication, not restatement
- `recommended_response`: imperative, time-bound, specific
- Deduplication rule: <50% content word overlap

### Problems

1. **24-field output schema is too wide** — fields like `what_is_happening`, `strategic_implication`, `strategic_takeaway`, `why_it_matters` have overlapping semantics. The LLM can't maintain distinction across 6+ narrative fields.
2. **No Zod validation** — output is JSON-parsed but not structurally validated. Redundant content passes through.
3. **No retry on quality failure** — only retries on parse failure, not on semantic redundancy.
4. **8-12 insights per call** — high count increases redundancy probability.

### Output Fields (all narrative, prone to overlap)

- `title`, `main_message`, `what_is_happening` — all describe the fact
- `why_it_matters`, `strategic_implication`, `strategic_takeaway` — all describe implications
- `recommended_response` — action (clear role)
- `cta_analysis`, `positioning_angle` — niche, often empty or repetitive

---

## Function 2: analyze-newsletter

**File:** `supabase/functions/_shared/newsletter-analysis.ts`
**LLM call:** Lines 361-641
**DB output:** `analyses` table

### Current System Prompt (lines 445-479)

Solid structure with:
- Confidence levels per finding
- Distinct sections (positioning, messaging, product_launches, pricing_signals, competitive_moves, recommendations)
- "Only include sections with actual findings"

### Problems

1. **`recommendations` array is free-form strings** — no structure for action vs rationale
2. **No overlap check between sections** — same finding can appear in `positioning` and `competitive_moves`
3. **Has retry logic (3x)** — but retries on parse failure, not semantic quality

---

## Function 3: analyze-meta-ad

**File:** `supabase/functions/analyze-meta-ad/index.ts`
**LLM call:** Lines 88-161
**DB output:** `meta_ad_analyses` table, `usage_events`

### Current System Prompt (line 116)

Very short — 1 sentence. No field differentiation rules at all.

### Problems

1. **No anti-redundancy rules** — `message_angle`, `offer_angle`, `strategy_takeaways` often overlap
2. **No validation** — raw JSON parse only
3. **No retry logic**
4. **Prompt lacks examples** — high variance in output quality

---

## Function 4: extract-newsletter-intel

**File:** `supabase/functions/extract-newsletter-intel/index.ts`
**LLM call:** Lines 523-677
**DB output:** `newsletter_extractions` table, `usage_events`

### Current System Prompt (lines 523-531)

Reasonable but minimal — extraction-focused, not analysis-focused.

### Problems

1. **No field differentiation rules** — `main_message` and `strategy_takeaways` can overlap
2. **Tool schema provides structure** — but no semantic validation
3. **Has heuristic fallback** — good resilience

---

## Root Cause Analysis

The redundancy problem originates primarily in **`generate-insights`**:
- 24-field schema with 6+ narrative fields that share semantics
- System prompt has rules but no enforcement (no Zod, no retry on quality)
- `reports-center` builds weekly briefs FROM these insights, so redundant insights cascade into redundant reports

**Fix priority:**
1. `generate-insights` — highest impact (feeds Dashboard + Insights page + Reports)
2. `analyze-meta-ad` — weakest prompt, easiest fix
3. `analyze-newsletter` — good foundation, needs tightening
4. `extract-newsletter-intel` — lowest priority (extraction, not synthesis)
