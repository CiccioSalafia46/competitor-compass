Fai una code review delle modifiche recenti in questo progetto React + Supabase.

Cerca esclusivamente:
- Bug logici (race conditions, stato non aggiornato, effetti non puliti)
- Problemi di sicurezza (XSS, SQL injection, dati non sanitizzati con DOMPurify, secret esposti lato client)
- Edge case non gestiti (loading/error states mancanti, array vuoti, undefined non gestiti)
- Regressioni rispetto al comportamento esistente (RLS Supabase rotta, route guard bypassate)
- Violazioni delle convenzioni del progetto (accesso diretto a import.meta.env, tipi.ts modificato manualmente, class components)

NON commentare su stile, naming, o preferenze personali.
Sii conciso: una riga per ogni problema trovato, con riferimento al file e alla riga nel formato [file:riga].
Concludi con un totale: "X problemi trovati" oppure "Nessun problema trovato".
