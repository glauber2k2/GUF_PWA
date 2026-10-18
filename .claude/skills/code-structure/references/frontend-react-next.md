# Arquitetura de Pastas — apps/web (Next.js App Router, site estático)

> Organize por **feature/domínio**, nunca por tipo de arquivo global. Cada feature é uma fatia vertical com tudo
> que precisa; o que é usado por várias features sobe para `shared/`. Regras de negócio, validação e acesso ao
> Supabase NÃO moram no app: ficam nos pacotes do monorepo (`packages/core`, `schemas`, `api`).

## 1. Árvore completa (`apps/web/src/`)

```
src/
├── app/                          # App Router (só roteamento e composição; output: "export")
│   ├── (app)/                    # Exige sessão e aceite (RequireAuth + AppShell)
│   ├── (auth)/                   # /login e /cadastro
│   ├── (consent)/                # /aceite
│   ├── <rota>/page.tsx           # Importa a tela pelo barrel da feature: import { XScreen } from "@/features/x"
│   ├── *.dev.tsx                 # Páginas só do `next dev` (pageExtensions)
│   ├── layout.tsx                # Layout raiz: fontes, THEME_BOOT_SCRIPT, Providers, ServiceWorkerUpdater
│   ├── providers.tsx             # Raiz de composição: QueryProvider, AuthProvider, MotionProvider, LegalReaderProvider
│   ├── not-found.tsx             # 404 (vira out/404.html)
│   ├── manifest.ts               # Manifesto do PWA
│   ├── globals.css               # Só imports dos tokens, Tailwind, fontes e keyframes
│   └── fonts/
│
├── features/
│   └── <feature>/                # kebab-case: home, history, workout, projects, routine, profile...
│       ├── api/                  # Hooks do TanStack Query sobre packages/api (useXxx, useXxxSource, mutations)
│       ├── hooks/                # Lógica da feature, um hook por finalidade (inclui use-dev-*-state)
│       ├── helpers/              # Funções puras da feature (paths, reducers de rascunho, builders)
│       ├── constants/            # Catálogos e valores fixos nomeados
│       ├── components/           # Frações de UI da feature (cards, folhas, skeletons)
│       ├── providers/            # Context da feature (ex.: WorkoutProvider, AuthProvider)
│       ├── ui/                   # Telas (XScreen) — composição, sem regra de negócio
│       ├── type.ts               # Tipos próprios da feature (quando existirem)
│       └── index.ts              # Barrel: contrato público da feature
│
├── shared/                       # Usado por 2+ features ou sem domínio (infraestrutura)
│   ├── components/
│   │   ├── ds/                   # Design system do Guf (barrel em ds/index.ts)
│   │   └── ui/                   # Componentes adicionados pelo CLI do shadcn
│   ├── hooks/                    # Hooks genéricos (online, rolagem, reordenar, folha arrastável...)
│   ├── helpers/                  # class-names (cn), motion (prefers-reduced-motion)
│   ├── libs/                     # supabase.ts (getSupabaseClient), query-provider.tsx, query-keys.ts
│   ├── offline/                  # Dexie: db, fila (outbox), cópia do treino, cache do aparelho
│   ├── preferences/              # Preferências do aparelho (tema, createDevicePreference)
│   └── sound/                    # Motor de som + sons do soundcn (alias "lib" do components.json)
│
├── store/
│   └── global/                   # Estado global fora do React (useSyncExternalStore): *.store.ts
│
├── mocks/                        # Dados fictícios com a MESMA assinatura de packages/api (só dev)
└── styles/tokens/                # Tokens do @theme
```

Fora de `src/`: `sw/` (service worker do Serwist, tsconfig próprio) e `public/` (ícones do PWA).

## 2. Camadas e dependências (SOLID)

```
app/ (rota) → features/<f>/ui → features/<f>/hooks | api → packages/api → Supabase (RLS)
                                         ↓                     ↑
                                   shared/offline (fila Dexie) ┘   regras puras: packages/core
```

| Camada | Faz | Não pode |
|---|---|---|
| `app/` | Declarar a rota, metadata e compor a tela da feature | Lógica, chamada ao Supabase |
| `features/<f>/ui` | Montar a tela com componentes e hooks | Regra de negócio, chamada direta a `packages/api` |
| `features/<f>/api` | `useQuery`/`useMutation` sobre funções de `packages/api` (ou do mock em dev) | JSX, `fetch`, `supabase.from()` direto |
| `features/<f>/hooks` | Estado e orquestração de UI da feature | Cálculo de negócio (vai para `packages/core`) |
| `shared/offline` | Fila de escrita e cópias locais (Dexie) | Conhecer telas |
| `packages/api` | Consultas e gravações no Supabase, `{ data, error }` | React |
| `packages/core` | Regras puras (1RM, volume, recordes, datas, textos) | React, Supabase |
| `packages/schemas` | Schemas Zod compartilhados | — |

Regras fixas do projeto que a estrutura respeita:
- **Site estático:** nada de Server Actions, Route Handlers, middleware ou SSR com dados. Tudo roda no cliente.
- **Backend = Supabase:** segurança no RLS; o app usa só a chave `publishable`. Mudança de banco só por migration em `supabase/migrations/`.
- **Offline-first no treino:** escrita do treino em andamento sempre pela fila (`shared/offline/outbox.ts`).
- **Dependency Inversion:** a tela recebe a fonte de dados por hook (`useXxxSource` escolhe API real ou mock);
  mocks validados com `satisfies <Contrato>Api` para que trocar a fonte não mude a tela.

## 3. Papel de cada pasta

| Pasta | Contém | Não pode |
|---|---|---|
| `features/<f>/api/` | Hooks do TanStack Query e invalidações | Lógica de tela |
| `features/<f>/hooks/` | Um hook por finalidade | Hook devolvendo 5+ valores não relacionados |
| `features/<f>/helpers/` | Funções puras da feature | Regras de negócio reaproveitáveis no mobile (essas vão para `packages/core`) |
| `features/<f>/components/` | Frações de UI da feature | Componente usado por várias features (sobe para `shared/components/`) |
| `features/<f>/ui/` | Telas (`XScreen`) | Regra de negócio |
| `index.ts` | Só o que outras features e `app/` usam | Ser furado: ninguém importa o interior de outra feature |
| `shared/` | O que é usado por 2+ features ou é infraestrutura | Código de uma feature só; importar de `features/` (a composição entre features fica em `app/`) |
| `store/global/` | Stores externos (toast, PWA) | Estado que cabe num hook local |
| `mocks/` | Fontes fictícias espelhando `packages/api` | Código que roda no carregamento do módulo (o build não descarta) |

## 4. Regras

| Regra | Detalhe |
|---|---|
| Barrel obrigatório | `app/` e outras features importam `@/features/<f>`; dentro da feature, caminho direto |
| `shared/` sem barrel geral | Importar pelo caminho (`@/shared/hooks/use-online-status`); o design system usa `@/shared/components/ds` |
| Um hook por finalidade | `useProjectsOverview`, `useCanEditPlanning`; nunca um `useProjects` que faz tudo |
| Telas sem regra de negócio | Cálculos vêm de `packages/core`; dados de `api/` |
| Sem `fetch` nem `supabase.from()` no app | Toda consulta passa por `packages/api` |
| Sem `utils.ts` genérico | Helpers por domínio |
| Promoção para `shared/` | Quando o segundo uso aparecer em outra feature |
| Promoção para `packages/` | Regra ou consulta que o app mobile (Expo) também vai usar |
| Nomes | Pastas e arquivos em kebab-case; componentes PascalCase; hooks com `use`; stores `*.store.ts` |

## 5. Feature nova — scaffold

```bash
FEATURE=medidas
mkdir -p apps/web/src/features/$FEATURE/{api,components,ui}
touch apps/web/src/features/$FEATURE/index.ts
```

Crie só as subpastas que a feature realmente vai usar. Ordem: função em `packages/api` (+ regra em
`packages/core`, schema em `packages/schemas`) → mock em `src/mocks/` → hook em `api/` → tela em `ui/` →
exportar a tela no `index.ts` → `page.tsx` em `app/`.

## Checklist frontend

- [ ] Código novo em `features/`, `shared/` ou `store/` (nunca recriar `components/`, `hooks/`, `lib/` na raiz de `src/`)
- [ ] Toda feature tem `index.ts` e ninguém fura o barrel
- [ ] Nenhuma regra de negócio em JSX ou em `ui/`
- [ ] Nenhuma chamada ao Supabase fora de `packages/api`
- [ ] Escrita do treino em andamento pela fila offline
- [ ] Nada em `shared/` que só uma feature usa
- [ ] Arquivos e pastas em kebab-case
