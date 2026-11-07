# Documentação do Guf App

# 0. Informações

Este documento tem como finalidade indexar a documentação do projeto e explicar como mantê-la.

| Feito por | Glauber |
| --- | --- |
| Data de Criação | 10/10/2026 |

Documentos de produto e planejamento. As instruções técnicas para quem programa (stack, arquitetura,
padrões obrigatórios e comandos) ficam no [`CLAUDE.md`](../CLAUDE.md), na raiz do repositório.

| Documento | Conteúdo |
|---|---|
| [`features/`](./features/) | Um documento por funcionalidade (caminhos, fluxos, regras de tela, estados de desenvolvimento); índice no `CLAUDE.md` |
| [`reference/`](./reference/) | Referências: funções RPC e Edge Functions (`supabase.md`), códigos de erro da API (`api-errors.md`), versões dos documentos legais (`legal-versions.md`) |
| [`architecture.md`](./architecture.md) | Arquitetura de código: camadas, pastas por feature, dependências entre elas e por que funciona com Supabase |
| [`implementation-plan.md`](./implementation-plan.md) | O que já foi entregue, as próximas etapas (ordem, escopo, critérios de aceite) e pendências para o lançamento |
| [`business-rules.md`](./business-rules.md) | Regras de negócio em vigor, por área do app, com onde cada regra está implementada |
| [`push-notifications.md`](./push-notifications.md) | Notificações no celular (competição e seguidores): regras, fluxo, custo, situação e configuração (VAPID, secrets, Vault) |
| [`lgpd.md`](./lgpd.md) | LGPD: o que já está implementado, o que falta e por quê (resumo para o time) |
| [`../.lgpd/STATUS.md`](../.lgpd/STATUS.md) | Auditoria LGPD: etapas, lacunas (`gaps.md`), mapa de dados, bases legais, fornecedores e registro de consentimentos |

## Como manter

- **Fonte da verdade:** o código e o banco (`supabase/migrations/`). Se um documento divergir do código, o código vale e o documento deve ser corrigido.
- **Ao concluir uma etapa:** marcar a etapa como entregue no plano e acrescentar ou ajustar as regras novas em `business-rules.md` no mesmo PR.
- **Regra nova ou alterada:** atualizar `business-rules.md` e, se for uma regra que orienta a implementação, também o documento da funcionalidade em `features/` (o `CLAUDE.md` só recebe regra que vale para o projeto inteiro).
- **Mudou a estrutura de pastas ou as camadas:** atualizar `architecture.md` e a árvore do `CLAUDE.md`.
- **Padrão de documento** (skill `code-docs`): cabeçalho "0. Informações" (finalidade em uma frase, autor e data de criação), texto curto e direto, diagramas em Mermaid.
- **Nomes de arquivo:** em inglês (kebab-case); conteúdo em português do Brasil.
