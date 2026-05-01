# Handoff for AI

Documento sintetico per passare contesto operativo a un altro LLM.

Per dettagli completi leggere anche:
- [PROJECT_AUDIT.md](../../PROJECT_AUDIT.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [TECH_DEBT.md](./TECH_DEBT.md)

Leggere prima [AGENTS.md](../../AGENTS.md).

## 1. Project in 10 Lines

Tracklyze e una SPA React/Vite con backend interamente su Supabase.  
E un SaaS multi-tenant per competitor intelligence.  
I tenant sono i `workspaces`.  
I dati arrivano da Gmail oppure da import manuale.  
L'import manuale salva raw content in `newsletter_entries` e mette subito in coda un job AI asincrono in `analyses`.  
Gmail usa OAuth Google e salva i messaggi in `newsletter_inbox`.  
La Inbox puo suggerire competitor mancanti e riallineare newsletter storiche in base a `website`/`domains`.  
La pagina `Competitors` usa ora `competitor-intelligence` per trasformare i segnali grezzi in un profilo strategico per competitor.  
I contenuti vengono analizzati da OpenAI tramite Edge Functions.  
Gli insight aggregano inbox, extraction, competitor e Meta Ads.  
La pagina Analytics ora ha un layer operativo con range selector, action queue, health audit, share-of-voice e competitor coverage.  
Billing e workspace-scoped via Stripe.  
Esiste un admin panel piattaforma separato dal ruolo admin di workspace.  
Il repo e funzionante ma ha gap su scheduler, tipi Supabase, smoke test live delle integrazioni e alcune decisioni ancora non persistite lato backend.  

## 2. Read First

1. `PROJECT_AUDIT.md`
2. `src/App.tsx`
3. `src/hooks/useAuth.tsx`
4. `src/hooks/useWorkspace.tsx`
5. `src/hooks/useRoles.tsx`
6. `supabase/functions/_shared/auth.ts`
7. `supabase/functions/generate-insights/index.ts`
8. `supabase/functions/enqueue-newsletter-analysis/index.ts`
9. `supabase/functions/_shared/newsletter-analysis.ts`
10. `supabase/functions/admin-data/index.ts`
11. `supabase/migrations/20260405143000_harden_platform_auth_and_billing.sql`

## 3. Core Things to Know

- Tutte le Edge Functions osservate hanno `verify_jwt = false`.
- La sicurezza dipende dai guard manuali in `_shared/auth.ts`.
- Il modello ruoli e doppio:
  - membership role in `workspace_members`
  - app role in `user_roles`
- `workspace_billing` e `platform_admins` sono nello schema recente ma non nei generated types browser attuali.
- il dashboard usa `dashboard-snapshot` come fonte primaria e un decision layer condiviso (`src/lib/dashboard-decision-engine.ts`); la UI corrente segue `Daily Brief First` con brief singolo, action queue, signal stream, competitor pulse e health collassabile
- `Competitors` usa `competitor-intelligence` come snapshot server-side per timeline, promo behavior, category focus e assessment strategico
- gli insight sono ora persistiti con schema strutturato (`campaign_type`, `main_message`, `offer_*`, `cta_*`, `product_categories`, `positioning_angle`, `strategic_takeaway`, `priority_level`, `impact_area`)
- il dominio newsletter manuale ha ora una queue leggera basata su `analyses` con `source_snapshot`, `attempt_count`, `max_attempts` e `validation_errors`
- Stripe billing ha sync event-driven via `stripe-webhook`
- l'alerting ora usa un evaluator condiviso e puo partire sia da scan manuali/scheduled sia in background da `gmail-sync`, `extract-newsletter-intel` e `fetch-meta-ads`
- L'inbox puo mostrare dati demo se Gmail non e connesso e non ci sono dati reali.
- Meta Ads lato UI e ancora demo/beta anche se il backend esiste.

## 4. Do Not Break

- il binding tra `workspace_id` e RLS
- la distinzione tra workspace admin e platform admin
- i redirect Gmail OAuth
- i piani billing workspace-scoped
- le functions con service role e accesso a segreti

## 5. Known Sharp Edges

- nessun cron/scheduler osservato per Gmail sync o per scansioni alert periodiche
- React Query montato ma non usato davvero
- `zod` e `react-hook-form` quasi non adottati
- diverse stringhe UI hanno encoding corrotto
- la suite Playwright e presente ma usa mocking deterministico, non provider reali

## 6. Current Quality Snapshot

- `npm run build`: OK
- `npm run test`: OK
- `npm run lint`: OK
- test presenti e piu utili di prima, ma la copertura resta ancora lontana da un vero E2E pack

## 7. Best Next Work

1. rigenerare i generated types Supabase
2. sfruttare il nuovo schema insight persistito per report/alert/query SQL aggiuntive
3. spostare enforcement quote piano lato server
4. chiarire o implementare scheduler per Gmail sync e scansioni alert periodiche
5. aggiungere smoke test reali/staging oltre alla suite mockata
6. ridurre demo mode ambiguo

## 8. Safe Working Style

- fai modifiche minime e verificabili
- prima controlla se tocchi auth, billing, RLS o una Edge Function
- se cambi lo schema DB, aggiorna anche i tipi generati
- non fidarti della UI per i permessi: controlla sempre backend + policies

## 9. Suggested Prompt for Another LLM

```text
Leggi prima PROJECT_AUDIT.md e docs/ai/HANDOFF_FOR_AI.md. 
Assumi che il repository sia una SPA React + Supabase multi-tenant per competitor intelligence. 
Prima di modificare qualcosa, verifica se il flusso tocca billing, Gmail OAuth, ruoli o una Edge Function con verify_jwt=false. 
Mantieni la distinzione tra workspace admin e platform admin. 
Se cambi schema o policy, aggiorna o segnala anche il drift dei generated types Supabase.
```
