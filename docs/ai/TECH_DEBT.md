# Technical Debt

Scopo di questo file:
- raccogliere il debito tecnico che impatta production readiness
- separare problemi certi, rischi probabili e refactor consigliati
- indicare un ordine di intervento pragmatico

Per il contesto completo usare anche [PROJECT_AUDIT.md](../../PROJECT_AUDIT.md).

## 1. Debt Summary

Il progetto e gia funzionante, ma il debito tecnico rilevante si concentra in quattro aree:
- operativita backend e billing
- sicurezza/configurazione
- consistenza architetturale
- gap tra marketing copy e runtime reale

## 2. Priorita P0

### P0.1 Generated types Supabase non allineati

Problema:
- `workspace_billing` e `platform_admins` non risultano nei generated types browser

Nota (verificato 2026-04-09):
- `platform_admins` ESISTE nel DB — creata in `20260405143000_harden_platform_auth_and_billing.sql`
- `_shared/auth.ts:isPlatformAdmin()` e corretto e sicuro; query errori silenziosi per tabella mancante non si verificano
- `workspace_billing` ESISTE nel DB — stessa migrazione
- Il problema e solo nei tipi generati browser, non a runtime backend

Impatto:
- type drift lato frontend
- errori futuri silenziosi durante refactor/schema changes client-side

Evidenza:
- `src/integrations/supabase/types.ts`

Azioni suggerite:
- rigenerare `src/integrations/supabase/types.ts` con `supabase gen types typescript`
- rendere la rigenerazione parte del workflow schema (CI step o pre-commit hook)

### P0.2 `verify_jwt = false` su tutte le Edge Functions

Problema:
- ogni function dipende dalla validazione manuale in `_shared/auth.ts`

Impatto:
- una regressione o nuova function puo introdurre buchi di sicurezza

Evidenza:
- `supabase/config.toml`

Azioni suggerite:
- mantenere la scelta solo se davvero necessaria
- introdurre checklist/review rule obbligatoria per ogni nuova function
- valutare il ritorno a `verify_jwt = true` dove possibile

Nota:
- il flusso Gmail ora usa `state` firmato e TTL breve; resta comunque essenziale mantenere i guard manuali per tutte le functions

### P0.3 Enforcement quote ancora troppo client-side

Problema:
- limiti come numero competitor/import/analyses sono ancora visibili e controllati soprattutto nel client

Impatto:
- enforcement parziale
- potenziale aggiramento fuori UI

Azioni suggerite:
- spostare i controlli critici lato function o SQL
- usare `workspace_billing` come fonte server-side

### P0.4 Webhook billing senza contract tests e monitoraggio dedicato

Problema:
- `stripe-webhook` esiste ma non ha ancora test contrattuali dedicati o monitoraggio operativo strutturato

Impatto:
- regressioni piu facili su renewal/cancellation/payment failure
- troubleshooting billing ancora fragile

Azioni suggerite:
- aggiungere test su payload/eventi Stripe reali o fixture ufficiali
- monitorare consegna eventi, secret rotation e failure path

## 3. Priorita P1

### P1.1 Mancanza scheduler / queue osservabili

Problema:
- esiste una queue leggera solo per la pipeline `newsletter_entries -> analyses`; l'alerting ora e anche event-driven, ma non si osservano ancora job schedulati per Gmail sync, scansioni alert periodiche o processi ricorrenti piu generali

Impatto:
- dipendenza da trigger manuali
- automazione di prodotto incompleta

Azioni suggerite:
- introdurre scheduler reale o documentare chiaramente che il prodotto e manual-triggered
- valutare Supabase scheduled functions o orchestrazione esterna

### P1.2 `admin-data` e `generate-insights` troppo grandi

Problema:
- functions molto dense con piu responsabilita

Impatto:
- testing difficile
- refactor rischiosi
- piu alta probabilita di regressioni

Azioni suggerite:
- estrarre servizi puri/helper domain-specific
- separare command handlers di `admin-data`
- separare aggregazione, prompting e persistence in `generate-insights`

### P1.3 Snapshot dashboard introdotto ma contract ancora fragile

Problema:
- il dashboard usa `dashboard-snapshot`, ma il contract con generated types e helper condivisi frontend/backend non e ancora consolidato

Impatto:
- rischio di drift tra snapshot, helper TS e UI future
- evoluzione piu difficile senza contract/fixtures stabili

Azioni suggerite:
- mantenere `src/lib/dashboard-decision-engine.ts` e `src/lib/insight-normalization.ts` come contract condiviso e testato
- aggiungere fixture snapshot e test di compatibilita

### P1.4 Demo mode mescolato ai flussi reali

Problema:
- inbox usa sample data se Gmail non e connesso e non ci sono record reali
- Meta Ads UI e volutamente demo

Impatto:
- rischio confusione utente
- comportamento ambiguo in ambienti non demo

Azioni suggerite:
- introdurre feature flag esplicita o environment gating
- distinguere chiaramente "preview mode" da "production mode"

### P1.5 Competitor intelligence ancora basata su heuristics applicative condivise

Problema:
- il nuovo profilo competitor usa `src/lib/competitor-intelligence.ts` come layer euristico condiviso tra Edge Function e UI
- non esiste ancora uno snapshot persistito/queryabile o una base SQL/materialized per timeline e assessment

Impatto:
- evoluzione piu delicata delle heuristics
- reporting SQL e analytics cross-competitor non possono ancora riusare direttamente questo layer

Azioni suggerite:
- mantenere il builder condiviso con test dedicati
- valutare in una fase successiva se spostare alcune aggregazioni in RPC/materialized view senza duplicare la logica narrativa

### P1.6 Insight engine ancora monolitico nonostante il nuovo schema strutturato

Problema:
- `insights` ora salva `priority_level`, `impact_area` e altri campi query-friendly, ma `generate-insights` continua a concentrare in un solo file aggregazione, prompting, fallback e persistence

Impatto:
- impossibile filtrare/ordinare server-side per priorita
- impossibile usare la stessa priorita in alert/report/admin senza ricomputarla

Azioni suggerite:
- decidere se la priorita deve restare solo una concern UI
- in caso contrario, aggiungere un campo persistito o una view/RPC condivisa

### P1.7 Inviti team non implementati

Problema:
- `TeamManagement` mostra il flusso, ma l'invito reale non esiste

Impatto:
- collaboration story incompleta
- UI che promette un workflow non operativo

Azioni suggerite:
- o implementare token/email flow
- o rendere la UI esplicitamente read-only/roadmap

### P1.8 Version mismatch nelle Edge Functions

Problema:
- mix di `deno std@0.168.0` / `0.190.0`
- mix di `@supabase/supabase-js@2.49.1` / `2.57.2`

Impatto:
- runtime inconsistente
- manutenzione piu difficile

Azioni suggerite:
- uniformare le dipendenze di tutte le functions

### P1.9 Analytics operativo ancora non riusabile lato backend

Problema:
- la pagina `Analytics` usa un layer client-side (`src/lib/analytics-audit.ts`) per action queue, anomaly feed e data health audit

Impatto:
- raccomandazioni e anomalie non sono ancora condivise con report, alert o admin
- rischio di drift futuro tra payload SQL e logica operativa frontend

Azioni suggerite:
- decidere se questo layer debba restare solo UI-side
- in caso contrario, estrarre un contract condiviso o una view/RPC backend-oriented

## 4. Priorita P2

### P2.0 Sistema toast duplicato (useToast + sonner)

Problema:
- `App.tsx` monta sia `<Toaster>` (shadcn/radix, usa `useToast` da `@/hooks/use-toast`) che `<Sonner>` (sonner)
- `useToast` e usato in 13 file (Auth, Billing, Competitors, GmailConnect, NewsletterInbox, Onboarding, TeamManagement, AnalysisView, ForgotPassword, NewNewsletter, NewsletterDetail, NewsletterReader, ResetPassword)
- `toast` da `sonner` e usato in 13 hook/pagine admin (useAlerts, useInsights, useAdmin, useMetaAds, Settings, AdminUsers, etc.)

Impatto:
- due overlay portals attivi simultaneamente
- rischio conflitti z-index e duplicazioni visive
- standard inconsistente tra flussi core e hook

Azione necessaria:
- migrare tutti i callsite `useToast` da `@/hooks/use-toast` a `toast` da `sonner`
- rimuovere `<Toaster>` (radix) da `App.tsx` e il hook `@/hooks/use-toast`
- NON rimuovere nessuno dei due sistemi senza completare prima la migrazione (13 file)

Non risolvibile in un singolo commit. Richiede una migration sprint dedicata.

### P2.1 React Query installato ma non adottato

Problema:
- `QueryClientProvider` presente ma il progetto usa fetching manuale quasi ovunque

Impatto:
- caching non standardizzato
- duplicazione di loading/error state

Azioni suggerite:
- o rimuovere la dipendenza
- o adottarla davvero sui flussi core

### P2.2 `zod` e `react-hook-form` quasi inutilizzati

Problema:
- esistono nel progetto ma non guidano il form handling applicativo

Impatto:
- validazione incoerente
- costo cognitivo inutile

Azioni suggerite:
- standardizzare i form critici con schema validation

### P2.3 TypeScript non strict

Problema:
- `tsconfig.json` non usa `strictNullChecks` o `noImplicitAny`

Impatto:
- safety limitata
- bug piu facili da introdurre

Azioni suggerite:
- alzare il livello gradualmente, non in un unico passaggio

### P2.4 Mojibake / encoding issues

Problema:
- stringhe come `Loadingâ€¦`, `Â©`, ecc.

Impatto:
- UX e percezione di qualita peggiorate

Azioni suggerite:
- fare un cleanup di copy/encoding mirato

## 5. Product/Code Mismatch Debt

| Tema | Evidenza | Debito |
| --- | --- | --- |
| Slack/webhook alerts | pricing / landing | promessa senza runtime osservato |
| Scheduled reports | pricing | promessa senza implementazione osservata |
| Anomaly detection | pricing | promessa senza implementazione osservata |
| Branded reports | pricing | promessa senza implementazione osservata |
| Meta Ads premium launch | landing + billing | backend quasi pronto, frontend ancora demo |

Suggerimento:
- o allineare il prodotto reale al copy
- o allineare il copy al prodotto reale

## 6. Security Debt

| Problema | Gravita | Area |
| --- | --- | --- |
| `verify_jwt = false` generalizzato | Alta | backend auth |
| wildcard CORS | Media | edge functions |
| webhook Stripe senza contract tests/monitoring forte | Media | billing |
| env docs incomplete | Media | ops/config |
| enforcement quote non centralizzato | Alta | billing/security |
| alcune tabelle browser-side hanno ancora policy member permissive | Media | RLS / tenant safety |

## 7. Testing Debt

Stato osservato:
- build green
- lint green con 11 warning
- test unitari/component presenti sui flussi core
- Playwright con suite `tests/core-flows.spec.ts`

Gap principali:
- nessun smoke test E2E live contro provider reali versionato nel repo
- nessun test integration per Edge Functions
- nessun test contract su billing/Gmail/admin

Ordine suggerito:
1. auth redirect + onboarding
2. Gmail connect/sync happy path mockato
3. billing access + plan gating
4. admin guard + auth status
5. insight generation fallback
6. webhook Stripe con fixture eventi reali

## 8. Recommended Refactor Order

1. Rigenerazione tipi Supabase e allineamento schema/tooling
2. Enforcement server-side dei limiti piano
3. Contract tests + monitoring per `stripe-webhook`
4. Decisione su priorita insight server-side vs client-side
5. Scheduler o chiarimento esplicito dei flussi manuali
6. Smontaggio di `admin-data` e `generate-insights`
7. Consolidamento del decision layer/snapshot dashboard
8. Cleanup demo mode / product copy mismatch
9. Standardizzazione validation/forms
10. Gradual strictness TypeScript

## 9. What Should Not Be "Fixed" Aggressively

Non forzare refactor massivi in questi punti senza piano:
- sostituzione globale del data layer browser
- riscrittura completa del modello ruoli
- spezzare tutto in moduli solo per preferenze stilistiche
- attivare Meta Ads reale senza definire il launch path end-to-end

Meglio:
- interventi incrementali
- test per flusso critico
- refactor guidati da rischio reale
