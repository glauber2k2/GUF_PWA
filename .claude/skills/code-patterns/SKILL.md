---
name: code-patterns
description: >
  Princípios, patterns e anti-patterns em código, em qualquer linguagem. Use ao escrever ou refatorar código.
  Cobre SOLID, KISS, DRY, Clean Code, MVC/MVVM, nomenclatura, POO, regras absolutas e gatilhos de refatoração.
  Gatilhos: "refatora isso", "melhora essa função", "escreve o código de X", "esse componente tá grande",
  "como nomear isso", "aplica SOLID". Para revisar PR/diff, use code-review-guf.
---

# Code Patterns — Índice

> O conteúdo completo vive em `.claude/patterns/`. Esta skill traz o mínimo inegociável e roteia.

## Regras absolutas (valem sempre)

1. Sem IIFE em JSX/TSX
2. Sem função multi-propósito: se o nome precisa de um "e", são duas funções
3. Sem comentário inline explicando "o que fez" (comentário de *porquê* é permitido)
4. Sem `any` sem justificativa

Detalhes: `.claude/patterns/regras-absolutas.md`

## Qual arquivo carregar

| Situação | Arquivo em `.claude/patterns/` |
|---|---|
| Justificar separação de responsabilidade, "aplica SOLID" | `principios-solid.md` |
| Gerar código novo | `regras-absolutas.md` + `nomenclatura.md` |
| Nomear variável, função, arquivo, pasta | `nomenclatura.md` |
| Modelar entidade, decidir classe vs. função | `poo.md` |
| Fechar entrega, checar o próprio código | `anti-patterns.md` |
| "refatora isso", "tá grande" | `refatoracao.md` + `principios-solid.md` |

Carregue só o que a tarefa exige.

## Checklist antes de entregar

- [ ] Nenhuma IIFE em JSX/TSX
- [ ] Cada função tem propósito único e nome claro
- [ ] Sem comentário inline explicando "o que fez"
- [ ] Código duplicado extraído
- [ ] Nomes autoexplicativos
- [ ] POO só onde a lógica é complexa ou stateful
- [ ] Nenhum `any` sem justificativa
- [ ] Guard clauses no lugar de nesting profundo
- [ ] Magic numbers viraram constantes nomeadas
