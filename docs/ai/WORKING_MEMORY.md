# Working Memory

Scopo:
- memoria operativa breve del progetto
- utile per riprendere il lavoro rapidamente tra agenti AI e sviluppatori
- da aggiornare quando cambiano architettura, flussi critici, stato del progetto o priorita

Ultimo aggiornamento: 2026-04-06

Prima lettura consigliata per nuovi agenti: [AGENTS.md](../../AGENTS.md)

## Project purpose

Tracklyze e un SaaS di competitor intelligence per team marketing/growth/e-commerce.
Raccoglie dati competitor da Gmail e da input manuale, li analizza con OpenAI e li trasforma in dashboard, alert e insight strategici.

## Current status

- Frontend React/Vite funzionante
- Backend su Supabase funzionante
- `build`, `test` e `lint` passano localmente
- il dashboard e stato ridisegnato secondo il principio `Daily Brief First`:
  - header con periodo, micro-stat e stato freshness/sync
  - una sola card hero `Today's Brief` con headline, why it matters e suggested action
  - action queue compatta max 3 elementi
  - signal stream unificato al posto di highlights/activity separati
  - competitor pulse compatto con sparkline SVG inline
  - system health collassabile, auto-espanso solo quando stale/fail
- il dashboard principale legge ora uno snapshot server-side da `dashboard-snapshot`
- il bootstrap client di dashboard/admin/billing e stato stabilizzato usando dipendenze hook basate su ID/token stabili invece di object reference variabili
- Analytics usa una RPC Postgres arricchita (`get_workspace_analytics`) con range selector, coverage audit, sender domains, share-of-voice, competitor pressure, discount posture e recent signals
- il modulo `Competitors` non e piu solo CRUD:
  - legge uno snapshot server-side da `competitor-intelligence`
  - mostra campaign timeline, messaging evolution, promo behavior, category focus
  - espone strengths, weaknesses, strategic gaps e opportunities per competitor
- gli insight usano ora uno schema strutturato persistito in `insights` con:
  - `campaign_type`, `main_message`, `offer_*`, `cta_*`, `product_categories`, `positioning_angle`
  - `strategic_takeaway`, `priority_level`, `impact_area`
  - action plan strutturato in tre blocchi
- signup e verifica email ritornano su `/redirect`, riusando il bootstrap auth/workspace esistente
- admin panel piu operativo:
  - lista utenti paginata con totale reale
  - audit log con metadata visibili
- il link `Admin Panel` e coerente con il gate reale: compare solo se `useAdminCheck()` rileva un vero platform admin da `PLATFORM_ADMIN_EMAILS` o `platform_admins`
- billing Stripe sincronizzato anche event-driven tramite `stripe-webhook`
- il sistema alert ora usa un evaluator condiviso con:
  - regole owner-scoped per utente/workspace
  - trigger event-driven da `gmail-sync`, `extract-newsletter-intel` e `fetch-meta-ads`
  - `alert_trigger_logs` come audit trail dedicato
- checkout e customer portal Stripe aprono una tab placeholder prima della risposta server per evitare popup bloccati dopo il click utente
- Playwright E2E presente con suite core-flow passante
- hardening recente su tenancy e OAuth:
  - `workspace_members` non consente piu self-join
  - `user_roles` possono essere assegnati solo a membri reali del workspace
  - Gmail OAuth usa `state` firmato e con scadenza breve
- onboarding, Gmail, inbox, AI extraction, insights, billing e admin panel esistono
- l'import manuale newsletter ora mette sempre in coda un job AI asincrono:
  - `enqueue-newsletter-analysis` crea/riaccoda il job
  - `analyses` tiene stato, tentativi, input snapshot e validazione
  - `analyze-newsletter` usa il processor condiviso per esecuzione e retry base
- la Inbox puo suggerire nuovi competitor da sender non attribuiti e puo riallineare newsletter storiche ai competitor correnti
- Meta Ads lato backend esiste, ma UI e ancora beta/demo
- inviti team reali via email non implementati

## Architecture rules

- `workspace_id` e il confine tenant principale
- RLS protegge il CRUD browser-side
- membership e ruoli non devono mai poter essere auto-assegnati dal client
- operazioni privilegiate e integrazioni esterne passano da Edge Functions
- tutte le Edge Functions osservate hanno `verify_jwt = false`, quindi i guard manuali in `supabase/functions/_shared/auth.ts` sono obbligatori
- per la pipeline manuale newsletter, `analyses` e sia tabella risultato sia job store leggero; evitare di introdurre una seconda coda senza una ragione forte
- il callback Gmail non deve fidarsi di `state` non firmato o di redirect origin impliciti
- distinguere sempre tra:
  - workspace admin
  - platform admin
- billing e workspace-scoped, non user-scoped
- le regole alert appartengono al loro creatore, ma il motore alert valuta tutte le regole attive del workspace e recapita la notifica al proprietario corretto
- i redirect di auth email devono puntare a `/redirect`, non a `/`
- `priority_level` e `impact_area` degli insight sono persistiti nel database e vengono riletti da UI, dashboard ed export
- `dashboard-snapshot` e la fonte primaria dei dati del dashboard; evitare di reintrodurre query browser-side duplicate senza motivo
- `competitor-intelligence` e la fonte primaria del profilo strategico competitor; evitare di ricostruire la stessa aggregazione con query browser-side sparse
- il decision layer resta un helper TS condiviso tra frontend e function, quindi va mantenuto coerente e testato

## Key modules

- Frontend bootstrap/router:
  - `src/App.tsx`
  - `src/main.tsx`
- Auth/workspace/roles/subscription:
  - `src/hooks/useAuth.tsx`
  - `src/hooks/useWorkspace.tsx`
  - `src/hooks/useRoles.tsx`
  - `src/hooks/useSubscription.tsx`
- Core product flows:
- `src/pages/Onboarding.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/NewNewsletter.tsx`
- `src/pages/AnalysisView.tsx`
- `src/pages/NewsletterInbox.tsx`
  - `src/pages/Analytics.tsx`
  - `src/pages/Insights.tsx`
  - `src/pages/Billing.tsx`
- Decision layer frontend:
  - `src/lib/dashboard-decision-engine.ts`
  - `src/lib/analytics-audit.ts`
  - `src/lib/domains.ts`
  - `src/lib/competitor-attribution.ts`
  - `src/lib/competitor-intelligence.ts`
  - `src/lib/insight-priority.ts`
  - `src/lib/insight-normalization.ts`
  - `src/hooks/useDashboardSnapshot.tsx`
  - `src/hooks/useCompetitorIntelligence.tsx`
- Backend shared:
  - `supabase/functions/_shared/auth.ts`
  - `supabase/functions/_shared/app.ts`
  - `supabase/functions/_shared/billing.ts`
  - `supabase/functions/_shared/openai.ts`
  - `supabase/functions/_shared/stripe-billing.ts`
- High-risk backend modules:
- `supabase/functions/gmail-auth/index.ts`
- `supabase/functions/gmail-sync/index.ts`
- `supabase/functions/enqueue-newsletter-analysis/index.ts`
- `supabase/functions/_shared/newsletter-analysis.ts`
- `supabase/functions/generate-insights/index.ts`
- `supabase/functions/competitor-intelligence/index.ts`
  - `supabase/functions/admin-data/index.ts`
- Schema anchors:
  - `supabase/migrations/20260401031600_1372769e-63e2-4a1f-b922-337c4fc533c4.sql`
  - `supabase/migrations/20260405143000_harden_platform_auth_and_billing.sql`

## Coding conventions dedotte

- TypeScript ovunque, ma il repo non e in strict mode
- alias frontend `@/`
- logica frontend organizzata soprattutto in hook custom + page components
- CRUD semplice direttamente da browser verso Supabase
- Edge Functions usate per secret, AI, billing e integrazioni
- modifiche schema tramite migration SQL, non manualmente
- generated types Supabase usati nel frontend ma vanno rigenerati quando lo schema cambia

## Important env vars

Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Backend / Supabase secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `ALLOWED_APP_ORIGINS`
- `PLATFORM_ADMIN_EMAILS`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PREMIUM`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `META_ACCESS_TOKEN`
- `OPENAI_API_KEY`
- `OPENAI_PROJECT_ID`
- `OPENAI_ORGANIZATION_ID`
- `OPENAI_MODEL_INSIGHTS`
- `OPENAI_MODEL_NEWSLETTER_ANALYSIS`
- `OPENAI_MODEL_NEWSLETTER_EXTRACTION`
- `OPENAI_MODEL_META_AD_ANALYSIS`
- `STRIPE_WEBHOOK_SECRET`

## Known issues

- nessuno scheduler/cron osservato per Gmail sync o per scansioni alert periodiche; l'alerting pero e ora anche event-driven su Gmail, extraction e Meta Ads
- esiste solo una queue locale al dominio newsletter manuale; non c'e ancora un worker/scheduler generale per altri job asincroni
- `src/integrations/supabase/types.ts` non sembra allineato alle ultime tabelle (`workspace_billing`, `platform_admins`)
- alcune tabelle browser-side dipendono ancora da policy RLS ampie lato member e meritano review periodica
- Meta Ads UI usa demo data
- inbox puo entrare in demo mode se Gmail non e connesso e non ci sono dati reali
- alcune stringhe UI hanno encoding corrotto
- il chunk route-level di `Analytics` e ancora molto grande (~467 kB raw, ~119 kB gzip in build locale)
- `QueryClientProvider` e presente ma React Query non e usato come data layer reale
- `zod` e `react-hook-form` sono presenti ma poco usati
- il dashboard snapshot e server-driven, ma gli helper condivisi frontend/backend vanno mantenuti coerenti e i generated types restano indietro
- il decision layer usa ora priorita insight a 3 livelli (`high`, `medium`, `low`) invece della vecchia tassonomia `critical/high/medium/monitor`
- la suite Playwright attuale e mockata; non sostituisce smoke test contro integrazioni reali
- la suite Playwright mockata puo ancora produrre rumore console da refresh token Supabase durante la chiusura del browser, pur restando verde

## In-progress work

Stato noto dalla working tree osservata:
- documentazione tecnica ampia appena generata:
  - `PROJECT_AUDIT.md`
  - `AGENTS.md`
  - `docs/ai/ARCHITECTURE.md`
  - `docs/ai/FEATURES_INVENTORY.md`
  - `docs/ai/TECH_DEBT.md`
  - `docs/ai/HANDOFF_FOR_AI.md`
  - `docs/ai/DECISIONS_LOG.md`
  - `docs/ai/SESSION_LOG.md`
- il repo risulta gia passato attraverso hardening recente su auth, billing e Edge Functions
- la working tree puo contenere modifiche locali non ancora consolidate in commit distinti
- il branch corrente include un passaggio deciso verso `feature/dashboard-decision-engine`

## Next recommended steps

1. rigenerare i generated types Supabase
2. valutare se sfruttare `priority_level`, `impact_area` e i nuovi campi strutturati degli insight anche in alerting/report SQL
3. fare review mirata delle policy RLS ancora permissive sui CRUD browser-side
4. spostare enforcement quote piano lato server
5. chiarire o implementare scheduler per Gmail sync e per scansioni alert periodiche
6. decidere il destino del demo mode inbox e della UI Meta Ads beta
7. aggiungere smoke test E2E selettivi contro integrazioni reali o staging
8. introdurre contract test/monitoring per `stripe-webhook`

## Safe starting points for future edits

- documentazione e readme
- cleanup copy/encoding UI
- test unitari e Playwright smoke tests
- rigenerazione tipi Supabase
- miglioramento `env.example` e docs di setup
- refactor locali a componenti/pagine che non toccano auth, billing, RLS o Edge Functions critiche

## Things to avoid touching without review

- `supabase/config.toml` e la scelta `verify_jwt = false`
- helper auth in `supabase/functions/_shared/auth.ts`
- policy RLS e migration dei ruoli
- flusso OAuth Gmail e redirect URI
- billing workspace-scoped e tabella `workspace_billing`
- `admin-data` senza capire bene platform admin vs workspace admin
- demo mode inbox / gating Meta Ads senza decidere l'impatto prodotto

## Maintenance note

Quando aggiorni questo file:
- mantienilo corto
- aggiorna solo fatti ancora veri
- rimuovi elementi chiusi o superati
- se serve dettaglio, rimanda ai documenti principali invece di duplicarlo qui
