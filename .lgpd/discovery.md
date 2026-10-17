# Discovery LGPD — Guf App

**Data**: 2026-10-16 · **Branch analisada**: `feat/auto-finalizar-treino` (commit `10b0fae`)
**Método**: leitura do código (migrations, Edge Function, packages/api, apps/web, textos legais). Configurações do painel do Supabase/Vercel e contratos **não** foram verificados (fora do repositório).

## 1. Schema do banco (`supabase/migrations/`)

| Tabela | Dados pessoais | Observação |
|---|---|---|
| `auth.users` (Supabase) | e-mail, senha (hash), metadados do Google (nome, foto), IP/registro de login (logs do Supabase) | gerida pelo Supabase |
| `profiles` | nome, avatar_url, unidade, meta semanal, fuso, `auto_finish_workout` | 1:1 com o usuário |
| `exercises` (próprios) | nomes de exercícios criados | baixo risco |
| `projects`, `routines`, `routine_exercises` | planejamento, observações em texto livre | texto livre pode conter qualquer coisa |
| `workout_sessions`, `workout_active_periods`, `session_exercises`, `set_logs` | datas/horários de treino, cargas, repetições, RPE, observações | revela rotina e horários do titular |
| `body_measurements`, `measurement_values` | peso, % de gordura, circunferências | **tratado como dado sensível (saúde)** — gravação exige consentimento pela RLS |
| `legal_documents` | — (versões, hash do texto) | leitura pública |
| `consent_records` | aceite/revogação, origem, plataforma, data | append-only pelo app; **apagado em cascata com a conta** |
| `entitlements` | plano | futuro pagamento |

- **RLS ativo em todas as tabelas**, regra "cada usuário só vê o próprio".
- Job `pg_cron` `auto-finish-idle-workouts` (decisão automatizada de baixo impacto: encerra treino ocioso, só para quem ligou a opção).

## 2. APIs e funções
- Sem backend próprio: site estático + Supabase (PostgREST, RPCs, Edge Function `delete-account`).
- `export_my_data()` (portabilidade/acesso) — **não inclui** `workout_active_periods` nem e-mail/identidades da conta.
- `delete-account`: valida o token, `auth.admin.deleteUser` → cascata. Comentário no código já aponta a dúvida sobre prova mínima de consentimento (art. 16). CORS `*`.
- `revoke_health_consent()`: registra revogação **e** apaga as medidas.

## 3. SDKs de terceiros / operadores
| Operador | Uso | Dados | Local provável |
|---|---|---|---|
| Supabase | banco, autenticação, Edge Functions, logs | todos | região do projeto **não verificada** |
| Vercel (testes) / Cloudflare Pages (produção prevista) | hospedagem do site estático | IP e logs de acesso ao site | EUA / global |
| Google (OAuth) | login social | nome, e-mail, foto | EUA |

- **Nenhum** analytics, pixel, Sentry, GTM ou CDN externo no código (fontes locais, ícones locais). Único `console.error` (Edge Function) registra só o `userId` e a mensagem.

## 4. Cookies e armazenamento no aparelho
- Sessão do Supabase (localStorage), preferências (`guf.theme`, `guf.rest-alert`, `guf.keep-screen-on`), treino ativo, IndexedDB (Dexie: fila offline, cópias de histórico/resumos).
- Ao sair: limpa cache, treino ativo e IndexedDB. Service worker **não** cacheia respostas do Supabase.
- Nenhum cookie de terceiros.

## 5. Mobile
- Ainda não existe (Expo previsto). PWA sem permissões especiais (Wake Lock e áudio não exigem permissão).

## 6. Política de privacidade e termos
- Textos em `packages/core/src/legal-content.ts`, **rascunho sem validação jurídica** (`LEGAL_CONTENT_IS_DRAFT`).
- Marcadores pendentes: `[RAZÃO SOCIAL]`, `[CNPJ]`, `[ENDEREÇO]`, `[NOME/E-MAIL DO ENCARREGADO]`, `[E-MAIL DE SUPORTE]`, `[PROVEDOR DE INFRAESTRUTURA]`, `[PAÍS DOS SERVIDORES]`, `[PRAZO]` pós-exclusão.
- Promete "registros de acesso por 6 meses (Marco Civil, art. 15)" — sem implementação verificada.

## 7. Encarregado
- Não designado (marcadores no texto).

## 8. Incidentes anteriores
- Nenhum registro encontrado no repositório. Não existe runbook.

## 9. Público
- Declarado 18+ por autodeclaração (checkbox no cadastro e `age_declaration`). App de academia: adolescentes podem ter "acesso provável" — avaliar ECA Digital (Lei 15.211/2025).

## 10. Porte
- Provável Agente de Tratamento de Pequeno Porte (Res. CD/ANPD nº 2/2022) — **confirmar** natureza jurídica e faturamento.
- **Atualização 2026-10-16**: não há empresa constituída; o app está em beta, desenvolvido só por Glauber. Supabase Free em `us-west-2`, SMTP padrão, Vercel Hobby, nenhum DPA aceito.
