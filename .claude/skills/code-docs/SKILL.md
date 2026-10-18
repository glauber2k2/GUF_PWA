---
name: code-docs
description: >
  Documentação de código e de projeto. Use ao escrever ou revisar JSDoc, TSDoc, Docstrings Python, Javadoc,
  DartDoc ou README, ou ao produzir documentos de projeto: Especificação, Arquitetura de Código, Documento de Fluxo
  (UML), Plano de Ação e Contrato de API. Gatilhos: "documenta isso", "escreve o JSDoc", "cria o README",
  "contrato de API", "plano de ação", "docstring", "documenta a arquitetura".
---

# Code Docs

> Documentação boa é curta e direta. Se precisou de 3 linhas para explicar o que a função faz, o problema é o nome.

## Parte 1 — Documentação de código

Nunca comente linha a linha. Documente o **contrato** da função; o corpo se explica pela nomenclatura.

```ts
/**
 * Busca um usuário pelo seu ID.
 *
 * @param id - UUID v4 do usuário
 * @returns Dados do usuário ou `null` se não encontrado
 * @throws {UnauthorizedError} Quando a sessão expirou
 */
async function fetchUser(id: string): Promise<User | null>
```

| Regra | Detalhe |
|---|---|
| Uma frase na descrição | Se não cabe em uma linha, a função faz coisas demais |
| Só o que não é óbvio | Restrições, formato, comportamento especial |
| `@param` sem repetir o tipo | Foque no formato ou no porquê |
| `@returns` objetivo | O que volta no sucesso |
| `@throws` só o tratável | Erros que o chamador precisa tratar |
| `@example` só se não for evidente | Ex.: `formatCurrency(1990) // "R$ 19,90"` |

| Linguagem | Padrão |
|---|---|
| JS / TS | JSDoc / TSDoc (`@param`, `@returns`, `@throws`, `@example`) |
| Python | Docstring Google style (`Args:`, `Returns:`, `Raises:`) |
| Java | Javadoc (`@param`, `@return`, `@throws`) |
| Dart | DartDoc (`///`, `[param]`) |

## Parte 2 — Documentos de projeto

| # | Documento | Conteúdo |
|---|---|---|
| 1 | Especificação Completa | Requisitos funcionais, não funcionais e modelo de dados (diagrama ER) |
| 2 | Arquitetura de Código | Como a arquitetura funciona, com casos gerais e específicos |
| 3 | Documento de Fluxo | Diagramas UML de Atividade e de Caso de Uso |
| 4 | Plano de Ação | Fases, da Fase 0 (configuração) até o MVP |
| 5 | Contrato de API | Entrada e saída de cada rota: método, path, auth, body, respostas e erros |

**Prioridade:** Especificação → Contrato de API (destrava front e back em paralelo) → Arquitetura e Plano de Ação
(junto com a Fase 0) → Fluxo (conforme os casos de uso se consolidam).

Diagramas dentro dos documentos em **Mermaid** (ER, atividade, caso de uso, sequência, visão de arquitetura).

**Cabeçalho padrão:**

```markdown
# 0. Informações

Este documento tem como finalidade [objetivo em uma frase].

| Feito por | [Nome] |
| --- | --- |
| Cargo | [Cargo] |
| Data de Criação | DD/MM/AAAA |
```

No guf, os documentos de projeto ficam em `docs/` (`implementation-plan.md`, `business-rules.md`, `lgpd.md`) e o
resumo vivo no `CLAUDE.md`. Não há rotas HTTP próprias: o **contrato de API** é o de cada função de
`packages/api` (`(client, input) => Promise<{ data, error }>`, TSDoc na função + tipo do contrato `XxxApi`) e o de
cada RPC do Supabase (tabela de RPCs do `CLAUDE.md`). Mudou função, RPC ou erro? Atualize os dois e o mock.

## Checklist

- [ ] Toda função exportada tem doc no padrão da linguagem
- [ ] Descrição cabe em uma linha
- [ ] Nenhum `@param` repete o tipo
- [ ] Zero comentário inline explicando "o que fez"
- [ ] README mostra como rodar o projeto
- [ ] Contrato de API atualizado se mudou rota
