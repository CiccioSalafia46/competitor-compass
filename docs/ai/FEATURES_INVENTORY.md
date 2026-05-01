# Features Inventory

Scopo di questo file:
- elencare le funzionalita utente e piattaforma
- indicare il loro stato reale nel codice
- rendere visibile cosa e pronto, cosa e parziale e cosa e solo abbozzato

Per dettagli architetturali o rischi usare anche:
- [PROJECT_AUDIT.md](../../PROJECT_AUDIT.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [TECH_DEBT.md](./TECH_DEBT.md)

## Status Legend

| Stato | Significato |
| --- | --- |
| Complete | workflow principale implementato e usabile |
| Mostly complete | usabile ma con gap operativi o hardening mancante |
| Partial | esiste solo una parte del flusso |
| Beta / Demo | presente come preview o prototipo guidato |
| Planned / Implied | suggerita da UI/copy/schema ma non osservata come feature completa |

## 1. Public / Acquisition

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Landing page marketing | Complete | `src/pages/Index.tsx` | comunica value proposition, pricing, FAQ |
| Privacy / Terms | Complete | `src/pages/Privacy.tsx`, `src/pages/Terms.tsx` | static pages |
| Pricing presentation | Mostly complete | `src/pages/Index.tsx`, `src/pages/Billing.tsx` | copy piu ampia della feature set effettiva |

## 2. Authentication and Access

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Signup email/password | Complete | `src/pages/Auth.tsx`, `src/hooks/useAuth.tsx` | usa Supabase Auth |
| Login email/password | Complete | `src/pages/Auth.tsx`, `src/hooks/useAuth.tsx` | standard |
| Forgot password | Complete | `src/pages/ForgotPassword.tsx` | avvia reset flow |
| Reset password | Complete | `src/pages/ResetPassword.tsx` | aggiorna password da token |
| Post-auth redirect | Complete | `src/components/AuthRedirect.tsx`, `src/hooks/useAuth.tsx` | signup verification e login convergono su `/redirect`, poi dashboard o onboarding |
| Email verification gating | Mostly complete | `src/components/RouteGuard.tsx`, `src/hooks/useEmailVerification.tsx` | non e un hard-block globale uniforme |

## 3. Workspace and Roles

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Create workspace | Complete | `src/hooks/useWorkspace.tsx`, RPC `create_workspace` | trigger DB completano membership/role |
| Switch workspace | Complete | `src/components/AppSidebar.tsx` | usa `current_workspace_id` in storage |
| Workspace membership | Complete | DB + `useRoles` | RLS-based |
| App role assignment | Mostly complete | `src/pages/TeamManagement.tsx`, `src/hooks/useRoles.tsx` | assign/remove ruolo implementati |
| Platform admin | Mostly complete | `supabase/functions/_shared/auth.ts`, `admin-data` | backend coerente; visibilita nav frontend da rifinire |

## 4. Onboarding

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Welcome step | Complete | `src/pages/Onboarding.tsx` | intro flow |
| Workspace step | Complete | `src/pages/Onboarding.tsx` | crea workspace |
| Competitors step | Mostly complete | `src/pages/Onboarding.tsx` | insert diretto su `competitors` |
| Gmail step | Mostly complete | `src/pages/Onboarding.tsx`, `src/hooks/useGmailConnection.tsx` | usa il flusso Gmail standard; gli errori locali sono piu visibili ma il ritorno resta centrato su settings |
| Import step | Partial | `src/pages/Onboarding.tsx` | guida verso dati reali/manuali |
| Insights step | Partial | `src/pages/Onboarding.tsx` | piu conferma che workflow pieno |
| Checklist persistita | Mostly complete | `src/hooks/useOnboarding.tsx` | persistenza solo in `localStorage` |

## 5. Competitor Intelligence Core

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Competitor CRUD | Complete | `src/pages/Competitors.tsx` | gated da ruoli e limiti client-side |
| Competitor metadata | Complete | DB `competitors` | supporta `website`, `description`, `domains`, `tags`, `is_monitored` |
| Competitor-to-inbox backfill | Complete | `sync_competitor_newsletter_attribution`, `sync_workspace_newsletter_attribution`, `src/pages/Competitors.tsx`, `src/pages/NewsletterInbox.tsx` | collega newsletter Gmail storiche ai competitor in base a website/domains, con supporto sottodomini e risoluzione prudente dei casi ambigui |
| Competitor intelligence profile | Complete | `src/pages/Competitors.tsx`, `src/hooks/useCompetitorIntelligence.tsx`, `supabase/functions/competitor-intelligence`, `src/lib/competitor-intelligence.ts` | vista strategica per competitor con timeline campagne, messaging evolution, promo behavior, category focus, strengths/weaknesses, strategic gaps e opportunities |
| Competitor overview on dashboard | Complete | `src/pages/Dashboard.tsx`, `src/components/dashboard/MiniSparkline.tsx` | competitor pulse compatto con conteggi, trend e sparkline SVG inline |

## 6. Manual Content Ingestion

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Manual import newsletter | Complete | `src/pages/NewNewsletter.tsx` | salva in `newsletter_entries` |
| Associate import to competitor | Complete | `src/pages/NewNewsletter.tsx` | select competitor |
| Trigger AI analysis on import | Complete | `src/pages/NewNewsletter.tsx`, `src/lib/newsletter-analysis.ts`, `enqueue-newsletter-analysis`, `analyze-newsletter` | ogni import crea un job asincrono in `analyses` con `source_snapshot`, tentativi e validazione output |
| Analysis detail view | Complete | `src/pages/AnalysisView.tsx` | polling dello stato |
| Historical detail view | Mostly complete | `src/pages/NewsletterDetail.tsx` | mostra entry e analisi correlate; puo rilanciare un job senza bloccare la UI |

## 7. Gmail Ingestion

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Gmail connect | Mostly complete | `src/hooks/useGmailConnection.tsx`, `gmail-auth` | richiede config Google corretta |
| Gmail disconnect | Complete | `useGmailConnection`, `gmail-auth` | rimozione connection/tokens |
| Manual sync | Complete | `useGmailConnection.sync`, `gmail-sync`, `src/pages/NewsletterInbox.tsx` | fullSync supportato; la UI mostra un riepilogo con checked/imported/skipped/errors/matched/needs-review e aggiorna la lista se arrivano nuove mail |
| Newsletter classification | Mostly complete | `gmail-sync` | heuristics-based |
| Competitor auto-association | Complete | `gmail-sync`, SQL attribution RPC, `src/pages/NewsletterInbox.tsx` | usa `domains` e `website` competitor, copre anche sottodomini e tenta un rematch automatico all'apertura della Inbox |
| Competitor suggestions from inbox | Complete | `get_newsletter_competitor_suggestions`, `src/pages/NewsletterInbox.tsx` | suggerisce la creazione del competitor quando il sender e attivo ma non esiste ancora |
| Inbox UI | Mostly complete | `src/pages/NewsletterInbox.tsx` | include fallback demo mode, azione esplicita di matching competitor e assegnazione manuale del competitor per singola newsletter |
| Reader UI | Mostly complete | `src/pages/NewsletterReader.tsx` | HTML sanitizzato |

## 8. AI Extraction and Analysis

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Newsletter inbox extraction | Complete | `extract-newsletter-intel` | OpenAI + fallback euristico |
| Manual newsletter analysis | Complete | `analyze-newsletter` | OpenAI structured output |
| Meta ad analysis backend | Mostly complete | `analyze-meta-ad` | dipende da pipeline Meta |
| Insight generation | Mostly complete | `generate-insights`, `src/pages/Insights.tsx`, `src/lib/insight-priority.ts`, `src/lib/insight-normalization.ts` | output piu strategico e action-oriented; schema persistito con `campaign_type`, `offers`, `cta_analysis`, `product_categories`, `positioning_angle`, `strategic_takeaway`, `priority_level`, `impact_area`; function ancora monolitica |
| Deterministic AI fallback | Mostly complete | `extract-newsletter-intel`, `generate-insights` | evita failure totale quando OpenAI fallisce |

## 9. Dashboards, Analytics, Alerts

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Main dashboard | Complete | `src/pages/Dashboard.tsx`, `src/components/dashboard/*`, `src/hooks/useDashboardSnapshot.tsx`, `supabase/functions/dashboard-snapshot`, `src/lib/dashboard-decision-engine.ts` | snapshot server-side + decision layer presentato come `Daily Brief First`: header freshness, `Today's Brief` singolo, action queue max 3, signal stream unificato, competitor pulse e system health collassabile |
| Workspace analytics | Complete | `src/pages/Analytics.tsx`, `src/lib/analytics-audit.ts`, RPC `get_workspace_analytics` | range selector 30/90/180, action queue, data health audit, share-of-voice, sender domains, competitor pressure, discount posture, cadence, competitor coverage e recent signals |
| Insights feed | Complete | `src/pages/Insights.tsx`, `src/hooks/useInsights.tsx` | insight ordinati per priorita persisted `high/medium/low`, con evidence blocks, offers, CTA analysis, positioning angle e strategic takeaway |
| Alert rules CRUD | Complete | `src/pages/Alerts.tsx`, `src/hooks/useAlerts.tsx` | regole per utente/workspace con modalita `event` / `scheduled` / `both` |
| Alert history | Complete | `alerts` + UI | notifiche in-app con unread/dismissed model e destinatario coerente con il proprietario della regola |
| Alert trigger log | Complete | `alert_trigger_logs`, `src/pages/Alerts.tsx`, `src/hooks/useAlerts.tsx` | audit trail di trigger, dedupe suppression e failure |
| Alert evaluation on demand | Complete | `evaluate-alerts` | manual scan e scheduled scan condividono lo stesso evaluator |
| Event-driven alert evaluation | Complete | `gmail-sync`, `extract-newsletter-intel`, `fetch-meta-ads`, `_shared/alerts.ts` | i nuovi import attivano il motore alert in background senza bloccare la UI |

## 10. Billing and Usage

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Current plan display | Complete | `useSubscription`, `Billing`, `Settings` | free/starter/premium |
| Stripe checkout | Mostly complete | `create-checkout`, `useSubscription`, `stripe-webhook` | sync event-driven presente; restano da consolidare contract test/live |
| Stripe customer portal | Mostly complete | `customer-portal` | richiede workspace admin |
| Subscription sync on refresh | Mostly complete | `check-subscription`, `stripe-webhook` | refresh on-demand + aggiornamento event-driven |
| Usage dashboard | Mostly complete | `src/pages/UsageDashboard.tsx`, `useUsage` | forte dipendenza da `usage_events` |
| Plan limit gating in UI | Mostly complete | `useUsage`, `Competitors`, `NewNewsletter`, `Dashboard` | enforcement server-side parziale |

## 11. Collaboration and Admin

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Team members view | Complete | `src/pages/TeamManagement.tsx` | legge membri e ruoli |
| Assign/remove app roles | Mostly complete | `TeamManagement`, `useWorkspaceRoles` | richiede admin |
| Invite teammate | Partial | `TeamManagement` | placeholder esplicito, niente email infra |
| Platform admin overview | Mostly complete | `src/pages/admin/AdminDashboard.tsx`, `admin-data` | dati aggregati; visibile solo con vero platform admin |
| Platform admin users/workspaces/logs | Mostly complete | `src/pages/admin/*`, `admin-data`, `src/types/admin.ts` | utenti paginati con totale reale, logs con metadata; restano file backend densi e alcune azioni molto potenti |
| Integration health admin | Mostly complete | `AdminIntegrations`, `AdminSecrets`, `admin-data` | stato secret/integrations, non valori reali |

## 12. Testing and Operational Validation

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Unit and component tests | Mostly complete | `src/components/*.test.tsx`, `src/hooks/*.test.ts`, `src/lib/*.test.ts` | coprono auth, guards, env e decision layer |
| Browser E2E core flows | Mostly complete | `tests/core-flows.spec.ts`, `tests/helpers/mockApp.ts` | copre auth, onboarding, Gmail, billing e admin con mocking deterministico |
| Live integration smoke tests | Partial | non versionati nel repo | restano necessari per provider reali |

## 13. Meta Ads and Future Intelligence

| Feature | Stato | Dove | Note |
| --- | --- | --- | --- |
| Meta Ads fetch backend | Mostly complete | `fetch-meta-ads` | importa in `meta_ads` |
| Meta Ads analysis backend | Mostly complete | `analyze-meta-ad` | OpenAI |
| Meta Ads UI real-time | Beta / Demo | `src/pages/MetaAds.tsx` | mostra `DEMO_META_ADS` |
| Meta Ads compare UI | Partial | `src/pages/MetaAdsCompare.tsx` | placeholder coming soon |

## 14. Features Advertised but Not Fully Backed by Runtime

Queste feature compaiono in copy/pricing/landing ma non sono state osservate come complete nel codice runtime:

| Feature promessa | Evidenza | Stato reale osservato |
| --- | --- | --- |
| Slack/webhook alerts | `src/pages/Billing.tsx`, `src/pages/Index.tsx` | non implementata nel runtime osservato |
| Scheduled reports | `src/pages/Billing.tsx` | non osservati job/report generator |
| Anomaly detection | `src/pages/Billing.tsx` | non osservata come feature reale |
| Branded reports | `src/pages/Billing.tsx` | non osservata |
| Full Meta Ads intelligence | landing/pricing/UI beta | backend esiste, frontend ancora demo |

## 15. Immediate Reading List by Feature Area

| Area | File da leggere per primi |
| --- | --- |
| Auth | `src/hooks/useAuth.tsx`, `src/components/AuthRedirect.tsx` |
| Workspace / roles | `src/hooks/useWorkspace.tsx`, `src/hooks/useRoles.tsx` |
| Onboarding | `src/pages/Onboarding.tsx`, `src/hooks/useOnboarding.tsx` |
| Gmail | `src/hooks/useGmailConnection.tsx`, `supabase/functions/gmail-auth/index.ts`, `supabase/functions/gmail-sync/index.ts` |
| AI | `supabase/functions/extract-newsletter-intel/index.ts`, `supabase/functions/analyze-newsletter/index.ts`, `supabase/functions/generate-insights/index.ts`, `src/lib/insight-priority.ts` |
| Billing | `src/hooks/useSubscription.tsx`, `supabase/functions/create-checkout/index.ts`, `supabase/functions/check-subscription/index.ts` |
| Dashboard | `src/pages/Dashboard.tsx`, `src/lib/dashboard-decision-engine.ts`, `src/hooks/useAnalyticsData.tsx` |
| Admin | `src/hooks/useAdmin.tsx`, `supabase/functions/admin-data/index.ts`, `src/pages/admin/AdminUsers.tsx`, `src/pages/admin/AdminLogs.tsx` |
