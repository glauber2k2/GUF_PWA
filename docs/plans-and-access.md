# Planos, permissões e assinaturas

Como o guf decide o que cada pessoa pode usar, onde isso é verificado e como acrescentar planos,
funcionalidades e o pagamento. Vale para o app web e para o app mobile futuro (as regras ficam no
banco e nos pacotes compartilhados).

## Resumo

| Conceito | Onde fica | Quem grava |
|---|---|---|
| **Catálogo**: planos, funcionalidades e o que cada plano libera | `plans`, `features`, `plan_features` | Só migration |
| **Assinatura**: espelho do que foi pago no gateway | `subscriptions` | Só o servidor (webhook) |
| **Direito de acesso**: qual plano a pessoa tem, de onde veio e até quando | `plan_grants` | Só o servidor (webhook, suporte) |
| **Plano efetivo** | `plan_of(user)` / `my_entitlements()` | Calculado |
| **Regra pura** ("pode usar?", "cabe mais um?", janela do histórico, textos) | `packages/core/src/plans.ts` | — |
| **Contrato** (`PlansApi`) | `packages/api/src/plans.ts` | — |
| **Tela** (portão, tela do Pro, /planos) | `apps/web/src/features/plans/` | — |

Migrations (aplicadas em 2026-10-21): `20261021200000_plans_and_entitlements` (estrutura),
`20261021200100_legal_docs_plans` (Termos 0.4-dev, Política 0.6-dev, Termos da Assinatura 0.1-dev),
`20261021200200_plan_history_window` (histórico e competição devolvidos pelo plano) e
`20261021200300_session_hidden_by_plan`.

## Por que não "papéis" (RBAC)

O que muda entre os planos são **funcionalidades e limites**, não o que a pessoa "é". Uma coluna
`role` quebraria nos casos que o produto quer suportar:

- a mesma pessoa com mais de um direito (ex.: Pro por conta própria e aluno de um personal);
- benefício que vem de outra conta (o aluno recebe pela assinatura do personal);
- mudar o que um plano oferece sem caçar `if (plan === "pro")` pelo código.

Por isso o código **nunca pergunta o nome do plano**: pergunta "pode usar X?" ou "qual o limite de
Y?". O catálogo responde. Mudar um limite ou criar um plano é uma linha nova por migration.

## Modelo de dados

```
plans ──< plan_features >── features          (catálogo)
  │
  └──< plan_grants >── auth.users ──< subscriptions
```

- **`plans`**: `code`, `name`, `rank` (o maior vence quando há vários direitos), `is_default` (plano
  de quem não tem direito válido; exatamente um), `is_purchasable` (aparece para assinar).
- **`features`**: `code`, `kind` (`flag` = liga/desliga, `limit` = quantidade) e `description`.
- **`plan_features`**: sem linha = não liberado; em `limit`, `limit_value` nulo = sem limite.
- **`subscriptions`**: `provider` + `provider_ref` únicos (webhook repetido não duplica), `status`
  (`trialing`, `active`, `past_due`, `canceled`, `expired`) e `current_period_end`.
- **`plan_grants`**: `source` (`subscription`, `manual`, `trial`), `subscription_id` (um direito por
  assinatura), `valid_from`, `valid_until`, `revoked_at`.

Leitura: catálogo é público (a tela de planos mostra a comparação sem login); assinaturas e direitos,
só o dono (RLS). Escrita pelo app: nenhuma.

### Catálogo atual

| Funcionalidade | Tipo | Free | Pro |
|---|---|---|---|
| `custom_projects` (projetos ativos além do Favoritos) | limit | 0 | sem limite |
| `routines_per_project` (rotinas ativas por projeto) | limit | 5 | sem limite |
| `guf_ai_daily_messages` (perguntas ao GUF AI em 24 h) | limit | 3 | 40 |
| `history_months` (meses de histórico visíveis, contando o atual) | limit | 2 | sem limite |
| `competition_full_history` (competição além do mês atual) | flag | não | sim |

## Funções do banco

| Função | Quem chama | O que faz |
|---|---|---|
| `my_entitlements()` | app (`getEntitlements`), Edge Function `guf-ai` | Plano, validade e cada funcionalidade com `enabled`, `limit`, `upgradable` |
| `effective_plan()` · `has_feature(f)` · `feature_limit(f)` | app, políticas de RLS futuras | Mesmas respostas para o usuário logado |
| `plan_of(u)` · `has_feature_of(u, f)` · `feature_limit_of(u, f)` | só o banco (gatilhos) | Versões com o usuário; o app não consegue perguntar o plano de outra pessoa |
| `apply_subscription_event(...)` | só `service_role` (webhook) | Atualiza a assinatura e o direito ligado a ela; idempotente; audita |
| `grant_plan(u, plan, until, source)` · `revoke_plan_grant(id)` | só `service_role` (suporte) | Direito sem pagamento (testadores, cortesia, teste); audita |
| `pending_subscription_documents()` | app | Documentos a aceitar para assinar |
| `is_premium()` | legado | "Plano acima do padrão" (mantida por compatibilidade) |

Auditoria: `plan_granted` e `plan_revoked` entram no `audit_log` (sem dados pessoais nos detalhes).

## Onde cada limite é aplicado

**Gravações: no banco** (o site é estático; esconder um botão não protege nada).

| Limite | Onde | Erro |
|---|---|---|
| `custom_projects` | gatilho `projects_enforce_plan_limit` (criar ou desarquivar projeto) | `GL001`, `hint = 'custom_projects'` |
| `routines_per_project` | gatilho `routines_enforce_plan_limit` (criar, desarquivar ou mudar de projeto; vale também dentro do `save_routine`) | `GL001`, `hint = 'routines_per_project'` |
| `guf_ai_daily_messages` | Edge Function `guf-ai` (lê `my_entitlements`) | HTTP 402 (outro plano libera mais) ou 429 (limite máximo) |

`toApiError` converte `GL001` em `plan_limit` com `feature` vindo do `hint`; o 402 do GUF AI vira
`plan_limit` com `feature = "guf_ai_daily_messages"`. Quem já passou do limite (ex.: tinha projetos
antes) **mantém o que tem**; só não cria nem reativa mais. Sem `auth.uid()` (servidor, jobs,
cadastro) os limites não se aplicam.

**Leituras do histórico e da competição: também no banco** (migrations
`20261021200200_plan_history_window` e `20261021200300_session_hidden_by_plan`). O banco **guarda tudo**
(quem assina depois vê o histórico inteiro na hora, sem migração de dados), mas **só devolve** ao app o
que o plano libera.

| Limite | Como o banco aplica |
|---|---|
| `history_months` | **RLS de leitura** em `workout_sessions`, `session_exercises`, `set_logs` e `workout_active_periods`: só treinos a partir de `history_visible_from()` (1º dia do mês mais antigo liberado, no fuso do perfil) ou em andamento. Vale para toda consulta do app, para `get_training_days`, `get_exercise_history` e `get_exercise_records` (rodam com os direitos de quem chama) e para o GUF AI (usa o token da pessoa). UPDATE e DELETE também passam pela leitura: treino fora da janela não é alterado pelo app. |
| `history_months` (perfil e outras pessoas) | `list_member_workouts`, `get_member_evolution` e `get_member_workout` viraram invólucros que cortam pela janela de **quem consulta** (o histórico de um amigo segue o seu plano). |
| `competition_full_history` | `get_competition_weeks` e `get_competition_days` viraram invólucros: sem a funcionalidade, `p_from` sobe para o início da temporada atual (`current_season_start_of`). |

As funções originais SECURITY DEFINER foram renomeadas para `*_unrestricted` (sem acesso pelo app) e
os invólucros mantêm nome, parâmetros e retorno: o app não mudou. **Ao alterar uma delas numa migration
futura, alterar a `*_unrestricted`.**

**O que continua usando o histórico inteiro, sem devolver treinos** (para o app funcionar igual para todos):

| Função | Por quê |
|---|---|
| `finish_workout`, `session_load_records`, pontuação da competição, `get_streak` | Recordes oficiais, sequência e pontos não podem mudar com o plano |
| `get_best_e1rm(ids, p_hidden_only)` | Só o número do melhor 1RM. `false`: recorde no treino em andamento (igual ao `finish_workout`). `true`: melhor 1RM dos treinos **fora** da janela, que o app junta ao histórico visível (`withHiddenHistoryBest` em core/history.ts) para os recordes da folha do dia, do resumo e da edição continuarem certos. A data desse recorde não é devolvida (`previousBest1Rm` vem com dia nulo). |
| `get_training_totals(p_until)` | 1º treino, total de concluídos e última rotina feita: calendário (até onde dá para tentar voltar), Perfil, rotina sugerida na Início e em Projetos, marco dos stories |
| `get_last_performance` | Coluna "Anterior" no treino |
| `export_my_data` | Direito de acesso do titular (LGPD art. 18, II): a exportação é sempre completa |
| `is_session_hidden_by_plan(id)` | Só sim/não: resumo antigo aberto por link mostra "Isso faz parte do Pro" em vez de "treino não encontrado" |

Sem `auth.uid()` (servidor, jobs, Edge Functions com service_role) nada é limitado.

**No app** continua o portão de experiência (`usePlanGate`): a tela do Pro aparece ANTES de pedir o que
o banco não vai devolver, e os padrões abrem no que cabe no plano.

| Limite | Onde no app |
|---|---|
| `history_months` | calendário (voltar além do mês anterior), gráfico do histórico (períodos maiores que a janela), evolução por exercício (períodos; novo período "1 mês"), resumo de treino antigo aberto por link (`PlanLockedNotice` + `useSessionHiddenByPlan`) |
| `competition_full_history` | troca de período na competição e no duelo (`useCompetitionView`) |

Limitação conhecida: na evolução por exercício, as marcações de recorde de carga e volume (e o volume
de projeto nos stories) consideram só o período visível; o recorde de 1RM usa a base escondida.

## Experiência: "deixar tentar"

Decisão de produto: a pessoa **nunca vê cadeado antes de tentar**. Botões, formulários e períodos
aparecem normalmente; ela preenche tudo e, **na hora de usar**, aparece a tela
"Isso faz parte do Pro" (`ProUpsellScreen`) com o texto da funcionalidade (`planUpsellCopy`) e o
botão "Conhecer o Pro" (abre `/planos?recurso=<funcionalidade>`, com a linha em destaque). Fechar
volta exatamente para onde estava, com o formulário preenchido.

No código das telas:

```ts
const gate = usePlanGate();

// Antes de gravar (pergunta ao plano já carregado; evita uma ida ao servidor):
if (!gate.allowAnother("routines_per_project", routinesInProject)) return;

// Depois de gravar (o banco é a palavra final; cobre app desatualizado):
if (gate.handlePlanError(error, "routines_per_project")) return;

// Leitura:
if (!gate.allowHistoryMonth(previousMonth, today)) return;
```

`usePlanGate` (features/plans/hooks) expõe `allowFeature`, `allowAnother`, `allowHistoryDate`,
`allowHistoryMonth`, `handlePlanError` (abrem a tela do Pro e devolvem `false`/`true`) e as consultas
sem efeito `isFeatureEnabled`, `isHistoryDateVisible`, `isHistoryMonthVisible`, `historyStart` (para
escolher padrões que cabem no plano e corrigir links antigos).

**Sem direitos carregados** (primeira abertura sem internet): nada é bloqueado no app; o banco
continua barrando as gravações. Os direitos ficam no aparelho (`withDeviceCache`, chave
`entitlements:<user>`) e saem ao sair da conta.

## Aceites (LGPD e CDC): agrupados por momento

Pedido do produto: não mostrar termos para aceitar toda hora. Os aceites ficam em dois momentos:

| Momento | Documentos | Onde | `source` |
|---|---|---|---|
| **Cadastro** (e `/aceite` quando uma versão exige) | Termos de Uso, Política de Privacidade, declaração de idade | cadastro / portão `/aceite` | `signup_email`, `signup_google`, `reaccept` |
| **Assinatura** | Termos da Assinatura **+ qualquer pendência do cadastro**, numa única caixa | tela `/planos` | `subscribe` |

- O consentimento de saúde continua separado: precisa ser específico e destacado (LGPD art. 11, I).
- `requires_reaccept` passou a valer: uma versão publicada com `false` (correção de texto, sem mudança
  material) **não** pede aceite de novo a quem aceitou uma versão a partir da última que exigiu
  (`pending_documents_of`).
- Os planos entraram nos Termos 0.4-dev e na Política 0.6-dev **já descrevendo a assinatura futura**
  (prestador de pagamento com marcador `[PRESTADOR DE PAGAMENTO]`): quando o pagamento for lançado,
  preencher o nome do prestador pode sair com `requires_reaccept = false`, sem nova rodada de `/aceite`.
- Bases legais: plano e assinatura = execução de contrato (art. 7º, V); registros de pagamento exigidos
  pela lei fiscal = obrigação legal (art. 7º, II). Detalhes em `.lgpd/legal-basis.md` (A022).
- O aceite da assinatura só é gravado quando a assinatura acontece de fato (`startSubscription`
  recusa com `billing_unavailable` ANTES de registrar qualquer aceite enquanto não há pagamento).

## Pagamento (preparado, ainda não implementado)

O que já existe: `subscriptions`, `apply_subscription_event`, `startSubscription` no contrato,
tela `/planos` com a caixa de aceite e o botão "Assinar". O que falta, em ordem:

1. **Escolher o gateway** (web: Stripe ou Mercado Pago; app nativo: Apple/Google, que exigem a
   compra pela loja). Para várias lojas, um agregador como o RevenueCat simplifica (é uma
   biblioteca/serviço novo: aprovar antes).
2. **Edge Function de checkout** (`create-checkout`): recebe o plano e os ids aceitos, registra os
   aceites (`accept_documents` com `source = 'subscribe'`) e devolve a URL/sessão do gateway.
   `startSubscription` passa a chamá-la.
3. **Edge Function de webhook** (`billing-webhook`, `--no-verify-jwt`, assinatura do gateway
   verificada): para cada evento, chama `apply_subscription_event(user, plan, provider, ref, status,
   period_end)`. É a ÚNICA forma de um direito pago nascer.
4. **Política e prestador**: preencher `[PRESTADOR DE PAGAMENTO]`, `[PREÇO]`, `[PERIODICIDADE]`,
   `[PRAZO DE AVISO]` e `[CANAL DE CANCELAMENTO]`; avaliar o prestador em `.lgpd/vendors/` e a
   transferência internacional, se houver.
5. **App**: depois do retorno do checkout, `invalidateQueries([PLANS_KEY])` para o plano novo aparecer.

## Como acrescentar

**Uma funcionalidade nova com limite**

1. Migration: `insert into features` + uma linha em `plan_features` para cada plano.
2. `packages/core/src/plans.ts`: valor em `PlanFeature`/`PLAN_FEATURES`, rótulo em
   `PLAN_FEATURE_LABELS` e texto em `planUpsellCopy` (o TypeScript aponta o que falta).
3. Aplicar: gravação → gatilho ou checagem na RPC/Edge Function (erro `GL001` com `hint`); leitura →
   `usePlanGate` na tela.
4. Mock: `apps/web/src/mocks/plans.ts`.

**Mudar um limite** (ex.: Free com 3 rotinas): só uma migration atualizando `plan_features`. Se o
limite **diminuir**, avisar antes no app (os Termos prometem) e lembrar que quem já passou mantém o que tem.

**Um plano novo** (ex.: `aluno`, `personal`)

1. Migration: `insert into plans` (com `rank`) e as linhas em `plan_features`.
2. Se o direito vier de outra conta (aluno ← personal): nova `source` em `plan_grants`
   (ex.: `coach_seat`) e a tabela do vínculo (`coach_links`: personal, aluno, status, escopos), com
   RLS liberando a leitura dos treinos do aluno só com vínculo ativo e escopo. O plano efetivo continua
   sendo o de maior `rank`; quando o vínculo acaba, o direito ganha `revoked_at`.
3. **LGPD antes de construir**: personal vendo treinos do aluno é compartilhamento com terceiro e
   exige revisar o RIPD (`.lgpd/RIPD/`), o mapa de dados e a Política; chat entre os dois é item que
   o projeto não permite sem nova avaliação (CLAUDE.md, "Compromisso de produto").

## Desenvolvimento

- `?estado=` (qualquer valor) usa o mock dos planos: **Free** por padrão; incluir `pro` simula o Pro
  (ex.: `/planos?estado=pro`, `/projetos?estado=padrao,pro`).
- GUF AI: `?estado=ia-plano` simula o fim das perguntas do plano Free (abre a tela do Pro).
- Dar Pro a alguém do beta (SQL, como `service_role`): `select public.grant_plan('<user_id>', 'pro');`
