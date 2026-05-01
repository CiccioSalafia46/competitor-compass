# Session Log

Scopo:
- registrare in modo minimo e ripetibile le sessioni di lavoro
- mantenere continuita tra agenti senza trasformare il file in un diario prolisso

Regola:
- usare una sezione per sessione
- compilare solo i campi sotto
- mantenere le voci corte e fattuali

## Template

### YYYY-MM-DD / short-session-name

- Objective:
- Changes made:
- Files touched:
- Docs updated:
- Next steps:

## Entries

### 2026-04-05 / security-hardening-authz-and-oauth-state

- Objective: chiudere vulnerabilita reali su multi-tenant membership e callback Gmail OAuth
- Changes made: firmato lo `state` di `gmail-auth` con scadenza breve, ristrette le origin consentite quando esiste config esplicita, aggiunta migration che impedisce self-join su `workspace_members`, blocca la rimozione di owner via client e consente `user_roles` solo per membri reali del workspace
- Files touched: `supabase/functions/gmail-auth/index.ts`, `supabase/functions/_shared/app.ts`, `supabase/migrations/20260405170000_harden_membership_and_oauth_state.sql`, `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: applicare la migration al DB remoto e fare review delle policy RLS ancora ampie su `alerts` e `newsletter_inbox`

### 2026-04-05 / lint-fast-refresh-rule-alignment

- Objective: chiudere il lint del repository senza introdurre churn inutile nei file UI/provider
- Changes made: applicato override ESLint mirato per disattivare `react-refresh/only-export-components` su file `src/components/ui/*` e provider hooks che esportano componenti insieme a helper/hook
- Files touched: `eslint.config.js`, `docs/ai/SESSION_LOG.md`
- Docs updated: `docs/ai/SESSION_LOG.md`
- Next steps: mantenere la regola attiva altrove e rivalutare solo se il pattern di export cambia

### 2026-04-05 / docs-memory-setup

- Objective: impostare il sistema documentale condiviso e operativo del repository
- Changes made: creati e consolidati audit, handoff, working memory, architecture, features inventory, tech debt, decisions log, session log e agents rules
- Files touched: `PROJECT_AUDIT.md`, `AGENTS.md`, `docs/ai/*`
- Docs updated: si
- Next steps: mantenere i file allineati al codice quando cambiano flussi, schema, auth, billing o logica di business

### 2026-04-05 / dashboard-decision-engine-and-admin-ops

- Objective: completare i prompt aperti su dashboard decisionale, insight piu strategici, admin panel piu operativo e test piu utili
- Changes made: introdotti `src/lib/dashboard-decision-engine.ts` e `src/lib/insight-priority.ts`, dashboard rifatto come decision interface, insight ordinati per priorita derivata e risposta strutturata, signup redirect unificato su `/redirect`, Gmail hook con errore locale, admin users paginati con totale reale, admin logs con metadata, rimosso il test placeholder e aggiunti test mirati, cleanup finale di alcune stringhe UI non ASCII in dashboard/insights/admin
- Files touched: `src/pages/Dashboard.tsx`, `src/pages/Insights.tsx`, `src/hooks/useInsights.tsx`, `src/lib/dashboard-decision-engine.ts`, `src/lib/insight-priority.ts`, `src/hooks/useAuth.tsx`, `src/hooks/useGmailConnection.tsx`, `src/components/GmailConnect.tsx`, `src/pages/admin/AdminUsers.tsx`, `src/pages/admin/AdminLogs.tsx`, `src/types/admin.ts`, `supabase/functions/admin-data/index.ts`, `supabase/functions/generate-insights/index.ts`, `src/components/admin/AdminGuard.test.tsx`, `src/hooks/useAuth.test.ts`, `src/lib/dashboard-decision-engine.test.ts`, `src/lib/insight-priority.test.ts`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: fare uno smoke test browser finale e decidere se spostare la priorita insight e il dashboard snapshot lato backend

### 2026-04-06 / webhook-dashboard-snapshot-playwright

- Objective: completare i tre step successivi su billing event-driven, snapshot dashboard server-side e suite browser E2E
- Changes made: aggiunti `stripe-webhook` e `_shared/stripe-billing.ts` con sync event-driven di `workspace_billing`, introdotta migration su `stripe_webhook_events`, creato `dashboard-snapshot` come payload server-driven del dashboard e rifattorizzato `Dashboard` per consumarlo, aggiunta suite Playwright `tests/core-flows.spec.ts` con mocking deterministico per auth/onboarding/Gmail/billing/admin e script `test:e2e`
- Files touched: `supabase/functions/_shared/stripe-billing.ts`, `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/dashboard-snapshot/index.ts`, `supabase/migrations/20260406010000_add_stripe_webhook_sync.sql`, `supabase/config.toml`, `src/hooks/useSubscription.tsx`, `src/pages/Billing.tsx`, `src/lib/plan-limits.ts`, `src/lib/dashboard-decision-engine.ts`, `src/lib/insight-normalization.ts`, `src/hooks/useInsights.tsx`, `src/hooks/useUsage.tsx`, `src/hooks/useDashboardSnapshot.tsx`, `src/pages/Dashboard.tsx`, `playwright.config.ts`, `tests/helpers/mockApp.ts`, `tests/core-flows.spec.ts`, `package.json`, `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: rigenerare i generated types Supabase, estendere i test verso smoke live/staging e aggiungere contract tests sul billing webhook

### 2026-04-06 / gmail-redirect-and-connection-fetch-fix

- Objective: ripristinare il collegamento Gmail rotto in locale e sul progetto Supabase corrente
- Changes made: corretto il fetch frontend della connessione Gmail rimuovendo il riferimento alla colonna inesistente `gmail_connections.updated_at`; corretto `_shared/app.ts` per preservare path e query del redirect richiesto quando l'origin e consentita, cosi il callback OAuth Gmail torna alla pagina applicativa corretta; ridistribuita la function `gmail-auth`
- Files touched: `src/hooks/useGmailConnection.tsx`, `supabase/functions/_shared/app.ts`, `docs/ai/ARCHITECTURE.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `docs/ai/ARCHITECTURE.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: verificare di nuovo il flusso Gmail da `localhost`, poi valutare la rigenerazione dei generated types Supabase

### 2026-04-06 / inbox-sync-summary-and-refresh

- Objective: migliorare il feedback del sync Gmail nella Inbox quando non ci sono nuove mail o quando arrivano nuovi import
- Changes made: esteso il payload di `gmail-sync` con stato, messaggio, modalita e timestamp del sync; aggiornato `useGmailConnection` con tipo esplicito del risultato; la pagina Inbox ora mostra un riepilogo visibile del sync e refresha la lista quando vengono importate nuove mail; aggiornato anche il toast di Settings per usare il nuovo messaggio
- Files touched: `supabase/functions/gmail-sync/index.ts`, `src/types/gmail.ts`, `src/hooks/useGmailConnection.tsx`, `src/pages/NewsletterInbox.tsx`, `src/components/GmailConnect.tsx`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/SESSION_LOG.md`
- Next steps: verificare la UX del riepilogo su `localhost` con sync senza novita, con nuove importazioni e con errori parziali

### 2026-04-06 / admin-panel-platform-admin-alignment

- Objective: ripristinare l'accesso al pannello admin senza indebolire la distinzione tra workspace admin e platform admin
- Changes made: aggiornato `AppSidebar` per mostrare `Admin Panel` solo quando `useAdminCheck()` conferma `isPlatformAdmin`; configurato il secret remoto `PLATFORM_ADMIN_EMAILS` sul progetto Supabase corrente per riallineare il gate admin al tuo account
- Files touched: `src/components/AppSidebar.tsx`, `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: fare hard refresh su `localhost`, verificare che il menu admin compaia e che `/admin` non rediriga piu a `/dashboard`

### 2026-04-06 / analytics-and-inbox-attribution-upgrade

- Objective: rendere Analytics molto piu utile per decisioni operative e introdurre attribution intelligente tra inbox Gmail e competitor
- Changes made: estesa la RPC `get_workspace_analytics` con summary KPI, attribution coverage, top sender domains, competitor pressure, cadence e recent signals; riscritta la pagina `Analytics`; aggiunte funzioni SQL per suggerire competitor mancanti e riallineare newsletter storiche ai competitor via `website`/`domains`; il flusso di creazione competitor ora salva domini normalizzati e backfilla subito le newsletter gia presenti; la Inbox mostra suggerimenti di creazione competitor e permette un rematch esplicito
- Files touched: `supabase/migrations/20260406112000_enhance_analytics_and_competitor_matching.sql`, `supabase/functions/gmail-sync/index.ts`, `src/pages/Analytics.tsx`, `src/hooks/useAnalyticsData.tsx`, `src/pages/NewsletterInbox.tsx`, `src/hooks/useNewsletterInbox.tsx`, `src/pages/Competitors.tsx`, `src/lib/domains.ts`, `src/lib/domains.test.ts`, `src/lib/competitor-attribution.ts`, `src/types/gmail.ts`, `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: provare su `localhost` il rematch competitor dalla Inbox, la creazione competitor da suggestion e verificare la qualita reale dei nuovi analytics con dati non demo

### 2026-04-06 / analytics-operational-layer-expansion

- Objective: trasformare la pagina Analytics in uno strumento piu utile per decisioni operative e strategiche, non solo descrittivo
- Changes made: aggiunta migration `20260406130000_expand_analytics_operational_layers.sql` che estende `get_workspace_analytics` con range selector 30/90/180, health/coverage KPI, share-of-voice, discount distribution, insight category mix e competitor coverage audit; introdotto `src/lib/analytics-audit.ts` con action queue, anomaly feed e data health audit; aggiornata `src/pages/Analytics.tsx` con nuovi moduli decisionali e controlli temporali; aggiunti test unitari dedicati
- Files touched: `supabase/migrations/20260406130000_expand_analytics_operational_layers.sql`, `src/hooks/useAnalyticsData.tsx`, `src/lib/analytics-audit.ts`, `src/lib/analytics-audit.test.ts`, `src/pages/Analytics.tsx`, `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: verificare la UX reale su `localhost`, decidere se portare action queue/anomaly feed anche lato backend e valutare eventuali ottimizzazioni bundle della pagina Analytics

### 2026-05-01 / dashboard-daily-brief-redesign

- Objective: ridisegnare dashboard e sidebar Tracklyze in chiave `Daily Brief First`, frontend-only e senza modifiche a schema o Edge Functions
- Changes made: rifatta la dashboard con header freshness, `Today's Brief` singolo, action queue compatta, signal stream unificato, competitor pulse con sparkline SVG inline, skeleton/empty states e system health collassabile con escalation su stale/fail; rifatta la sidebar in gruppi Workspace/Intelligence con contatori, Settings footer, Account menu, drawer mobile e stato collassato persistito in localStorage; aggiornate chiavi i18n dashboard/nav in 5 lingue
- Files touched: `src/pages/Dashboard.tsx`, `src/components/dashboard/*`, `src/components/SystemHealthPanel.tsx`, `src/components/AppSidebar.tsx`, `src/components/ui/sidebar.tsx`, `src/components/ui/sheet.tsx`, `src/hooks/useDashboardSnapshot.tsx`, `public/locales/*/dashboard.json`, `public/locales/*/nav.json`, `docs/ai/*`
- Docs updated: `docs/ai/WORKING_MEMORY.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: verificare la resa browser su dati reali/mock, decidere se aggiungere bottom navigation mobile e se esporre activity giornaliera reale per competitor sparkline invece della distribuzione client-side temporanea

### 2026-04-06 / analytics-rpc-ordering-fix

- Objective: ripristinare il caricamento della pagina Analytics su database gia migrati
- Changes made: corretto l'ordinamento `share_of_voice` nella function SQL `get_workspace_analytics`, che usava alias camelCase non quotati e rompeva la RPC; aggiunta migration di follow-up per i database gia linkati e migliorato il parsing dei messaggi errore lato frontend per mostrare il dettaglio reale del backend
- Files touched: `supabase/migrations/20260406130000_expand_analytics_operational_layers.sql`, `supabase/migrations/20260406143000_fix_analytics_share_of_voice_ordering.sql`, `src/hooks/useAnalyticsData.tsx`, `src/lib/errors.ts`, `docs/ai/SESSION_LOG.md`
- Docs updated: `docs/ai/SESSION_LOG.md`
- Next steps: eseguire `supabase db push`, verificare `/analytics` su `localhost` e controllare se emergono altri errori SQL nascosti dietro il messaggio generico

### 2026-04-06 / inbox-domain-matching-and-manual-assignment

- Objective: ripristinare il rematch competitor della Inbox e permettere l'assegnazione per singola newsletter
- Changes made: corretto il rematch SQL che rompeva con `min(uuid)`, introdotto `domain_matches_competitor()` per match esatti e per sottodomini, aggiornate le RPC di attribution/suggestions, aggiunto auto-match in background all'apertura della Inbox e selettore manuale del competitor per ogni newsletter
- Files touched: `supabase/migrations/20260406112000_enhance_analytics_and_competitor_matching.sql`, `supabase/migrations/20260406152000_fix_competitor_domain_matching_and_assignment.sql`, `src/hooks/useNewsletterInbox.tsx`, `src/pages/NewsletterInbox.tsx`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: verificare su `localhost` che `Match competitors` non fallisca piu, che i sender come `*.lovable.dev` vengano attribuiti al competitor corretto e che l'override manuale non introduca conflitti di UX

### 2026-04-06 / e2e-auth-bootstrap-stabilization

- Objective: rendere affidabile la suite Playwright dei core flows durante l'audit completo del prodotto
- Changes made: aggiornato `signInThroughUi()` per attendere la fine del bootstrap auth e uscire solo quando l'app ha lasciato `/auth` e `/redirect`, evitando race che facevano fallire in modo intermittente i test billing e admin
- Files touched: `tests/helpers/mockApp.ts`, `docs/ai/SESSION_LOG.md`
- Docs updated: `docs/ai/SESSION_LOG.md`
- Next steps: rieseguire `npm run test:e2e` e confermare che i failure rimasti siano bug di prodotto reali, non instabilita della suite

### 2026-04-06 / e2e-core-flows-alignment-with-current-ui

- Objective: riallineare i test browser dei flussi core al comportamento reale dell'app senza indebolire le garanzie di accesso
- Changes made: i test billing/admin ora navigano tramite entry point UI reali invece di affidarsi a `page.goto()` full reload nel mock harness; il controllo non-admin verifica l'assenza del link `Admin Panel`, mentre la protezione del direct route resta coperta dai test mirati di `AdminGuard`
- Files touched: `tests/core-flows.spec.ts`, `docs/ai/SESSION_LOG.md`
- Docs updated: `docs/ai/SESSION_LOG.md`
- Next steps: rieseguire la suite E2E completa e valutare eventuali smoke live separati dal mocking Playwright

### 2026-04-06 / deep-audit-bootstrap-billing-and-e2e-hardening

- Objective: chiudere i problemi emersi dal check completo profondo, distinguendo bug reali da instabilita del test harness
- Changes made: stabilizzati i hook che bootstrappano dashboard/admin/billing usando dipendenze stabili (`user.id`, `workspace.id`, `access_token`) invece di oggetti interi; evitati refetch inutili e loader intermittenti post-login; reso popup-safe il flow Stripe aprendo una tab placeholder prima della risposta server; irrobustito il mock Playwright con parsing body sicuro, request log minimale e attese piu affidabili sui core flows
- Files touched: `src/hooks/useWorkspace.tsx`, `src/hooks/useRoles.tsx`, `src/hooks/useSubscription.tsx`, `src/hooks/useAdmin.tsx`, `src/hooks/useDashboardSnapshot.tsx`, `src/hooks/useUsage.tsx`, `tests/helpers/mockApp.ts`, `tests/core-flows.spec.ts`, `docs/ai/SESSION_LOG.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/WORKING_MEMORY.md`
- Docs updated: `docs/ai/SESSION_LOG.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/WORKING_MEMORY.md`
- Next steps: valutare se spezzare il chunk `Analytics` troppo grande e se pulire il rumore console del refresh token nei test Playwright mockati

### 2026-04-06 / async-newsletter-analysis-queue

- Objective: collegare l'ingestione manuale newsletter a una pipeline AI asincrona, con stato job, retry base e validazione output
- Changes made: aggiunta migration `20260406170000_add_analysis_job_metadata.sql` con metadata job su `analyses`; estratto il processor condiviso `_shared/newsletter-analysis.ts` con snapshot raw content, validazione payload AI e retry base; introdotta la function `enqueue-newsletter-analysis` che crea/riaccoda job e processa in background senza bloccare la UI; ricollegati `NewNewsletter`, `NewsletterDetail` e `AnalysisView` al nuovo enqueue flow
- Files touched: `supabase/migrations/20260406170000_add_analysis_job_metadata.sql`, `supabase/functions/_shared/newsletter-analysis.ts`, `supabase/functions/enqueue-newsletter-analysis/index.ts`, `supabase/functions/analyze-newsletter/index.ts`, `supabase/config.toml`, `src/lib/newsletter-analysis.ts`, `src/pages/NewNewsletter.tsx`, `src/pages/NewsletterDetail.tsx`, `src/pages/AnalysisView.tsx`, `src/integrations/supabase/types.ts`, `PROJECT_AUDIT.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: verificare il flusso reale su `localhost`, decidere se estendere lo stesso enqueue path a un futuro importer CSV e valutare se introdurre uno scheduler/worker piu generale per gli altri job asincroni del prodotto

### 2026-04-06 / structured-insights-schema-redesign

- Objective: rendere gli insight AI piu strategici, consistenti e query-friendly per analytics e decision making
- Changes made: aggiunta migration `20260406183000_redesign_insights_structured_fields.sql` che estende `insights` con `campaign_type`, `main_message`, `offer_*`, `cta_*`, `product_categories`, `positioning_angle`, `strategic_takeaway`, `priority_level`, `impact_area` e relativi indici; aggiornata `generate-insights` con nuovo contratto AI, validazione anti-generic, fallback strutturato e persistence dei nuovi campi; riallineati normalizer, dashboard snapshot, export settings, UI Insights, decision layer e test alla nuova tassonomia `high/medium/low`
- Files touched: `supabase/migrations/20260406183000_redesign_insights_structured_fields.sql`, `supabase/functions/generate-insights/index.ts`, `supabase/functions/dashboard-snapshot/index.ts`, `src/integrations/supabase/types.ts`, `src/hooks/useInsights.tsx`, `src/lib/insight-priority.ts`, `src/lib/insight-normalization.ts`, `src/lib/dashboard-decision-engine.ts`, `src/lib/dashboard-decision-engine.test.ts`, `src/lib/insight-priority.test.ts`, `src/lib/analytics-audit.ts`, `src/pages/Analytics.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Insights.tsx`, `src/pages/Settings.tsx`, `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: verificare su `localhost` la resa reale degli insight generati, valutare come sfruttare `priority_level` e `impact_area` in alerting/report SQL e considerare l'estrazione di servizi piu piccoli da `generate-insights`

### 2026-04-06 / event-driven-alert-system

- Objective: introdurre un sistema alert rule-based, event-driven e auditabile per sconti, keyword, campagne nuove e spike di attivita
- Changes made: aggiunta migration `20260406193000_rule_based_event_driven_alerts.sql` con `evaluation_mode`, stato regole, `recipient_user_id` su `alerts`, `alert_trigger_logs` e policy owner-scoped sulle regole; estratto il motore condiviso `_shared/alerts.ts` con dedupe/cooldown, summary coerenti e background scheduling; rifattorizzata `evaluate-alerts`; collegata la valutazione event-driven a `gmail-sync`, `extract-newsletter-intel` e `fetch-meta-ads`; aggiornata la pagina `Alerts` con modalita di valutazione, log trigger e metadati operativi; riallineati generated types e stabilizzata l'asserzione E2E del dashboard mockato
- Files touched: `supabase/migrations/20260406193000_rule_based_event_driven_alerts.sql`, `supabase/functions/_shared/alerts.ts`, `supabase/functions/evaluate-alerts/index.ts`, `supabase/functions/gmail-sync/index.ts`, `supabase/functions/extract-newsletter-intel/index.ts`, `supabase/functions/fetch-meta-ads/index.ts`, `src/hooks/useAlerts.tsx`, `src/pages/Alerts.tsx`, `src/integrations/supabase/types.ts`, `tests/core-flows.spec.ts`, `PROJECT_AUDIT.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/TECH_DEBT.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: verificare su `localhost` la UX reale della pagina Alerts, decidere se aggiungere un cron vero per le scansioni periodiche e valutare canali esterni reali per email/webhook in una fase successiva

### 2026-04-06 / dashboard-ai-brief-and-filters

- Objective: trasformare il dashboard in una vera interfaccia decisionale con briefing AI, highlight piu utili e filtri rapidi
- Changes made: esteso `dashboard-decision-engine` con `aiSummary`, highlight tipizzati, ordinamento insight orientato a priorita+impatto e metadata per filtri; aggiornato `dashboard-snapshot` per restituire piu insight e `competitor_id` sulle inbox preview; rifatta la UI `Dashboard` con quick filters competitor/campaign type, blocchi `What changed today` e `What matters most`, highlights piu operativi, insight con badge di impatto e fallback robusti per snapshot legacy; corretto l'harness E2E e l'ignore ESLint per `test-results` / `playwright-report`
- Files touched: `src/lib/dashboard-decision-engine.ts`, `src/lib/dashboard-decision-engine.test.ts`, `src/hooks/useDashboardSnapshot.tsx`, `supabase/functions/dashboard-snapshot/index.ts`, `src/pages/Dashboard.tsx`, `tests/core-flows.spec.ts`, `eslint.config.js`, `PROJECT_AUDIT.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: provare il dashboard su `localhost` con dati reali, valutare se portare anche i filtri lato snapshot/backend e decidere se ridurre ulteriormente il chunk `Dashboard` o mantenerlo cosi

### 2026-04-06 / competitor-intelligence-module

- Objective: trasformare `Competitors` da semplice CRUD a modulo di competitor intelligence strategica
- Changes made: aggiunto il builder condiviso `src/lib/competitor-intelligence.ts` con timeline, messaging evolution, promo behavior, category focus e assessment strategico; introdotta la function server-side `competitor-intelligence` e il relativo hook `useCompetitorIntelligence`; rifatta la pagina `src/pages/Competitors.tsx` come directory + deep dive con strengths, weaknesses, strategic gaps, opportunities e top signals; aggiunti test unitari del builder e deployata la nuova Edge Function
- Files touched: `src/lib/competitor-intelligence.ts`, `src/lib/competitor-intelligence.test.ts`, `src/hooks/useCompetitorIntelligence.tsx`, `src/pages/Competitors.tsx`, `supabase/functions/competitor-intelligence/index.ts`, `supabase/config.toml`, `PROJECT_AUDIT.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Docs updated: `PROJECT_AUDIT.md`, `docs/ai/ARCHITECTURE.md`, `docs/ai/FEATURES_INVENTORY.md`, `docs/ai/WORKING_MEMORY.md`, `docs/ai/HANDOFF_FOR_AI.md`, `docs/ai/DECISIONS_LOG.md`, `docs/ai/SESSION_LOG.md`
- Next steps: verificare la resa reale del profilo competitor con dati workspace veri, decidere se aggiungere filtri temporali per il modulo e valutare se spostare parte delle heuristics in uno strato SQL/materialized lato backend
