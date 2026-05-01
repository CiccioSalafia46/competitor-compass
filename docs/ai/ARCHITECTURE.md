# Architecture

Scopo di questo file:
- descrivere l'architettura tecnica reale del progetto
- spiegare i flussi principali e i punti di accoppiamento
- fornire una mappa operativa per modifiche future

Per la panoramica completa di stato, rischi e roadmap usare anche [PROJECT_AUDIT.md](../../PROJECT_AUDIT.md).

## 1. System Overview

Tracklyze e una SPA React/Vite che usa Supabase come backend completo:
- autenticazione: Supabase Auth
- database: Supabase Postgres con RLS
- API/server logic: Supabase Edge Functions
- AI: OpenAI
- billing: Stripe
- ingest email: Google OAuth + Gmail API
- ad intelligence: Meta Ad Library API

### Vista ad alto livello

```text
Browser (React SPA)
  -> Supabase Auth (sessione utente)
  -> Supabase Postgres via supabase-js (CRUD protetto da RLS)
  -> Supabase Edge Functions (operazioni privilegiate / integrazioni / AI)
       -> OpenAI
       -> Stripe
       -> Google OAuth + Gmail API
       -> Meta Ad Library API
```

## 2. Runtime Components

### Frontend

Entrypoint:
- `src/main.tsx`
- `src/App.tsx`

Provider principali:
- `AuthProvider`
- `WorkspaceProvider`
- `SubscriptionProvider`
- `QueryClientProvider`

Nota:
- `@tanstack/react-query` e presente e montato, ma nel codice attuale il fetching reale e quasi tutto gestito con `useEffect` e chiamate dirette Supabase.

### Backend

Backend applicativo osservato:
- nessun server Node/Express separato
- Supabase Edge Functions come layer server
- SQL RPC in Postgres per operazioni condivise

Helper Edge condivisi:
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/app.ts`
- `supabase/functions/_shared/billing.ts`
- `supabase/functions/_shared/openai.ts`
- `supabase/functions/_shared/stripe-billing.ts`

Helper frontend condivisi introdotti per il decision layer:
- `src/lib/dashboard-decision-engine.ts`
- `src/lib/insight-priority.ts`
- `src/lib/insight-normalization.ts`
- `src/lib/competitor-intelligence.ts`
- `src/hooks/useDashboardSnapshot.tsx`
- `src/hooks/useCompetitorIntelligence.tsx`

## 3. Repository Areas That Matter for Architecture

| Area | Ruolo |
| --- | --- |
| `src/pages` | pagine e flussi utente |
| `src/hooks` | orchestrazione logica frontend |
| `src/integrations/supabase` | client browser e tipi DB |
| `src/lib` | helper trasversali frontend |
| `supabase/functions` | backend runtime e integrazioni |
| `supabase/migrations` | schema, policy, trigger, RPC |

## 4. Core Architectural Decisions

### 4.1 Multi-tenant by workspace

Il progetto e strutturato intorno a `workspaces`.

Conseguenze:
- quasi tutte le entita business hanno `workspace_id`
- l'accesso ai dati client-side passa da RLS
- billing e per workspace, non per utente

Tabelle chiave:
- `workspaces`
- `workspace_members`
- `user_roles`
- `workspace_billing`

### 4.2 Dual role model

Esistono due livelli di ruolo:
- membership role in `workspace_members.role`: `owner`, `admin`, `member`, `viewer`
- app role in `user_roles.role`: `admin`, `analyst`, `viewer`

Uso osservato:
- membership role per appartenenza tenant e alcune amministrazioni
- app role per permessi applicativi come analyze/manage data

Questo modello e potente ma aumenta la complessita.

Hardening osservato:
- la membership workspace non puo piu essere auto-assegnata dal client
- i `user_roles` possono essere assegnati solo a utenti gia membri del workspace

### 4.3 Direct DB access from the browser

Per il CRUD ordinario il frontend chiama direttamente il database con `supabase-js`.

Esempi:
- `competitors`
- `newsletter_entries`
- `newsletter_inbox`
- `alerts`
- `insights`
- `workspace_members`
- `user_roles`

Protezione:
- RLS lato database

Tradeoff:
- piu velocita di sviluppo
- piu forte dipendenza dalla correttezza delle policy RLS

### 4.4 Edge Functions for privileged and external work

Le operazioni che richiedono service role, segreti o logica complessa passano da Edge Functions:
- Gmail OAuth/sync
- OpenAI analysis/extraction/insights
- Stripe checkout/portal/subscription sync
- Meta Ads fetch/analyze
- admin panel

### 4.5 Manual JWT verification inside Edge Functions

In `supabase/config.toml` tutte le functions osservate hanno:

```toml
verify_jwt = false
```

Quindi ogni function deve validare manualmente il bearer token tramite `_shared/auth.ts`.

Questo e un punto architetturale critico:
- consente maggiore controllo
- ma rende facile introdurre regressioni di sicurezza se una nuova function dimentica i guard

## 5. Frontend Architecture

### 5.1 Route layout

`src/App.tsx` organizza le route in tre gruppi:

1. Pagine pubbliche
- `/`
- `/auth`
- `/forgot-password`
- `/reset-password`
- `/privacy`
- `/terms`

2. Flussi bootstrap
- `/redirect`
- `/onboarding`

3. Area autenticata
- shell comune: `AppLayout`
- route applicative e admin

### 5.2 Guards

Guard principali:
- `src/components/RouteGuard.tsx`
- `src/components/admin/AdminGuard.tsx`
- `src/components/AuthRedirect.tsx`

Ruolo di ciascuno:
- `RouteGuard`: auth, email verification, ruolo minimo, presenza workspace
- `AdminGuard`: accesso admin panel
- `AuthRedirect`: dopo login decide `onboarding` vs `dashboard`

### 5.3 State model

State globale:
- auth context
- workspace context
- subscription context

State locale:
- pagine e hook feature-based
- onboarding in `localStorage`
- workspace corrente in `localStorage`
- tier corrente in `sessionStorage`

### 5.4 Fetching model

Pattern prevalente:
- `useEffect` + `supabase.from(...)`
- `invokeEdgeFunction(...)` per le functions

Pattern decision layer recente:
- `useDashboardSnapshot` chiama `dashboard-snapshot` come fonte primaria del dashboard
- `dashboard-snapshot` combina query service-role, analytics RPC, usage, Gmail status, alerts e insights
- la composizione finale resta condivisa in `src/lib/dashboard-decision-engine.ts`, usato sia da function sia da test/UI
- `useCompetitorIntelligence` chiama `competitor-intelligence` come fonte primaria del profilo strategico competitor
- `competitor-intelligence` combina newsletter attribuite, extraction AI, Meta ads e insights e delega l'assessment a `src/lib/competitor-intelligence.ts`

Pattern poco usato/non adottato:
- `useQuery` / `useMutation`
- schema validation uniforme con `zod`

### 5.5 Decision interface layer

Il dashboard non e piu solo una raccolta di KPI. Esiste un layer di composizione lato frontend che costruisce:
- `aiSummary`
- `dailyHighlights`
- `prioritizedInsights`
- `anomalies`
- `competitorSummary`
- `recommendedActions`

Il consumer UI del dashboard ora privilegia il flusso `Daily Brief First`:
- header con filtro periodo, micro-stat e stato freshness/sync derivato da Gmail o inbox recente
- `Today's Brief` singolo costruito da insight prioritari o highlight di fallback
- action queue max 3, signal stream unificato e competitor pulse con sparkline SVG inline
- system health collassabile, auto-espanso quando una sorgente e stale/fail
- fallback compatibili con payload snapshot legacy o parziali

Input usati:
- analytics aggregate dalla RPC `get_workspace_analytics`
  - summary KPI per range 30/90/180
  - attribution coverage e data health audit
  - top sender domains e share-of-voice
  - competitor pressure e competitor coverage audit
  - discount posture e recent signals feed
- alert unread
- insight recenti
- usage/plan limits
- stato Gmail connection

Lo snapshot dashboard-specifico ora esiste. La decision logic resta condivisa in TypeScript per evitare doppie implementazioni frontend/backend.

Per la pagina `Analytics`, la strategia e ibrida:
- il database produce il payload aggregato e tenant-safe via `get_workspace_analytics`
- il frontend deriva sopra un layer operativo leggero (`src/lib/analytics-audit.ts`) per action queue, anomaly feed e health audit

Questo evita di spostare nel DB raccomandazioni troppo presentational, ma significa che il layer operativo analytics non e ancora riusabile lato backend/reporting.

### 5.6 Insight prioritization layer

La priorita e l'impatto degli insight sono ora persistiti in database (`priority_level`, `impact_area`) e riletti da UI, dashboard, analytics ed export.

`src/lib/insight-priority.ts` resta comunque rilevante per:
- normalizzazione dei valori legacy
- ordinamento coerente lato UI
- fallback se un payload storico non ha campi completi

L'ordine corrente e:
- `high`
- `medium`
- `low`

Questa scelta rende la priorita queryable lato server, ma mantiene un helper TypeScript condiviso per compatibilita con dati storici e consumer diversi.

## 6. Backend Architecture

### 6.1 Functions inventory

Functions osservate:
- `admin-data`
- `analyze-meta-ad`
- `analyze-newsletter`
- `enqueue-newsletter-analysis`
- `check-subscription`
- `create-checkout`
- `customer-portal`
- `dashboard-snapshot`
- `competitor-intelligence`
- `evaluate-alerts`
- `extract-newsletter-intel`
- `fetch-meta-ads`
- `generate-insights`
- `gmail-auth`
- `gmail-sync`
- `stripe-webhook`

Helper condivisi rilevanti:
- `_shared/auth.ts`
- `_shared/http.ts`
- `_shared/openai.ts`
- `_shared/newsletter-analysis.ts`
- `_shared/stripe-billing.ts`
- `_shared/alerts.ts`

### 6.2 Service boundaries

Non esiste un service layer separato per dominio. La boundary reale e:
- function-specific handler
- helper condivisi in `_shared`

Questo produce due effetti:
- sviluppo veloce
- alcune functions troppo grandi e difficili da testare

### 6.3 SQL RPC layer

Le RPC nel DB coprono soprattutto:
- workspace creation
- analytics aggregation
- role checks
- rate limiting
- dedup checks

RPC principali:
- `create_workspace`
- `get_workspace_analytics`
- `check_rate_limit`
- `check_extraction_exists`
- `check_ad_analysis_exists`

## 7. Main End-to-End Flows

### 7.1 Auth and workspace bootstrap

```text
Auth page
  -> Supabase Auth
  -> /redirect
  -> load workspaces
  -> onboarding if none
  -> dashboard if at least one
```

File chiave:
- `src/hooks/useAuth.tsx`
- `src/hooks/useWorkspace.tsx`
- `src/components/AuthRedirect.tsx`

Nota:
- `useAuth.signUp()` usa `emailRedirectTo = <origin>/redirect`, cosi il flusso email verification rientra nello stesso bootstrap usato dal login

### 7.2 Onboarding

```text
Onboarding page
  -> workspace step
  -> competitors step
  -> Gmail step
  -> import step
  -> insights step
  -> dashboard
```

Note:
- stato onboarding salvato in `localStorage`
- autocompletion basata su dati reali nel workspace

File chiave:
- `src/pages/Onboarding.tsx`
- `src/hooks/useOnboarding.tsx`

### 7.3 Manual import -> analysis

```text
NewNewsletter page
  -> insert newsletter_entries
  -> enqueue-newsletter-analysis
  -> create analyses row with source snapshot + job metadata
  -> background processing via shared newsletter-analysis processor
  -> poll analysis result
```

File chiave:
- `src/pages/NewNewsletter.tsx`
- `src/pages/AnalysisView.tsx`
- `src/lib/newsletter-analysis.ts`
- `supabase/functions/enqueue-newsletter-analysis/index.ts`
- `supabase/functions/analyze-newsletter/index.ts`

Note:
- il client non aspetta piu la completion AI per continuare il flusso
- `analyses` funge sia da record business sia da job store leggero
- il raw content resta in `newsletter_entries.content` ed e anche snapshottato in `analyses.source_snapshot`
- la validazione dell'output AI avviene prima del salvataggio del `result`
- il retry base e gestito nel processor condiviso, senza introdurre una coda esterna

### 7.4 Gmail connect -> sync -> inbox -> extraction

```text
Connect Gmail
  -> gmail-auth initiate
  -> signed + expiring OAuth state
  -> Google OAuth
  -> gmail-auth callback
  -> safe redirect back to the requested in-app path on an allowed origin
  -> save gmail_connections + gmail_tokens
  -> gmail-sync
  -> newsletter_inbox
  -> optional sync_workspace_newsletter_attribution
  -> optional get_newsletter_competitor_suggestions
  -> extract-newsletter-intel
  -> newsletter_extractions
```

File chiave:
- `src/hooks/useGmailConnection.tsx`
- `src/hooks/useNewsletterInbox.tsx`
- `supabase/functions/gmail-auth/index.ts`
- `supabase/functions/gmail-sync/index.ts`
- `supabase/functions/extract-newsletter-intel/index.ts`

Nota di sicurezza:
- il callback Gmail non si basa piu su uno `state` solo base64; il payload e firmato lato server e scade rapidamente
- il redirect post-OAuth preserva path e query solo se l'origin richiesto e tra quelli consentiti

Nota operativa:
- `gmail-sync` ritorna anche un riepilogo strutturato (`status`, `message`, `imported`, `skipped`, `errors`, `attributed`, `needs_review`, `total`, `sync_mode`, `synced_at`) usato dalla Inbox per confermare quando non ci sono nuove mail, quando arrivano nuove importazioni e quante email sono gia state attribuite a competitor noti
- la logica di matching competitor-newsletter usa `domains` e `website` del competitor, con match esatto o per sottodominio (`mail.lovable.dev` puo essere attribuito a `lovable.dev`)
- la Inbox tenta un auto-match in background quando esistono competitor monitorati e offre anche un override manuale per singola newsletter
- l'inbox puo proporre nuovi competitor partendo dai sender domain non ancora mappati

### 7.5 Insights generation

```text
Insights page
  -> load existing insights
  -> generate-insights
  -> aggregate inbox/extractions/ads/competitors
  -> OpenAI or deterministic fallback
  -> insert insights
```

File chiave:
- `src/pages/Insights.tsx`
- `src/hooks/useInsights.tsx`
- `supabase/functions/generate-insights/index.ts`

Note operative:
- la function genera insight piu orientati alla decisione e al piano d'azione
- la pagina insights legge e mostra il nuovo schema persistito degli insight, mantenendo nel client solo la normalizzazione/fallback del contratto
- `recommended_response` viene spezzato in `Immediate / Next 30 days / Measure`

### 7.6 Billing

```text
Billing page
  -> check-subscription
  -> create-checkout
  -> Stripe Checkout
  -> stripe-webhook
  -> workspace_billing
  -> return to app
  -> check-subscription
  -> customer-portal
```

File chiave:
- `src/hooks/useSubscription.tsx`
- `supabase/functions/check-subscription/index.ts`
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/customer-portal/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/_shared/stripe-billing.ts`

Nota:
- la sincronizzazione subscription e ora sia on-demand sia event-driven
- non e ancora osservato un meccanismo di riconciliazione schedulata

### 7.7 Admin

```text
Admin UI
  -> admin-data auth_status
  -> admin guard
  -> admin-data actions
  -> service-role queries / mutations
```

File chiave:
- `src/hooks/useAdmin.tsx`
- `src/components/admin/AdminGuard.tsx`
- `supabase/functions/admin-data/index.ts`

Note operative:
- l'azione `users` di `admin-data` ritorna ora `total`, `page`, `perPage`
- i log admin espongono anche `metadata` per rendere l'audit trail piu utile

## 8. Data Flow Summary

### Manual content pipeline

```text
newsletter_entries
  -> enqueue-newsletter-analysis
  -> analyses (pending / processing / completed / failed)
  -> analysis result visible in UI
```

### Gmail pipeline

```text
gmail_connections
  -> gmail_tokens
  -> newsletter_inbox
  -> auto-match / manual match competitor attribution
  -> newsletter_extractions
  -> alerts / insights / analytics
```

### Meta Ads pipeline

```text
Meta API
  -> meta_ads
  -> meta_ad_analyses
  -> insights / analytics
```

### Alert pipeline

```text
alert_rules
  -> evaluate-alerts (manual / scheduled scan)
  -> _shared/alerts.ts
  -> alerts
  -> alert_trigger_logs

gmail-sync / extract-newsletter-intel / fetch-meta-ads
  -> _shared/alerts.ts (background event-driven evaluation)
  -> alerts
  -> alert_trigger_logs
```

### Billing pipeline

```text
Stripe
  -> stripe-webhook
  -> workspace_billing
  -> SubscriptionProvider
  -> Billing / Usage UI
```

## 9. Cross-Cutting Concerns

### Auth and authorization

- browser auth: Supabase session
- DB authZ: RLS
- function authZ: `_shared/auth.ts`
- platform admin separato da workspace admin
- Gmail OAuth state firmato lato function

### Rate limiting

Presente via RPC `check_rate_limit` per varie functions AI/integration.

Non osservato:
- rate limiting HTTP generale

### Error handling

- frontend: `invokeEdgeFunction`
- backend: `HttpError` + `jsonResponse`
- logging prevalente: `console.error`, `audit_log`, `usage_events`
- alerting: `alert_trigger_logs` conserva trigger riusciti, soppressi da cooldown e failure di persistence

### Environment management

Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Backend:
- Supabase service role
- Google OAuth creds
- Stripe key/prices
- OpenAI keys/model names
- Meta token
- app origins

### Demo / beta logic

Due aree usano esplicitamente dati demo o gating:
- inbox demo se Gmail non connesso e nessun dato reale
- Meta Ads UI come preview beta

## 10. Known Architectural Constraints

- Esiste una queue leggera solo per `newsletter_entries -> analyses`, implementata dentro `analyses` e orchestrata da `enqueue-newsletter-analysis`.
- Non esiste ancora un cron/scheduler osservato per Gmail sync o per scansioni alert periodiche, ma l'alerting ora e anche event-driven sui flussi `gmail-sync`, `extract-newsletter-intel` e `fetch-meta-ads`.
- Generated types Supabase non allineati alle ultime migrazioni.
- `QueryClientProvider` presente ma non sfruttato come data layer reale.
- Molta logica di business distribuita in hook/page anziche in servizi dedicati.
- Alcune promesse di prodotto sono piu avanti della implementazione runtime.
- Il dashboard e server-driven tramite `dashboard-snapshot`, ma il contract type-safe con i generated types DB non e ancora allineato.
- Gli insight persistono ora `priority_level` e `impact_area` nel database, quindi query, export e dashboard leggono un contratto comune; restano comunque da portare lato SQL eventuali report/alert che vogliano sfruttare l'intero schema strutturato.

## 11. Recommended Reading Order

1. `src/App.tsx`
2. `src/hooks/useAuth.tsx`
3. `src/hooks/useWorkspace.tsx`
4. `src/hooks/useRoles.tsx`
5. `src/hooks/useSubscription.tsx`
6. `supabase/functions/_shared/auth.ts`
7. `supabase/migrations/20260401031600_1372769e-63e2-4a1f-b922-337c4fc533c4.sql`
8. `supabase/migrations/20260405143000_harden_platform_auth_and_billing.sql`
9. `supabase/functions/gmail-auth/index.ts`
10. `supabase/functions/gmail-sync/index.ts`
11. `supabase/functions/generate-insights/index.ts`
12. `src/lib/insight-priority.ts`
13. `src/lib/dashboard-decision-engine.ts`
14. `supabase/functions/admin-data/index.ts`
