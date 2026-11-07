# PWA (instalável e abre offline)

> Detalhes de implementação que saíram do `CLAUDE.md` (índice em "Funcionalidades: onde ler os detalhes").
> Ler inteiro antes de mexer nesta funcionalidade e atualizar no mesmo PR quando o código mudar.

## PWA (instalável e abre offline)
- **Pasta:** `features/pwa/` (`ServiceWorkerUpdater`) + estado em `store/global/pwa.store.ts`; service worker em `apps/web/sw/`.
- **Service worker** gerado DEPOIS do `next build`: `apps/web` → `"build": "next build && serwist build serwist.config.mjs"`. O `serwist build` empacota `apps/web/sw/sw.ts` (esbuild) e injeta o pré-cache de `out/` em `out/sw.js`. Sem Route Handler nem servidor (o pacote `@serwist/turbopack` exige Route Handler — não usar).
- **Publicação como site estático (Cloudflare):** o Worker `treino-guf` publica a pasta `apps/web/out` inteira (`wrangler.jsonc` na raiz), inclusive o `out/sw.js` gerado depois do `next build`. Na Vercel (até 2026-11-07) o preset Next.js deixava o `sw.js` de fora e até 2026-10-20 `/sw.js` dava 404 em produção (sem offline e sem notificações). Cabeçalhos em `apps/web/public/_headers`: cache longo para `/_next/static/`; `/sw.js` sem cache. Conferir depois de publicar: `https://<domínio>/sw.js` deve responder 200. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` também está no `globalEnv` do `turbo.json`.
- **`sw/sw.ts`** tem tsconfig próprio (lib webworker) e fica fora do tsconfig do app; o `pnpm typecheck` do web checa os dois.
- **Pré-cache:** HTML, payloads `.txt` da navegação, JS, CSS, fontes e ícones (sem `.map`). Rotas com query string usam o mesmo HTML (`ignoreURLParametersMatching`). **Nunca** cachear respostas do Supabase no service worker (dados do usuário ficam só no Dexie/TanStack).
- **Registro e atualização:** `ServiceWorkerUpdater` (layout raiz) chama `initPwa()` de `src/store/global/pwa.store.ts`: guarda o convite `beforeinstallprompt`, acompanha o modo instalado e registra `/sw.js` (só no build de produção); versão nova espera e mostra "Nova versão do guf disponível · Atualizar" (`applyUpdate` → `SKIP_WAITING`); só recarrega quando o usuário toca. O Perfil usa o mesmo estado (`usePwaState`, `useInstallPlatform`, `promptInstall`).
- **Manifesto:** `src/app/manifest.ts` (estático → `/manifest.webmanifest`): standalone, retrato, cores ink-950. Ícones: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`; `src/app/icon.svg` (favicon) e `src/app/apple-icon.png` (iPhone). Não definir `icons` no `metadata` (desliga os ícones por arquivo).
- **Topo no iPhone (PWA):** `StatusBarBackdrop` (shared/components, no layout raiz) pinta a área segura do topo na cor do fundo (o conteúdo que rolava por baixo do relógio aparecia borrado); cabeçalhos com altura fixa e `pt-[env(safe-area-inset-top)]` usam `box-content` (senão a área segura come a altura e o conteúdo do cabeçalho vaza).
- **No iPhone:** instalar por Safari → Compartilhar → "Adicionar à Tela de Início" (o iOS não mostra convite automático).
