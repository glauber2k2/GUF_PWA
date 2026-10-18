---
name: code-attention
description: >
  Verificação prévia. Use ANTES de criar qualquer componente, hook, helper, serviço, rota ou instalar biblioteca,
  e ANTES de fechar qualquer entrega. Varre o projeto atrás de design system instalado, componentes com o mesmo
  propósito, duplicatas, documentação que referencia o alvo e suíte E2E. Quando encontra duplicatas, PERGUNTA ao
  usuário qual usar. Gatilhos: "cria um componente", "adiciona um botão/modal/tabela", "instala a lib X",
  "já existe algo pra isso?", "isso não vai duplicar?", "finaliza a entrega", "pode commitar".
---

# Code Attention — Antes de Criar e Antes de Entregar

> Esta skill não escreve código. Ela impede que código duplicado seja escrito e que entrega saia pela metade.

## Princípio

Antes de adicionar qualquer coisa, a pergunta é: **"isso já existe aqui?"**

```
Reutilizar  >  Estender  >  Usar o design system já adotado  >  Criar do zero
```

## Gate de Entrada — 4 varreduras antes da primeira linha

### 1. Dependências
Leia `apps/web/package.json`, `apps/web/components.json`, os `package.json` de `packages/*` e a lista de stack
do `CLAUDE.md`, e verifique se já há algo cobrindo o pedido:

| Pedido | No guf já existe |
|---|---|
| Componente de UI | Design system do Guf (`apps/web/src/shared/components/ds`) + shadcn/Base UI |
| Formulário | React Hook Form + `@hookform/resolvers` |
| Validação | Zod (`packages/schemas`) |
| Data / hora | date-fns só em `packages/core` (o app usa `dates.ts`) |
| Dados / HTTP | `packages/api` (Supabase) + TanStack Query nos hooks `features/*/api` — nunca `fetch` próprio |
| Regra de negócio | `packages/core` (1RM, volume, recordes, sequência, textos) |
| Offline | Dexie em `shared/offline` (fila `outbox`, `withDeviceCache`) |
| Estado global | `store/global/*.store.ts` (useSyncExternalStore) e Context das features |
| Ícone | lucide-react |
| Gráfico | Recharts |
| Animação | Motion (`m.*` + primitivas de `ds/motion.tsx`), keyframes `animate-guf-*` |
| Som | soundcn (`shared/sound`) |

Nunca instale lib nova se já existe outra cobrindo a mesma necessidade; fora da lista do `CLAUDE.md`, pergunte
sempre. Se a instalada parecer inferior, exponha o trade-off e pergunte.

### 2. Mesmo propósito
Procure em `apps/web/src/shared/components/ds/` (barrel `index.ts`), `shared/components/`, `shared/hooks/`,
`shared/helpers/`, `features/*/components/`, `features/*/hooks/`, `features/*/helpers/` e, para lógica,
em `packages/core/src/` e `packages/api/src/`.

**Busque por sinônimo, não só pelo nome pedido:**

| Pedido | Também procure |
|---|---|
| Modal | Dialog, Drawer, Sheet, Overlay, Popup |
| Tabela | Table, DataGrid, Grid, List, DataTable |
| Select | Dropdown, Combobox, Autocomplete, Picker |
| Aviso | Toast, Snackbar, Alert, Notification, Banner |
| Card | Panel, Tile, Box, Widget |
| Loader | Spinner, Loading, Skeleton, Shimmer |
| Abas | Tabs, TabBar, Segmented |
| Upload | Dropzone, FilePicker, FileInput |
| Data | DatePicker, Calendar, DateRange |
| Confirmação | Confirm, ConfirmDialog, AlertDialog |
| Badge | Tag, Chip, Pill, Label |

Cubra nome de arquivo, declaração exportada (`export function|const`) e barrel exports (`**/index.ts`).

### 3. Documentação que referencia o alvo
Liste os arquivos que citam o componente/módulo/rota: `README.md`, `docs/`, contrato de API, especificação.
Não atualize ainda; o resultado alimenta o Gate de Saída.

### 4. Suíte de testes

| Encontrou | Significa |
|---|---|
| `playwright.config.*`, `e2e/`, `tests/e2e/` | E2E com Playwright |
| `cypress.config.*`, `cypress/` | E2E com Cypress |
| `vitest.config.*`, `jest.config.*`, `*.test.*`, `*.spec.*` | Testes unitários |
| Nada | Sem suíte: não crie uma do nada |

Hoje o guf **não tem suíte de testes**; a verificação é `pnpm lint`, `pnpm typecheck`, `pnpm build` e conferir a tela
(estados `?estado=` em dev, Edge headless).

## Decisão

| Resultado | Ação |
|---|---|
| 1 componente com o mesmo propósito | Reutilize, informe o caminho, siga |
| 1 parecido cobrindo ~80% | Estenda via prop/variant, informe, siga |
| 2 ou mais com o mesmo propósito | PARE e pergunte |
| Design system tem o componente mas não foi adicionado | Adicione pelo CLI oficial (ex.: `pnpm dlx shadcn add dialog`) e adapte aos tokens |
| Nada existe e nenhuma lib cobre | Crie seguindo `/code-structure` e `/code-patterns` |
| Nada existe, mas uma lib nova cobriria | PARE e pergunte |

## Duplicatas — sempre perguntar

Mostre uma tabela com caminho, número de usos (`rg -c`), última alteração (`git log -1 --date=relative`) e base
(design system ou próprio). Pergunte com AskUserQuestion: usar o nº 1 · usar o nº 2 · unificar e migrar ·
criar um terceiro (só com justificativa).

Critério para recomendar: está no design system > mora em `shared/` > mais usos > alterado mais recentemente >
tem tipagem e testes. Recomende, mas não execute antes da resposta.

## Gate de Saída — antes de dizer "concluído"

Agrupe numa única pergunta:
1. **Documentação** (se a varredura 3 achou arquivos): atualizar tudo · só o contrato de API · não agora
2. **E2E** (se existe Playwright/Cypress): fluxo feliz · fluxo feliz + erros · não agora.
   Sem suíte E2E, apenas registre: "Projeto sem suíte E2E — nenhum teste de ponta a ponta foi criado."
3. **Consolidação pendente** (se ficou duplicata): deixar · consolidar agora · anotar como débito técnico

## Não pergunte quando

- Existe exatamente um componente com o mesmo propósito
- O componente do design system só precisa ser adicionado
- O arquivo novo tem lugar óbvio na estrutura
- A mudança é interna e não afeta documentação
- O usuário já respondeu a mesma pergunta nesta sessão

## Regras absolutas

- Nunca crie componente, hook ou helper sem a varredura de mesmo propósito
- Nunca instale dependência sem checar equivalente instalada
- Nunca escolha sozinho entre duplicatas
- Nunca reescreva à mão o que o design system entrega via CLI
- Nunca feche entrega que mexeu em contrato/rota/componente público sem perguntar sobre documentação
- Nunca crie suíte de testes do zero sem perguntar
- Nunca apague a duplicata perdedora sem autorização

## Relatório de varredura (máx. 6 linhas)

```
Varredura — "modal de confirmação"
- Design system: Shadcn instalado, `dialog` já adicionado
- Mesmo propósito: 2 candidatos → precisa de decisão
- Docs referenciando: docs/componentes.md
- E2E: Playwright em e2e/
→ Bloqueado: preciso da sua escolha
```

Se nada for encontrado, diga em uma linha e siga.

## Não aplique em
Correção de bug sem criar nada novo, ajuste de texto/estilo/constante, tarefa fora de código.
