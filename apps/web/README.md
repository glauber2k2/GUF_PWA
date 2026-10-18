# @guf/web

PWA do Guf (Next.js, App Router, export estático). Veja o `CLAUDE.md` na raiz.

```bash
cp .env.example .env.local   # preencha com URL e chave anon do Supabase
pnpm dev                     # a partir da raiz do monorepo
```

Código organizado por feature: `src/features/<feature>/` (com barrel `index.ts`), `src/shared/` para o que é comum e
`src/store/global/` para stores externos. Regras e camadas em [`docs/architecture.md`](../../docs/architecture.md).
