---
name: code-review-guf
description: >
  Revisão de código. Use ao revisar PR, branch, diff, arquivo ou trecho solto. Reporta bugs reais (null, async,
  race condition, vazamento, segurança), avalia organização contra a estrutura do projeto, aponta onde enxugar e
  verifica aderência aos patterns. Classifica cada achado por severidade. Gatilhos: "revisa esse PR", "revisa esse
  código", "olha esse diff", "tem algum bug aqui?", "isso tá bom?", "faz um code review".
---

# Code Review

> Esta skill é o procedimento. Os conceitos vivem em `.claude/patterns/`; cite o arquivo em vez de repetir.

## Quatro perguntas, nesta ordem

```
1. Isso quebra?          → erro/bug     → BLOQUEIA
2. Isso está no lugar?   → organização  → BLOQUEIA se fere camada
3. Isso está poluído?    → enxugamento  → MELHORIA
4. Isso segue o padrão?  → patterns     → BLOQUEIA se fere regra absoluta
```

## Passo 1 — Escopo

| Pedido | Escopo |
|---|---|
| "revisa esse PR/branch" | `git diff main...HEAD` (comece por `--stat`) |
| "revisa esse arquivo" | O arquivo inteiro |
| "revisa isso" (colado) | O trecho |
| "revisa o projeto" | Pergunte qual módulo |

Revise o que mudou. Leia o código em volta quando necessário. Diff com 40+ arquivos: revise por módulo e diga isso.

## Passo 2 — Caçar erros (prioridade máxima)

| Classe | Procure |
|---|---|
| Null/undefined | Acesso sem checagem, `!` forçado |
| Async | `await` esquecido, promise não tratada, `async` em `forEach` |
| Erro | `catch` vazio, erro engolido, `throw` de string |
| Condicional | `==` vs `===`, falsy acidental (`0`, `""`), negação invertida |
| Limite | Índice fora, divisão por zero, lista/string vazia |
| Tipo | `any` mascarando, cast forçado, retorno fora da assinatura |
| Estado | Mutação direta, dependência faltando em `useEffect`/`useMemo`, closure com valor velho |
| Recurso | Listener/timer/subscription sem cleanup, conexão aberta |
| Concorrência | Race condition, request sem cancelamento |
| **Segurança** | Payload não validado, query concatenada, segredo hardcoded, chave `service_role`/`secret` no front, tabela sem RLS, dado sensível (medidas, saúde) em log, permissão só no frontend, resposta do Supabase cacheada no service worker |

Segurança é sempre Bloqueador. Verifique também **regressão**: quem consome o que mudou (assinatura, retorno, contrato, arquivo movido).

## Passo 3 — Organização (contra `/code-structure`)

- Arquivo no lugar certo (helper de feature em `shared/` ou o contrário)
- Camadas do guf: regra de negócio em tela/JSX em vez de `packages/core`, consulta ao Supabase fora de
  `packages/api`, escrita do treino fora da fila offline, `shared/` importando `features/` (Bloqueador)
- Quebra das bases: Server Action, Route Handler, middleware, SSR com dados, rotas dinâmicas `[id]`,
  mudança de banco fora de migration (Bloqueador)
- Barrel export ausente ou furado
- Hook devolvendo 5+ valores não relacionados
- Feature importando o interior de outra
- `utils.ts`/`helpers.ts` virando depósito

## Passo 4 — Enxugamento
Use `.claude/patterns/refatoracao.md`. Priorize o que é mais lido e o que mais cresce; não liste 30 micro-ajustes.
A sugestão não pode ser maior que a mudança revisada; se for, proponha tarefa separada.

## Passo 5 — Patterns
Sempre: `anti-patterns.md` e `regras-absolutas.md`. Conforme o diff: `nomenclatura.md`, `principios-solid.md`, `poo.md`.
As 4 regras absolutas são sempre Bloqueador.

## Passo 6 — O que ficou para trás
- [ ] Criou algo que já existia? (Bloqueador)
- [ ] Instalou dependência com equivalente já instalada?
- [ ] Mudou contrato/rota/componente público sem atualizar a documentação?
- [ ] Tem E2E no projeto e o fluxo novo ficou sem cobertura?
- [ ] Funções exportadas novas sem documentação?

## Severidade

| Nível | Critério | Efeito |
|---|---|---|
| 🔴 Bloqueador | Quebra, segurança, regra absoluta, camada, duplicata | Não aprova |
| 🟡 Melhoria | Anti-pattern, refatoração, arquivo no lugar errado | Corrigir neste PR, de preferência |
| 🔵 Sugestão | Nomenclatura, organização interna, documentação | A critério do autor |
| ⚪ Nota | Contexto, elogio, aviso fora do escopo | Informativo |

Não infle severidade para parecer rigoroso nem esvazie para agradar.

## Relatório

```markdown
## Review — <escopo> · <N> arquivos, +<X>/-<Y>

**Veredito:** Aprovado · Aprovado com ressalvas · Requer correção

### 🔴 Bloqueadores
1. **`src/modules/pedidos/pedidos.service.ts:47`** — `await` ausente em `repository.salvar()`
   Retorna antes da escrita; o response diz sucesso mesmo se o banco falhar.

### 🟡 Melhorias
### 🔵 Sugestões
### ⚪ Notas

### Verificado e sem apontamento
Tipagem, imports, nomenclatura de arquivos...
```

- Sempre `arquivo:linha` e sempre o porquê
- Patch quando couber em poucas linhas
- Numeração contínua entre as seções
- Sem achados: diga em duas linhas e liste o que foi verificado

## Regras

- Nunca aprove sem ler o diff inteiro do escopo
- Nunca classifique preferência pessoal como Bloqueador
- Nunca afirme que algo quebra sem descrever o cenário concreto
- Nunca altere o código durante o review, salvo pedido explícito
- Nunca invente achado

**Tom:** o alvo é o código, nunca a pessoa. Sem ironia, sem "obviamente". Escreva o que muda e por quê.
