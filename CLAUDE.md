# CLAUDE.md — Competitor Compass

## Identità del progetto

**Nome:** Competitor Compass (internal: Tracklyze)
**Descrizione:** Piattaforma SaaS B2B per competitive intelligence. Permette ai team di monitorare competitor, analizzare newsletter, gestire Meta Ads, generare insights AI, e ricevere alert automatici.
**Stato:** Produzione attiva — branch principale `main`, sviluppo su feature branches.
**Architettura:** Full-stack con React frontend + Supabase (PostgreSQL, Auth, Edge Functions) + Stripe billing.

---

## Stack tecnologico

### Frontend
| Libreria | Versione | Ruolo |
|---|---|---|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.8.3 | Tipizzazione |
| Vite + SWC | 8.0.3 / 4.3.0 | Build tool, dev server (porta 8080) |
| React Router | 6.30.1 | Routing client-side |
| TanStack React Query | 5.83.0 | Server state, caching, refetch |
| Tailwind CSS | 3.4.17 | Styling (HSL CSS variables, dark mode class-based) |
| Shadcn UI + Radix UI | vari | Componenti headless accessibili |
| Recharts | 2.15.4 | Grafici e visualizzazioni |
| React Hook Form + Zod | 7.61.1 / 3.25.76 | Form management e validazione |
| Sonner | 1.7.4 | Toast notifications |
| Lucide React | 0.462.0 | Icone |
| DOMPurify | 3.3.3 | Sanitizzazione HTML (anti-XSS) |
| next-themes | 0.3.0 | Dark mode toggle |
| date-fns | 3.6.0 | Manipolazione date |

### Backend / Infrastruttura
| Servizio | Ruolo |
|---|---|
| Supabase (PostgreSQL) | Database principale con RLS |
| Supabase Auth | Autenticazione (email/password, OAuth Gmail) |
| Supabase Edge Functions | Business logic serverless (18 funzioni, Deno) |
| Stripe | Billing: checkout, customer portal, webhook |
| Meta Ads API | Integrazione campagne pubblicitarie |
| Gmail API | OAuth sync email per newsletter monitoring |
| OpenAI | AI analysis nelle edge functions (`_shared/openai.ts`) |

### Dev / Test / Build
| Tool | Versione | Ruolo |
|---|---|---|
| Vitest | 3.2.4 | Unit/integration tests (jsdom) |
| Playwright | 1.57.0 | E2E tests |
| Testing Library | 16.0.0 | React component testing |
| ESLint | 9.32.0 | Linting (typescript-eslint, react-hooks, react-refresh) |
| PostCSS + Autoprefixer | 8.5.6 | CSS processing |

---

## Comandi essenziali

```bash
# Sviluppo
npm run dev          # Dev server su http://localhost:8080

# Build
npm run build        # Build produzione → dist/
npm run build:dev    # Build con mode=development
npm run preview      # Preview build locale

# Test
npm run test         # Vitest run (una volta)
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright E2E tests

# Qualità
npm run lint         # ESLint sull'intero progetto

# Supabase (locale, se necessario)
supabase start       # Avvia stack locale
supabase db push     # Applica migrazioni
supabase functions serve  # Serve edge functions localmente
```

**Variabili d'ambiente richieste** (file `.env`):
```
VITE_SUPABASE_URL="https://qynksmyzqkzltnuajarm.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
VITE_SUPABASE_PROJECT_ID="qynksmyzqkzltnuajarm"
```
Le variabili vengono lette tramite `src/lib/env.ts` — non accedere mai direttamente a `import.meta.env` nei componenti.

---

## Convenzioni di codice

### Componenti React
- **Solo functional components** — mai class components
- **Props tipizzate con `interface` dedicata**, mai `type` inline nei parametri
- **Export**: export nominato + export default quando il componente è una pagina
- **Nessun inline style** — usa classi Tailwind o variabili CSS
- **Memoizzazione esplicita** (`React.memo`) solo per componenti provati come bottleneck (es. `TopBar`, `AppSidebar`)
- **Lazy loading** per tutte le pagine in `App.tsx` tranne Index e Auth

### Naming
- **File componenti**: PascalCase (`DashboardSnapshot.tsx`)
- **File hooks**: camelCase con prefisso `use` (`useWorkspace.tsx`)
- **File utilities**: kebab-case (`dashboard-decision-engine.ts`)
- **Costanti globali**: UPPER_SNAKE_CASE
- **Variabili e funzioni**: camelCase

### Hooks e stato
- **Stato globale**: Context API (Auth, Workspace, Subscription) — usare i provider in `App.tsx`
- **Stato server**: TanStack React Query — sempre con staleTime/gcTime espliciti
- **Stato locale UI**: `useState` e `useReducer` — non alzare mai lo stato inutilmente
- I custom hooks in `src/hooks/` espongono un'interfaccia pulita e non devono fare side-effects impliciti

### Gestione errori
- **User-facing errors**: `sonner` toast via `toast.error()`
- **Logging**: `console.error()` per errori interni non mostrati all'utente
- **Boundaries**: `ErrorBoundary` wrappa il contenuto principale in `AppLayout.tsx`
- **Errori di rete**: `src/lib/transient-network.ts` gestisce retry per errori transitori
- **Sanitizzazione**: usare sempre `DOMPurify.sanitize()` prima di rendere HTML da sorgenti esterne

### Sicurezza
- Mai esporre secret lato client — usare solo la `PUBLISHABLE_KEY` (anon key) di Supabase
- Le logiche privilegiate vivono nelle **Edge Functions**, non nel frontend
- **RLS attivo su tutte le tabelle** — le query devono sempre passare per l'utente autenticato
- Sanitizzare sempre l'HTML esterno con `DOMPurify` prima di `dangerouslySetInnerHTML`
- Validare input utente con **Zod** prima di inviare a Supabase o edge functions

### Forms
- `react-hook-form` + `@hookform/resolvers/zod` per tutti i form
- Schema Zod definito **fuori** dal componente (non inline)
- Mostrare sempre `formState.errors` all'utente

---

## Architettura dei moduli

### Struttura cartelle (`src/`)

```
src/
├── App.tsx                    # Root: provider stack + React Router + route definitions
├── main.tsx                   # Entry point (inizializza dark mode prima del render)
├── index.css                  # Global styles + CSS variables Tailwind
│
├── pages/                     # Route components (lazy-loaded)
│   ├── Index.tsx              # Landing page (eager)
│   ├── Auth.tsx               # Login/Signup (eager)
│   ├── Dashboard.tsx          # Dashboard principale con decision engine
│   ├── Competitors.tsx
│   ├── Insights.tsx
│   ├── Analytics.tsx
│   ├── Alerts.tsx
│   ├── MetaAds.tsx / MetaAdsCompare.tsx
│   ├── NewsletterInbox.tsx / NewsletterDetail.tsx / NewsletterReader.tsx
│   ├── Settings.tsx / TeamManagement.tsx / Billing.tsx
│   ├── Onboarding.tsx
│   └── admin/                 # Admin panel (isolato con AdminGuard)
│       ├── AdminDashboard.tsx
│       ├── AdminUsers.tsx
│       ├── AdminWorkspaces.tsx
│       ├── AdminLogs.tsx
│       ├── AdminIntegrations.tsx
│       ├── AdminIssues.tsx
│       └── AdminSecrets.tsx
│
├── components/
│   ├── AppLayout.tsx          # Layout wrapper autenticato (TopBar + Sidebar + ErrorBoundary)
│   ├── AppSidebar.tsx         # Navigazione laterale con workspace selector e role badges
│   ├── RouteGuard.tsx         # Protezione rotte per ruolo e verifica email
│   ├── admin/AdminGuard.tsx   # Protezione rotte admin (isPlatformAdmin)
│   ├── AuthRedirect.tsx       # Redirect post-login
│   ├── ErrorBoundary.tsx      # Catch rendering errors
│   ├── GmailConnect.tsx       # UI connessione Gmail
│   ├── UpgradePrompt.tsx      # Banner upgrade piano
│   └── ui/                    # Shadcn UI components (accordion, badge, button, card, ...)
│
├── hooks/                     # Custom hooks (logica riutilizzabile)
│   ├── useAuth.tsx            # AuthProvider + useAuth() — sessione utente
│   ├── useWorkspace.tsx       # WorkspaceProvider + useWorkspace() — workspace corrente
│   ├── useSubscription.tsx    # SubscriptionProvider + useSubscription() — billing tier
│   ├── useRoles.tsx           # Role-based access (isAdmin, isAnalyst, canAnalyze, ...)
│   ├── useAdmin.tsx           # isPlatformAdmin check
│   ├── useAlerts.tsx          # Lista alert, mark-read, polling
│   ├── useInsights.tsx        # Insights filtrati e paginati
│   ├── useAnalyticsData.tsx   # Dati per Analytics page
│   ├── useMetaAds.tsx         # Meta Ads data fetching
│   ├── useNewsletterInbox.tsx # Inbox con conteggio non letti
│   ├── useGmailConnection.tsx # Stato connessione Gmail + OAuth
│   ├── useOnboarding.tsx      # Flusso onboarding step-by-step
│   ├── useUsage.tsx           # Tracking utilizzo features
│   ├── useDebounce.ts         # Utility: valore debounced
│   └── useAnalyticsTracker.tsx # Tracking eventi analytics
│
├── integrations/supabase/
│   ├── client.ts              # Supabase client (localStorage, auto-refresh)
│   └── types.ts               # Tipi auto-generati dal DB — NON modificare manualmente
│
├── lib/
│   ├── env.ts                 # Lettura variabili d'ambiente (unico punto di accesso)
│   ├── utils.ts               # cn() e utility generiche
│   ├── errors.ts              # Classi di errore custom
│   ├── invokeEdgeFunction.ts  # Wrapper type-safe per chiamare edge functions
│   ├── dashboard-decision-engine.ts  # Logica del decision engine nella dashboard
│   ├── insight-priority.ts    # Calcolo priorità degli insights
│   ├── transient-network.ts   # Retry logic per errori di rete
│   └── export-csv.ts          # Export dati in CSV
│
└── types/                     # TypeScript types custom (non DB)
```

### Provider stack (in ordine in `App.tsx`)
```
QueryClientProvider (React Query)
  └── AuthProvider
        └── WorkspaceProvider
              └── SubscriptionProvider
                    └── BrowserRouter
                          └── Routes
```

### Flusso di autenticazione e autorizzazione
1. `AuthProvider` → carica sessione da Supabase Auth (localStorage)
2. `WorkspaceProvider` → carica workspace dell'utente corrente
3. `RouteGuard` → controlla `minimumRole` e `requireVerified` prima di rendere la pagina
4. `AdminGuard` → chiama edge function `admin-data` per verificare `isPlatformAdmin`
5. RLS di Supabase → protezione a livello DB (ogni query è scoped all'utente)

### Edge Functions (`supabase/functions/`)
| Funzione | Ruolo |
|---|---|
| `admin-data` | Statistiche piattaforma per admin |
| `analyze-newsletter` | Analisi contenuto newsletter con AI |
| `analyze-meta-ad` | Intelligence sugli ads Meta |
| `check-subscription` | Verifica stato abbonamento Stripe |
| `competitor-intelligence` | Dati intelligence sui competitor |
| `create-checkout` | Crea sessione Stripe checkout |
| `customer-portal` | Redirect al portale Stripe |
| `dashboard-snapshot` | Snapshot dati dashboard (server-side) |
| `enqueue-newsletter-analysis` | Accodamento analisi newsletter |
| `evaluate-alerts` | Valutazione regole di alert |
| `extract-newsletter-intel` | Estrazione intelligence da newsletter |
| `fetch-meta-ads` | Fetch campagne Meta Ads API |
| `generate-insights` | Generazione insights AI (OpenAI) |
| `gmail-auth` | OAuth flow Gmail |
| `gmail-sync` | Sincronizzazione email Gmail |
| `reports-center` | Generazione report |
| `stripe-webhook` | Gestione webhook Stripe |
| `_shared/openai.ts` | Client OpenAI condiviso tra functions |

Tutte le edge functions hanno `verify_jwt = false` in `config.toml` — la verifica JWT è manuale. Usare sempre `src/lib/invokeEdgeFunction.ts` per invocarle dal frontend.

### Database (Supabase PostgreSQL)
Le migrazioni vivono in `supabase/migrations/`. I tipi TypeScript sono auto-generati in `src/integrations/supabase/types.ts`.

Tabelle principali:
- `profiles` — metadati utente
- `workspaces` + `workspace_members` — multi-tenancy
- `user_roles` — ruoli app (admin/analyst/viewer)
- `competitors` — competitor tracciati
- `newsletters` + `newsletter_items` — fonti e contenuti
- `analyses` — analisi completate
- `insights` — insights generati (con priorità e categoria)
- `alert_rules` + `alerts` — sistema di alerting
- `meta_ads` — dati Meta/Facebook
- `gmail_connections` — stato OAuth Gmail
- `stripe_customers` — billing per workspace

---

## Regole comportamentali per Claude

### Principio fondamentale — autonomia sui fix
**Procedi in autonomia quando sei sicuro. Riporta quando hai dubbi.**

Applica direttamente (senza chiedere) quando:
- Il fix è puntuale, con effetti chiaramente limitati a un modulo
- Il rischio di regressione è nullo o basso
- La correzione riguarda un bug inequivocabile (non una preferenza)

Riporta prima di toccare quando:
- Il fix modifica logica condivisa (DB functions, RLS, attribuzioni, schemi)
- Ci sono trade-off tra più approcci
- La modifica ha effetti retroattivi su dati esistenti
- Il rischio è classificabile come "risky"

### NON fare mai
- Non modificare `src/integrations/supabase/types.ts` — è auto-generato
- Non aggiungere dipendenze npm senza chiedere prima
- Non accedere a `import.meta.env` direttamente — usare `src/lib/env.ts`
- Non inserire logica business nelle edge functions senza considerare il RLS del DB
- Non rimuovere `DOMPurify.sanitize()` da rendering di HTML esterno
- Non creare class components
- Non aggiungere `console.log` in produzione — usare `console.error` solo per errori reali
- Non modificare `supabase/config.toml` senza verificare l'impatto su tutte le funzioni
- Non fare `git add -A` o `git add .` — staged solo i file rilevanti

### Gestione dipendenze
- Prima di aggiungere una libreria, verifica se la funzionalità esiste già in quelle installate
- Preferire librerie già nel progetto (es. `date-fns` per date, `zod` per validazione)
- Aggiornamenti di versione: proporre sempre, non eseguire automaticamente

### Commit standard (Conventional Commits)
```
<type>(<scope>): <description breve in inglese>

[body opzionale: spiega il "perché", non il "cosa"]
```
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`
Scope: nome del modulo o pagina (es. `dashboard`, `alerts`, `auth`, `meta-ads`)
Massimo 72 caratteri per la prima riga.

### Workflow obbligatorio per ogni task
1. **Explore** — leggi i file coinvolti, non toccare nulla
2. **Plan** — proponi il piano con file, modifiche e rischi
3. **Implement** — esegui solo dopo approvazione
4. **Verify** — esegui test, poi `/review`, poi `/commit`

### Test
- Ogni nuovo hook o utility dovrebbe avere un test Vitest in `src/**/*.test.ts`
- I test E2E Playwright vivono in `tests/`
- Non modificare `playwright-fixture.ts` senza capire come funziona il mock system
- Se scrivi un test, non mockare il database — usa i fixture reali o l'helper `mockApp()`

---

## Slash commands disponibili

| Comando | File | Scopo |
|---|---|---|
| `/review` | `.claude/commands/review.md` | Code review focalizzata su bug e security |
| `/component` | `.claude/commands/component.md` | Crea nuovo componente React |
| `/refactor` | `.claude/commands/refactor.md` | Refactoring sicuro con test first |
| `/commit` | `.claude/commands/commit.md` | Commit strutturato Conventional Commits |

---

## Pattern architetturali da rispettare

### React Query
```typescript
// staleTime e gcTime sempre espliciti
const { data } = useQuery({
  queryKey: ['alerts', workspaceId],
  queryFn: () => fetchAlerts(workspaceId),
  staleTime: 60_000,
  gcTime: 300_000,
  enabled: !!workspaceId,
});
```

### Chiamata a edge function
```typescript
// Sempre tramite invokeEdgeFunction, mai direttamente con supabase.functions.invoke
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction';

const result = await invokeEdgeFunction('generate-insights', { workspaceId });
```

### Componente con guard di ruolo
```typescript
// RouteGuard wrappa le pagine protette in App.tsx
<RouteGuard minimumRole="analyst" requireVerified>
  <Insights />
</RouteGuard>
```

### Controllo permessi inline
```typescript
const { canAnalyze, isAdmin } = useRoles();
if (!canAnalyze) return <UpgradePrompt />;
```
