# Registro de Consentimentos — Guf App

**Versão**: v1
**Data**: 2026-10-17
**Etapa**: F3 (`lgpd-consent-schema`), adaptada para Supabase/Postgres
**Migration**: `supabase/migrations/20261017132154_consent_ledger_hardening.sql`
**Resolve**: G6, G13, G14 (ver `gaps.md`)

> Diagnóstico e implementação técnica. **Não é parecer jurídico**: prazo de guarda da prova (5 anos) e base legal da prova pós-exclusão precisam de validação ⚖.

## Estrutura

| Tabela | Conteúdo | Quem grava | Quem lê |
|---|---|---|---|
| `legal_documents` | Versão de cada documento (terms, privacy, age_declaration, health_consent, social_sharing), `content_hash` e `summary_hash` | Só migration (administrador) | Público |
| `consent_records` | Um registro por ação (`granted` / `revoked`), com documento/versão, origem, plataforma e data | Só funções do banco (abaixo) | O próprio titular (RLS) |
| `consent_proofs` | Cópia mínima dos registros de quem excluiu a conta, com e-mail em SHA-256 | Só o gatilho de exclusão | Ninguém pelo app (RLS sem políticas); controlador via SQL |

## Princípios atendidos

| Princípio | Como | Norma |
|---|---|---|
| Só inclusão (append-only) | Sem política de update/delete; revogar = novo registro `revoked` | Art. 8º, § 5º; Art. 6º, X |
| Registro fechado | Sem política de insert; privilégios de escrita revogados de `anon`/`authenticated` | Art. 8º, § 2º |
| Versionado | Todo registro aponta para uma versão de `legal_documents` | Art. 8º, § 6º; Art. 9º, § 2º |
| Específico por finalidade | Um documento por finalidade (termos, privacidade, idade, saúde) | Art. 8º, § 4º; Art. 11, I |
| Prova do texto exibido | `content_hash` = SHA-256 do texto do app (`packages/core/src/legal-hash.ts`) | Art. 8º, § 2º |
| Revogação fácil | Perfil › Privacidade; revogar saúde apaga as medidas na mesma transação | Art. 8º, § 5º; Art. 18, IX |
| Prova após exclusão | `consent_proofs`, 5 anos, eliminação automática diária | Art. 16, I; Art. 7º, VI ⚖ |

## Pontos de gravação

| Função / gatilho | Origem (`source`) | Validações |
|---|---|---|
| `handle_new_user` (cadastro por e-mail) | `signup_email` | Só versões vigentes de terms/privacy/age_declaration; ids inválidos ignorados |
| `accept_documents(ids, source, platform)` | `signup_email` · `signup_google` · `reaccept` | Logado; origem e plataforma da lista; ids sem repetição; só versões vigentes (senão 22023) |
| `grant_health_consent(platform)` | `health_module` | Logado; termo de saúde publicado; plataforma da lista |
| `revoke_health_consent(platform)` | `settings` | Logado; plataforma da lista; apaga `body_measurements` |
| `grant_social_consent(platform)` | `social_module` | Logado; termo `social_sharing` publicado (senão GS003); plataforma da lista. Pedido ao aceitar o 1º seguidor ou abrir o perfil |
| `revoke_social_consent(platform)` | `settings` | Logado; plataforma da lista; remove os seguidores e fecha o perfil |
| `preserve_consent_proofs` (antes de apagar `auth.users`) | — | Copia todos os registros do titular para `consent_proofs` |

Plataformas aceitas: `web`, `ios`, `android` (ou nula).

## Prova após a exclusão da conta (G6)

- **Quando**: gatilho `on_auth_user_deleted_preserve_consents` (`before delete on auth.users`). Vale para a Edge Function `delete-account`, o painel e o SQL.
- **O que guarda**: id antigo da conta, SHA-256 de `lower(trim(email))`, documento/tipo/versão, `content_hash`/`summary_hash`, ação, origem, plataforma, data do aceite, data da exclusão, `purge_after`.
- **O que NÃO guarda**: e-mail em texto, nome, foto, treinos, medidas ou qualquer outro dado.
- **Prazo**: 5 anos a partir da exclusão (proposta: prescrição do CDC, art. 27) ⚖.
- **Eliminação**: job pg_cron `purge-expired-consent-proofs`, todo dia às 03:17 UTC.
- **Consulta** (controlador, para responder a um questionamento):

```sql
select doc_type, doc_version, action, source, consented_at, account_deleted_at
  from public.consent_proofs
 where email_sha256 = encode(sha256(convert_to(lower(trim('pessoa@exemplo.com')), 'UTF8')), 'hex')
 order by consented_at;
```

> O hash do e-mail é dado **pseudonimizado** (Art. 13, § 4º), não anonimizado: continua sendo dado pessoal e entra no ROPA (F10) e na política de privacidade (F4).

## Hash dos textos (G14)

- Regra em `packages/core/src/legal-hash.ts`: SHA-256 do `JSON.stringify` do conteúdo de `legal-content.ts` (documento inteiro; idade = seção "idade" dos Termos; `summary_hash` = resumo do termo de saúde).
- Gerar: `pnpm --filter @guf/core legal:hashes`.
- Conferência: em desenvolvimento, `/documentos` mostra o aviso "Hash diferente (dev)" quando o banco não confere com o texto do app.
- Os rascunhos `0.1-dev` receberam o hash real do texto atual. **Cada mudança no texto exige nova versão** em `legal_documents` (nova migration) com o hash novo; versões com `requires_reaccept` levam o titular ao portão `/aceite`.

## Procedimento para publicar uma versão nova de documento

1. Texto final aprovado pelo jurídico entra em `legal-content.ts` (e `changes[versão]`, se houver aceite anterior).
2. `pnpm --filter @guf/core legal:hashes`.
3. `npx supabase migration new legal_docs_vX` com `insert into legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)`.
4. Conferir `/documentos` em dev sem o aviso de hash.
5. Aplicar a migration e publicar o app **juntos** (texto e hash precisam bater em produção).

## Pendências

- ⚖ Validar prazo de 5 anos e base legal da prova pós-exclusão.
- ⚖ Validar se a prova deve incluir `revoked` de saúde (hoje inclui tudo: é a prova de que a revogação foi respeitada).
- Propagação da revogação a operadores: não se aplica hoje (sem analytics/marketing). Rever se algum operador novo receber dados com base em consentimento.
- Log de auditoria das ações (F6, `lgpd-audit-logging`).
