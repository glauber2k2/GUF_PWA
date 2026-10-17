# Relatório da Auditoria LGPD — Guf App

**Data**: 2026-10-17 · **Etapa**: F15 · **Período**: 2026-10-16 a 2026-10-17
**Escopo**: tudo o que é **gratuito e não exige empresa aberta** (decisão de 2026-10-17). Itens que dependem de dinheiro, CNPJ ou advogado ficaram registrados como "futuro".

> Relatório técnico. **Não é parecer jurídico**: os pontos marcados com ⚖ precisam de advogado de proteção de dados antes do lançamento público.

## 1. Resumo

O guf é um PWA de musculação em **beta gratuito**, mantido por uma pessoa (controlador provisório, pessoa natural), com banco no **Brasil** (Supabase `sa-east-1`) e **sem publicidade, analytics ou rastreadores**. A base técnica de privacidade está **boa para um beta com convidados**: dados isolados por conta, consentimento de saúde em camadas, registro de consentimentos fechado e com prova após a exclusão, exportação completa, exclusão total da conta, registro de auditoria à prova de adulteração e plano de incidente.

**O que impede abrir para o público** não é técnico: é a falta de **controlador formal, política revisada, contratos com fornecedores e planos pagos de infraestrutura** — todos dependem de orçamento.

## 2. Situação das lacunas (23)

| Situação | Qtd. | Lacunas |
|---|---|---|
| **Resolvidas (verde)** | 6 | G10 canal do titular · G12 exportação completa · G13 registro de consentimentos fechado · G14 hash dos textos · G18 foto apagada na exclusão · G19 registro de auditoria |
| **Encaminhadas (amarelo)** | 11 | G4 runbook (faltam contatos e simulação) · G5 ROPA (rascunho) · G6 prova pós-exclusão (prazo ⚖) · G8 transferência (banco no Brasil; base do art. 33 ⚖) · G9 logs de acesso (plano) · G11 ECA Digital (decisão ⚖) · G15 backups (conferir painel) · G16 Auth (conferir painel) · G17 RIPD das medidas (quando o módulo existir) · G20 CORS (definir o secret) · G23 planos gratuitos |
| **Abertas (vermelho)** | 6 | G1 controlador identificado · G2 Encarregado · G3 política final · G7 DPAs · G21 governança · G22 controlador não constituído |

Todas as vermelhas dependem de **empresa, advogado ou dinheiro** (G2 tem dispensa provisória de agente de pequeno porte ⚖, desde que o canal exista — e ele existe).

## 3. O que foi entregue

| Etapa | Entrega | Onde |
|---|---|---|
| L0–L4 | Diagnóstico, mapa de dados (16 atividades), bases legais, fornecedores | `discovery.md`, `gaps.md`, `data-map.md`, `legal-basis.md`, `vendors/` |
| Migração | Banco movido dos EUA para São Paulo | `STATUS.md` |
| F3 | Registro de consentimentos fechado; prova dos aceites por 5 anos após a exclusão (e-mail em hash); hash dos textos legais | `consent-ledger.md` · migration `20261017132154` |
| F4 | Política de privacidade v1 (rascunho, 15 seções) | `policies/privacy-policy-v1-draft.md` |
| F5 | Exportação completa (`guf-export/2`); canal de pedidos no Perfil; fluxo de 15 dias | `dsar/workflow.md` · migration `20261017141954` |
| F6 | Registro de auditoria só inclusão, encadeado por hash | `audit-log.md` · migration `20261017143503` |
| F7 | CORS por lista na exclusão de conta; cabeçalhos de segurança; checklist dos painéis | `security-checklist.md` · `vercel.json` |
| F8 | Tabela de prazos; foto do Storage apagada na exclusão | `retention.md` |
| F9 | Runbook de incidente, modelos de comunicação (ANPD e titular), registro de 5 anos | `incidents/` |
| F10 | ROPA (rascunho 0.1) | `ROPA.md` |
| F13 | Avaliação ECA Digital (rascunho) e compromisso de produto | `eca-digital.md` |

Todas as migrations foram **aplicadas e testadas** no banco com usuários fictícios em transações desfeitas (nenhum dado de teste ficou no banco).

## 4. Ações gratuitas que dependem de você

| # | Ação | Onde | Tempo |
|---|---|---|---|
| 1 | **Ligar MFA** no Supabase, Vercel, GitHub e Google | Painéis | 15 min |
| 2 | Definir os sites autorizados da exclusão de conta: `npx supabase secrets set ALLOWED_ORIGINS="https://<app>.vercel.app,http://localhost:3000"` | Terminal | 2 min |
| 3 | Supabase › Auth: senha mínima 8, confirmação de e-mail ligada, redirects só do app | Painel | 5 min |
| 4 | Conferir backups do plano Free e anotar em `retention.md` (seção 4) | Painel | 5 min |
| 5 | Confirmar o Root Directory da Vercel e apagar o `vercel.json` que sobrar | Painel + repo | 2 min |
| 6 | Testar "Excluir minha conta" com conta de teste no app publicado | App | 5 min |
| 7 | Terminar a migração: variáveis da Vercel, pausar e depois excluir o projeto antigo (`us-west-2`) | Painéis | 10 min |
| 8 | Verificar se Supabase e Vercel oferecem DPA aceitável por pessoa natural, sem custo, e arquivar em `vendors/` (G7) | Sites dos fornecedores | 20 min |
| 9 | Primeira simulação de incidente (runbook, seção 7) | — | 1 h |
| 10 | Manter o beta **só com convidados** que sabem que é um teste | — | — |

## 5. Futuro (exige dinheiro, empresa ou advogado)

1. **Constituir o controlador** (empresa/CNPJ) ou formalizar a pessoa natural como controladora (G1, G22).
2. **Advogado de proteção de dados**, numa única consulta, levando: política v1 (F4), ROPA (F10), ECA Digital (F13), prazos de 5 anos, decisão N1 (dados de treino como dado de saúde) e Marco Civil.
3. **Encarregado** designado e e-mail em domínio próprio (F11, G2).
4. **Planos pagos** do Supabase (backups e logs longos) e hospedagem de produção (G9, G23).
5. **DPAs e base de transferência internacional** em nome do controlador formal (F14, G7, G8).
6. **RIPD do módulo de medidas** antes de lançá-lo (F12, G17).
7. Publicar a política v1 no app (nova versão em `legal_documents` com hash, `/aceite` com "O que mudou").
8. Governança: revisão anual deste material e treinamento (G21).

## 6. Rotina mínima (gratuita)

| Frequência | O quê |
|---|---|
| Mensal | `select * from verify_audit_log();` e anotar o último `self_hash` fora do banco |
| A cada pedido de titular | Fluxo de `dsar/workflow.md` (15 dias) |
| A cada incidente/suspeita | `incidents/runbook.md` e registro em `incidents/log.md` |
| Trimestral | Checklist dos painéis (`security-checklist.md`), ficha do Supabase |
| Semestral (próx. 2027-04-17) | Revisar ROPA, ECA Digital e `gaps.md` |
| A cada funcionalidade nova com dados pessoais | Atualizar `data-map.md`, `legal-basis.md` e ROPA; respeitar o compromisso de produto do `CLAUDE.md` |
