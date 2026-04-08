# PROJECT AUDIT

Audit tecnico del repository `competitor-compass` basato sul codice e sulla working tree corrente.

| Campo | Valore |
| --- | --- |
| Data audit | 2026-04-06 |
| Branch osservato | `feature/dashboard-decision-engine` |
| Ambito | Working tree locale corrente, non necessariamente coincidente con l'ultimo commit remoto |
| Verifiche eseguite | `npm run build` = OK, `npm run test` = OK, `npm run lint` = OK, `npm run test:e2e` = OK |

Nota metodologica:
- Le affermazioni non marcate come inferenza derivano da codice, configurazioni, migrazioni, script e comandi eseguiti localmente.
- Le deduzioni di prodotto o di maturita non esplicitate nel codice sono indicate come inferenze oppure riportate in `17. Ambiguita / Da verificare`.

## 1. Executive Summary

Tracklyze e un SaaS di competitive intelligence per team marketing/growth/e-commerce. Il prodotto raccoglie dati sui competitor da Gmail e da input manuale, li salva in Supabase, li analizza con OpenAI, genera insight strategici, mostra dashboard e permette alert, billing e gestione workspace.

Aggiornamento rilevante della working tree osservata:
- il dashboard e stato portato verso una decision interface con highlights, anomalie, competitor pressure e azioni raccomandate
- il dashboard espone ora anche un AI brief esplicito (`What changed today`, `What matters most`) e filtri rapidi per competitor/campaign type, mantenendo compatibilita con snapshot legacy incompleti
- il dashboard principale usa ora uno snapshot server-side dedicato (`dashboard-snapshot`) come fonte primaria dei dati
- il modulo competitor espone ora un profilo strategico server-driven (`competitor-intelligence`) con timeline campagne, evoluzione messaggi, comportamento promo, focus categorie e assessment strengths/weaknesses/gaps/opportunities
- gli insight sono piu strategici e action-oriented e ora persistono anche un layer strutturato query-friendly (`campaign_type`, `offer_*`, `cta_*`, `product_categories`, `positioning_angle`, `strategic_takeaway`, `priority_level`, `impact_area`)
- l'admin panel e piu operativo su users/logs
- il signup ritorna su `/redirect` per riusare il bootstrap auth/workspace
- il billing Stripe e ora sincronizzato anche event-driven tramite `stripe-webhook`
- esiste una suite Playwright core-flow versionata nel repo per auth, onboarding, Gmail, billing e admin

Stato attuale di maturita:
- Il prodotto e utilizzabile in locale e ha una superficie funzionale ampia.
- I moduli core frontend/backend sono presenti e integrati: auth, workspaces, onboarding, inbox, analisi AI, insight, alert, billing, admin panel.
- Alcune aree sono esplicitamente incomplete o in beta: Meta Ads UI, inviti team, smoke test E2E live contro integrazioni reali, scheduler/automazioni e alcune promesse commerciali.

Moduli principali gia sviluppati:
- autenticazione email/password con Supabase Auth
- multi-workspace con ruoli
- onboarding a step
- import manuale newsletter
- integrazione Gmail con OAuth e sync inbox
- estrazione AI da inbox e analisi AI su contenuti manuali
- generazione insight aggregati
- alert rules e alert history
- billing Stripe workspace-scoped
- admin panel piattaforma

Elementi mancanti o incompleti:
- invito membri reale via email
- Meta Ads lato UI ancora in modalita demo/beta
- automazioni pianificate reali non osservate
- test coverage ancora leggera fuori dai core browser flow
- documentazione tecnica presente ma da mantenere allineata

Valutazione sintetica di qualita:
- Architettura coerente per un SaaS single-repo basato su Supabase.
- Qualita complessiva buona ma non ancora "production-hardened" in ogni area.
- I rischi principali non sono di build, ma di operativita: configurazione ambienti, assenza di scheduler, tipi generati non allineati allo schema piu recente, logica di piano parzialmente applicata solo client-side, alcune policy RLS ancora ampie e demo/beta flows mischiati a flussi reali.

## 2. Product Understanding

### Problema che il SaaS sembra risolvere

Inferenza dal codice marketing, dalle pagine applicative e dai modelli dati:
- ridurre il lavoro manuale di monitoraggio competitor
- centralizzare newsletter, campagne, alert e segnali di mercato in un solo posto
- trasformare contenuti competitor in insight azionabili per pricing, promozioni, messaging, cadence, product focus e paid media

### Utente target

Inferenza forte da `src/pages/Index.tsx`, `src/pages/Billing.tsx`, `src/pages/UsageDashboard.tsx`:
- team marketing
- team growth
- team e-commerce / DTC
- team SaaS con bisogno di market intelligence
- figure come Head of Growth, Marketing Director, VP Marketing

### Funzionalita principali implementate

- account utente e reset password
- creazione workspace
- gestione ruoli e membri nel workspace
- onboarding guidato
- tracking competitor
- acquisizione contenuti competitor via Gmail oppure da input manuale
- analisi AI strutturata
- dashboard e analytics
- insight strategici aggregati
- alert rules e notifiche in-app
- billing e piano
- admin panel per supervisione piattaforma

### User flow principali deducibili

- visita landing -> signup/login -> redirect -> onboarding -> workspace -> competitor setup -> Gmail connect/manual import -> dashboard
- import manuale di newsletter -> analisi AI -> consultazione dettaglio analisi
- sync Gmail -> inbox competitor -> lettura newsletter -> extract intelligence -> insight/alert/dashboard
- piano free -> upgrade Stripe -> refresh subscription -> sblocco capacity/features
- platform admin -> admin panel -> overview, users, workspaces, logs, integration health

### Funzionalita parziali o non complete

- Meta Ads: backend quasi pronto, frontend volutamente demo-gated
- team invitations: UI presente ma invio email non implementato
- feature flags: tabella e admin toggle presenti, uso runtime non osservato
- Slack/webhook alerts, scheduled reports, anomaly detection, branded reports: venduti in copy/pricing, ma non implementati in modo osservabile nel codice runtime

## 3. Stack Tecnologico

| Categoria | Tecnologia | Note |
| --- | --- | --- |
| Linguaggi | TypeScript, SQL, CSS, Deno TypeScript | Frontend TSX, Supabase Edge Functions, migrazioni SQL |
| Frontend framework | React 18 | SPA con `react-router-dom` |
| Build tool | Vite 8 + SWC | `@vitejs/plugin-react-swc` |
| Styling | Tailwind CSS + shadcn/ui + Radix UI | design system custom su componenti Radix |
| State / data | React Context, state locale, Supabase client | `@tanstack/react-query` montato ma non usato nel fetching applicativo |
| Backend | Supabase Edge Functions | Nessun server Node/Express separato |
| Database | Supabase Postgres | schema gestito con migrazioni SQL |
| Auth | Supabase Auth | email/password, reset password |
| Authorization | Supabase RLS + ruoli applicativi | dual model: `workspace_members` + `user_roles` |
| ORM | Nessuno | query dirette Supabase + SQL RPC |
| AI | OpenAI Chat Completions API | helper comune in `supabase/functions/_shared/openai.ts` |
| Billing | Stripe | checkout, portal, sync subscription on-demand + webhook event-driven |
| Gmail | Google OAuth 2.0 + Gmail API | via Edge Functions |
| Ads | Meta Ad Library API | backend presente, UI ancora beta/demo |
| Charts | Recharts | analytics/dashboard |
| Sanitizzazione HTML | DOMPurify | newsletter reader |
| Form library | `react-hook-form` | dipendenza presente; uso applicativo minimo |
| Validation library | `zod` | installata ma non usata nel codice applicativo osservato |
| Testing | Vitest + Testing Library | test unitari/component su auth, guards e decision layer |
| Browser E2E | Playwright | suite core-flow presente e passante, con mocking deterministico delle integrazioni |
| Package manager | npm | `package-lock.json` presente |
| Repo model | Single package repo | non monorepo |

Hosting/deploy deducibile:
- backend, auth, DB e functions: Supabase
- frontend: SPA Vite deployabile staticamente; il provider di hosting del frontend non e esplicitato nel repo

## 4. Struttura del Repository

### Mini mappa del repository

```text
.
├─ public/
│  ├─ favicon.ico
│  ├─ placeholder.svg
│  └─ robots.txt
├─ src/
│  ├─ components/
│  │  ├─ admin/
│  │  ├─ meta-ads/
│  │  └─ ui/
│  ├─ hooks/
│  ├─ integrations/supabase/
│  ├─ lib/
│  ├─ pages/
│  │  └─ admin/
│  ├─ test/
│  └─ types/
├─ supabase/
│  ├─ functions/
│  │  ├─ _shared/
│  │  └─ <12 edge functions>
│  └─ migrations/
├─ README.md
├─ package.json
├─ vite.config.ts
├─ vitest.config.ts
├─ eslint.config.js
├─ tailwind.config.ts
├─ components.json
├─ playwright.config.ts
└─ .env.example
```

### Cartelle principali

| Cartella | Scopo |
| --- | --- |
| `src/components` | shell UI, admin UI, meta ads UI, componenti shadcn/ui |
| `src/hooks` | auth, workspace, ruoli, subscription, onboarding, usage, inbox, insight, admin |
| `src/integrations/supabase` | client Supabase browser e tipi DB generati |
| `src/lib` | helper condivisi frontend: env, error parsing, edge invoke, demo data, CSV export |
| `src/pages` | route pages pubbliche, applicative e admin |
| `src/types` | tipi applicativi non coperti dai generated types |
| `supabase/functions` | Edge Functions Deno e helper condivisi |
| `supabase/migrations` | evoluzione schema, RPC, policy RLS, trigger |

### Entry point applicativi

- Frontend bootstrap: `src/main.tsx`
- Router e provider tree: `src/App.tsx`
- Client Supabase browser: `src/integrations/supabase/client.ts`
- Edge auth helper: `supabase/functions/_shared/auth.ts`

### File di configurazione rilevanti

- `package.json`: script e dipendenze
- `vite.config.ts`: dev server, alias, plugin React SWC
- `vitest.config.ts`: jsdom e setup test
- `eslint.config.js`: policy lint
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: TypeScript config
- `tailwind.config.ts`, `components.json`: styling/design system
- `supabase/config.toml`: project ref e `verify_jwt` per le functions
- `.env.example`: env frontend minima, oggi incompleta rispetto al backend reale

### Script importanti

| Script | Funzione |
| --- | --- |
| `npm run dev` | avvio frontend locale |
| `npm run build` | build produzione Vite |
| `npm run lint` | lint ESLint |
| `npm run test` | suite Vitest |
| `npm run preview` | preview build |

### Convenzioni organizzative osservate

- alias `@/` per il frontend
- logica business frontend distribuita in hook custom + page components
- edge functions con helper condivisi in `_shared`
- uso di generated types Supabase nel frontend, ma non in tutte le functions
- naming DB in `snake_case`, naming frontend in `camelCase`

## 5. Architettura Applicativa

### Architettura frontend

- SPA React con routing client-side.
- Provider tree principale:
  - `AuthProvider`
  - `WorkspaceProvider`
  - `SubscriptionProvider`
  - `QueryClientProvider` (attualmente non sfruttato per il fetching reale)
- Shell autenticata con `AppLayout`, `AppSidebar`, `TopBar`, `EmailVerificationBanner`.
- Pagine lazy-loaded per ridurre il carico iniziale.

### Architettura backend

- Nessun backend applicativo tradizionale separato.
- Il backend e composto da:
  - Supabase Auth
  - Supabase Postgres con RLS
  - SQL RPC (`create_workspace`, `get_workspace_analytics`, `check_rate_limit`, ecc.)
  - Supabase Edge Functions per operazioni privilegiate, integrazioni esterne e AI

### Comunicazione frontend/backend

- Frontend -> DB diretto per CRUD consentiti da RLS:
  - `workspaces`
  - `competitors`
  - `newsletter_entries`
  - `newsletter_inbox`
  - `insights`
  - `alerts`
  - `workspace_members`
  - `user_roles`
- Frontend -> Edge Functions per:
  - Gmail OAuth/sync
  - OpenAI extraction/analysis/insights
  - Stripe billing
  - Meta Ads fetch/analyze
  - admin operations

### Servizi condivisi

- `src/lib/invokeEdgeFunction.ts`: wrapper comune per bearer token e parsing errori
- `supabase/functions/_shared/auth.ts`: authZ/authN lato function
- `supabase/functions/_shared/app.ts`: safe origin / redirect sanitization
- `supabase/functions/_shared/billing.ts`: plan map Stripe
- `supabase/functions/_shared/openai.ts`: chiamata comune OpenAI

### Pattern architetturali riconoscibili

- Context-based application shell
- hook-per-feature
- edge-function-per-capability
- policy-based DB security con RLS
- AI workflow sincroni e user-triggered

### Gestione stato

- Context React per auth/workspace/subscription
- `useState` / `useEffect` per il resto
- `localStorage`:
  - `current_workspace_id`
  - stato onboarding per workspace
  - tema dark mode
- `sessionStorage`:
  - tier subscription per workspace

### Separazione delle responsabilita

Positiva:
- auth/workspace/subscription separati
- helpers edge condivisi
- pages raggruppate per dominio

Criticita:
- molta logica business e ancora dentro le pagine
- `generate-insights` e `admin-data` sono file monolitici
- duplicazione di concetti di ruolo: membership role vs app role

### Multi-tenant logic

Presente e centrale:
- `workspace_id` e il perno tenant su quasi tutto il dominio
- RLS basata su membership workspace
- billing workspace-scoped
- admin panel piattaforma separato dal concetto di workspace admin

### Job, queue, cron, webhook, eventi

Fatti osservati:
- esiste una queue leggera per `newsletter_entries -> analyses`, ottenuta riusando `analyses` come job store con stato/tentativi/snapshot input
- nessun sistema di queue/worker dedicato general-purpose trovato
- nessun cron job osservato nel repo
- webhook Stripe presente come Edge Function `stripe-webhook`
- uso di `usage_events` e `audit_log` come event store leggero interno

Conseguenza architetturale:
- molte operazioni pesanti sono eseguite in tempo reale su richiesta utente
- esiste una pipeline asincrona locale al dominio newsletter manuale, ma non un sistema di job/scheduler uniforme per il resto del prodotto

## 6. Funzionalita Implementate

| Funzionalita | Descrizione | Dove si trova | Stato | Dipendenze | Criticita |
| --- | --- | --- | --- | --- | --- |
| Auth utente | signup/login/reset password con email/password | `src/hooks/useAuth.tsx`, `src/pages/Auth.tsx`, `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx` | Completa | Supabase Auth | nessun social login |
| Workspace bootstrap | carica workspace visibili, seleziona workspace corrente, crea workspace via RPC | `src/hooks/useWorkspace.tsx` | Completa | `workspaces`, `workspace_members`, `create_workspace` | stato corrente in `localStorage` |
| RBAC workspace | ruoli membership + app roles | `src/hooks/useRoles.tsx`, migrations ruoli | Quasi fatta | `workspace_members`, `user_roles` | modello duale complesso |
| Onboarding | checklist e progress locale per setup | `src/pages/Onboarding.tsx`, `src/hooks/useOnboarding.tsx` | Quasi fatta | workspace, competitors, Gmail, insights | stato non persistito server-side |
| Competitor management | CRUD competitor per workspace + domini di matching inbox | `src/pages/Competitors.tsx`, RPC `sync_competitor_newsletter_attribution` | Completa | `competitors`, `newsletter_inbox`, `useUsage`, `useAuditLog` | limiti piano applicati solo client-side |
| Competitor intelligence profile | profilo strategico per competitor con timeline, messaging evolution, promo behavior, category focus e assessment | `src/pages/Competitors.tsx`, `src/hooks/useCompetitorIntelligence.tsx`, `src/lib/competitor-intelligence.ts`, `supabase/functions/competitor-intelligence` | Completa | `competitors`, `newsletter_inbox`, `newsletter_extractions`, `meta_ads`, `insights` | heuristics ancora codificate in helper TS condiviso, non in SQL/materialized layer |
| Import manuale newsletter | paste contenuto e analisi asincrona automatica | `src/pages/NewNewsletter.tsx`, `src/pages/NewsletterDetail.tsx`, `src/lib/newsletter-analysis.ts` | Completa | `newsletter_entries`, `analyses`, `enqueue-newsletter-analysis`, `analyze-newsletter` | pipeline separata dalla inbox Gmail, ma ora con queue locale al dominio analisi |
| Gmail connect + sync | OAuth Google, sync inbox e attribution feedback | `src/hooks/useGmailConnection.tsx`, `supabase/functions/gmail-auth`, `supabase/functions/gmail-sync` | Quasi fatta | Google OAuth/Gmail API, Supabase | il sync ora restituisce anche matched/unassigned; onboarding usa ancora il flusso Gmail standard |
| Inbox competitor | lista newsletter Gmail/importate, lettura, tagging, archive, suggerimenti competitor | `src/pages/NewsletterInbox.tsx`, `src/pages/NewsletterReader.tsx`, `src/hooks/useNewsletterInbox.tsx`, RPC competitor suggestion/matching | Quasi fatta | `newsletter_inbox`, `newsletter_extractions`, `competitors` | demo mode attivo se inbox vuota e Gmail non connesso |
| AI extraction inbox | estrae offerte, CTA, categorie, urgenza | `supabase/functions/extract-newsletter-intel` | Completa | OpenAI, rate limits | fallback euristico, file grande |
| AI manual analysis | analisi contenuto newsletter manuale | `supabase/functions/enqueue-newsletter-analysis`, `supabase/functions/analyze-newsletter`, `src/pages/AnalysisView.tsx` | Completa | OpenAI, `analyses` | esecuzione asincrona in background con validazione output, retry base e polling UI |
| Insights strategici | aggrega segnali e genera insight operativi | `src/pages/Insights.tsx`, `src/hooks/useInsights.tsx`, `src/lib/insight-priority.ts`, `src/lib/insight-normalization.ts`, `supabase/functions/generate-insights` | Quasi fatta | OpenAI, inbox, extractions, ads | piu utile e densa; schema insight persistito e query-friendly, ma la function resta monolitica |
| Analytics dashboard | analytics aggregate via RPC con range selector, action queue, data health audit, attribution coverage, share-of-voice e signal feed | `src/pages/Analytics.tsx`, `src/hooks/useAnalyticsData.tsx`, `src/lib/analytics-audit.ts`, RPC `get_workspace_analytics` | Completa | Postgres RPC, Recharts | dipende dalla qualita dei dati ingestiti; il layer operativo e ancora client-side |
| Dashboard decisionale | pannello principale orientato alla decisione | `src/pages/Dashboard.tsx`, `src/hooks/useDashboardSnapshot.tsx`, `src/lib/dashboard-decision-engine.ts`, `supabase/functions/dashboard-snapshot` | Completa | snapshot server-side, analytics RPC, alerts, insights, usage, Gmail status | lo snapshot e server-driven, ma la logica resta condivisa tra helper TS frontend/backend |
| Alerts | regole per utente/workspace, notifiche in-app, trigger log e evaluation manuale/event-driven | `src/pages/Alerts.tsx`, `src/hooks/useAlerts.tsx`, `supabase/functions/evaluate-alerts`, `supabase/functions/_shared/alerts.ts` | Quasi fatta | `alert_rules`, `alerts`, `alert_trigger_logs` | nessun canale esterno reale osservato; manca ancora un cron per scansioni periodiche |
| Billing | checkout, portal, current plan, usage bars | `src/pages/Billing.tsx`, `src/hooks/useSubscription.tsx`, `stripe-webhook` e funzioni Stripe correlate | Quasi fatta | Stripe, `workspace_billing`, `stripe_webhook_events` | sync event-driven presente; mancano scheduler e test contract/live su tutto il ciclo billing |
| Usage metering | visualizza metrica piano/uso | `src/hooks/useUsage.tsx`, `src/pages/UsageDashboard.tsx` | Quasi fatta | `usage_events` | enforcement solo parziale lato server |
| Team management | mostra membri e assegna app roles | `src/pages/TeamManagement.tsx` | Parziale | `workspace_members`, `user_roles` | inviti reali non implementati |
| Admin panel | supervisione piattaforma, utenti, workspaces, logs, integrations | `src/pages/admin/*`, `supabase/functions/admin-data`, `src/types/admin.ts` | Quasi fatta | platform admin, service role | users paginati e log con metadata; backend ancora molto denso |
| Meta Ads intelligence | backend fetch/analyze, UI preview demo | `src/pages/MetaAds.tsx`, `src/pages/MetaAdsCompare.tsx`, `supabase/functions/fetch-meta-ads`, `supabase/functions/analyze-meta-ad` | Parziale / Beta | Meta API, OpenAI | UI ancora non usa i dati reali |

## 7. Flussi Core del Sistema

### 7.1 Registrazione / login / reset password

Flusso:
1. Utente entra in `src/pages/Auth.tsx`.
2. `useAuth` chiama Supabase Auth per signup/signin.
3. Dopo autenticazione, il route `/redirect` usa `src/components/AuthRedirect.tsx`.
4. Se non ci sono workspace -> `/onboarding`.
5. Se ci sono workspace -> `/dashboard`.

File principali:
- `src/hooks/useAuth.tsx`
- `src/components/AuthRedirect.tsx`
- `src/pages/Auth.tsx`
- `src/pages/ForgotPassword.tsx`
- `src/pages/ResetPassword.tsx`

Note:
- auth provider e browser-side
- email verification gestita, ma non come hard block globale
- `useAuth.signUp()` usa `emailRedirectTo = <origin>/redirect`, quindi email verification e login rientrano nello stesso bootstrap route

### 7.2 Onboarding e creazione workspace

Flusso:
1. `src/pages/Onboarding.tsx` gestisce steps.
2. Step workspace chiama `useWorkspace.createWorkspace()`.
3. `create_workspace` RPC inserisce la riga in `workspaces`.
4. Trigger DB aggiungono owner in `workspace_members` e ruolo admin in `user_roles`.
5. Stato onboarding viene salvato in `localStorage` via `useOnboarding`.

File principali:
- `src/pages/Onboarding.tsx`
- `src/hooks/useOnboarding.tsx`
- `src/hooks/useWorkspace.tsx`
- `supabase/migrations/20260405003000_simplify_create_workspace.sql`

Criticita:
- progress onboarding non persistito server-side
- Gmail step usa ancora il redirect dello hook standard verso `/settings`, non verso ritorno contestuale all'onboarding

### 7.3 Gestione competitor

Flusso:
1. Pagina `src/pages/Competitors.tsx` legge `competitors` del workspace corrente.
2. Controlla i permessi con `useRoles`.
3. Controlla limiti piano con `useUsage`.
4. In creazione deriva anche i `domains` dal website e dall'input manuale.
5. Inserisce/cancella righe direttamente su `competitors`.
6. Dopo la creazione invoca `sync_competitor_newsletter_attribution` per collegare newsletter Gmail gia presenti allo stesso dominio competitor.
7. Traccia audit e usage events.

Criticita:
- enforcement limiti competitor fatto nel client; aggirabile se non esiste equivalente lato server

### 7.4 Import manuale newsletter e analisi

Flusso:
1. `src/pages/NewNewsletter.tsx` salva il contenuto in `newsletter_entries`.
2. `enqueue-newsletter-analysis` crea una riga `analyses` con stato `pending`, snapshot del raw content, utente richiedente e metadata di tentativo.
3. Il processor condiviso `_shared/newsletter-analysis.ts` esegue l'analisi in background, valida l'output AI e salva solo payload strutturati validi.
4. `src/pages/AnalysisView.tsx` polla l'analisi finche non e `completed`/`failed`.

File principali:
- `src/pages/NewNewsletter.tsx`
- `src/pages/NewsletterDetail.tsx`
- `src/pages/AnalysisView.tsx`
- `src/lib/newsletter-analysis.ts`
- `supabase/functions/enqueue-newsletter-analysis/index.ts`
- `supabase/functions/analyze-newsletter/index.ts`

### 7.5 Gmail connect, sync e intelligence extraction

Flusso:
1. `useGmailConnection.connect()` invoca `gmail-auth` con `action: "initiate"`.
2. `gmail-auth` costruisce URL Google OAuth.
3. Google callback torna alla stessa Edge Function.
4. La function salva `gmail_connections` e `gmail_tokens`.
5. Da UI, `sync()` invoca `gmail-sync`.
6. `gmail-sync` legge Gmail API, classifica le email, associa competitor usando `domains` e `website`, inserisce `newsletter_inbox` e restituisce un riepilogo (`imported`, `matched`, `needs_review`, ecc.).
7. La Inbox puo anche invocare `sync_workspace_newsletter_attribution` per riallineare email storiche ai competitor esistenti.
8. Se restano newsletter non attribuite, la Inbox usa `get_newsletter_competitor_suggestions` per suggerire la creazione del competitor mancante.
9. `NewsletterReader` o inbox invocano `extract-newsletter-intel`.
10. L'extraction salva `newsletter_extractions`.

File principali:
- `src/hooks/useGmailConnection.tsx`
- `src/pages/NewsletterInbox.tsx`
- `src/pages/NewsletterReader.tsx`
- `src/hooks/useNewsletterInbox.tsx`
- `supabase/functions/gmail-auth/index.ts`
- `supabase/functions/gmail-sync/index.ts`
- `supabase/functions/extract-newsletter-intel/index.ts`

Criticita:
- modalita demo in inbox se Gmail non connesso e nessun dato reale
- nessun scheduler osservato per sync automatiche server-side; per gli alert esiste ora anche un path event-driven oltre alla scansione manuale

### 7.6 Generazione insight

Flusso:
1. `src/pages/Insights.tsx` carica insight esistenti da `insights`.
2. `useInsights.generateInsights()` invoca Edge Function `generate-insights`.
3. La function aggrega dati da `newsletter_inbox`, `newsletter_extractions`, `meta_ads`, `meta_ad_analyses`, `competitors`.
4. Chiama OpenAI oppure usa fallback deterministico.
5. Salva nuove righe in `insights`.

File principali:
- `src/pages/Insights.tsx`
- `src/hooks/useInsights.tsx`
- `supabase/functions/generate-insights/index.ts`

### 7.7 Billing

Flusso:
1. `useSubscription.checkSubscription()` invoca `check-subscription`.
2. `useSubscription.checkout(plan)` invoca `create-checkout`.
3. `create-checkout` crea customer/session Stripe e aggiorna `workspace_billing`.
4. Stripe ritorna al frontend con query param `checkout=success`.
5. Stripe invia eventi a `stripe-webhook`, che sincronizza `workspace_billing` in modo event-driven.
6. `useSubscription` richiama `checkSubscription()` per refresh immediato della UI.
7. `customer-portal` apre il portal Stripe.

File principali:
- `src/hooks/useSubscription.tsx`
- `src/pages/Billing.tsx`
- `supabase/functions/check-subscription/index.ts`
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/customer-portal/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/_shared/stripe-billing.ts`

Criticita:
- il sync event-driven esiste, ma manca ancora una suite di contract test/live validation sul ciclo renewal/cancellation/failure
- non e stato osservato uno scheduler complementare per riconciliazioni periodiche

### 7.8 Admin panel

Flusso:
1. UI verifica `auth_status` tramite `useAdminCheck`.
2. `AdminGuard` permette l'accesso solo se `isPlatformAdmin`.
3. Le varie schermate admin invocano `admin-data` con `action` diverse.
4. La function esegue query service-role e azioni amministrative.

File principali:
- `src/hooks/useAdmin.tsx`
- `src/components/admin/AdminGuard.tsx`
- `src/pages/admin/*`
- `supabase/functions/admin-data/index.ts`

Criticita:
- l'accesso admin dipende da `PLATFORM_ADMIN_EMAILS` o dalla tabella `platform_admins`, quindi gli ambienti non configurati correttamente perdono il pannello admin anche se il codice frontend e coerente

## 8. Data Model e Persistenza

### Entita principali

| Entita | Scopo | Relazioni principali |
| --- | --- | --- |
| `profiles` | profilo applicativo utente | 1:1 con `auth.users` |
| `workspaces` | tenant principale | owner -> `auth.users`; 1:N con quasi tutte le entita |
| `workspace_members` | membership tenant | collega utenti e workspace |
| `user_roles` | ruoli applicativi (`admin`, `analyst`, `viewer`) | per workspace |
| `competitors` | competitor monitorati | appartiene a workspace |
| `newsletter_entries` | input manuale | appartiene a workspace, opzionalmente competitor |
| `analyses` | analisi AI su `newsletter_entries` e job store leggero della pipeline manuale | 1:N rispetto a `newsletter_entries`; contiene anche stato job, snapshot input, tentativi e validation notes |
| `gmail_connections` | connessioni Gmail autorizzate | per workspace e utente |
| `gmail_tokens` | token OAuth Google | 1:1 con `gmail_connections` |
| `newsletter_inbox` | inbox sincronizzata da Gmail | per workspace, opzionale competitor |
| `newsletter_extractions` | output strutturato da inbox | 1:N con `newsletter_inbox` |
| `meta_ads` | ads importate da Meta | per workspace, opzionale competitor |
| `meta_ad_analyses` | analisi AI degli ads | 1:N con `meta_ads` |
| `alert_rules` | regole di alert | per workspace e proprietario utente |
| `alerts` | notifiche generate | per workspace con destinatario utente |
| `alert_trigger_logs` | audit trail dei trigger alert | per workspace con destinatario utente |
| `insights` | insight strategici persistiti | per workspace |
| `usage_events` | metering interno e analytics prodotto | per workspace |
| `audit_log` | audit trail | per workspace |
| `rate_limits` | throttling backend | per user/endpoint/workspace |
| `feature_flags` | registry feature flags | amministrazione piattaforma |
| `platform_admins` | admin piattaforma | aggiunto da migrazione recente |
| `workspace_billing` | stato billing per workspace | aggiunto da migrazione recente |

### Relazioni e pattern chiave

- `workspace_id` e il perno tenant su quasi tutto il dominio.
- Esistono due pipeline dati principali:
  - pipeline manuale: `newsletter_entries` -> `analyses`
  - pipeline Gmail: `gmail_connections` -> `newsletter_inbox` -> `newsletter_extractions`
- `insights` aggrega segnali provenienti da pipeline diverse.
- `usage_events` serve sia per usage UI sia per analytics interni leggeri.

### Migrazioni

Fatti osservati:
- `supabase/migrations/` contiene 15 migration file.
- Le migrazioni coprono schema base, RPC, rate limiting, analytics RPC, feature flags e hardening auth/billing recente.

Migrazioni chiave:
- `20260401031600_1372769e-63e2-4a1f-b922-337c4fc533c4.sql`: schema core iniziale
- `20260401032738_f031417b-6345-4291-b82b-6484969d1511.sql`: app roles, audit log, usage events
- `20260401034947_dcf37c97-0749-4d75-8dcc-9855b3847717.sql`: Gmail e inbox
- `20260401042133_bf8bc761-abfe-4f0b-a47b-105175b6dc35.sql`: alerts e insights
- `20260401111301_a3d87963-1153-4985-92b3-0c5623d45659.sql`: analytics RPC
- `20260401111835_753cf501-6458-496a-acbe-e9ce9187b223.sql`: rate limiting RPC
- `20260405143000_harden_platform_auth_and_billing.sql`: `platform_admins`, `workspace_billing`, hardening policy
- `20260406130000_expand_analytics_operational_layers.sql`: analytics range selector, coverage/share-of-voice e competitor audit

### Seed

Non e stato trovato un file `seed.sql` o uno script seed dedicato.

### Validazioni e convenzioni

- naming DB coerente in `snake_case`
- diversi check constraints su enum testuali e stati
- alcune validazioni applicative sono lato client, non lato DB/function

### Punti deboli del modello dati

- dual role model (`workspace_members.role` + `user_roles.role`) aumenta la complessita
- piano/billing/usage non risultano completamente applicati lato server per tutte le operazioni
- `src/integrations/supabase/types.ts` non contiene `platform_admins` e `workspace_billing`: i generated types appaiono non allineati allo schema piu recente
- manual import e Gmail ingestion restano due pipeline distinte; l'import manuale ora ha una queue asincrona locale al dominio `analyses`, ma non esiste ancora un worker/scheduler uniforme per tutto il prodotto

## 9. API / Contratti di Comunicazione

### Edge Functions principali

| Function | Metodo | Input principale | AuthZ | Output principale | Note |
| --- | --- | --- | --- | --- | --- |
| `check-subscription` | POST | `{ workspaceId }` | member workspace | stato subscription/tier | sync Stripe on-demand |
| `create-checkout` | POST | `{ workspaceId, plan }` | admin workspace | `{ url }` | usa piani whitelisted |
| `customer-portal` | POST | `{ workspaceId }` | admin workspace | `{ url }` | apre billing portal |
| `gmail-auth` | POST / GET callback | POST: `{ action, workspaceId, redirectUrl }` | admin workspace / auth user | `{ url }` o redirect callback | OAuth Google |
| `gmail-sync` | POST | `{ connectionId, fullSync?, maxResults? }` | member/analyst via checks server | contatori sync + matched/unassigned | importa inbox Gmail e riporta lo stato attribution |
| `extract-newsletter-intel` | POST | `{ newsletterInboxId }` | verified analyst | `{ extraction }` | OpenAI + fallback euristico |
| `analyze-newsletter` | POST | `{ analysisId, newsletterEntryId }` | verified analyst | stato analisi | pipeline manual import |
| `generate-insights` | POST | `{ workspaceId, category? }` | verified analyst | `{ insights, message? }` | AI + fallback deterministico |
| `fetch-meta-ads` | POST | `{ workspaceId, competitorId?, pageId?, searchTerms?, adType?, limit? }` | analyst | risultati importati | richiede `META_ACCESS_TOKEN` |
| `analyze-meta-ad` | POST | `{ metaAdId }` | verified analyst | analisi ad | OpenAI |
| `evaluate-alerts` | POST | `{ workspaceId, source? }` | analyst | summary alert e scan manuale/scheduled | usa lo stesso evaluator condiviso dei trigger event-driven |
| `admin-data` | POST | `{ action, ... }` | platform admin salvo `auth_status` | payload variabile per action | command-style endpoint admin |

### RPC SQL principali

| RPC | Scopo |
| --- | --- |
| `create_workspace(_name, _slug)` | crea workspace dell'utente autenticato |
| `get_workspace_analytics(_workspace_id, _range_days)` | analytics aggregate lato DB con KPI per range, coverage, share-of-voice e competitor audit |
| `sync_competitor_newsletter_attribution(_competitor_id)` | collega inbox storica al competitor creato/aggiornato |
| `sync_workspace_newsletter_attribution(_workspace_id)` | riallinea newsletter non attribuite con i competitor esistenti |
| `get_newsletter_competitor_suggestions(_workspace_id)` | sender domain non attribuiti da proporre come nuovi competitor |
| `check_rate_limit(_user_id, _workspace_id, _endpoint, _max_per_hour)` | rate limiting service-side |
| `check_extraction_exists(_newsletter_inbox_id)` | dedup extraction |
| `check_ad_analysis_exists(_meta_ad_id)` | dedup ad analysis |
| `is_workspace_member(_user_id, _workspace_id)` | helper tenancy |
| `has_role(_user_id, _workspace_id, _role)` | helper app role |
| `has_any_role(_user_id, _workspace_id, _roles)` | helper app role array |

### Autenticazione / autorizzazione API

Fatti osservati:
- tutte le functions in `supabase/config.toml` hanno `verify_jwt = false`
- l'autenticazione viene fatta manualmente con `requireAuthenticatedUser()` in `_shared/auth.ts`
- l'autorizzazione e funzione-specifica: member/admin/analyst/platform admin

Implica:
- la sicurezza dipende fortemente dal fatto che ogni function continui a chiamare esplicitamente i guard corretti

### Error handling API

- Edge functions usano `jsonResponse()` e `HttpError` in modo relativamente coerente.
- Il frontend usa `invokeEdgeFunction()` per migliorare parsing errori.
- Esistono ancora vari `console.error` lato UI e fallimenti silenziosi in tracking interno.

### API incomplete o incoerenti

- `admin-data` e un endpoint "multi-action" molto potente ma poco segmentato
- Meta Ads ha backend reale ma UI non lo espone come feature attiva
- `stripe-webhook` esiste, ma la copertura contrattuale degli eventi Stripe resta da consolidare

## 10. Frontend Audit

### Pagine / route principali

Pubbliche:
- `/`
- `/auth`
- `/forgot-password`
- `/reset-password`
- `/privacy`
- `/terms`

Bootstrap:
- `/redirect`
- `/onboarding`

Applicative:
- `/dashboard`
- `/inbox`
- `/inbox/:id`
- `/newsletters`
- `/newsletters/new`
- `/newsletters/:id`
- `/competitors`
- `/meta-ads`
- `/meta-ads/compare`
- `/insights`
- `/analytics`
- `/alerts`
- `/analyses/:id`
- `/settings`
- `/settings/team`
- `/settings/usage`
- `/settings/billing`

Admin:
- `/admin`
- `/admin/users`
- `/admin/workspaces`
- `/admin/logs`
- `/admin/integrations`
- `/admin/issues`
- `/admin/secrets`

### Layout e shell

- layout principale: `src/components/AppLayout.tsx`
- navigazione laterale: `src/components/AppSidebar.tsx`
- header con unread alerts
- dark mode gestito in `src/main.tsx` + toggle UI

### Design system deducibile

- Tailwind + componenti shadcn/Radix
- tono visuale SaaS dashboard classico, pulito
- buona coerenza generale dei componenti UI

### Gestione stato

- buona separazione tra context globali e hook di feature
- fetching quasi tutto manuale con `useEffect`
- `QueryClientProvider` presente ma TanStack Query non e usato realmente

### Data fetching

Pattern osservato:
- query dirette `supabase.from(...)`
- edge invoke via helper centralizzato
- poca cache intelligente
- polling manuale in alcuni punti

### Form handling e validazione

- gran parte dei form usa `useState` imperativo
- `react-hook-form` e `zod` non sono usati in modo significativo nel codice applicativo
- validazione spesso minima, inline e non centralizzata

### UX attuale

Punti positivi:
- onboarding chiaro
- dashboard leggibile
- inbox e insight ben navigabili
- stati vuoti in genere presenti
- billing visivamente chiaro

Punti deboli / incoerenze:
- onboarding Gmail usa lo stesso redirect di settings
- inbox entra in demo mode automaticamente, rischio di confusione tra dati reali e sample data
- presenza di stringhe con encoding corrotto (`Loadingâ€¦`, `Â©`, ecc.)
- alcune feature vendute in pricing/landing non hanno corrispettivo runtime osservabile

## 11. Backend Audit

### Servizi

Il backend e organizzato per capability, non per domini separati:
- auth helpers
- billing helpers
- OpenAI helper
- functions per Gmail, AI, alerts, billing, admin

### Controller / handler

- ogni Edge Function funge da handler HTTP completo
- `admin-data` e un command dispatcher centralizzato

### Domain logic

Buona parte della domain logic e dentro:
- functions AI (`analyze-newsletter`, `extract-newsletter-intel`, `generate-insights`, `analyze-meta-ad`)
- functions integrazioni (`gmail-sync`, `fetch-meta-ads`)
- pages frontend per workflow semplici

### Query layer / repository layer

- non esiste un repository layer dedicato
- query SQL e Supabase call sono direttamente nei handler / hook / pages

### Auth

- auth browser: Supabase session
- auth Edge: bearer token -> `auth.getUser()`
- authZ: helper condivisi buoni ma il modello `verify_jwt = false` richiede disciplina costante

### Caching

- nessun caching backend dedicato osservato
- nessuna cache applicativa significativa lato frontend oltre a stato locale

### Error handling

Moderatamente migliorato ma non uniforme:
- backend usa `HttpError`
- frontend ha `invokeEdgeFunction`
- rimangono logging console e fallback silenziosi

### Logging

- `audit_log` e `usage_events` usati come telemetry interna
- manca osservabilita esterna standard (es. error tracking centralizzato)

### Separazione tra business logic e infrastructure

Parziale:
- `_shared` aiuta
- ma le functions grandi sono ancora miste: auth, fetch, transform, persistence, response nello stesso file

### Code smell principali backend

- versioni Deno std / `@supabase/supabase-js` non uniformi tra functions (`0.168.0` e `0.190.0`; `2.49.1` e `2.57.2`)
- `generate-insights` e `admin-data` sono troppo grandi per manutenzione comoda
- `stripe-webhook` e presente ma senza contract tests dedicati
- nessun job scheduler osservato per sync Gmail o scansioni alert periodiche; l'alerting pero e ora anche event-driven sui flussi di ingestione principali

## 12. Sicurezza

### Rischi certi osservati nel codice

- Tutte le Edge Functions sono configurate con `verify_jwt = false` in `supabase/config.toml`.
  - Mitigazione presente: auth manuale in `_shared/auth.ts`.
  - Rischio: una nuova function o una regressione puo introdurre una falla facilmente.
- `corsHeaders` in `supabase/functions/_shared/http.ts` usa `Access-Control-Allow-Origin: "*"`.
  - Non equivale da sola a una vulnerabilita critica, ma amplia la superficie e riduce il controllo sugli origin.
- `stripe-webhook` e presente e verifica la firma Stripe.
  - Rischio residuo: copertura eventi e monitoraggio operativo del webhook ancora da consolidare.
- I limiti di piano risultano applicati in larga parte lato frontend (`src/hooks/useUsage.tsx`, `src/pages/Competitors.tsx`, `src/pages/NewNewsletter.tsx`).
  - Rischio certo di enforcement parziale se la stessa operazione e invocata fuori UI o tramite funzioni non protette da quota.
- `src/integrations/supabase/types.ts` non riflette le ultime tabelle (`workspace_billing`, `platform_admins`).
  - Rischio certo di type drift e di bug futuri nelle evoluzioni schema.

### Rischi probabili / da verificare

- Nessun rate limiting HTTP generalizzato osservato oltre al rate limit applicativo su alcune functions AI.
- `profiles` e leggibile da tutti gli utenti autenticati; da verificare se e una scelta voluta o troppo permissiva.
- Nessuna strategia esplicita di verifica webhook Google/Meta per callback oltre ai flussi OAuth standard.
- Nessuna evidenza di protezioni applicative centralizzate tipo CSP, security headers avanzati, WAF app-specifica o audit security automation.

### Aspetti positivi osservati

- RLS estesa sulla maggior parte delle tabelle
- token Gmail tenuti fuori dalla portata client
- sanitizzazione HTML con DOMPurify nel reader
- platform admin separato dal workspace admin a livello backend
- safe origin sanitization per checkout/portal/Gmail redirect

## 13. Configurazione e Variabili Ambiente

### Variabili frontend osservate

| Variabile | Area | Obbligatoria | Note |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | frontend | Si | usata da `src/lib/env.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | Si | chiave pubblica browser |
| `VITE_SUPABASE_PROJECT_ID` | frontend | No | metadato opzionale |

### Variabili backend / functions osservate

| Variabile | Area | Obbligatoria di fatto | Dove |
| --- | --- | --- | --- |
| `SUPABASE_URL` | tutte le functions | Si | quasi tutte le functions |
| `SUPABASE_SERVICE_ROLE_KEY` | tutte le functions privilegiate | Si | quasi tutte le functions |
| `APP_URL` | redirect sicuri | Consigliata | `_shared/app.ts` |
| `ALLOWED_APP_ORIGINS` | redirect sicuri | Consigliata | `_shared/app.ts` |
| `PLATFORM_ADMIN_EMAILS` | admin panel | Opzionale | `_shared/auth.ts` |
| `STRIPE_SECRET_KEY` | billing | Si per billing | `check-subscription`, `create-checkout`, `customer-portal` |
| `STRIPE_PRICE_STARTER` | billing | No ma consigliata | `_shared/billing.ts` |
| `STRIPE_PRICE_PREMIUM` | billing | No ma consigliata | `_shared/billing.ts` |
| `GOOGLE_CLIENT_ID` | Gmail | Si | `gmail-auth`, `gmail-sync` |
| `GOOGLE_CLIENT_SECRET` | Gmail | Si | `gmail-auth`, `gmail-sync` |
| `META_ACCESS_TOKEN` | Meta Ads | Si per feature reale | `fetch-meta-ads` |
| `OPENAI_API_KEY` | AI | Si | `_shared/openai.ts` |
| `OPENAI_PROJECT_ID` | AI | No | `_shared/openai.ts` |
| `OPENAI_ORGANIZATION_ID` | AI | No | `_shared/openai.ts` |
| `OPENAI_MODEL_INSIGHTS` | AI | No | `generate-insights` |
| `OPENAI_MODEL_NEWSLETTER_ANALYSIS` | AI | No | `analyze-newsletter` |
| `OPENAI_MODEL_NEWSLETTER_EXTRACTION` | AI | No | `extract-newsletter-intel` |
| `OPENAI_MODEL_META_AD_ANALYSIS` | AI | No | `analyze-meta-ad` |

### Gap di configurazione osservati

- `.env.example` documenta solo 3 variabili frontend
- non esiste un env example completo per il backend/functions
- il repo dipende in realta da molti segreti remoti Supabase non documentati

### Rischi di configurazione

- facile partire con frontend configurato ma backend functions non configurate
- rischio di ambienti disallineati tra frontend locale, project ref Supabase e secrets remoti
- rischio alto di OAuth redirect mismatch se Google non viene configurato con il project ref corretto

## 14. Dipendenze Critiche

| Dipendenza | Ruolo | Criticita / lock-in |
| --- | --- | --- |
| Supabase | auth, DB, RLS, RPC, edge functions | lock-in alto; e il backbone dell'app |
| OpenAI | extraction, analysis, insights | lock-in alto sul provider AI; fallback limitati |
| Stripe | billing/subscription | lock-in alto lato monetizzazione |
| Google OAuth / Gmail API | ingestion automatica inbox | point of failure per il flusso di raccolta dati principale |
| Meta Ad Library API | ad intelligence futura | feature dipendente da token e limiti provider |
| React + Vite | runtime frontend | rischio basso, standard |
| Radix/shadcn | UI foundation | rischio moderato, ma ben diffuso |
| Recharts | analytics UI | chunk size non trascurabile |

Dipendenze / situazioni potenzialmente rischiose:
- funzioni Deno con versioni non uniformi di std e supabase-js
- `zod` installato ma non usato
- `@tanstack/react-query` montato ma non usato
- `react-hook-form` praticamente non adottato nei form applicativi

## 15. Testing e Qualita del Codice

### Stato osservato

- `npm run build`: passa
- `npm run test`: passa
- `npm run lint`: passa

### Test esistenti

Test osservati:
- `src/components/RouteGuard.test.tsx`
- `src/components/AuthRedirect.test.tsx`
- `src/components/admin/AdminGuard.test.tsx`
- `src/hooks/useAuth.test.ts`
- `src/lib/env.test.ts`
- `src/lib/dashboard-decision-engine.test.ts`
- `src/lib/insight-priority.test.ts`
- `tests/core-flows.spec.ts`

Copertura percepita:
- medio-bassa
- focalizzata su auth, guard, env, decision layer e core browser flow mockati
- assenti ancora test veri su:
  - alert evaluation
  - insight generation end-to-end con provider reali
  - admin operations distruttive end-to-end
  - Meta Ads backend
  - billing webhook con payload/eventi reali

### Linting / formatting

- lint pulito

### Type safety

- migliorata rispetto al passato recente, ma il repo non e in modalita TypeScript strict
- `tsconfig.json` ha:
  - `noImplicitAny: false`
  - `strictNullChecks: false`
  - `noUnusedLocals: false`
  - `noUnusedParameters: false`

### Parti fragili

- generated types Supabase disallineati
- grandi file edge monolitici
- enforcement piano non completamente server-side
- workflow asincroni senza infrastruttura dedicata

### Debito tecnico principale

- documentazione tecnica ora presente, ma da mantenere allineata alla working tree reale
- env docs incompleta
- test coverage ancora insufficiente per funzioni critiche e per i flussi browser completi
- promesse commerciali non allineate con tutto il runtime osservabile
- stringhe con mojibake/encoding

## 16. Stato di Completamento

### Fatto

- auth base
- reset password
- multi-workspace
- ruoli base
- competitor CRUD
- import manuale newsletter
- Gmail OAuth + sync
- AI extraction / analysis / insights
- analytics dashboard
- alert rules in-app
- billing UI + Stripe checkout/portal + webhook sync
- admin panel base
- dashboard snapshot server-side
- Playwright core-flow suite

### Quasi fatto

- onboarding
- billing robusto
- admin hardening
- insight engine
- usage metering
- Gmail end-to-end productization

### Abbozzato

- feature flags runtime
- advanced integrations monitoring
- Meta Ads real UX
- richer collaboration workflows

### Non fatto ma previsto / deducibile

- Slack/webhook alerts
- scheduled reports
- anomaly detection
- branded reports
- real invitation emails
- full Meta Ads launch path
- stronger observability

### Incoerente o da rifattorizzare

- dual role system da semplificare/documentare
- React Query presente ma inutilizzato
- `zod` presente ma inutilizzato
- `react-hook-form` quasi inutilizzato
- generated types non rigenerati
- mix di demo data e dati reali in inbox / meta ads

## 17. Ambiguita / Da verificare

- Il frontend di produzione dove viene deployato esattamente non e deducibile dal repo.
- Non e chiaro se esista un job scheduler esterno che invoca `gmail-sync` o scansioni periodiche di `evaluate-alerts`; i trigger real-time da ingestione sono invece osservabili nel codice.
- Non e chiaro se le feature flag siano consumate altrove fuori dal codice osservato.
- Non e chiaro se le promesse di pricing/landing siano backlog reale o solo copy provvisoria.
- Non e chiaro se le env locali `.env` / `.env.local` correnti siano allineate all'ambiente di produzione.
- Non e chiaro se la working tree corrente rappresenti un rilascio coerente o un insieme di fix ancora da consolidare in commit distinti.
- Non e chiaro se il demo mode dell'inbox sia una scelta product voluta in produzione o solo supporto per sviluppo/demo.

## 18. Rischi Tecnici e di Prodotto

### Colli di bottiglia tecnici

- molte funzioni AI e sync restano user-triggered; solo la pipeline manuale newsletter ha ora una coda asincrona locale
- `generate-insights` molto pesante e monolitica
- nessun scheduler/queue generale osservato

### Debito tecnico

- docs mancanti
- generated types stale
- non-strict TypeScript
- versioni backend non uniformi
- form validation non standardizzata

### Rischi di scalabilita

- polling UI per alcune operazioni
- funzioni AI potenzialmente costose e lunghe
- nessun sistema di retry/queue centrale oltre alla pipeline asincrona `newsletter_entries -> analyses`
- usage enforcement non completamente server-side

### Rischi di manutenzione

- molto business logic embedded in hooks/pages/functions
- file grandi e difficili da testare
- due pipeline dati separate per newsletter
- helper del decision layer condivisi tra frontend e function `dashboard-snapshot`, da mantenere coerenti
- schema insight piu ricco disponibile lato backend, ma non ancora sfruttato da report SQL o alerting dedicato

### Rischi di sicurezza

- `verify_jwt = false` richiede forte disciplina
- wildcard CORS
- segreti e ciclo di vita del webhook Stripe da monitorare
- possibile disallineamento config secrets/origins

### Rischi di UX / prodotto

- feature commerciali promesse ma non realmente operative
- demo data che puo confondere utenti reali
- onboarding Gmail con redirect non perfettamente coerente

### Dipendenze eccessive da parti fragili

- Supabase come unico backend totale
- OpenAI come motore AI unico
- Gmail come integrazione primaria per ingestion automatica

## 19. Raccomandazioni Prioritizzate

### Priorita alta

| Problema | Impatto | Azione suggerita | Area coinvolta | Difficolta |
| --- | --- | --- | --- | --- |
| Generated types non allineati | bug futuri e type drift | rigenerare `src/integrations/supabase/types.ts` dopo ogni migrazione | DB/frontend | Bassa |
| Enforced quotas parzialmente client-side | bypass limiti piano e incoerenze billing | spostare l'enforcement critico lato DB/functions | billing/usage/security | Media |
| Contract test e monitoraggio webhook Stripe assenti | regressioni billing difficili da intercettare su renewal/cancellation/failure | aggiungere test contract e verifica operativa del webhook `stripe-webhook` | billing/backend/ops | Media |
| Decision layer condiviso tra browser e function | rischio di drift se gli helper evolvono in modo incoerente | mantenere `dashboard-decision-engine.ts` e `insight-normalization.ts` come contract comune e testato | frontend/backend | Media |
| Schema insight ancora sottoutilizzato | `priority_level`, `impact_area` e i nuovi campi strutturati non sono ancora sfruttati pienamente da report/alert SQL | estendere query, export e alerting per usare il nuovo contratto senza duplicare logica lato client | AI/frontend/backend | Media |
| Demo data mescolata ai flussi reali | rischio UX e decisioni errate | separare modalita demo da modalita produzione con feature flag chiara | inbox/meta ads/frontend | Media |
| Env docs incomplete | onboarding dev lento e ambienti fragili | estendere `.env.example` e aggiungere matrice completa env/secrets | config/docs | Bassa |
| Nessun scheduler osservato | sync Gmail e scansioni alert periodiche dipendono ancora da azioni manuali o da trigger esterni non osservati; l'alerting realtime da ingestione esiste ma non sostituisce un cron | definire job scheduler reale o chiarire che i flussi periodici sono manuali | backend/product | Media |

### Priorita media

| Problema | Impatto | Azione suggerita | Area coinvolta | Difficolta |
| --- | --- | --- | --- | --- |
| Meta Ads UI ancora demo | feature non monetizzabile davvero | decidere launch plan: attivare dati reali oppure declassare la promessa commerciale | product/frontend/backend | Media |
| Team invites incomplete | collaboration incompleta | implementare inviti via email con token e membership acceptance | team/auth/backend | Alta |
| React Query non usato | complexity inutile / niente caching vera | o adottarlo sui flussi principali o rimuovere provider/dependency | frontend | Media |
| `zod` / `react-hook-form` quasi inutilizzati | validazione non uniforme | introdurre schema validation su form critici | frontend | Media |
| Versions mismatch nelle functions | manutenzione e bug runtime | uniformare `deno std` e `@supabase/supabase-js` | backend | Bassa |
| File backend monolitici | difficile testare e modificare | estrarre servizi/domain helpers da `generate-insights` e `admin-data` | backend | Media |

### Priorita bassa

| Problema | Impatto | Azione suggerita | Area coinvolta | Difficolta |
| --- | --- | --- | --- | --- |
| README placeholder | scarso handoff umano | sostituire README con quick start e architettura minima | docs | Bassa |
| Stringhe con mojibake | UX e percezione qualita | ripulire encoding e copy corrotti | frontend | Bassa |
| E2E live contro integrazioni reali assenti | regressioni provider-side non intercettate | estendere Playwright con smoke selettivi su ambiente reale o staging | QA/frontend/backend | Media |
| Observability limitata | troubleshooting difficile | integrare error tracking / structured logs | ops/backend/frontend | Media |

## 20. Handoff per Altri LLM / Nuovi Sviluppatori

### Come spiegare il progetto in 10 righe

Tracklyze e una SPA React + Supabase per competitor intelligence.  
Ogni utente opera dentro uno o piu workspace multi-tenant.  
I competitor possono essere configurati manualmente e i dati arrivano da Gmail oppure da paste manuale.  
I contenuti vengono analizzati da OpenAI tramite Edge Functions Supabase.  
L'import manuale crea un job asincrono in `analyses`, che conserva anche uno snapshot del raw content.  
Esistono due pipeline dati: `newsletter_entries -> analyses` e `newsletter_inbox -> newsletter_extractions`.  
Gli insight aggregano questi segnali e li salvano in `insights`.  
Billing e workspace-scoped via Stripe.  
Esiste un admin panel piattaforma separato dal ruolo admin di workspace.  
Meta Ads backend c'e, ma la UI e ancora in beta/demo.  
Il repo e funzionale ma ha gap su scheduler, generated types, test coverage live e documentazione operativa da mantenere.  
Il dashboard e piu utile e decision-oriented, ma il contract snapshot/helper condivisi va mantenuto con attenzione prima del launch.  

### File da leggere per primi

1. `src/App.tsx`
2. `src/hooks/useAuth.tsx`
3. `src/hooks/useWorkspace.tsx`
4. `src/hooks/useRoles.tsx`
5. `src/hooks/useSubscription.tsx`
6. `src/pages/Onboarding.tsx`
7. `src/pages/Dashboard.tsx`
8. `src/pages/Insights.tsx`
9. `src/integrations/supabase/types.ts`
10. `supabase/migrations/20260401031600_1372769e-63e2-4a1f-b922-337c4fc533c4.sql`
11. `supabase/migrations/20260405143000_harden_platform_auth_and_billing.sql`
12. `supabase/functions/_shared/auth.ts`
13. `supabase/functions/gmail-auth/index.ts`
14. `supabase/functions/gmail-sync/index.ts`
15. `supabase/functions/generate-insights/index.ts`
16. `src/lib/insight-priority.ts`
17. `src/lib/dashboard-decision-engine.ts`
18. `supabase/functions/admin-data/index.ts`

### Moduli piu importanti

- auth/workspace/subscription providers
- onboarding
- Gmail pipeline
- insights generation
- billing functions
- admin-data function

### Aree pericolose dove non rompere nulla

- `supabase/config.toml`: tutte le functions hanno `verify_jwt = false`; i guard manuali sono obbligatori
- policy RLS e helper SQL dei ruoli
- billing workspace-scoped e `workspace_billing`
- redirect Gmail e whitelist origin
- generated types Supabase non aggiornati
- demo mode inbox / beta Meta Ads

### Checklist per chi continua il lavoro

- confermare che il project ref Supabase corretto sia quello attuale
- rigenerare i tipi Supabase
- verificare i secrets remoti richiesti dalle functions
- decidere se il demo mode deve restare attivo
- decidere il piano di lancio reale di Meta Ads
- espandere la suite Playwright oltre il mocking locale con smoke test selettivi su ambiente reale/staging
- aggiornare README e env example

### Prompt iniziale consigliato per un altro LLM

```text
Leggi prima PROJECT_AUDIT.md, poi apri src/App.tsx, src/hooks/useAuth.tsx, src/hooks/useWorkspace.tsx, src/hooks/useRoles.tsx, supabase/functions/_shared/auth.ts, supabase/functions/generate-insights/index.ts e la migration 20260405143000_harden_platform_auth_and_billing.sql.
Assumi che il progetto sia una SPA React + Supabase multi-tenant per competitor intelligence.
Prima di proporre modifiche, verifica sempre se il flusso tocca billing, Gmail OAuth, RLS o una Edge Function con verify_jwt=false.
Mantieni modifiche minime e non rompere la distinzione tra platform admin e workspace admin.
Se lavori su schema o policies, rigenera anche i generated types Supabase o segnala esplicitamente il drift.
```

## A. Glossario del progetto

| Termine | Significato |
| --- | --- |
| Workspace | tenant principale del SaaS |
| Workspace member role | ruolo membership: `owner`, `admin`, `member`, `viewer` |
| App role | ruolo applicativo: `admin`, `analyst`, `viewer` |
| Inbox | collezione di email competitor sincronizzate da Gmail |
| Newsletter entry | contenuto competitor inserito manualmente |
| Analysis | analisi AI su `newsletter_entries` |
| Extraction | estrazione AI strutturata da `newsletter_inbox` |
| Insight | sintesi strategica multi-sorgente persistita |
| Usage events | eventi interni usati per metering/analytics |
| Audit log | log azioni utente/admin |
| Platform admin | amministratore globale della piattaforma |
| Workspace billing | stato billing per singolo workspace |
| Demo mode | fallback UI con dati sample se mancano dati reali |

## B. Elenco file chiave

| File | Perche e importante |
| --- | --- |
| `src/main.tsx` | bootstrap app e init dark mode |
| `src/App.tsx` | router, providers, struttura delle route |
| `src/hooks/useAuth.tsx` | auth browser e session lifecycle |
| `src/hooks/useWorkspace.tsx` | tenancy lato client |
| `src/hooks/useRoles.tsx` | modello permessi lato client |
| `src/hooks/useSubscription.tsx` | stato piano e flussi Stripe lato client |
| `src/hooks/useOnboarding.tsx` | stato onboarding e autocompletion |
| `src/hooks/useGmailConnection.tsx` | connessione/sync Gmail lato client |
| `src/hooks/useInsights.tsx` | fetch/generate insight lato client |
| `src/pages/Onboarding.tsx` | flusso di attivazione prodotto |
| `src/pages/Dashboard.tsx` | pagina riepilogo principale |
| `src/pages/NewsletterInbox.tsx` | inbox reale/demo |
| `src/pages/Insights.tsx` | feed insight strategici |
| `src/pages/Billing.tsx` | UI piani, limiti, upgrade |
| `src/components/AppSidebar.tsx` | IA dell'app e visibilita nav |
| `src/integrations/supabase/types.ts` | tipi DB generati |
| `supabase/config.toml` | project ref e auth mode functions |
| `supabase/functions/_shared/auth.ts` | authZ/authN centralizzata delle functions |
| `supabase/functions/_shared/openai.ts` | chiamate OpenAI condivise |
| `supabase/functions/gmail-auth/index.ts` | OAuth Gmail |
| `supabase/functions/gmail-sync/index.ts` | sync inbox Gmail |
| `supabase/functions/generate-insights/index.ts` | motore insight |
| `supabase/functions/admin-data/index.ts` | backend admin piattaforma |
| `supabase/migrations/20260401031600_1372769e-63e2-4a1f-b922-337c4fc533c4.sql` | schema base |
| `supabase/migrations/20260405143000_harden_platform_auth_and_billing.sql` | hardening piu recente |

## C. Quick Start per riprendere il progetto

### Installazione

```bash
npm install
```

### Variabili ambiente frontend minime

Da `.env.example`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

Nota:
- per usare davvero Gmail, Stripe, AI e Meta Ads servono anche i secrets remoti Supabase elencati nella sezione 13

### Avvio locale

```bash
npm run dev
```

Dev server atteso su `http://localhost:8080`.

### Database / Supabase

Passi dedotti:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --linked --yes
npx supabase functions deploy <function-name>
```

Non e certo dal repo:
- se esista uno script unico di bootstrap locale completo
- se tutti i secrets remoti siano gia presenti nel progetto Supabase target

### Test

```bash
npm run test
```

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

### Deploy

Deducibile solo in parte:
- frontend: build Vite statico, provider non esplicitato
- backend: Supabase Edge Functions + migrations

### Controlli iniziali consigliati

1. verificare `supabase/config.toml`
2. verificare che Google OAuth redirect punti alla function `gmail-auth`
3. verificare i secrets Stripe/OpenAI/Google/Meta
4. rigenerare i tipi Supabase se lo schema e cambiato

## D. Suggested next prompt

```text
Leggi PROJECT_AUDIT.md e produci un piano tecnico eseguibile per portare il repository a uno stato production-ready.
Concentrati prima su: enforcement server-side dei limiti piano, scheduler per Gmail sync/alerts, rigenerazione generated types Supabase, monitoraggio/contract test del webhook Stripe, rimozione demo mode ambiguo e attivazione/ritiro chiaro della feature Meta Ads.
Per ogni punto indica file coinvolti, rischio di regressione, ordine di implementazione e test da aggiungere.
Non rifattorizzare senza motivo: proponi cambi incrementali e verificabili.
```
