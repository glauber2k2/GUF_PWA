# Registro de Auditoria — Guf App

**Versão**: v1 · **Data**: 2026-10-17 · **Etapa**: F6 (`lgpd-audit-logging`) · **Resolve**: G19
**Migration**: `supabase/migrations/20261017143503_audit_log.sql` (aplicada e testada em 2026-10-17)
**Custo**: zero (tabela e gatilhos no próprio Postgres do Supabase; sem serviço externo)

> Implementação técnica. **Não é parecer jurídico** ⚖ (prazo de 5 anos a validar).

## Para que serve

Provar que as ações do titular foram registradas e atendidas — consentimentos, revogações, exportações e exclusões (Art. 6º, X — responsabilização e prestação de contas). Também ajuda a reconstruir a linha do tempo de um incidente (`.lgpd/incidents/runbook.md`).

## Como funciona

- Tabela `public.audit_log`, **só inclusão**: um gatilho recusa qualquer edição e qualquer remoção fora da eliminação por prazo (erro 42501).
- **Encadeada por hash**: cada registro guarda o hash do anterior (`prev_hash`) e o próprio (`self_hash` = SHA-256 de hash anterior, horário em microssegundos, ação, ator, titular e hash dos detalhes). Alterar ou remover um registro no meio quebra a cadeia.
- Gravada **só pelo banco** (gatilhos e funções SECURITY DEFINER); o app não lê nem grava (RLS ligado, sem políticas, privilégios revogados).
- Gravações serializadas por trava de transação (`pg_advisory_xact_lock`), para a cadeia não bifurcar.

## Eventos

| Ação | Quando | Ator | Detalhes guardados |
|---|---|---|---|
| `consent_granted` | Toda inclusão de aceite em `consent_records` (cadastro, `/aceite`, saúde) | `user` (logado) ou `service` (gatilho de cadastro) | documento, versão, origem, plataforma, id do registro |
| `consent_revoked` | Revogação do consentimento de saúde | `user` | idem |
| `health_data_deleted` | Medidas apagadas (revogação ou exclusão da conta) | `user` ou `service` | quantidade de medidas |
| `data_exported` | `export_my_data()` | `user` | formato, nº de treinos e de medidas |
| `social_data_deleted` | `revoke_social_consent()` (revogar o compartilhamento) | `user` | nº de seguidores removidos |
| `social_visibility_changed` | `update_social_settings()` | `user` | visibilidade, histórico oculto, pedidos aceitos ao abrir a conta |
| `follow_accepted` | Pedido aceito ou seguir conta aberta (`subject` = quem é seguido) | `user` | id interno de quem segue, modo (`request`/`open`) |
| `follow_ended` | Deixar de seguir ou remover seguidor (`subject` = quem era seguido) | `user` | id interno de quem seguia, quem encerrou |
| `user_blocked` | `block_user()` | `user` | id interno da pessoa bloqueada |
| `account_deleted` | Antes de apagar `auth.users` (Edge Function, painel ou SQL) | `service` | provedores de login, idade da conta em dias, nº de registros de consentimento |
| `consent_proofs_purged` | Job diário apagou provas vencidas | `system` | quantidade |
| `audit_log_purged` | Job mensal apagou registros com mais de 5 anos | `system` | quantidade |

**Minimização**: sem e-mail, nome, IP, conteúdo de treinos ou valores de medidas. Só ids internos (uuid sem FK — o registro sobrevive à exclusão da conta, mas o id não aponta para mais nada) e contagens. É dado pessoal pseudonimizado: está no mapa de dados como A016.

**Fora do registro do banco**: pedidos recebidos por e-mail (controle em planilha privada — `.lgpd/dsar/workflow.md`) e logins/acessos (logs do Supabase Auth, retenção do plano).

## Retenção

- **5 anos** a partir do evento (proposta, alinhada à prova de consentimento e ao registro de incidentes da Res. 15/2024) ⚖.
- Job pg_cron `purge-expired-audit-log`, dia 1 de cada mês às 03:41 UTC. A eliminação é registrada como `audit_log_purged`; o primeiro registro restante vira a âncora da cadeia.

## Verificação de integridade

No SQL Editor do Supabase (ou `npx supabase db query --linked`):

```sql
select * from public.verify_audit_log();
-- checked = registros conferidos; first_broken_id = null → cadeia íntegra
```

Rodar **uma vez por mês** e antes de usar o registro como prova. `first_broken_id` preenchido = adulteração ou bug: tratar como possível incidente (runbook, seção 4).

## Consultas úteis (controlador)

```sql
-- Linha do tempo de um titular (pelo id da conta)
select occurred_at, action, actor_type, details
  from public.audit_log where subject_id = '<uuid>' order by id;

-- Exclusões de conta no mês
select count(*) from public.audit_log
 where action = 'account_deleted' and occurred_at >= date_trunc('month', now());
```

## Testes (2026-10-17, usuário fictício, transação desfeita)

| # | Teste | Resultado |
|---|---|---|
| 1 | App lê `audit_log` | Bloqueado (42501) |
| 2 | Ciclo cadastro → saúde → 2 medidas → exportar → revogar → excluir conta | 8 eventos na ordem: 3 aceites do cadastro, aceite de saúde, exportação (2 medidas), revogação, 2 medidas apagadas, conta excluída |
| 3 | `verify_audit_log()` | Cadeia íntegra |
| 4–5 | Editar / apagar registro | Bloqueado (42501) |
| 6 | Adulterar um registro (gatilho desligado no teste) | Detectado no id adulterado |
| 7 | E-mail do titular no registro | Não aparece |
| 8 | Job mensal | Agendado |

## Limitações conhecidas

- Um administrador com acesso total ao banco pode desligar o gatilho e reescrever a cadeia inteira; o hash detecta alterações pontuais, não uma reescrita completa. Mitigação futura (custo zero): anotar mensalmente o `self_hash` do último registro fora do banco (ex.: no `log.md` de incidentes ou num e-mail para si mesmo), criando âncoras externas.
- Ações administrativas feitas direto no painel (SQL manual em dados de usuários) não geram evento, exceto as cobertas pelos gatilhos acima.
