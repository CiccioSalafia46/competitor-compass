# AUDIT_REPORT.md

Fase 1 - Discovery completa Tracklyze SaaS.

Data audit: 2026-05-01  
Scope: repository locale `c:\Users\franc\competitor-compass`  
Regola rispettata: nessun file di codice, schema o traduzione e stato modificato in questa fase. Questo file e l'unico output scritto.

## Metodo e limiti

Fatti osservati:
- Analisi statica di codice React/Vite, Supabase Edge Functions, migrations SQL, config Vercel/Vite/Tailwind/TypeScript/ESLint.
- Comandi eseguiti: `npm audit --json`, `npm outdated --json`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e`, Lighthouse locale sulla homepage, grep mirati su security/i18n/performance.
- Build, typecheck, lint e unit test sono stati eseguiti localmente.

Da verificare:
- Stato reale del database Supabase live, grants effettivi post-migration, backup Supabase, pg_stat_statements, environment di staging, config Supabase Auth lato dashboard, deploy functions correnti.
- Alcune findings RLS/RPC sono derivate da migrations SQL e semantica Postgres. Vanno confermate su DB live con query su `pg_policies`, `pg_proc.proacl`, `information_schema.role_routine_grants`.

## Riepilogo numerico

- CRITICAL: 2
- HIGH: 12
- MEDIUM: 46
- LOW: 28
- Opportunita / miglioramenti DX: 57

## IMMEDIATE ATTENTION

1. 🚨 IMMEDIATE ATTENTION - `public.soft_delete_newsletter_inbox(_id uuid, _user_id uuid)` e una RPC `SECURITY DEFINER` che si fida di `_user_id` passato dal caller. File: `supabase/migrations/20260408140000_soft_delete_retention.sql:37`, grant a `authenticated` in `:101`. Impatto: privilege escalation/IDOR su soft delete inbox, almeno same-workspace e potenzialmente cross-workspace in base agli ID noti.
2. 🚨 IMMEDIATE ATTENTION - `public.purge_soft_deleted_rows(...)` e una RPC `SECURITY DEFINER` distruttiva senza `REVOKE EXECUTE` osservato. File: `supabase/migrations/20260412030000_batch_purge_soft_deleted.sql:11`. Impatto: se il default EXECUTE a `PUBLIC` e attivo, un caller puo hard-delete righe soft-deleted oltre il perimetro previsto dal cron.

---

# 1.1 Inventario architetturale

## Stack rilevato

- Frontend: Vite 8, React 18.3, TypeScript 5.8, React Router 6, shadcn/ui + Radix UI, Tailwind 3, TanStack React Query 5, react-i18next.
- Backend: Supabase Postgres/Auth/RLS/Edge Functions Deno.
- Billing: Stripe via Edge Functions `create-checkout`, `customer-portal`, `check-subscription`, `stripe-webhook`.
- OAuth / provider esterni: Google Gmail OAuth, Meta Ad Library API, Stripe, OpenAI API.
- Testing: Vitest, Testing Library, Playwright.
- Hosting config: Vercel static Vite SPA with rewrites and security headers.

## Struttura e conteggio file

| Area | File |
|---|---:|
| `src/components` | 110 |
| `src/components/homepage` | 33 |
| `src/components/admin` | 3 |
| `src/components/ui` | 51 |
| `src/pages` | 37 |
| `src/hooks` | 29 |
| `src/lib` | 29 |
| `src/types` | 2 |
| `supabase/functions` | 29 file/cartelle rilevati |
| `supabase/migrations` | 43 |
| `tests` | 2 |
| `public/locales` | 85 JSON |

## Route React

Route pubbliche (`src/App.tsx:97-104`, `:139`):
- `/`
- `/auth`
- `/forgot-password`
- `/reset-password`
- `/onboarding`
- `/redirect`
- `/privacy`
- `/terms`
- `*`

Route autenticate sotto `AppLayout` (`src/App.tsx:105-125`):
- `/dashboard`
- `/inbox`, `/inbox/:id` con `requireVerified`
- `/newsletters`
- `/newsletters/new` con `minimumRole="analyst"` e `requireVerified`
- `/newsletters/:id` con `requireVerified`
- `/competitors` con `requireVerified`
- `/meta-ads`, `/meta-ads/compare` con `minimumRole="analyst"` e `requireVerified`
- `/insights`, `/weekly-briefing` con `minimumRole="analyst"` e `requireVerified`
- `/analytics`
- `/reports`, `/alerts`, `/analyses/:id` con `requireVerified`
- `/settings`
- `/settings/team`, `/settings/usage`, `/settings/billing` con `minimumRole="admin"`
- `/billing` redirect a `/settings/billing`

Route platform admin (`src/App.tsx:128-137`):
- `/admin`
- `/admin/users`
- `/admin/workspaces`
- `/admin/logs`
- `/admin/integrations`
- `/admin/issues`
- `/admin/secrets`
- `/admin/billing`
- `/admin/health`

## Edge Functions

Tutte le funzioni non-webhook hanno `verify_jwt = true` in `supabase/config.toml`. `stripe-webhook` ha `verify_jwt = false`, corretto per webhook Stripe se la signature viene verificata.

| Function | Endpoint | Trigger/metodo | Client DB | Auth/guard osservati | Shared imports | Note principali |
|---|---|---|---|---|---|---|
| `admin-data` | `/functions/v1/admin-data` | HTTP POST/OPTIONS | service_role | `requireAuthenticatedUser`, `assertPlatformAdmin`, `isPlatformAdmin` | `auth.ts`, `http.ts` | Buon check platform admin; azioni distruttive senza transazione DB globale. |
| `analyze-meta-ad` | `/functions/v1/analyze-meta-ad` | HTTP | service_role | authenticated, verified, workspace analyst, active subscription | `auth.ts`, `billing.ts`, `http.ts`, `openai.ts` | Rate limit per user; output JSON parziale; no org budget. |
| `analyze-newsletter` | `/functions/v1/analyze-newsletter` | HTTP | service_role | authenticated, verified, workspace analyst, active subscription | `auth.ts`, `billing.ts`, `http.ts`, `newsletter-analysis.ts` | Structured validation presente; prompt injection non eliminabile. |
| `check-subscription` | `/functions/v1/check-subscription` | HTTP | service_role | authenticated, workspace member | `auth.ts`, `stripe-billing.ts`, `http.ts` | Legge Stripe; status `past_due` trattato in modo diverso da `_shared/billing`. |
| `competitor-intelligence` | `/functions/v1/competitor-intelligence` | HTTP | service_role | authenticated, workspace member | `auth.ts`, `competitor-intelligence.ts`, `http.ts` | Workspace guard presente. |
| `create-checkout` | `/functions/v1/create-checkout` | HTTP | service_role | authenticated, verified, workspace admin | `auth.ts`, `app.ts`, `billing.ts`, `stripe-billing.ts`, `http.ts` | Price IDs server-side da env. |
| `customer-portal` | `/functions/v1/customer-portal` | HTTP | service_role | authenticated, verified, workspace admin | `auth.ts`, `app.ts`, `stripe-billing.ts`, `http.ts` | Customer letto da `workspace_billing`. |
| `dashboard-snapshot` | `/functions/v1/dashboard-snapshot` | HTTP | service_role | authenticated, workspace member | `auth.ts`, `http.ts` | Importa codice da `src/lib`, coupling e cold start risk. |
| `enqueue-newsletter-analysis` | `/functions/v1/enqueue-newsletter-analysis` | HTTP/background task | service_role | authenticated, verified, workspace analyst | `auth.ts`, `http.ts`, `newsletter-analysis.ts` | Usa background task; rate limit non evidente. |
| `evaluate-alerts` | `/functions/v1/evaluate-alerts` | HTTP/scheduled candidate | service_role | authenticated, workspace analyst | `auth.ts`, `alerts.ts`, `http.ts` | Nessun cron osservato in repo; da verificare trigger prod. |
| `extract-newsletter-intel` | `/functions/v1/extract-newsletter-intel` | HTTP | service_role | authenticated, verified, workspace analyst, active subscription | `auth.ts`, `billing.ts`, `alerts.ts`, `http.ts`, `openai.ts` | AI fallback euristico presente; org quota mancante. |
| `fetch-meta-ads` | `/functions/v1/fetch-meta-ads` | HTTP | service_role | authenticated, workspace analyst | `auth.ts`, `alerts.ts`, `http.ts` | `limit` client non cappato; `competitorId` non verificato contro workspace prima insert. |
| `generate-insights` | `/functions/v1/generate-insights` | HTTP | service_role | authenticated, verified, workspace analyst, active subscription | `auth.ts`, `billing.ts`, `http.ts`, `openai.ts` | Delete-before-insert su insights. |
| `generate-weekly-briefing` | `/functions/v1/generate-weekly-briefing` | HTTP | service_role | authenticated, verified, workspace analyst, active subscription | `auth.ts`, `billing.ts`, `http.ts`, `openai.ts` | Max tokens presente; quota org mancante. |
| `gmail-auth` | `/functions/v1/gmail-auth` | POST init/disconnect, GET callback | service_role | authenticated, workspace admin | `auth.ts`, `app.ts`, `http.ts` | State HMAC con TTL; token in chiaro in DB; no one-time state. |
| `gmail-sync` | `/functions/v1/gmail-sync` | HTTP | service_role | authenticated, workspace member | `auth.ts`, `alerts.ts`, `http.ts` | No rate limit/cap robusto; member puo syncare workspace connection. |
| `invite-member` | `/functions/v1/invite-member` | HTTP | service_role | authenticated, verified, workspace admin | `auth.ts`, `http.ts` | Existing user auto-add; invite token non governa accept. |
| `reports-center` | `/functions/v1/reports-center` | HTTP | service_role | authenticated, workspace member/analyst by action, verified | `auth.ts`, `billing.ts`, `http.ts`, `reports.ts` | Validazione custom report presente. |
| `stripe-webhook` | `/functions/v1/stripe-webhook` | Stripe webhook POST | service_role | Stripe signature | `stripe-billing.ts` | Signature ok; idempotency segna event prima del processing. |

## Schema database / RLS

Il parser statico ha rilevato 29 tabelle `public` con RLS abilitato. Nessuna tabella public rilevata senza RLS nelle migrations finali. Due tabelle hanno RLS senza policy per design service-side (`workspace_billing`, `platform_admins`), ma questo va confermato live.

| Tabella | RLS | Policy count | Gap rilevati | Severity |
|---|---:|---:|---|---|
| `alert_rules` | yes | 4 | Policy per analyst/member; owner update. | low |
| `alert_trigger_logs` | yes | 1 | Select only; insert service-side. | low |
| `alerts` | yes | 5 | Delete duplicato members/analysts; non critico. | low |
| `analyses` | yes | 3 | Analyst write, members read. | low |
| `audit_log` | yes | 2 | Insert client-side possibile per authenticated; valutare se audit debba essere server-only. | medium |
| `competitor_profiles` | yes | 2 | Admin all, members read. | low |
| `competitors` | yes | 4 | Tenant isolation ok via workspace membership. | low |
| `feature_flags` | yes | 1 | Deny all client. | info |
| `gmail_connections` | yes | 4 | Admin manage, members read. | low |
| `gmail_tokens` | yes | 4 | Deny all client, ma token plaintext a riposo. | high |
| `insights` | yes | 4 | Analyst write, members read. | low |
| `meta_ad_analyses` | yes | 4 | Analyst write, members read. | low |
| `meta_ads` | yes | 4 | Cross-tenant `competitor_id` referential gap. | high |
| `newsletter_entries` | yes | 3 | Analyst write/delete, members read. | low |
| `newsletter_extractions` | yes | 4 | Analyst write, members read. | low |
| `newsletter_inbox` | yes | 4 | Cross-tenant `competitor_id` referential gap; soft-delete RPC bypass. | critical |
| `platform_admins` | yes | 0 | Service-side only; confirm no client requirement. | info |
| `profiles` | yes | 3 | Own insert/update; workspace-member select. | low |
| `rate_limits` | yes | 1 | Deny all client; helper RPC needs revoke review. | medium |
| `report_runs` | yes | 1 | Members read; writes service-side. | low |
| `report_schedules` | yes | 4 | Analyst manage. | low |
| `stripe_webhook_events` | yes | 1 | Admins read own workspace; service writes. | low |
| `usage_events` | yes | 2 | Members insert/select; evaluate abuse of client-inserted usage. | medium |
| `user_roles` | yes | 3 | Admin insert/delete; workspace members select. | low |
| `weekly_briefings` | yes | 2 | Service role manage, members read. | low |
| `workspace_billing` | yes | 0 | Service-side only; no client reads. | info |
| `workspace_invitations` | yes | 1 | Admin all; invite accept model weak. | high |
| `workspace_members` | yes | 3 | Self-join hardening observed; owner delete blocked. | low |
| `workspaces` | yes | 4 | Auth insert, member select, owner update/delete. | low |

## Flussi OAuth e provider esterni

- Google Gmail: `gmail-auth` genera state HMAC e callback GET, scope Gmail read-only, token stored in `gmail_tokens`; `gmail-sync` usa/refresh token.
- Meta Ads: `fetch-meta-ads` chiama Graph API con `META_ACCESS_TOKEN`; non e stato osservato un OAuth per account Meta per workspace.
- Stripe: Checkout, Customer Portal, subscription check, webhook.
- OpenAI: Edge Functions AI usano `OPENAI_API_KEY` lato server tramite `_shared/openai.ts`.

## Punti cross-tenant teoricamente possibili

- RPC `soft_delete_newsletter_inbox(_id, _user_id)` con `_user_id` client-controlled.
- RPC `get_dashboard_stats(_workspace_id)` grant a `authenticated` senza membership check nella versione finale.
- RPC `purge_soft_deleted_rows(...)` distruttiva senza revoke osservato.
- `newsletter_inbox.competitor_id` e `meta_ads.competitor_id` non vincolati a competitor dello stesso workspace.
- `fetch-meta-ads` accetta `competitorId` dal client e lo inserisce senza verifica workspace specifica.
- Direct RPC helper `check_rate_limit(_user_id, ...)` si fida di `_user_id`.

---

# 1.2 Security audit - CRITICO

## 1.2.1 RLS

Findings principali:

| ID | Severity | File/linea | Descrizione | Fix proposto |
|---|---|---|---|---|
| C-01 | critical | `supabase/migrations/20260408140000_soft_delete_retention.sql:37`, `:101` | RPC `SECURITY DEFINER` `soft_delete_newsletter_inbox` prende `_user_id` dal caller e usa quel valore per autorizzare `can_manage_competitive_data`. | Nuova migration: cambiare firma a `(_id uuid)`, usare `auth.uid()`, revocare vecchia funzione da `PUBLIC/anon/authenticated`, grant solo alla nuova, test owner/member/other org. |
| C-02 | critical | `supabase/migrations/20260412030000_batch_purge_soft_deleted.sql:11`, `:90` | RPC `purge_soft_deleted_rows` hard-delete batch e viene invocata da cron; nessun `REVOKE EXECUTE` osservato. Default Postgres e execute a `PUBLIC` salvo revoke. | Revocare execute da `PUBLIC`, `anon`, `authenticated`; grant solo a `service_role`/owner cron; validare `_retention_days >= 30` e batch cap. |
| H-01 | high | `supabase/migrations/20260412040000_fix_dashboard_rpc_service_role.sql:14`, `:85` | `get_dashboard_stats(_workspace_id)` e grantato ad `authenticated`; la versione finale rimuove il membership check per permettere service role. Direct RPC puo esporre aggregati cross-tenant. | Ripristinare membership check per caller authenticated e bypass solo per service role, oppure revocare authenticated e usare solo Edge Function. |
| H-02 | high | `src/hooks/useNewsletterInbox.tsx:316`, `supabase/functions/fetch-meta-ads/index.ts:99` | `competitor_id` puo essere associato a record workspace senza composite FK workspace-aware. | Validare competitor workspace in Edge/UI e aggiungere vincoli composite `(workspace_id, competitor_id)` con migration pianificata. |
| H-10 | high | `supabase/migrations/20260401111835_753cf501-6458-496a-acbe-e9ce9187b223.sql:24`, `:61`, `:76` | Helper RPC `check_rate_limit`, `check_extraction_exists`, `check_ad_analysis_exists` sono `SECURITY DEFINER`; non ho osservato revoke espliciti. `check_rate_limit` accetta `_user_id`. | Revocare execute se server-only; sostituire `_user_id` con `auth.uid()` quando callable da client. |

Test concettuale piu importante:
- Owner stessa org: deve poter soft-delete inbox propria/org se ruolo lo consente.
- Member stessa org viewer: non deve poter passare `_user_id` di un admin per soft-delete.
- Utente altra org: non deve poter dedurre o modificare record tramite RPC con UUID noti.

## 1.2.2 Edge Functions authorization

Pattern positivi:
- Le function non-webhook usano `verify_jwt=true`.
- `requireAuthenticatedUser` valida il Bearer token con `supabase.auth.getUser(token)` (`supabase/functions/_shared/auth.ts:57`).
- Workspace role checks centralizzati in `_shared/auth.ts`.
- `admin-data` usa `assertPlatformAdmin`, non solo `is_authenticated`.
- `stripe-webhook` verifica `Stripe-Signature` con `constructEventAsync` (`supabase/functions/stripe-webhook/index.ts:127`).

Findings:

| ID | Severity | File/linea | Descrizione | Fix proposto |
|---|---|---|---|---|
| H-03 | high | `supabase/functions/gmail-auth/index.ts:214-226`, `supabase/functions/gmail-sync/index.ts:343-362` | Gmail access/refresh token sono salvati leggibili in DB. RLS li nega al client, ma service_role/admin compromise espone token OAuth. | Cifrare token applicativamente con chiave server/KMS, mantenere key version e rotazione; non esporre token via admin-data, solo health metadata. |
| H-04 | high | `supabase/functions/stripe-webhook/index.ts:61`, `:156-174` | L'evento Stripe viene inserito in `stripe_webhook_events` prima del processing. Se il processing fallisce, il retry Stripe vede duplicate e ritorna 200 senza aggiornare billing. | Idempotency con stato `processing/processed/failed`, oppure transazione DB/RPC atomica che segna processed solo dopo update billing. |
| H-05 | high | `supabase/functions/invite-member/index.ts:62-84`, `supabase/migrations/20260407120000_workspace_invitations.sql:52-100` | Existing user viene aggiunto direttamente al workspace; new user puo essere auto-accepted per email. Token invite non governa accettazione esplicita. | Flusso accept esplicito tokenizzato, expiry e one-time use; non auto-add senza consenso. |
| H-11 | high | `supabase/functions/gmail-sync/index.ts:318`, `:387`, `:444-452` | Gmail sync non mostra rate limit, non richiede `assertVerifiedUser`, e `maxResults` e controllato dal client senza cap evidente. | Rate limit per workspace/user, cap server-side, verified-user guard, eventuale admin/analyst guard per sync manuale. |
| H-12 | high | `supabase/functions/fetch-meta-ads/index.ts:37`, `:66`, `:111-119`, `:146` | `limit` viene propagato a Meta, dedupe per ad in loop, `competitorId` client-driven. | Cap server-side, batch dedupe, verifica competitor workspace prima insert, rate limit e input schema. |
| M-01 | medium | `supabase/functions/_shared/http.ts:1` | CORS `Access-Control-Allow-Origin: *` per tutte le function. JWT limita la maggior parte delle azioni, ma il perimetro browser non e ristretto. | Riflettere solo origin consentite da `ALLOWED_APP_ORIGINS`/`APP_URL`; mantenere OPTIONS coerente. |
| M-02 | medium | multiple Edge Functions | Rate limiting non uniforme. Presente in alcune AI flows, assente/da verificare in invite, Gmail, admin, reports, alerts. | Middleware shared rate-limit per user/workspace/function. |
| M-03 | medium | multiple Edge Functions | Validazione input manuale, Zod non usato nelle function principali. | Schema validation centralizzata per body/action e limiti di lunghezza. |
| M-04 | medium | `fetch-meta-ads`, `gmail-auth`, `gmail-sync`, AI functions | Errori provider/log possono includere dettagli upstream e PII. | Logging strutturato con redaction, errori client generici, correlation ID. |

## 1.2.3 Frontend security

Fatti osservati:
- Nessuna `SERVICE_ROLE_KEY` esposta in `src/`; i riferimenti service role sono solo nelle Edge Functions.
- Env frontend in `src/lib/env.ts` usa solo `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- Supabase client persiste sessione in `localStorage` (`src/integrations/supabase/client.ts:14`), comportamento standard ma sensibile a XSS.
- `dangerouslySetInnerHTML` usa DOMPurify nei punti osservati: `NewsletterReader`, `MetaAds`, `Competitors`; `ui/chart` inietta CSS controllato.
- Nessun `eval` o `new Function` osservato; nessun `target="_blank"` in `src`.
- CSP presente in `vercel.json`, ma `style-src 'unsafe-inline'` e necessario all'attuale stack; manca `upgrade-insecure-requests`.

Findings:

| ID | Severity | File/linea | Descrizione | Fix proposto |
|---|---|---|---|---|
| M-05 | medium | `src/pages/NewsletterReader.tsx:80`, `:403` | Sanitizzazione email HTML consente `style`, `class`, `target`. Link esterni sanitizzati ma non viene forzato `rel=noopener noreferrer`. | Hook DOMPurify `afterSanitizeAttributes` per `target=_blank` e `rel`; valutare allowlist CSS piu stretta. |
| M-06 | medium | `src/integrations/supabase/client.ts:14` | Sessione in localStorage: rischio furto token in caso XSS. | Ridurre superfici XSS, CSP piu stretta, audit HTML email, valutare storage strategy se threat model lo richiede. |
| L-01 | low | `.env.example` | Placeholder secret tipo `sk_live_...` possono sembrare reali. | Usare placeholder inequivocabili (`sk_test_xxx`, `replace_me`). |

## 1.2.4 Auth & session

Fatti osservati:
- Guard frontend per `minimumRole` e `requireVerified` in `RouteGuard`, ma enforcement reale su azioni critiche e lato Edge.
- Password minimum lato UI: 6 caratteri in `Auth.tsx:100` e `ResetPassword.tsx:45-46`.
- Supabase Auth config live non e nel repo.

Da verificare:
- PKCE flow lato Supabase client/dashboard.
- Email confirmation obbligatoria a livello Supabase Auth.
- Password policy reale.
- Session timeout/refresh policy.
- MFA per platform admin.
- Custom claims server-side.

Finding:
- M-07: Auth hardening incompleto da repo. Per SaaS B2B admin/billing, MFA platform admin e password policy server-side vanno confermate e documentate.

## 1.2.5 Stripe billing security

Fatti positivi:
- Webhook signature verification presente.
- Event types principali gestiti: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`.
- Price IDs server-side da env in `_shared/billing.ts`.
- `create-checkout` e `customer-portal` richiedono workspace admin + verified user.
- `check-subscription` legge Stripe, non si fida solo del client.

Findings:

| ID | Severity | File/linea | Descrizione | Fix proposto |
|---|---|---|---|---|
| H-04 | high | `supabase/functions/stripe-webhook/index.ts:61` | Idempotency segna event prima del successo. | Vedi sopra. |
| M-08 | medium | `supabase/functions/check-subscription/index.ts:56-58`, `_shared/billing.ts:62` | `check-subscription` considera `past_due` subscribed, `_shared/billing` no. | Allineare modello accesso/billing per evitare UX incoerente. |
| M-09 | medium | `stripe-webhook` | Race condition concorrenti per stesso customer non risolta esplicitamente nel codice osservato. | Upsert transazionale con ordering su `current_period_end` o lock advisory per workspace/customer. |

## 1.2.6 Dipendenze

`npm audit --json`: 0 vulnerabilita.

Outdated principali:
- `vite` 8.0.8 -> 8.0.10
- `react` 18.3.1 -> 19.2.5
- `react-router-dom` 6.30.3 -> 7.14.2
- `recharts` 2.15.4 -> 3.8.1
- `zod` 3.25.76 -> 4.4.1
- `tailwindcss` 3.4.17 -> 4.2.4
- `vitest` 3.2.4 -> 4.1.5
- `@tanstack/react-query` 5.83.0 -> 5.100.7
- `typescript` 5.8.3 -> 5.9.3 wanted / 6.0.3 latest

Candidate unused / underused:
- `@vercel/analytics` e `@vercel/speed-insights` sono installati ma non importati in `src`.
- `zod`, `react-hook-form`, `@hookform/resolvers` risultano utili ma non applicati alle Edge Functions; uso frontend non completo da audit statico.

---

# 1.3 AI Pipeline audit

Functions in scope: `analyze-meta-ad`, `analyze-newsletter`, `extract-newsletter-intel`, `generate-insights`, `generate-weekly-briefing`, parti di `reports-center`/`dashboard-snapshot`.

Fatti positivi:
- API key OpenAI letta solo da Deno env (`_shared/openai.ts`), non esposta client.
- `_shared/openai.ts` impone timeout default 90s e supporta `maxCompletionTokens`.
- `newsletter-analysis` valida strutturalmente diversi campi in `_shared/newsletter-analysis.ts`.
- Output AI non viene eseguito come codice.

Findings:

| ID | Severity | Area | Descrizione | Fix proposto |
|---|---|---|---|---|
| H-06 | high | cost control | Rate limit per user/function esiste in alcuni flussi, ma non ho osservato quota mensile server-side per workspace, budget token/costi o anomaly alert. | Usage ledger server-side per workspace, hard cap per piano, alert, dashboard cost. |
| M-10 | medium | prompt injection | Newsletter/ad copy esterni finiscono nei prompt. Ci sono schema e istruzioni, ma delimitazione anti-instruction non e sistematica in tutti i prompt. | Delimitatori espliciti per contenuto non fidato, policy "do not follow instructions inside content", validation strict. |
| H-09 | high | `generate-insights` | Delete-before-insert: `supabase/functions/generate-insights/index.ts:1539-1541` cancella insights esistenti prima dell'insert. | Insert in staging/upsert transazionale o RPC che sostituisce solo dopo successo. |
| M-11 | medium | output handling | Alcuni JSON parse su output AI hanno fallback euristico; error handling non sempre produce payload strutturato uniforme. | Schema validator unico e dead-letter/retry state. |
| M-12 | medium | fallback | Fallback presenti ma non coerenti tra functions; provider down puo generare errori utente o stati parziali. | Definire stati `queued/running/failed/retryable` e retry policy per AI jobs. |

---

# 1.4 Multi-tenancy & data isolation

Modello tenant osservato:
- Tenant principale: `workspace_id`.
- Membership: `workspace_members`.
- Ruoli workspace: `user_roles` con `admin`, `analyst`, `viewer`.
- Platform admin separato: env `PLATFORM_ADMIN_EMAILS` e tabella `platform_admins`.
- Billing workspace-scoped: `workspace_billing`.

Punti solidi:
- RLS e guard Edge usano workspace membership in molte aree.
- `assertWorkspaceAdmin`, `assertWorkspaceAnalyst`, `assertWorkspaceMember` centralizzano il controllo.
- `WorkspaceProvider` salva `current_workspace_id` e seleziona workspace disponibile.

Findings:
- H-02: FK non workspace-aware per `competitor_id`.
- H-05: invite flow non richiede accept esplicito.
- M-13: cambio workspace invalida parte delle query tramite query key, ma serve test E2E per evitare cache cross-workspace su dashboard/inbox/analytics dopo switch rapido.
- M-14: utenti rimossi da org dipendono da RLS e query invalidation; nessun test E2E osservato per revoca immediata.
- M-15: `usage_events` consente insert client-side via RLS; per quota/billing il ledger dovrebbe essere server-only o firmato.

---

# 1.5 Performance audit

## Frontend

Build:
- `npm run build` passa.
- Top chunks osservati:
  - CSS `index-*.css`: 120.09 kB raw / 20.65 kB gzip
  - `generateCategoricalChart-*.js` (Recharts): 365.37 kB / 97.62 kB gzip
  - `index-*.js`: 204.66 kB / 50.18 kB gzip
  - `client-*.js`: 196.42 kB / 50.27 kB gzip
  - `button-*.js`: 135.90 kB / 44.34 kB gzip
  - `Analytics-*.js`: 81.18 kB / 19.14 kB gzip
  - `i18n-*.js`: 63.03 kB / 19.99 kB gzip

Lighthouse locale homepage:
- Performance 66
- Accessibility 86
- Best Practices 100
- SEO 100
- LCP 4.9s
- CLS 0.116
- TBT 0ms

Findings:
- M-16: Recharts e analytics chunks sono i candidati principali per lazy loading/route splitting ulteriore.
- M-17: homepage LCP/CLS non production-grade per landing pubblica.
- M-18: `QueryClientProvider`, auth/workspace/subscription providers e doppio toaster sono montati anche per landing pubblica (`src/App.tsx:86-95`), aumentando runtime iniziale.
- M-19: diverse animazioni homepage usano `setInterval`; molte hanno cleanup e `prefers-reduced-motion`, ma lint segnala dipendenze hook mancanti in orchestratori.
- L-02: Tailwind build warning per classi arbitrarie; non blocca build ma segnala CSS non generato come previsto.

## Backend / Edge Functions

Findings:
- H-12: `fetch-meta-ads` fa dedupe con query per ad, N+1 DB.
- H-11: `gmail-sync` fetch Gmail message detail per ogni messaggio; il pattern e spesso necessario con Gmail API, ma manca cap robusto e backpressure.
- M-20: `dashboard-snapshot` importa da `src/lib`, aumentando coupling frontend/backend e potenziale cold start.
- M-21: `admin-data` e grande multi-action function; diverse azioni aggregano manualmente e non sono transazionali.
- M-22: import Deno/Supabase version drift tra functions (`std@0.168.0`, `0.190.0`, `npm:@supabase/supabase-js@2.57.2`, `esm.sh@2.49.1`).

## Database

Fatti osservati:
- Molti indici workspace/date sono stati aggiunti nelle migrations recenti.
- `get_workspace_analytics` e stato ottimizzato con RPC SQL e timeout.

Da verificare:
- Live `pg_stat_statements`.
- Missing FK indexes effettivi su DB live.
- Query plan per dashboard, analytics, reports.

Findings:
- H-02: mancano vincoli composite workspace-aware per relazioni cross-tenant sensibili.
- M-23: nessuna evidenza locale di test SQL/RLS automatizzati.

---

# 1.6 Code quality

## File/componenti grandi

Esempi sopra soglia:
- `supabase/functions/generate-insights/index.ts`: circa 1617 righe.
- `src/pages/Reports.tsx`: circa 1349 righe.
- `src/pages/Analytics.tsx`: circa 1303 righe.
- `src/pages/Competitors.tsx`: circa 1284 righe.
- `src/pages/Alerts.tsx`: circa 1187 righe.
- `src/pages/Dashboard.tsx`: circa 1042 righe.
- `src/lib/reports.ts`: circa 1012 righe.
- `supabase/functions/_shared/alerts.ts`: circa 1007 righe.
- `supabase/functions/admin-data/index.ts`: circa 870 righe.

## TypeScript / ESLint

Config:
- `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, `noUnusedParameters: false`.
- ESLint disabilita `@typescript-eslint/no-unused-vars`.

Lint:
- `npm run lint` passa con 3 warning React Hooks:
  - `src/components/homepage/Step01ConnectScene.tsx:20` missing dependency `connected`
  - `src/components/homepage/Step02CompetitorsScene.tsx:42` missing dependency `rows.length`
  - `src/components/homepage/useDemoOrchestrator.ts:66` missing dependency `state.isPlaying`

Tests:
- `npm run test` passa: 94 tests.
- `npm run test:e2e` fallisce 2/8:
  - `tests/core-flows.spec.ts:88`: testo `Decision Engine` non trovato.
  - `tests/core-flows.spec.ts:233`: `getByText("48")` strict mode violation.

Findings:
- H-07: `src/integrations/supabase/types.ts` e stale rispetto alle migrations recenti (mancano tabelle come `workspace_billing`, `platform_admins`, `workspace_invitations`, `weekly_briefings`, `report_schedules`, `report_runs`, `competitor_profiles`, `stripe_webhook_events`).
- H-08: Playwright e2e non passa; per SaaS production-grade i core flows non sono affidabili.
- M-24: TypeScript troppo permissivo per sicurezza multi-tenant/billing.
- M-25: Dead code/import inutilizzati non rilevabili perche noUnused/ESLint unused disabilitati.
- M-26: `console.error/log` estesi in frontend e Edge Functions; utile in dev, ma serve redaction/logging policy.

---

# 1.7 Accessibility

Lighthouse accessibility: 86.

Findings osservati:
- M-27: button focusable dentro pannello `aria-hidden` nella landing/demo.
- M-28: `progressbar` senza nome accessibile.
- M-29: contrasti colore insufficienti in alcuni testi piccoli/viola brand.
- M-30: heading order non sempre sequenziale.
- M-31: manca landmark `main` sulla homepage.
- M-32: touch targets sotto 44px a 320/375px, in particolare language selector, dark mode, mobile menu/demo controls.
- L-03: shadcn Dialog/Dropdown/Combobox sono buone basi, ma componenti custom homepage richiedono test tastiera manuale.

Preferenza fix: semantica HTML prima di `aria-*`.

---

# 1.8 i18n

Lingue: `de`, `en`, `es`, `fr`, `it`.

Key parity:
- 16/17 namespace sono allineati tra le 5 lingue.
- `reports.json`: `fr=123`, le altre lingue `122`; manca 1 key in `de/en/es/it` rispetto a `fr`.

Findings:
- M-33: `<html lang="en">` e statico in `index.html`; non ho osservato update dinamico di `document.documentElement.lang`.
- L-04: molte stringhe admin/app sono hardcoded in inglese, specialmente admin panel e health pages.
- L-05: formattazione date/numeri non sempre locale-aware; uso misto date-fns/Intl/manual strings.
- Da non fare senza team umano: inventare traduzioni mancanti. Se si corregge, usare EN source e `[NEEDS TRANSLATION]` sulle altre lingue come richiesto.

---

# 1.9 SEO & Meta

Fatti osservati:
- `index.html` ha title, description, OG base e Twitter card.
- `public/robots.txt` esiste.
- `sitemap.xml` non osservato.
- Routes pubbliche privacy/terms esistono.

Findings:
- M-34: nessun canonical URL osservato.
- M-35: nessun `sitemap.xml` osservato.
- M-36: nessun hreflang per 5 lingue.
- M-37: nessuno Schema.org (`Organization`, `SoftwareApplication`, FAQ) osservato.
- L-06: OG/Twitter image usa `/placeholder.svg`; non production-grade.
- L-07: meta sono globali SPA, non per-route.

---

# 1.10 GDPR & Compliance

Fatti osservati:
- Privacy e Terms esistono (`src/pages/Privacy.tsx`, `src/pages/Terms.tsx`).
- Privacy dichiara read-only Gmail, disconnect, export e delete.
- Retention tecnica: soft delete e purge cron per alcune tabelle.

Findings:
- M-38: cookie consent/banner non osservato, nonostante localStorage/cookie UI e possibili analytics.
- M-39: Privacy dice che disconnect Gmail "revokes our access immediately", ma nel codice osservato `gmail-auth` disconnect elimina token/connection; non ho visto chiamata a Google token revoke endpoint.
- M-40: export/delete DSAR non appare implementato come workflow completo, oltre a export parziali in settings.
- M-41: sub-processor list non dettagliata nel prodotto/documentazione osservata.
- M-42: audit log accesso PII esiste parzialmente, ma admin/platform actions non sempre hanno log transazionale robusto.

---

# 1.11 DevOps & Observability

Fatti osservati:
- Nessuna directory `.github` rilevata; quindi nessun workflow CI GitHub locale.
- Script `build:ci` esiste e combina typecheck, lint, tests, build.
- `vercel.json` configura rewrites, cache headers, CSP e security headers.
- `@vercel/analytics` e `@vercel/speed-insights` sono installati ma non importati.
- Admin panel ha `system_health`, ma non e un public health check endpoint.

Findings:
- M-43: CI/CD non versionato nel repo.
- M-44: error tracking tipo Sentry/PostHog non osservato.
- M-45: structured logging parziale; manca redaction/correlation-id standard.
- M-46: backup DB Supabase, PITR e alerting non verificabili dal repo.
- L-08: `.env.example` andrebbe riallineato e reso meno ambiguo.

---

# Build config e anomalie

- `vite.config.ts`: server dev su host `::`, porta 8080, HMR overlay disabilitato. Ok localmente, ma overlay off puo nascondere errori durante sviluppo.
- `tsconfig`: non strict. Per multi-tenant/billing e un rischio di qualita medio.
- `eslint.config.js`: unused vars off; react-refresh off in provider/UI, accettabile ma da monitorare.
- `tailwind.config.ts`: token design system centralizzati, ma build mostra warnings su classi arbitrarie.
- `vercel.json`: CSP presente, ma `style-src 'unsafe-inline'`; nessun `upgrade-insecure-requests`; SPA rewrite globale corretto per Vite/React Router.

---

# Issue register prioritizzato

## Critical

1. C-01 `soft_delete_newsletter_inbox` IDOR/privilege escalation via `_user_id`.
2. C-02 `purge_soft_deleted_rows` destructive SECURITY DEFINER con execute non ristretto osservato.

## High

1. H-01 `get_dashboard_stats` cross-tenant aggregate leak via direct RPC.
2. H-02 Cross-tenant `competitor_id` referential integrity gap.
3. H-03 Gmail OAuth tokens plaintext at rest.
4. H-04 Stripe webhook idempotency segna evento prima del successo.
5. H-05 Invite flow auto-add/auto-accept senza accept token esplicito.
6. H-06 AI cost controls: quota mensile/budget workspace assenti.
7. H-07 Supabase generated types stale.
8. H-08 Playwright E2E failing.
9. H-09 `generate-insights` delete-before-insert.
10. H-10 Server-only RPC helpers con execute/revoke da rivedere.
11. H-11 Gmail sync senza rate limit/cap/verified guard robusti.
12. H-12 `fetch-meta-ads` input/cap/N+1/competitor workspace validation.

## Medium principali

- CORS wildcard.
- Input validation Edge manuale/non uniforme.
- Logging e error responses non redatti in modo standard.
- Admin destructive actions non transazionali.
- Billing `past_due` incoerente.
- Auth dashboard settings non documentate nel repo.
- TypeScript non strict e unused vars disabilitati.
- Homepage performance/accessibility sotto target.
- No CI workflow versionato.
- No sitemap/canonical/hreflang/schema.
- GDPR DSAR/export/delete/token revoke incompleti o non verificabili.
- Vercel Analytics/Speed Insights installati ma non montati.

---

# Stop richiesto

Fase 1 completata. Non ho applicato fix.

Riepilogo numerico:
- 2 issue CRITICAL
- 12 issue HIGH
- 46 issue MEDIUM
- 28 issue LOW
- 57 opportunita / miglioramenti DX

STOP: serve conferma esplicita prima di procedere alla Fase 2 e creare `AUDIT_PLAN.md`.
