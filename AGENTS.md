# AGENTS

Regole operative per agenti AI e sviluppatori che lavorano su questo repository.

Scopo:
- ridurre la perdita di contesto tra sessioni
- mantenere coerenza tra codice e documentazione
- evitare modifiche che rompano auth, tenancy, billing o flussi critici

## 1. Read Order

Prima di lavorare sul codice, leggere in questo ordine:

1. [HANDOFF_FOR_AI.md](./docs/ai/HANDOFF_FOR_AI.md)
2. [WORKING_MEMORY.md](./docs/ai/WORKING_MEMORY.md)
3. [PROJECT_AUDIT.md](./PROJECT_AUDIT.md)
4. [ARCHITECTURE.md](./docs/ai/ARCHITECTURE.md)
5. [TECH_DEBT.md](./docs/ai/TECH_DEBT.md)
6. [FEATURES_INVENTORY.md](./docs/ai/FEATURES_INVENTORY.md)
7. [DECISIONS_LOG.md](./docs/ai/DECISIONS_LOG.md)

Ordine minimo per onboarding rapido:
- `AGENTS.md`
- `docs/ai/HANDOFF_FOR_AI.md`
- `docs/ai/WORKING_MEMORY.md`

## 2. Repository Rules

- Analizzare sempre il codice reale prima di proporre modifiche.
- Non assumere che README o copy marketing siano allineati al runtime.
- Distinguere sempre tra fatti osservati e inferenze.
- Se qualcosa non e chiaro, segnarlo come `Da verificare`.
- Preferire modifiche piccole, verificabili e localizzate.
- Non introdurre refactor ampi se non richiesti o non giustificati dal rischio.

## 3. Critical Architecture Rules

- `workspace_id` e il confine tenant principale.
- Le policy RLS sono parte dell'architettura, non solo del database.
- Distinguere sempre tra:
  - workspace admin
  - platform admin
- Billing e workspace-scoped.
- Le Edge Functions osservate hanno `verify_jwt = false`, quindi la validazione manuale in `supabase/functions/_shared/auth.ts` e obbligatoria.
- Non cambiare redirect Gmail, origin sanitization o billing flow senza revisione completa del flusso.

## 4. Code Analysis Rules

Prima di modificare qualsiasi area:

- Auth / permissions:
  - leggere `src/hooks/useAuth.tsx`
  - leggere `src/hooks/useRoles.tsx`
  - leggere `supabase/functions/_shared/auth.ts`
- Workspace / tenancy:
  - leggere `src/hooks/useWorkspace.tsx`
  - verificare `workspace_id` e policy RLS correlate
- Billing:
  - leggere `src/hooks/useSubscription.tsx`
  - leggere `supabase/functions/check-subscription/index.ts`
  - leggere `supabase/functions/create-checkout/index.ts`
  - leggere `supabase/functions/customer-portal/index.ts`
- Gmail:
  - leggere `src/hooks/useGmailConnection.tsx`
  - leggere `supabase/functions/gmail-auth/index.ts`
  - leggere `supabase/functions/gmail-sync/index.ts`
- Schema DB:
  - leggere le migrazioni rilevanti
  - verificare se i generated types sono da rigenerare

## 5. Code Modification Rules

- Non rompere i flussi esistenti per sistemare problemi locali.
- Non spostare logica cross-cutting senza aggiornare la documentazione.
- Se tocchi una Edge Function, controlla sempre:
  - auth
  - role checks
  - `workspace_id`
  - error handling
  - uso dei secret
- Se tocchi schema DB o policy:
  - aggiungere migration SQL
  - verificare impatto su RLS
  - verificare impatto su generated types
- Se tocchi il copy di pricing o landing:
  - verificare che la feature esista davvero nel runtime

## 6. Documentation Rules

Regola critica del repository:

Se una modifica introduce:
- nuova logica di business
- modifica flussi esistenti
- cambiamenti a database/API
- cambiamenti a auth o permessi

allora bisogna:
1. aggiornare documentazione
2. verificare coerenza con documentazione esistente
3. correggere eventuali parti obsolete

La documentazione deve rappresentare la verita attuale del codice.

### Quando aggiornare i file docs

Aggiornare:
- [PROJECT_AUDIT.md](./PROJECT_AUDIT.md)
  - quando cambia la fotografia globale del progetto
- [ARCHITECTURE.md](./docs/ai/ARCHITECTURE.md)
  - quando cambiano flussi, moduli, data flow, integrazioni, punti sensibili
- [FEATURES_INVENTORY.md](./docs/ai/FEATURES_INVENTORY.md)
  - quando cambia stato, perimetro o comportamento reale di una feature
- [TECH_DEBT.md](./docs/ai/TECH_DEBT.md)
  - quando si chiude o si introduce debito tecnico rilevante
- [HANDOFF_FOR_AI.md](./docs/ai/HANDOFF_FOR_AI.md)
  - quando cambia il quadro sintetico utile per onboarding rapido
- [WORKING_MEMORY.md](./docs/ai/WORKING_MEMORY.md)
  - alla fine di task che modificano stato attuale, problemi noti o prossimi passi
- [DECISIONS_LOG.md](./docs/ai/DECISIONS_LOG.md)
  - quando viene presa una decisione architetturale o di flusso rilevante
- [SESSION_LOG.md](./docs/ai/SESSION_LOG.md)
  - a chiusura sessione, in formato sintetico

## 7. Facts vs Hypotheses

Quando scrivi analisi o documentazione:

- Fatti osservati:
  - derivano da codice, config, migrazioni, test, build, lint o comandi eseguiti
- Inferenze:
  - derivano da copy, naming, struttura, schema o comportamento dedotto
- Ambiguita:
  - vanno marcate come `Da verificare`

Non presentare ipotesi come se fossero fatti.

## 8. Safe Starting Points

Zone sicure per iniziare senza rischio elevato:
- test
- documentazione
- cleanup copy/encoding
- env docs
- generated types regeneration
- componenti UI non cross-cutting

## 9. Areas Requiring Review Before Changes

Non toccare senza review consapevole:
- `supabase/config.toml`
- `supabase/functions/_shared/auth.ts`
- policy RLS e migrazioni ruoli
- billing flow Stripe
- redirect Gmail OAuth
- `workspace_billing`
- `platform_admins`
- `admin-data`
- `generate-insights`

## 10. End-of-Task Report Format

A fine task, il report deve essere sintetico e includere:

- cosa e stato fatto
- file toccati
- verifiche eseguite
- rischi residui o cose non fatte
- documentazione aggiornata

Formato consigliato:

```text
Done:
- ...

Files changed:
- ...

Verification:
- ...

Docs updated:
- ...

Remaining risks / follow-ups:
- ...
```
