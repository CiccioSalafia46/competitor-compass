# FUNCTIONAL AUDIT — Tracklyze / Competitor Compass

**Date:** 2026-05-03
**Scope:** Frontend (React 18 + Vite), Hooks, Edge Functions (Supabase/Deno)
**Baseline:** Build OK (0 errors), Lint OK (0 errors, 3 warnings), Tests 94/94 pass

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 5 |
| Low | 7 |
| **Total** | **14** |

**Top issues to fix immediately:**
1. **F-001** — `openPortal()` dangling blank popup window on error
2. **F-002** — Gmail token persistence failure causes silent sync breakage

**Recurring pattern:** Several hooks silently swallow errors (log to console, no user feedback).

---

## HIGH

### F-001 — openPortal() leaves dangling blank window on error ✅ FIXED
- **Category:** Error Handling
- **File:** `src/hooks/useSubscription.tsx:127-142`
- **Description:** `openPortal()` opens `window.open("about:blank")` before calling `invokeEdgeFunction("customer-portal")`. If the edge function throws (network error, JWT expired, Stripe down), the exception propagates uncaught and the blank popup is never closed. Contrast with `checkout()` in the same file which wraps properly.
- **Repro:** Open billing page → click "Manage Subscription" with network disconnected
- **Impact:** User gets a blank stuck popup window + unhandled promise rejection
- **Fix:** Wrap `invokeEdgeFunction` call in try/catch, close `pendingWindow` in catch/finally

### F-002 — Gmail token persistence failure silently breaks next sync ✅ FIXED
- **Category:** Data Integrity
- **File:** `supabase/functions/gmail-sync/index.ts:201-207`
- **Description:** When Google token refresh succeeds but the DB update fails, the function logs the error and continues with the in-memory token. The current sync works, but the **next** sync will load the expired token from DB and fail with "Gmail access revoked".
- **Repro:** Trigger a sync during DB transient error → next sync fails
- **Impact:** User sees "Gmail disconnected" unexpectedly; requires re-auth
- **Fix:** Retry DB update 2-3 times or fail the sync operation explicitly

---

## MEDIUM

### F-003 — DarkModeToggle setTimeout without cleanup ✅ FIXED
- **Category:** Memory Leak
- **File:** `src/components/DarkModeToggle.tsx:25-29`
- **Description:** `setTimeout(() => setAnimate(false), 300)` is never cleared. If the component unmounts during the 300ms animation, `setAnimate` fires on unmounted component.
- **Impact:** React warning in console; theoretical memory leak
- **Fix:** Use a ref to store timeout ID, clear in useEffect cleanup

### F-004 — useUsage division by zero when limit is 0 ✅ FIXED
- **Category:** Edge Case
- **File:** `src/hooks/useUsage.tsx:95-99`
- **Description:** `getUsagePercent()` guards against `limit === -1` (unlimited) but not `limit === 0`. If a plan has a 0 limit for a metric, `usage[metric] / 0` returns `Infinity`.
- **Impact:** Progress bar shows 100% or renders broken
- **Fix:** Add `|| limit === 0` to the guard clause

### F-005 — lazyWithRetry has no permanent failure recovery ✅ FIXED
- **Category:** Routing
- **File:** `src/lib/lazyWithRetry.ts:28-36`
- **Description:** After retry + page reload, if the chunk still fails to load, the Promise rejects silently. The Suspense boundary shows `<PageLoader>` spinning forever — no error message, no recovery action.
- **Impact:** User stuck on infinite radar loader with no way to recover
- **Fix:** Add an ErrorBoundary with "Something went wrong — Reload" fallback

### F-006 — AuthRedirect error state has no escape route ✅ FIXED
- **Category:** Routing
- **File:** `src/components/AuthRedirect.tsx:22-34`
- **Description:** If workspace bootstrap fails, the error screen shows only a Retry button. If retry keeps failing, there's no link to sign out or go home.
- **Impact:** User trapped in error screen after OAuth callback
- **Fix:** Add a "Sign out" or "Go to login" fallback link

### F-007 — useMetaAdAnalysis errors silently swallowed ✅ FIXED
- **Category:** Error Handling
- **File:** `src/hooks/useMetaAds.tsx:121-154`
- **Description:** Supabase query errors are logged to console but never shown to the user. Component renders as if there's simply no data.
- **Impact:** User has no idea why Meta Ad analysis isn't showing
- **Fix:** Show toast notification on error like `useMetaAds()` does

---

## LOW

### F-008 — Dashboard brief navigation unguarded modulo
- **Category:** Edge Case
- **File:** `src/pages/Dashboard.tsx:347-352`
- **Description:** `handleBriefPrev/Next` do `% todayBriefs.length` which is `% 0` = NaN if array is empty. In practice, navigation UI is only rendered when `briefCount > 1`, and `onAnimationEnd` only fires when `briefCount > 1`, so this is unreachable. Still worth a defensive guard.
- **Fix:** Add `if (todayBriefs.length === 0) return;` at top of each handler

### F-009 — Newsletter pagination stale closure on rapid clicks
- **Category:** Race Condition
- **File:** `src/hooks/useNewsletterInbox.tsx:198-213`
- **Description:** `goToNextPage()` reads `items[items.length - 1]` from state. Rapid clicking during fetch could use stale items for cursor.
- **Impact:** Duplicate rows or wrong page on very fast pagination
- **Fix:** Disable pagination buttons while loading (already partially done via `loading` state)

### F-010 — RouteGuard/AdminGuard no loading timeout
- **Category:** Routing
- **Files:** `src/components/RouteGuard.tsx`, `src/components/admin/AdminGuard.tsx`
- **Description:** Loading states spin indefinitely if auth/roles/admin check hangs.
- **Fix:** Add timeout with "Taking longer than expected — Reload" message after 15s

### F-011 — customer-portal edge function generic 500 errors
- **Category:** Error Handling
- **File:** `supabase/functions/customer-portal/index.ts:49-52`
- **Description:** Stripe API errors (rate limit, invalid customer) caught by outer try/catch and returned as generic 500.
- **Fix:** Return appropriate status codes based on Stripe error type

### F-012 — useGmailConnection sync() errors not surfaced
- **Category:** Error Handling
- **File:** `src/hooks/useGmailConnection.tsx:87-99`
- **Description:** `sync()` doesn't catch errors — relies on callers to wrap in try/catch. The `finally` block resets `syncing`, but no error state is exposed.
- **Fix:** Expose `syncError` state or catch and toast internally

### F-013 — Missing runtime validation in edge functions
- **Category:** Security
- **Files:** Multiple edge functions (`fetch-meta-ads`, `create-checkout`, `gmail-sync`, etc.)
- **Description:** No Zod/runtime validation on `req.json()` bodies. TypeScript types are compile-time only. Supabase SDK handles type coercion, so practical risk is low.
- **Fix:** Add Zod schemas for input validation (recommended but not urgent)

### F-014 — Hidden CSV file input missing aria-label
- **Category:** Accessibility
- **File:** `src/pages/Competitors.tsx:342-351`
- **Description:** Hidden file input `<input type="file" className="hidden">` lacks aria-label. In practice, it's triggered by a visible button click, so screen readers interact with the button, not the input.
- **Fix:** Add `aria-label="Import competitors from CSV file"`

---

## What passed (no issues found)

| Area | Status |
|------|--------|
| DOMPurify sanitization on all dangerouslySetInnerHTML | PASS |
| target="_blank" with rel="noopener noreferrer" | PASS |
| No hardcoded secrets in frontend | PASS |
| No sensitive data in console.log | PASS |
| Environment variables centralized via env.ts | PASS |
| Stripe webhook signature verification | PASS |
| Stripe webhook idempotency (event_id dedup) | PASS |
| Gmail OAuth state parameter (HMAC + TTL) | PASS |
| Multi-tenant isolation (workspace_id on all queries) | PASS |
| RLS policies on all tables | PASS |
| Soft delete integrity | PASS |
| Supabase Realtime cleanup (useRealtimeTable) | PASS |
| AppLayout interval cleanup | PASS |
| 404 NotFound route | PASS |
| Route ordering (no shadowing) | PASS |
| All icon-only buttons have aria-label | PASS |
| All images have alt attributes | PASS |
| Dialog/AlertDialog focus trap (shadcn built-in) | PASS |
| All tests pass (94/94) | PASS |
| ESLint 0 errors | PASS |
| Build 0 errors | PASS |

---

## Build metrics

| Metric | Value |
|--------|-------|
| Build time | 9.5s |
| Total JS (gzip) | ~600 KB |
| Largest chunk | `generateCategoricalChart` (Recharts) — 365 KB / 97 KB gzip |
| CSS (gzip) | 22 KB |
| Tailwind warnings | 3 (ambiguous duration/ease classes) |
| ESLint warnings | 3 (homepage useEffect deps, intentional) |
| Test warnings | act() warnings in useOnboarding tests (cosmetic) |

---

## Pattern: silent error swallowing

Files affected: `useMetaAds.tsx`, `useGmailConnection.tsx`, `customer-portal/index.ts`

**Pattern:** Errors from API calls are caught and logged to `console.error()` but never surfaced to the user. Component renders "no data" state indistinguishable from "loading" or "empty".

**Systemic fix:** Standardize on `toast.error(getErrorMessage(error))` for user-facing API errors across all hooks.
