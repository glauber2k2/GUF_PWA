# Retenção e Eliminação — Guf App

**Versão**: v1 · **Data**: 2026-10-17 · **Etapa**: F8 (`lgpd-retention-erasure`) · **Resolve (parcial)**: G15, G18
**Norma**: LGPD Arts. 15, 16 e 18, VI · Marco Civil (Lei 12.965/2014) Art. 15 · Res. CD/ANPD nº 15/2024 Art. 10
**Escopo**: sem custo e sem empresa (decisão de 2026-10-17)

> Proposta técnica. Os prazos marcados com ⚖ precisam de validação jurídica antes do lançamento.

## 1. Regra geral

O guf **não tem obrigação fiscal, trabalhista ou bancária** hoje (não cobra nada, não tem funcionários). Por isso a regra é **eliminação definitiva** (hard delete) quando a finalidade acaba, com só duas exceções guardadas de forma mínima e pseudonimizada: a prova dos aceites e o registro de auditoria.

## 2. Tabela de retenção

| Dado | Prazo | Gatilho do fim | Como é eliminado | Base / observação |
|---|---|---|---|---|
| Conta (`auth.users`, identidades, sessões) | Enquanto a conta existir | Excluir conta | Supabase Auth apaga; cascata nas tabelas `auth.*` | Art. 7º, V |
| Perfil, preferências, projetos, rotinas, exercícios próprios, treinos, séries, períodos ativos, direitos de plano (`plan_grants`) e assinaturas (`subscriptions`) | Enquanto a conta existir | Excluir conta (ou o titular apaga o item) | **Cascata** `on delete cascade` de `auth.users` em todas as tabelas com `user_id` (conferido no banco em 2026-10-17) | Art. 7º, V |
| Medidas corporais | Até revogar o consentimento ou excluir a conta | Revogar / excluir | `revoke_health_consent` apaga na hora; cascata na exclusão; o mesmo dia registrado de novo substitui os valores; não ficam no aparelho | Art. 11, I; Art. 16 |
| Registros de consentimento (`consent_records`) | Enquanto a conta existir | Excluir conta | Cascata (antes disso, a cópia mínima vai para `consent_proofs`) | Art. 7º, II |
| **Prova mínima dos aceites** (`consent_proofs`) | **5 anos** após a exclusão ⚖ | `purge_after` vencido | Job diário `purge-expired-consent-proofs` (03:17 UTC) | Art. 16, I; Art. 7º, VI — e-mail só em SHA-256 |
| **Registro de auditoria** (`audit_log`) | **5 anos** após o evento ⚖ | Idade do registro | Job mensal `purge-expired-audit-log` (dia 1, 03:41 UTC) | Art. 6º, X; Res. 15/2024 Art. 10 |
| Foto enviada (bucket `avatars`, futuro) | Enquanto a conta existir ou até trocar/remover | Excluir conta | **Edge Function `delete-account` apaga a pasta `<user_id>/` antes de excluir a conta** (G18, publicado em 2026-10-17); trocar/remover a foto deve apagar o arquivo antigo quando o upload existir | Art. 16; Art. 18, VI |
| Foto do Google | Enquanto a conta existir | Excluir conta | É só uma URL no perfil/identidade (o arquivo está no Google) | — |
| Dados no aparelho (IndexedDB, localStorage, cache do TanStack) | Até sair da conta | Sair / excluir conta | `signOut` limpa cache, treino ativo e IndexedDB | Art. 7º, V |
| Avisos no celular (`push_subscriptions`) | Até o titular desligar, sair da conta no aparelho ou o serviço de push responder 404/410 | Desligar / sair / excluir | Exclusão pelo app; a Edge Function `push-alerts` apaga as inscrições recusadas; cascata na exclusão | Art. 7º, V; Art. 16 |
| Estado dos avisos (`competition_alert_states`) | Temporada atual e anterior | Automático | `compute_competition_alerts` apaga temporadas mais antigas; cascata na exclusão | Art. 16 (minimização) |
| Avisos de seguidores enviados (`follow_alerts_sent`) | 1 dia (limite de 1 aviso por dia por pessoa e tipo) | Automático | `build_follow_alert` apaga as linhas com mais de 1 dia; cascata na exclusão | Art. 16 (minimização) |
| Conversas do GUF AI (`ai_conversations`, `ai_messages`) | **180 dias** sem mensagem nova | `updated_at` vencido | Job diário `purge-expired-ai-conversations` (03:29 UTC, registra `ai_conversations_purged`); cascata na exclusão da conta | Art. 16 (minimização) — RIPD `ripd-guf-ai.md` |
| Uso da importação de ficha (`ai_plan_imports`: só o horário) | **2 dias** | `created_at` vencido | Job diário `purge-expired-ai-plan-imports` (03:41 UTC); cascata na exclusão da conta | Art. 16 (minimização) — RIPD `ripd-guf-ai.md` §6 |
| Perfil social (`social_profiles`) e vínculos (`follows`) | Perfil enquanto a conta existir; seguidores até o titular remover | Remover seguidor / bloquear / excluir | `remove_follower` e `block_user` (registram `follow_ended`/`user_blocked`); cascata na exclusão, inclusive vínculos de outras pessoas com o titular | Art. 7º, V; Art. 16 |
| Bloqueios feitos pelo titular (`blocks`) | Até desbloquear ou excluir a conta | Desbloquear / excluir | `unblock_user`; cascata na exclusão de qualquer um dos dois | Proteção do titular |
| RPE da sessão e pontuação | RPE igual aos treinos; pontuação não é guardada | Excluir o treino ou a conta | Cascata; pontuação recalculada a cada consulta | Art. 7º, I |
| Comunicados (`announcements`) e quem viu/fechou/tocou (`announcement_receipts`) | **12 meses** depois do fim do comunicado | `ended_at` ou `ends_at` + 12 meses | Job diário `purge-expired-announcements` (03:41 UTC, registra `announcements_purged`); cascata na exclusão da conta | Art. 16 (minimização) — A023 |
| Lista de ids de um comunicado (`announcement_targets`) | Até o comunicado terminar | Encerrado ou fim passado | Apagada ao encerrar e pelo mesmo job diário | Art. 6º, III — A023 |
| Colaboradores (`staff_members`) | Até desligar (`disabled_at`, no mesmo dia) ou excluir a conta de trabalho | Desligamento | Admin no painel; cascata na exclusão | Art. 46 — A022 |
| Arquivo exportado (JSON) | Fica só no aparelho do titular | — | Nunca é guardado no servidor | Art. 18, II e V |
| Logs da plataforma (Supabase API/Auth, Vercel) | **Retenção do plano** (curta nos planos gratuitos) | Automático pelo fornecedor | Fornecedor | G9 — os "6 meses" do Marco Civil não estão garantidos; só valem para provedor PJ com fins econômicos ⚖ |
| **Backups do banco** | **Retenção do plano** (a confirmar) | Automático pelo fornecedor | Fornecedor; dados excluídos somem dos backups quando o backup expira | G15 — ver seção 4 |
| Pedidos de titulares (e-mail + planilha privada) | 5 anos | Idade do pedido | Manual, revisão anual | Prova de atendimento — `.lgpd/dsar/workflow.md` |
| Registro de incidentes (`.lgpd/incidents/log.md`) | 5 anos por incidente (mínimo) | Data do marco + 5 anos | Manual | Res. 15/2024 Art. 10 |

## 3. Exclusão da conta — o que acontece, em ordem

1. App: digitar EXCLUIR → Edge Function `delete-account` (valida o token; só sites autorizados quando `ALLOWED_ORIGINS` estiver definido).
2. Função: apaga a foto enviada no Storage (se houver).
3. Banco, antes da exclusão: `on_auth_user_deleted_audit` grava `account_deleted` no `audit_log`; `on_auth_user_deleted_preserve_consents` copia os aceites para `consent_proofs`.
4. Banco: exclusão em `auth.users` → **cascata** em todas as tabelas do usuário (medidas apagadas também geram `health_data_deleted`).
5. App: `signOut` e limpeza do aparelho → `/login/?conta-excluida=1`.

**O que sobra**: a prova mínima dos aceites e o registro de auditoria (ambos sem nome, e-mail em claro ou conteúdo), pelos prazos da tabela; e cópias em backups do fornecedor até expirarem.

## 4. Backups (G15)

- **Conferir no painel** (gratuito): Supabase › Database › Backups — anotar aqui se o plano Free tem backups e por quanto tempo ficam.
  - Resultado: [PREENCHER — data da conferência, existe backup? prazo?]
- Na política de privacidade, o marcador `[PRAZO DOS BACKUPS]` recebe esse prazo.
- Se o plano Free **não tiver backup**, o risco passa a ser de perda de dados (disponibilidade), não de retenção: registrar no runbook de incidente como cenário e, se quiser, exportar manualmente um dump periódico **criptografado e fora do OneDrive/repositório** (custo zero, mas cria mais uma cópia de dados pessoais — só se for realmente guardar com segurança e apagar as antigas).
- Restaurar um backup antigo **traz de volta** contas que já tinham sido excluídas: após qualquer restauração, reaplicar as exclusões feitas depois da data do backup (lista pelo `audit_log`, ação `account_deleted`, que ficaria preservado se exportado antes).

## 5. Contas inativas

**Decisão (2026-10-17)**: não há eliminação automática por inatividade no beta. Os dados ficam enquanto a conta existir, como diz a política. Reavaliar antes do lançamento (ex.: aviso por e-mail e exclusão após 24 meses sem acesso) — exige serviço de e-mail próprio.

## 6. Pendências

- [ ] Conferir backups no painel e preencher a seção 4 (você, gratuito).
- [ ] Testar "Excluir minha conta" com uma conta de teste no app publicado, depois de definir `ALLOWED_ORIGINS` (a função nova foi publicada; o caminho com foto só poderá ser testado quando o upload existir).
- [ ] ⚖ Validar os prazos de 5 anos (prova e auditoria) e a aplicação do Marco Civil.
- [ ] Quando o upload de foto existir: apagar o arquivo antigo ao trocar ou remover a foto.
