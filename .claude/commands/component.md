Crea un nuovo componente React seguendo le convenzioni di questo progetto.

Regole obbligatorie:
- Functional component con TypeScript
- Props tipizzate con `interface` dedicata (nome: `<ComponentName>Props`)
- Nessun inline style: usa classi Tailwind o variabili CSS dal tema
- Usa i componenti Shadcn UI da `src/components/ui/` dove appropriato
- Icone solo da `lucide-react`
- Se il componente accede a dati: usa un hook esistente da `src/hooks/` o crea uno nuovo
- Export nominato + export default
- Se il componente gestisce stato server: usa TanStack React Query con staleTime esplicito
- Aggiorna `lessons.md` se scopri una convenzione non documentata in `CLAUDE.md`

Posizione file:
- Componente riutilizzabile → `src/components/<ComponentName>.tsx`
- Componente specifico di una pagina → `src/components/<feature>/<ComponentName>.tsx`
- Pagina → `src/pages/<PageName>.tsx` (aggiungere route lazy in `App.tsx`)
