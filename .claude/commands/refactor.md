Refactora il codice indicato seguendo questi vincoli:

- Non cambiare il comportamento esterno (stessi input, stessi output, stessa UI)
- Non aggiungere nuove dipendenze npm
- Mantieni o migliora la leggibilità
- Non toccare `src/integrations/supabase/types.ts` (auto-generato)
- Non alzare stato inutilmente — lo stato locale resta locale
- Dopo ogni modifica, verifica che i test esistenti passino con `npm run test`
- Se i test non esistono per il codice modificato, scrivili prima di refactorare
- Se estrai un hook, posizionalo in `src/hooks/` con naming `use<Name>.tsx`
- Se estrai una utility, posizionala in `src/lib/<name>.ts`

Al termine, documenta brevemente cosa è cambiato e perché, senza modificare il comportamento.
