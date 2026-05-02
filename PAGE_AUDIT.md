# PAGE_AUDIT.md — Visual QA Audit

## SUMMARY

| Severity | Count |
|----------|-------|
| Critical | 4 |
| High | 18 |
| Medium | 32 |
| Low | 14 |
| **Total** | **68** |

### Pages with most issues (desc)
1. Reports — 22 issues
2. Dashboard — 16 issues
3. Insights — 8 issues
4. NewsletterInbox — 7 issues
5. Competitors — 6 issues
6. Alerts — 5 issues
7. MetaAds — 3 issues
8. SystemHealthPanel — 5 issues (shared component)

### Top 10 Recurring Patterns (fix once → fix everywhere)

1. **Non-standard spacing values** (p-5, gap-5, py-5, mt-2.5, gap-0.5) — 19 instances across all pages
2. **Hardcoded English strings** — 16 instances needing i18n keys
3. **Missing focus-visible states** on interactive elements — 9 instances
4. **Badge sizing inconsistency** (text-[10px] vs text-caption vs text-xs) — 8 instances
5. **Tracking/letter-spacing inconsistency** in eyebrows (tracking-[0.08em] vs tracking-[0.12em] vs tracking-[0.16em] vs tracking-wider) — 6 instances
6. **Priority badge "low" colors differ** (gray in one context, green/purple in another) — 4 instances
7. **Sidebar count badges missing tabular-nums** — 4 instances
8. **Icon sizes inconsistent** in same context (h-3 vs h-3.5 vs h-4 vs h-5) — 8 instances
9. **Card surface pancake** (bg-card nested inside bg-card) — 3 instances
10. **Dark mode opacity inconsistency** (different opacity strategies for same semantic) — 5 instances

---

## ISSUES BY PAGE

---

### REPORTS (22 issues)

---

P-001
Categoria: Badge
Severity: High
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 1109-1118
Descrizione: Archive status badge uses `text-[10px] py-0` — custom non-standard size with zero vertical padding
Fix: Standardize to `text-xs font-medium px-2 py-0.5 rounded-md`
Pattern ricorrente: SI — all badges across product

P-002
Categoria: Badge
Severity: High
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 819-825 vs 870-876
Descrizione: Priority badge "low" is gray (bg-muted text-muted-foreground) in Insights section but green (bg-emerald-400/15 text-emerald-600) in Actions section
Fix: Standardize "low" to consistent color across both sections (violet/primary since it's the brand)
Pattern ricorrente: SI — same inconsistency in Dashboard ActionQueue

P-003
Categoria: Spaziatura
Severity: High
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 629, 633
Descrizione: Executive Brief columns use `py-5` (20px) — not on scale
Fix: Change to `py-4` (16px) or `py-6` (24px)
Pattern ricorrente: SI

P-004
Categoria: Spaziatura
Severity: Medium
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 639
Descrizione: Metadata row uses `gap-x-5 gap-y-1 py-2.5` — three off-scale values
Fix: Change to `gap-x-4 gap-y-2 py-2` or `gap-x-6 gap-y-2 py-3`
Pattern ricorrente: SI

P-005
Categoria: Spaziatura
Severity: Medium
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 419
Descrizione: Builder dialog grid uses `gap-5` (20px) — off scale
Fix: Change to `gap-4` or `gap-6`
Pattern ricorrente: SI — gap-5 used in Dashboard too

P-006
Categoria: Spaziatura
Severity: Medium
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 1070
Descrizione: Archive filter container `gap-0.5 p-0.5` — cramped, off scale
Fix: Change to `gap-1 p-1`
Pattern ricorrente: NO

P-007
Categoria: Tipografia
Severity: Medium
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 630 vs 752 vs 820
Descrizione: Same semantic role (eyebrow label) uses 3 different tracking values: `tracking-[0.16em]`, `tracking-[0.12em]`, `tracking-wide`
Fix: Standardize all eyebrows to `tracking-wider` (Tailwind built-in)
Pattern ricorrente: SI — across all pages

P-008
Categoria: Superfici
Severity: High
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 687
Descrizione: Metric cards use `bg-card` nested inside section that also has `bg-card` — pancake white effect
Fix: Change metric cards to `bg-muted/30` or `bg-background` to create depth
Pattern ricorrente: SI — metric cards in Competitors too

P-009
Categoria: Superfici
Severity: Medium
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 620
Descrizione: Executive Brief gradient `from-primary/[0.04]` is barely visible — unclear visual hierarchy
Fix: Increase to `from-primary/[0.06]` light, ensure dark mode variant `dark:from-primary/[0.08]`
Pattern ricorrente: NO

P-010
Categoria: Stati
Severity: High
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 1078-1090
Descrizione: Archive filter buttons have no `:focus-visible` state — keyboard users can't see selection
Fix: Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`
Pattern ricorrente: SI — custom toggle buttons across pages

P-011
Categoria: Stati
Severity: High
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 1095-1134
Descrizione: Archive list button rows have no focus-visible styling
Fix: Add `focus-visible:ring-2 focus-visible:ring-ring`
Pattern ricorrente: SI — all list rows with button

P-012
Categoria: i18n
Severity: High
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 1018
Descrizione: "Generate new" is hardcoded English
Fix: Use `t("buttons.generateNew")`
Pattern ricorrente: SI

P-013
Categoria: i18n
Severity: High
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 1130
Descrizione: "Retry" button is hardcoded English
Fix: Use `t("buttons.retry")`
Pattern ricorrente: NO

P-014
Categoria: i18n
Severity: High
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 1049-1051
Descrizione: "No reports generated yet" + description are hardcoded English
Fix: Use t() keys
Pattern ricorrente: SI — empty states

P-015
Categoria: i18n
Severity: Medium
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 1007
Descrizione: "· {count} generated" is hardcoded English
Fix: Use `t("header.generatedCount", { count })`
Pattern ricorrente: NO

P-016
Categoria: i18n
Severity: Medium
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 1073-1075
Descrizione: Archive filter labels "All", "Completed", "Failed" are hardcoded
Fix: Use `t("archive.filterAll")` etc.
Pattern ricorrente: NO

P-017
Categoria: Dark mode
Severity: Medium
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 620
Descrizione: Executive Brief gradient has no dark mode override
Fix: Add explicit dark: variant
Pattern ricorrente: NO

P-018
Categoria: Dark mode
Severity: Low
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 763
Descrizione: Table row hover `hover:bg-muted/20` may be invisible in dark
Fix: Increase to `hover:bg-muted/30`
Pattern ricorrente: NO

P-019
Categoria: Spaziatura
Severity: Low
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 177
Descrizione: Schedule dialog content uses `py-2` (8px) — too tight for form content
Fix: Change to `py-4`
Pattern ricorrente: NO

P-020
Categoria: Spaziatura
Severity: Low
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 1100
Descrizione: Archive rows use `gap-3` (12px) with h-10 buttons — acceptable but verify
Fix: Consider `gap-2` for tighter row or keep
Pattern ricorrente: NO

P-021
Categoria: Tipografia
Severity: Low
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 689
Descrizione: Metric value uses `font-bold` where standard says `font-semibold`
Fix: Change to `font-semibold`
Pattern ricorrente: SI — KPI values in Competitors

P-022
Categoria: Spaziatura
Severity: Low
Pagina: Reports
File: src/pages/Reports.tsx
Linea: 670
Descrizione: Section header uses `gap-3` with `px-6 py-4` — minor mismatch
Fix: Change to `gap-4`
Pattern ricorrente: NO

---

### DASHBOARD (16 issues)

---

P-023
Categoria: Spaziatura
Severity: Critical
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 381
Descrizione: Root container uses `space-y-5` (20px) — off scale, applies globally to all sections
Fix: Change to `space-y-4` (16px) or `space-y-6` (24px)
Pattern ricorrente: SI — same value at line 414, 652

P-024
Categoria: Spaziatura
Severity: High
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 414, 652
Descrizione: Desktop grid and brief columns use `gap-5` (20px) — off scale
Fix: Change to `gap-4` or `gap-6`
Pattern ricorrente: SI

P-025
Categoria: Tipografia
Severity: High
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 487 vs 654/660
Descrizione: Workspace eyebrow `text-caption font-medium uppercase tracking-[0.08em]` but brief section eyebrows use `text-[11px] font-semibold uppercase tracking-wider` — different class, weight, and tracking
Fix: Standardize all eyebrows to one pattern: `text-[11px] font-medium uppercase tracking-wider`
Pattern ricorrente: SI — different eyebrow styles across pages

P-026
Categoria: Stati
Severity: Critical
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 637-643
Descrizione: Pagination dots (button elements) have onClick but no visible focus state
Fix: Add `focus-visible:ring-2 focus-visible:ring-ring rounded-full`
Pattern ricorrente: NO

P-027
Categoria: i18n
Severity: High
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 545
Descrizione: "Health" is hardcoded English in KPI card eyebrow
Fix: Use `t("pulseHealth")`
Pattern ricorrente: NO

P-028
Categoria: Numeri
Severity: Medium
Pagina: Dashboard (Sidebar)
File: src/components/AppSidebar.tsx
Linea: 179
Descrizione: Sidebar count badge missing `tabular-nums` — numbers may shift on update
Fix: Add `tabular-nums` or `stat-value` class to count span
Pattern ricorrente: SI

P-029
Categoria: i18n
Severity: Medium
Pagina: Dashboard (Sidebar)
File: src/components/AppSidebar.tsx
Linea: 210
Descrizione: "Tracklyze" logo text is hardcoded
Fix: Could use i18n or leave as brand name (acceptable)
Pattern ricorrente: NO

P-030
Categoria: Spaziatura
Severity: Medium
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 778
Descrizione: SignalRow uses `min-h-[44px]` — arbitrary pixel value
Fix: Change to `min-h-11` (44px Tailwind equivalent) for consistency
Pattern ricorrente: NO

P-031
Categoria: Spaziatura
Severity: Medium
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 872
Descrizione: CompetitorPulseRow uses `min-h-[58px]` — not on 8px scale (should be 56 or 64)
Fix: Change to `min-h-14` (56px)
Pattern ricorrente: NO

P-032
Categoria: Icone
Severity: Medium
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 510 vs 517 vs 561
Descrizione: Same icon (RefreshCw) used at 3 different sizes: h-5, h-4, h-3 in similar contexts
Fix: Standardize RefreshCw to h-4 w-4 in button context, h-3.5 w-3.5 in compact
Pattern ricorrente: NO

P-033
Categoria: Dark mode
Severity: Medium
Pagina: SystemHealthPanel
File: src/components/SystemHealthPanel.tsx
Linea: 274-276
Descrizione: Different opacity strategy for healthy (`dark:bg-emerald-950/10`), warning (`bg-warning/5` no dark), error (`bg-destructive/5` no dark)
Fix: Add explicit dark: variants to warning and error: `dark:bg-warning/10`, `dark:bg-destructive/10`
Pattern ricorrente: NO

P-034
Categoria: Stati
Severity: Critical
Pagina: SystemHealthPanel
File: src/components/SystemHealthPanel.tsx
Linea: 279-308
Descrizione: Summary expand button completely missing `focus-visible` ring
Fix: Add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
Pattern ricorrente: SI

P-035
Categoria: Numeri
Severity: Low
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 839, 848
Descrizione: Competitor limit count displayed without tabular-nums
Fix: Wrap in `<span className="tabular-nums">`
Pattern ricorrente: NO

P-036
Categoria: Badge
Severity: Low
Pagina: Dashboard (Sidebar)
File: src/components/AppSidebar.tsx
Linea: 178 vs 183
Descrizione: Stat badge and premium badge use different height/padding strategies (implicit vs h-5 constraint)
Fix: Standardize both to explicit `h-5 px-1.5 py-0 text-caption`
Pattern ricorrente: NO

P-037
Categoria: Tipografia
Severity: Low
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 692
Descrizione: ActionQueue now uses `space-y-1` which creates 4px gap between tinted rows — may look cramped
Fix: Consider `space-y-0.5` or remove entirely (rows separate via background tint)
Pattern ricorrente: NO

P-038
Categoria: Stati
Severity: Critical
Pagina: Dashboard
File: src/pages/Dashboard.tsx
Linea: 812
Descrizione: Badge wrapped in button for limitReached click has no focus state
Fix: Wrap in proper button with focus ring
Pattern ricorrente: NO

---

### INSIGHTS (8 issues)

---

P-039
Categoria: i18n
Severity: High
Pagina: Insights
File: src/pages/Insights.tsx
Linea: 243-246, 261
Descrizione: "Immediate:", "Next 30 days:", "Measure:", "Positioning" are hardcoded English
Fix: Use t() keys for each
Pattern ricorrente: SI

P-040
Categoria: Spaziatura
Severity: Medium
Pagina: Insights
File: src/pages/Insights.tsx
Linea: 127, 131
Descrizione: `mt-1.5` (6px) and `gap-1` (4px) — borderline acceptable but inconsistent
Fix: Use `mt-2` and `gap-1.5`
Pattern ricorrente: NO

P-041
Categoria: Tipografia
Severity: Medium
Pagina: Insights
File: src/pages/Insights.tsx
Linea: 204 vs 232, 278
Descrizione: `space-y-4` in expanded view but `space-y-3` elsewhere — minor inconsistency
Fix: Standardize to `space-y-4`
Pattern ricorrente: NO

P-042
Categoria: Stati
Severity: Medium
Pagina: Insights
File: src/pages/Insights.tsx
Linea: 269-275
Descrizione: Collapse button has minimal hover state, no visible focus ring
Fix: Add focus-visible ring
Pattern ricorrente: SI

P-043
Categoria: Badge
Severity: Medium
Pagina: Insights
File: src/pages/Insights.tsx
Linea: 120
Descrizione: Badge uses `text-[10px]` — same non-standard custom size as Reports
Fix: Standardize to `text-xs`
Pattern ricorrente: SI

P-044
Categoria: Spaziatura
Severity: Low
Pagina: Insights
File: src/pages/Insights.tsx
Linea: 131
Descrizione: `gap-1` (4px) for badge container — slightly cramped
Fix: Change to `gap-1.5`
Pattern ricorrente: NO

P-045
Categoria: Stati
Severity: Low
Pagina: Insights
File: src/pages/Insights.tsx
Linea: 347-361
Descrizione: Action buttons (Copy, Bookmark, Share) need better hover states
Fix: Add background hover
Pattern ricorrente: NO

P-046
Categoria: Tipografia
Severity: Low
Pagina: Insights
File: src/pages/Insights.tsx
Linea: 128-129
Descrizione: Priority conditionally changes weight (font-semibold vs font-medium) — intentional but subtle
Fix: Keep (intentional hierarchy signal)
Pattern ricorrente: NO

---

### NEWSLETTER INBOX (7 issues)

---

P-047
Categoria: Spaziatura
Severity: Medium
Pagina: NewsletterInbox
File: src/pages/NewsletterInbox.tsx
Linea: 391
Descrizione: Stats bar uses `px-5` (20px) — off scale
Fix: Change to `px-4`
Pattern ricorrente: SI

P-048
Categoria: Spaziatura
Severity: Low
Pagina: NewsletterInbox
File: src/pages/NewsletterInbox.tsx
Linea: 580
Descrizione: Segmented control `gap-0.5` (2px) — off scale
Fix: Change to `gap-1`
Pattern ricorrente: NO

P-049
Categoria: Badge
Severity: Low
Pagina: NewsletterInbox
File: src/pages/NewsletterInbox.tsx
Linea: 423 vs 444
Descrizione: Missing `font-medium` on one badge variant vs present on another
Fix: Add consistent font-medium
Pattern ricorrente: NO

P-050
Categoria: Stati
Severity: Medium
Pagina: NewsletterInbox
File: src/pages/NewsletterInbox.tsx
Linea: 657-671
Descrizione: Star button missing focus ring
Fix: Add `focus-visible:ring-2 focus-visible:ring-ring`
Pattern ricorrente: SI

P-051
Categoria: i18n
Severity: Medium
Pagina: NewsletterInbox
File: src/pages/NewsletterInbox.tsx
Linea: 889, 901
Descrizione: "Close" and "No content available." are hardcoded English
Fix: Use t() keys
Pattern ricorrente: SI

P-052
Categoria: Tipografia
Severity: Low
Pagina: NewsletterInbox
File: src/pages/NewsletterInbox.tsx
Linea: 691-693
Descrizione: Sender name uses conditional font weights (font-semibold vs font-medium) — intentional for read/unread
Fix: Keep (intentional)
Pattern ricorrente: NO

P-053
Categoria: Dark mode
Severity: Low
Pagina: NewsletterInbox
File: src/pages/NewsletterInbox.tsx
Linea: 652
Descrizione: `dark:bg-primary/[0.06]` bracket notation — verify works in Tailwind JIT
Fix: Verify; if issue use `dark:bg-primary/5`
Pattern ricorrente: NO

---

### COMPETITORS (6 issues)

---

P-054
Categoria: Badge
Severity: Medium
Pagina: Competitors
File: src/pages/Competitors.tsx
Linea: 433 vs 649
Descrizione: Signal badge uses `text-caption font-semibold` but line 649 uses `text-[10px]`
Fix: Standardize to `text-xs font-medium`
Pattern ricorrente: SI

P-055
Categoria: Spaziatura
Severity: Medium
Pagina: Competitors
File: src/pages/Competitors.tsx
Linea: 454
Descrizione: `mt-2.5` (10px) — off scale
Fix: Change to `mt-2` or `mt-3`
Pattern ricorrente: NO

P-056
Categoria: Icone
Severity: Low
Pagina: Competitors
File: src/pages/Competitors.tsx
Linea: 451 vs 456-465
Descrizione: Delete icon h-3.5 but other context icons h-3 — minor inconsistency
Fix: Standardize to h-3.5 for all small inline icons
Pattern ricorrente: NO

P-057
Categoria: i18n
Severity: Medium
Pagina: Competitors
File: src/pages/Competitors.tsx
Linea: 1001
Descrizione: "AI Analysis" tab heading is hardcoded
Fix: Use t() key
Pattern ricorrente: SI

P-058
Categoria: Tipografia
Severity: Low
Pagina: Competitors
File: src/pages/Competitors.tsx
Linea: 726-727
Descrizione: KPI value uses `font-bold` — standard is `font-semibold`
Fix: Change to `font-semibold`
Pattern ricorrente: SI (same as P-021)

P-059
Categoria: Stati
Severity: Medium
Pagina: Competitors
File: src/pages/Competitors.tsx
Linea: 421
Descrizione: Competitor row button missing explicit focus ring
Fix: Add focus-visible:ring-2
Pattern ricorrente: SI

---

### ALERTS (5 issues)

---

P-060
Categoria: Tipografia
Severity: Medium
Pagina: Alerts
File: src/pages/Alerts.tsx
Linea: 1004
Descrizione: Uses `text-[12px]` instead of Tailwind `text-xs` (same value, but inconsistent notation)
Fix: Change to `text-xs`
Pattern ricorrente: NO

P-061
Categoria: i18n
Severity: Medium
Pagina: Alerts
File: src/pages/Alerts.tsx
Linea: 1004-1005
Descrizione: "Quick Presets" title and subtitle are hardcoded
Fix: Use t() keys
Pattern ricorrente: SI

P-062
Categoria: Stati
Severity: Medium
Pagina: Alerts
File: src/pages/Alerts.tsx
Linea: 499-509
Descrizione: Competitor toggle buttons missing focus-visible ring
Fix: Add focus-visible:ring
Pattern ricorrente: SI

P-063
Categoria: Numeri
Severity: Low
Pagina: Alerts
File: src/pages/Alerts.tsx
Linea: 1168
Descrizione: Log timestamp missing tabular-nums
Fix: Add tabular-nums class
Pattern ricorrente: NO

P-064
Categoria: Badge
Severity: Low
Pagina: Alerts
File: src/pages/Alerts.tsx
Linea: 962-963
Descrizione: Alert severity badge and competitor badge use different variant approaches
Fix: Standardize
Pattern ricorrente: NO

---

### META ADS (3 issues)

---

P-065
Categoria: i18n
Severity: Medium
Pagina: MetaAds
File: src/pages/MetaAds.tsx
Linea: 28, 40, 59
Descrizione: "Coming Soon", "Competitor ad tracking is coming", "You're on Premium..." all hardcoded English
Fix: Use t() keys
Pattern ricorrente: SI

P-066
Categoria: Badge
Severity: Low
Pagina: MetaAds
File: src/pages/MetaAds.tsx
Linea: 28
Descrizione: Badge uses `text-[10px] font-normal` — unique non-standard sizing
Fix: Standardize to `text-xs font-medium`
Pattern ricorrente: SI

P-067
Categoria: Spaziatura
Severity: Low
Pagina: MetaAds
File: src/pages/MetaAds.tsx
Linea: 48
Descrizione: Feature grid `gap-4` ✓ — correct, no issue
Fix: None needed
Pattern ricorrente: NO

P-068
Categoria: Tipografia
Severity: Low
Pagina: MetaAds
File: src/pages/MetaAds.tsx
Linea: 39
Descrizione: Hero title `text-xl` — should be `text-2xl` for hero context like other pages
Fix: Optional — keep as intentional "coming soon" reduced prominence
Pattern ricorrente: NO
