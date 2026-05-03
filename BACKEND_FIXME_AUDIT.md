# Backend FIXME Audit — Tracklyze

**Date:** 2026-05-03
**Total FIXME found:** 9 (all in `src/`, 0 in edge functions)

---

## Priority 1 — Feature UI non funzionanti

### B-001 — Save to playbook (button shows "Coming soon")
- **File:** `src/pages/Insights.tsx:350-352`
- **Category:** Persistenza
- **Impact:** User clicks "Save to playbook" → gets "Coming soon" toast. Feature promised in UI but not implemented.
- **Effort:** Large — requires new DB tables (playbooks, playbook_items), RLS policies, edge function or RPC, frontend mutation
- **Dependency:** New DB migration + new backend endpoint
- **Decision:** ⏰ **BACKLOG** — requires product decisions (playbook structure, sharing model, sidebar placement). Too large for this sprint.

### B-002 — Share with team (button shows "Coming soon")
- **File:** `src/pages/Insights.tsx:354-356`
- **Category:** API mancante
- **Impact:** User clicks "Share" → gets "Coming soon" toast. Feature promised in UI but not implemented.
- **Effort:** Large — requires shared_links table, token generation, public page route, expiry management
- **Dependency:** Product decision (public link vs team-only, expiry, read-only scope)
- **Decision:** ⏰ **BACKLOG** — requires product decisions about sharing model

### B-003 — Mark as actioned (button shows "Coming soon")
- **File:** `src/pages/Insights.tsx:358-360`
- **Category:** Persistenza
- **Impact:** User clicks "Mark as actioned" → gets "Coming soon" toast. Insights can't be triaged.
- **Effort:** Small — add `actioned_at`/`actioned_by` columns to `insights` table, simple RPC update, frontend mutation
- **Dependency:** DB migration only
- **Decision:** ✅ **FIX NOW** — small effort, high user value (triage workflow)

### B-004 — Executive summary AI-generated paragraph
- **File:** `src/pages/Insights.tsx:441`
- **Category:** API mancante
- **Impact:** Shows inline stats instead of narrative paragraph. Functional but not the intended UX.
- **Effort:** Medium — could add a `summary` field to generate-insights output, or a dedicated endpoint
- **Decision:** ⏰ **BACKLOG** — current inline stats are functional, not blocking

---

## Priority 2 — Cost guardrails

### B-005 — AI usage tracking + rate limiting
- **File:** No FIXME comment, but identified in previous audit
- **Category:** Cost tracking / Rate limiting
- **Impact:** Without rate limiting, a user spamming "Generate insights" causes unbounded AI costs
- **Effort:** Medium — new table, shared helper in edge functions, quota check before LLM calls
- **Decision:** ✅ **FIX NOW** — critical for launch

---

## Priority 3 — Data quality

### B-006 — Activity heatmap uses stub data
- **File:** `src/components/dashboard/ActivityHeatmap.tsx:69`
- **Category:** API mancante
- **Impact:** Heatmap shows "No activity data" or empty state because dashboard-snapshot doesn't expose per-day-per-competitor data
- **Effort:** Medium — needs aggregation query in dashboard-snapshot endpoint
- **Decision:** ⏰ **BACKLOG** — heatmap component is ready, needs backend data

### B-007 — Competitor pulse sparkline uses synthetic distribution
- **File:** `src/pages/Dashboard.tsx:282`
- **Category:** API mancante
- **Impact:** Sparklines show approximate distribution instead of real daily data. Visually correct but not data-accurate.
- **Effort:** Medium — same fix as B-006 (both need per-day data)
- **Decision:** ⏰ **BACKLOG** — coupled with B-006

---

## Priority 4 — Already resolved by prompt tuning

### B-008 — Tune AI prompt for title specificity
- **File:** `src/pages/Dashboard.tsx:167`
- **Category:** Prompt tuning
- **Decision:** ⏭️ **SKIP** — resolved in prompt tuning commit `c0c1c2b`

### B-009 — Tune AI prompt for insight dedup + causal framing
- **Files:** `src/pages/Insights.tsx:171`, `src/pages/Insights.tsx:174`
- **Category:** Prompt tuning
- **Decision:** ⏭️ **SKIP** — resolved in prompt tuning commit `c0c1c2b`

---

## Summary

| ID | Description | Priority | Decision |
|----|------------|----------|----------|
| B-001 | Save to playbook | 1 | ⏰ Backlog (Large, needs product decisions) |
| B-002 | Share with team | 1 | ⏰ Backlog (Large, needs product decisions) |
| B-003 | Mark as actioned | 1 | ✅ Fix now (Small) |
| B-004 | Executive summary paragraph | 1 | ⏰ Backlog (current stats functional) |
| B-005 | AI usage tracking + rate limiting | 2 | ✅ Fix now (Critical for launch) |
| B-006 | Heatmap real data | 3 | ⏰ Backlog |
| B-007 | Sparkline real data | 3 | ⏰ Backlog |
| B-008 | Prompt title specificity | 4 | ⏭️ Skip (resolved) |
| B-009 | Prompt dedup + causal framing | 4 | ⏭️ Skip (resolved) |

**Fixing now: B-003 + B-005**
