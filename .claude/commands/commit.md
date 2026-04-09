Analizza le modifiche correnti (`git diff --staged`) e crea un commit seguendo il formato Conventional Commits:

```
<type>(<scope>): <description in inglese>

[body opzionale: spiega il "perché", non il "cosa" — max 3 righe]
```

Types validi: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`

Scope — usa il nome del modulo o pagina coinvolta:
- `auth`, `dashboard`, `alerts`, `insights`, `meta-ads`, `newsletter`, `billing`, `competitors`, `analytics`, `settings`, `admin`, `onboarding`
- Per infrastruttura: `supabase`, `edge-fn`, `deps`, `config`

Regole:
- La description deve essere in inglese, imperativa, massimo 72 caratteri
- NON aggiungere Co-Authored-By o footer automatici
- NON includere "refactored", "updated", "changed" — descrivi cosa fa il codice, non cosa hai fatto tu
- Se ci sono più scope indipendenti, usa scope generico o dividi in commit separati

Prima di committare, esegui `npm run lint` e verifica che non ci siano errori bloccanti.
