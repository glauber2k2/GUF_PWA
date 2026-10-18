---
name: code-structure
description: >
  Estrutura do monorepo guf, camadas e escolha de bibliotecas. Use ao adicionar features, decidir onde um arquivo
  deve morar, escolher bibliotecas ou mexer em backend (Supabase). Cobre apps/web (features + shared + store),
  pacotes compartilhados (core, schemas, api, types) e supabase/ (migrations, Edge Functions). Gatilhos:
  "estrutura de pastas", "onde coloco esse arquivo", "qual lib para X", "cria a feature de...", "organiza esse projeto".
---

# Code Structure — guf

> Organize por **feature/domínio**, nunca por tipo de arquivo global. Estrutura vem antes do código.
> O guf é um **site estático** (Next.js `output: "export"`, PWA com Serwist, offline com Dexie) e o backend é
> **só o Supabase** (Postgres + RLS + RPCs + Edge Functions). Não existe servidor próprio.

## Monorepo

```
guf_backend/
├── apps/web/                 # Next.js PWA — ver references/frontend-react-next.md
├── packages/
│   ├── core/                 # Domínio: regras puras (1RM, volume, recordes, datas, textos) — sem React, sem Supabase
│   ├── schemas/              # Validação: schemas Zod compartilhados
│   ├── api/                  # Acesso a dados: cliente Supabase + funções (client, input) => { data, error }
│   └── types/                # Tipos gerados do banco (src/database.ts)
├── supabase/
│   ├── migrations/           # Única forma de mudar o banco (nunca editar migration existente)
│   └── functions/            # Edge Functions (Deno), ex.: delete-account
├── docs/                     # Plano, regras de negócio, LGPD
└── .claude/                  # Skills e padrões (este arquivo)
```

Os pacotes existem para o app mobile (Expo) reaproveitar tudo que não é tela.

## Camadas (equivalente ao routes → controller → service → repository)

| Camada clássica | No guf | Faz | Não pode |
|---|---|---|---|
| routes | `apps/web/src/app/` | Declarar rota e compor a tela | Lógica |
| controller | `features/<f>/ui` + `features/<f>/api` | Receber a interação, chamar hooks, mostrar estado | Regra de negócio |
| service | `packages/core` (regras) + `features/<f>/hooks` (orquestração de UI) | Regra de negócio pura | Conhecer React (core) ou Supabase |
| repository | `packages/api` (+ `shared/offline` para a fila e cópias locais) | Ler e gravar no Supabase / Dexie | Regra de negócio |
| banco | Supabase: tabelas, RLS, RPCs, gatilhos | Integridade e segurança (RLS é quem protege os dados) | Ser alterado fora de migration |

**Regra de dependência:** `app → features → (shared, packages/api, packages/core, packages/schemas) → Supabase`.
`shared/` nunca importa `features/`; `packages/` nunca importa `apps/`.

## Frontend (apps/web)

Baseada em **features + shared + store**. Árvore completa, papel de cada pasta e scaffold de feature:
`references/frontend-react-next.md` (leia sempre que a tarefa envolver o app web).

| Regra | Detalhe |
|---|---|
| Um hook por finalidade | `useProjectsOverview`, `useCanEditPlanning`; nunca um hook que faz tudo |
| `ui/` sem regra de negócio | Cálculos vêm de `packages/core`, dados de `api/` |
| Tabelas e listas grandes | Sempre viram componente próprio |
| `index.ts` obrigatório | Toda feature exporta seu contrato público; ninguém importa o interior de outra feature |
| Sem `utils.ts` genérico | Helpers por domínio |
| Sem `fetch` nem `supabase.from()` no app | Toda consulta passa por `packages/api` |
| Escrita do treino | Sempre pela fila offline (`shared/offline/outbox.ts`) |
| Proibido pela arquitetura | Server Actions, Route Handlers, middleware, SSR com dados, rotas dinâmicas `[id]` |

## Backend (Supabase)

| Precisa de | Onde |
|---|---|
| Tabela, coluna, política RLS, gatilho, RPC | Nova migration: `npx supabase migration new <nome>` |
| Tipos depois da migration | `npx supabase gen types typescript --linked` → `packages/types/src/database.ts` |
| Lógica que precisa da chave secreta | Edge Function em `supabase/functions/` (nunca no app) |
| Consulta usada pelo app | Função em `packages/api/src/<dominio>.ts` com contrato `{ data, error }` |
| Erro novo do banco | Código e mensagem em português em `packages/api/src/result.ts` |

## Escolha de bibliotecas

1. Use primeiro o que o projeto já tem (lista de stack do `CLAUDE.md`; ver `/code-attention`).
2. Fora dessa lista, **pergunte antes de instalar**. Não usar: servidor HTTP próprio (Express etc.), ORM (Prisma),
   Zustand, bibliotecas de cookie — o estado do servidor é TanStack Query, o global é `store/global/*.store.ts`.

## Checklist

- [ ] Organizado por feature (app) e por domínio (packages)
- [ ] Cada feature tem `index.ts`
- [ ] Regra de negócio em `packages/core`, consulta em `packages/api`, validação em `packages/schemas`
- [ ] Nenhum `utils.ts` genérico
- [ ] Arquivos e pastas em kebab-case
- [ ] Continua site estático, offline-first no treino e com o banco protegido por RLS
