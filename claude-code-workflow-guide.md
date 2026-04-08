# Claude Code — Workflow Guide per Web Development

## Panoramica del sistema

Questo documento descrive l'architettura di file e le pratiche di lavoro da adottare in ogni progetto per massimizzare l'efficienza con Claude Code. Va usato come **riferimento da consegnare a Claude Code** per generare i file reali del tuo progetto.

---

## Struttura dei file da creare

```
Progetto/
├── CLAUDE.md
├── lessons.md
└── .claude/
    └── commands/
        ├── review.md
        ├── component.md
        ├── refactor.md
        └── commit.md
```

---

## `CLAUDE.md` — Memoria permanente del progetto

File letto automaticamente da Claude Code ad ogni sessione. È il contratto tra te e Claude: definisce chi è il progetto, come è fatto, e come si lavora.

### Sezioni da includere

**Identità del progetto**
- Nome, descrizione breve, obiettivo principale
- Stato attuale (in sviluppo / produzione / manutenzione)

**Stack tecnologico**
- Frontend, backend, database, servizi esterni
- Versioni rilevanti delle dipendenze principali

**Comandi essenziali**
- Avvio del dev server
- Esecuzione dei test
- Build di produzione
- Linting e formatting

**Convenzioni di codice**
- Stile dei componenti (es. functional components con hooks, mai class components)
- Naming conventions (file, variabili, funzioni, classi)
- Gestione degli errori
- Struttura delle cartelle

**Architettura**
- Descrizione dei moduli principali
- Come i moduli si relazionano tra loro
- Pattern architetturali adottati (es. feature-based, atomic design)

**Regole comportamentali per Claude**
- Cosa NON fare mai (es. modificare file di configurazione senza chiedere)
- Come gestire le dipendenze (aggiungere solo se strettamente necessario)
- Standard minimi per i commit

---

## `lessons.md` — Memoria degli errori

File aggiornato da Claude ogni volta che fa un errore corretto da te. Costruisce nel tempo un insieme di regole specifiche per il tuo progetto.

### Formato consigliato

```markdown
## Lezione #001 — [data]
**Errore**: [cosa ha fatto di sbagliato]
**Contesto**: [in quale situazione]
**Regola**: [cosa fare invece, in forma imperativa]
```

### Come usarlo

Dopo ogni correzione significativa, di' a Claude:
> "Scrivi una regola in lessons.md che prevenga questo errore in futuro."

Claude scrive la regola da solo. Nel tempo questo file diventa il tuo manuale di qualità personalizzato.

---

## `.claude/commands/` — Slash commands personalizzati

Comandi riutilizzabili per le azioni più frequenti. Vivono nella cartella `.claude/commands/` e vengono committati su git insieme al codice.

### `review.md` — Code review focalizzata

Esegue una review del codice concentrata su ciò che conta davvero.

```
Fai una code review delle modifiche recenti.
Cerca esclusivamente:
- Bug logici
- Problemi di sicurezza
- Edge case non gestiti
- Regressioni rispetto al comportamento esistente

NON commentare su stile, naming, o preferenze personali.
Sii conciso: una riga per ogni problema trovato, con riferimento al file e alla riga.
```

### `component.md` — Creazione componente

Crea un nuovo componente rispettando le convenzioni del progetto.

```
Crea un nuovo componente React con il nome fornito.
Segui queste regole:
- Functional component con TypeScript
- Props tipizzate con interface dedicata
- Nessun inline style: usa i moduli CSS o il sistema di styling del progetto
- Includi un export nominato e un export default
- Aggiungi un test base nel file *.test.tsx corrispondente
```

### `refactor.md` — Refactoring sicuro

Refactoring con vincoli chiari per evitare regressioni.

```
Refactora il codice indicato seguendo questi vincoli:
- Non cambiare il comportamento esterno (stessi input, stessi output)
- Non aggiungere nuove dipendenze
- Mantieni o migliora la leggibilità
- Dopo ogni modifica, verifica che i test passino
- Se i test non esistono, scrivili prima di refactorare
```

### `commit.md` — Commit strutturato

Genera un commit message coerente e commita le modifiche.

```
Analizza le modifiche correnti e crea un commit seguendo il formato Conventional Commits:
<type>(<scope>): <description>

Types validi: feat, fix, refactor, test, docs, chore, style
- La description deve essere in italiano/inglese (scegli in base al progetto)
- Massimo 72 caratteri per la prima riga
- Se necessario, aggiungi un body che spiega il "perché", non il "cosa"

Non aggiungere Co-Authored-By o footer automatici.
```

---

## Il ciclo di lavoro in 4 fasi

Per ogni nuovo task, segui sempre questo ordine. Non saltare fasi.

### Fase 1 — Explore (solo lettura)

Claude legge e comprende senza modificare nulla.

Prompt tipo:
> "Leggi @src/[file] e spiegami [aspetto specifico]. Non modificare nulla."

Usa la **Plan Mode** (Shift+Tab) per assicurarti che Claude non tocchi il codice.

### Fase 2 — Plan (solo pianificazione)

Claude propone un piano d'azione che tu devi approvare prima di procedere.

Prompt tipo:
> "Pianifica come implementare [feature]. Elenca i file che toccherai, le modifiche che farai, e i rischi. Non scrivere ancora codice."

Non procedere finché il piano non ti convince.

### Fase 3 — Implement (esecuzione)

Solo dopo aver approvato il piano, Claude implementa.

Prompt tipo:
> "Procedi con il piano approvato. Lavora un file alla volta e dimmi quando hai finito ogni step."

### Fase 4 — Verify & Commit

Claude verifica, testa, e commita.

Prompt tipo:
> "Esegui i test. Se falliscono, correggili. Poi usa /review per cercare bug e security issues. Infine usa /commit."

---

## Controllo della profondità di ragionamento

Con il piano Max non è necessario cambiare modello manualmente. Si controlla la profondità di analisi con keyword nel prompt:

| Keyword | Quando usarla |
|---|---|
| *(nessuna)* | Task semplici, modifiche locali |
| `think` | Task con più file coinvolti |
| `think hard` | Refactoring, nuove feature complesse |
| `think harder` | Architettura, decisioni con impatto a lungo termine |

Esempi:
> "think hard: refactora il sistema di autenticazione mantenendo la compatibilità con l'API esistente."

> "Aggiorna il testo del bottone nel componente Header." *(nessuna keyword)*

---

## Sessioni e lavoro parallelo

### Nomi alle sessioni

Appena inizi un task, rinomina la sessione con `/rename [nome-descrittivo]`.

Esempi: `auth-refresh-token`, `dashboard-charts`, `bug-login-redirect`

### Git worktrees per task paralleli

Per lavorare su più feature contemporaneamente senza conflitti:

```bash
# Crea un worktree per una nuova feature
git worktree add ../progetto-feature-x feature/x

# Apri Claude Code nella nuova directory
cd ../progetto-feature-x
claude
```

Ogni istanza Claude lavora in isolamento. Nessun conflitto, nessuna contaminazione del contesto.

---

## Come iniziare su un nuovo progetto

1. Crea `CLAUDE.md` con le sezioni descritte sopra
2. Crea `lessons.md` vuoto (si riempirà nel tempo)
3. Crea la cartella `.claude/commands/` con i comandi base
4. Apri Claude Code ed esegui `/init` per un'analisi automatica del progetto
5. Chiedi a Claude di integrare l'output di `/init` nel tuo `CLAUDE.md`

---

## Come iniziare su un progetto esistente

Dai questo prompt a Claude Code:

> "Leggi l'intera codebase e genera un `CLAUDE.md` completo seguendo la struttura del file `claude-code-workflow-guide.md`. Includi stack reale, comandi reali, convenzioni che vedi già nel codice, e architettura dei moduli. Poi crea `lessons.md` vuoto e i comandi in `.claude/commands/`."
