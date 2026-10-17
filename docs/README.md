# Documentação do Guf App

Documentos de produto e planejamento. As instruções técnicas para quem programa (stack, arquitetura,
padrões obrigatórios e comandos) ficam no [`CLAUDE.md`](../CLAUDE.md), na raiz do repositório.

| Documento | Conteúdo |
|---|---|
| [`implementation-plan.md`](./implementation-plan.md) | O que já foi entregue, as próximas etapas (ordem, escopo, critérios de aceite) e pendências para o lançamento |
| [`business-rules.md`](./business-rules.md) | Regras de negócio em vigor, por área do app, com onde cada regra está implementada |
| [`../.lgpd/STATUS.md`](../.lgpd/STATUS.md) | Auditoria LGPD: etapas, lacunas (`gaps.md`), mapa de dados, bases legais, fornecedores e registro de consentimentos |

## Como manter

- **Fonte da verdade:** o código e o banco (`supabase/migrations/`). Se um documento divergir do código, o código vale e o documento deve ser corrigido.
- **Ao concluir uma etapa:** marcar a etapa como entregue no plano e acrescentar ou ajustar as regras novas em `business-rules.md` no mesmo PR.
- **Regra nova ou alterada:** atualizar `business-rules.md` e, se for uma regra que orienta a implementação, também o `CLAUDE.md`.
- **Nomes de arquivo:** em inglês (kebab-case); conteúdo em português do Brasil.
