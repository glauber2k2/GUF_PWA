---
name: code-standards
description: >
  Skill MÃE de padrões de engenharia. SEMPRE consulte ao escrever, revisar, refatorar, documentar ou estruturar
  qualquer código deste projeto. Coordena cinco filhas: code-attention (varredura antes de criar e checkpoint antes
  de entregar), code-structure (pastas, stacks e serviços), code-patterns (princípios, nomenclatura, anti-patterns),
  code-docs (documentação de código e de projeto) e code-review-guf (revisão de PR, branch ou diff). Use mesmo que o
  usuário não mencione "padrões" ou "documentação".
---

# Code Standards — Skill Mãe

> Ponto de entrada único dos padrões. Esta skill não contém as regras: ela roteia para a filha certa e garante
> que nenhuma etapa seja esquecida.

## Árvore

```
code-standards (mãe)
├── code-attention ... Gate de Entrada (antes de criar) e Gate de Saída (antes de entregar)
├── code-structure ... Estrutura de pastas, camadas, stacks e serviços
├── code-patterns .... SOLID, KISS, DRY, Clean Code, nomenclatura, POO, regras absolutas, anti-patterns
├── code-docs ........ Documentação de código e documentos de projeto
└── code-review-guf .. Procedimento de revisão (consome os conceitos de .claude/patterns/)
```

Os conceitos ficam em `.claude/patterns/` (um arquivo por tema) e podem ser lidos por qualquer skill.

**Precedência:** o `CLAUDE.md` do projeto vence estas skills em caso de conflito. Nada aqui muda as bases do guf:
site estático (`output: "export"`), backend e banco só no Supabase (RLS, migrations), PWA instalável e treino
offline-first (fila Dexie).

## Roteamento

| Pedido | Carregue |
|---|---|
| "cria um componente/hook/serviço", "adiciona um modal", "instala a lib X" | `/code-attention` primeiro |
| "já existe algo pra isso?", "isso não vai duplicar?", "pode commitar" | `/code-attention` |
| "onde coloco esse arquivo", "estrutura de pastas", "qual stack/lib usar" | `/code-structure` |
| "refatora isso", "melhora essa função", "esse componente tá grande", "como nomear" | `/code-patterns` |
| "documenta essa função", "cria o README", "contrato de API", "plano de ação" | `/code-docs` |
| "revisa esse PR/branch/diff", "tem bug aqui?", "faz um code review" | `/code-review-guf` |
| "escreve o código de X" (feature nova) | attention → structure → patterns → docs → attention |
| "revisa o que você acabou de fazer" | `/code-review-guf` sobre o próprio diff |

## Ordem de execução (feature nova)

1. `/code-attention` — Gate de Entrada: o que já existe cobre isso?
2. `/code-structure` — onde cada arquivo mora, antes da primeira linha
3. `/code-patterns` — escrever já dentro dos princípios
4. `/code-docs` — documentar o que foi entregue
5. `/code-attention` — Gate de Saída: documentação referenciada e teste E2E

Nunca inverta: documentar código mal estruturado é retrabalho, e criar o que já existe é dívida nova.

## Contrato mínimo (toda entrega, sem exceção)

- [ ] Nada foi criado sem antes checar se já existia no projeto
- [ ] Nenhuma duplicata foi resolvida sem a escolha do usuário
- [ ] Uma responsabilidade por função, arquivo e módulo
- [ ] Nomes autoexplicativos, sem abreviações, sem magic numbers
- [ ] Zero comentário inline explicando "o que o código faz"
- [ ] Funções exportadas documentadas no padrão da linguagem
- [ ] Código duplicado extraído
- [ ] Arquivo no lugar certo da estrutura
- [ ] SOLID, KISS, DRY e Clean Code respeitados
- [ ] Revisão de encerramento executada

Se algum item falhar, corrija antes de entregar. Refatoração exigida por este contrato não precisa ser pedida.

## Revisão de encerramento (obrigatória)

Ao encerrar qualquer tarefa, mesmo pequena:

**1. O que foi feito está correto e no padrão?**
- [ ] Reler o próprio diff, arquivo por arquivo
- [ ] Confirmar o Contrato mínimo em tudo que foi tocado
- [ ] Sem código morto, `console.log`, TODO esquecido ou trecho comentado

**2. Isso interferiu em outra parte do código?**
- [ ] Mapear tudo que consome o que foi alterado (funções, componentes, rotas, tipos, contratos)
- [ ] Verificar se assinaturas, retornos ou comportamentos mudaram e quebram quem depende deles
- [ ] Conferir imports/exports, renomeações e arquivos movidos em todos os pontos de referência
- [ ] Validar efeitos colaterais: estado compartilhado, migrações, variáveis de ambiente, configs
- [ ] Rodar `pnpm lint`, `pnpm typecheck` e `pnpm build` (o build gera também o service worker)
- [ ] Mudou caminho, regra ou fluxo? Atualizar `CLAUDE.md` e `docs/`
