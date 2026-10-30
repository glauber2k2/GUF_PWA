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
| **Regra pura** ("pode usar?", "cabe mais um?", período dos gráficos, textos) | `packages/core/src/plans.ts` | — |
| **Contrato** (`PlansApi`) | `packages/api/src/plans.ts` | — |
| **Tela** (portão, tela do Pro, /planos) | `apps/web/src/features/plans/` | — |

Migrations (aplicadas em 2026-10-21): `20261021200000_plans_and_entitlements` (estrutura),
`20261021200100_legal_docs_plans` (Termos 0.4-dev, Política 0.6-dev, Termos da Assinatura 0.1-dev),
`20261021200200_plan_history_window` e `20261021200300_session_hidden_by_plan` (primeira versão, com o
histórico cortado; desfeita pela seguinte), `20261021200400_charts_window_and_member_month` (regra atual:
histórico completo, gráficos pelo plano, outra pessoa = mês atual) e `20261021200500_legal_docs_charts`
(Termos 0.5-dev e Termos da Assinatura 0.2-dev, sem novo aceite).

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
| `chart_months` (meses que os gráficos mostram, contando o atual) | limit | 2 | sem limite |
| `measurement_chart_months` (meses que os gráficos de medidas corporais mostram, de hoje para trás; aplicado no app: 3M · 6M · Tudo, os registros ficam completos) | limit | 3 | sem limite |
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

**Histórico, recordes e evolução: completos em qualquer plano.** O plano limita só o que os
**gráficos** mostram (`chart_months`) e a competição além do mês atual. Regra revista em 2026-10-21
(migration `20261021200400_charts_window_and_member_month`, que desfez a janela no histórico de
`plan_history_window`).

| Regra | Onde |
|---|---|
| Seu histórico de treinos (lista, calendário, folha do dia, resumos, recordes, evolução, "Anterior", GUF AI) | Completo para todos: RLS de leitura volta a ser só "os próprios". |
| `chart_months` — período dos gráficos (Free: mês atual e anterior) | **Gráfico de evolução do seu perfil**: `get_member_evolution` corta no banco pela `chart_visible_from()`. **Gráfico do Histórico** (volume médio) e **gráfico da evolução por exercício**: corte no app (`usePlanGate().allowChartFrom`), porque usam os mesmos números que a lista, o calendário e os recordes já mostram completos — cortar a consulta no banco não esconderia nada e quebraria os recordes. |
| Histórico de **outra pessoa** (lista de treinos, treino aberto e gráfico do perfil dela) | **Só o mês atual, em qualquer plano** (de quem consulta e de quem é consultado): `list_member_workouts`, `get_member_workout` e `get_member_evolution` cortam no banco por `member_history_from(dono)` (o seu: sem corte; de outra pessoa: 1º dia do mês atual no seu fuso). O perfil mostra "Você vê os treinos deste mês." (`MEMBER_HISTORY_SCOPE_NOTE`). |
| `competition_full_history` | `get_competition_weeks`/`get_competition_days` cortam no banco: sem a funcionalidade, só a temporada atual (`competition_visible_from` → `current_season_start_of`). No app, trocar de período abre a tela do Pro (`useCompetitionView`). |

As cinco funções SECURITY DEFINER do perfil e da competição viraram invólucros com o mesmo nome,
parâmetros e retorno; as originais são `*_unrestricted` (sem acesso pelo app). **Ao alterar uma delas
numa migration futura, alterar a `*_unrestricted`.**

Funções de apoio: `get_best_e1rm(ids)` (melhor 1RM de todo o histórico, só o número: recorde no treino
em andamento, igual ao `finish_workout`) e `get_training_totals(p_until)` (1º treino, total de concluídos
e última rotina feita, numa chamada: calendário, Perfil, rotina sugerida, marco dos stories). A
exportação de dados é sempre completa (LGPD art. 18, II). Sem `auth.uid()` (servidor, jobs) nada é limitado.

No app, os gráficos abrem no maior período que cabe no plano (Histórico: "4 sem"; evolução: "1 mês",
período novo) e escolher um período maior abre a tela do Pro; link antigo com período fora do plano
volta ao que cabe.

## Selo do plano

`PlanBadge` (`features/plans`) mostra o plano ao lado do @ no seu perfil social. Recebe o usuário
(`PlanBadgeUser`: `planName` e `isDefaultPlan`; os `Entitlements` do usuário logado servem) e usa o
`Badge` do shadcn (`shared/components/ui/badge.tsx`) com as variantes do guf: `muted` para o plano
padrão e `accent` com coroa para planos pagos. A aparência depende do nível, não do nome, então um plano
novo não exige mudar o componente. O plano de outra pessoa não aparece: ele não sai do banco para
terceiros, e mostrá-lo seria um dado novo exposto a outras pessoas (revisar o RIPD social e criar uma
função no banco antes).

## Experiência: "deixar tentar"

Decisão de produto: a pessoa **nunca vê cadeado antes de tentar**. Botões, formulários e períodos
aparecem normalmente; ela preenche tudo e, **na hora de usar**, aparece a tela
"Isso faz parte do Pro" (`ProUpsellScreen`) com o texto da funcionalidade (`planUpsellCopy`) e o
botão "Conhecer o Pro" (abre `/planos?recurso=<funcionalidade>`, com a linha em destaque). Fechar
volta exatamente para onde estava, com o formulário preenchido.

**Padrão dos textos da tela do Pro** (`planUpsellCopy`): título curto com o benefício e mensagem em duas
frases, "No plano X, … (o que o plano atual inclui). Com o Pro, … (o que o Pro libera)." O nome do plano
e os limites vêm dos direitos, nunca escritos no texto. Funcionalidade nova segue o mesmo padrão.

**GUF AI:** quando as perguntas do dia acabam, além da tela do Pro, a conversa mostra o aviso
"Você usou as 3 perguntas de hoje do plano Free." (`aiDailyLimitReachedText`) com o botão "Conhecer o Pro".

No código das telas:

```ts
const gate = usePlanGate();

// Antes de gravar (pergunta ao plano já carregado; evita uma ida ao servidor):
if (!gate.allowAnother("routines_per_project", routinesInProject)) return;

// Depois de gravar (o banco é a palavra final; cobre app desatualizado):
if (gate.handlePlanError(error, "routines_per_project")) return;

// Gráfico (período que começa em `from`):
if (!gate.allowChartFrom(from, today)) return;
```

`usePlanGate` (features/plans/hooks) expõe `allowFeature`, `allowAnother`, `allowChartFrom`,
`handlePlanError` (abrem a tela do Pro e devolvem `false`/`true`) e as consultas sem efeito
`isFeatureEnabled` e `isChartFromVisible` (para escolher o período padrão dos gráficos e corrigir links antigos).

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

## Pagamento (Stripe, atrás de uma interface de gateway)

Implementado na branch `feat/assinatura-stripe`; tudo em [`stripe-payments-plan.md`](stripe-payments-plan.md)
(decisões, fluxos, proteções contra burla na seção 11.1 e como ligar na 11.4). Resumo:

- **Contratar:** `startSubscription` → Edge Function `billing` (ação `checkout`): confere o preço de
  `plan_prices` no gateway, grava os aceites (`source = subscribe`) e devolve a página de pagamento
  hospedada pelo Stripe. Sem preço ativo, `billing_unavailable` (a venda fica desligada).
- **O Pro pago nasce e acaba só pelo webhook** (`billing-webhook`, assinatura conferida, objeto relido no
  gateway, idempotente) → `billing_sync_subscription`, que escreve `subscriptions` e o `plan_grants`
  ligado. A função antiga `apply_subscription_event` está sem permissão de execução.
- **Cancelar:** ação `cancel`; o banco decide pelos 7 dias (`withdrawal_window`): dentro, devolve tudo e
  encerra agora; depois, Pro até o fim do período (`cancel_at_period_end`).
- **Gateway novo:** um adaptador em `supabase/functions/_shared/billing/providers/<gateway>/` que implementa
  `BillingProvider` + uma entrada em `BILLING_PROVIDERS` + o valor no `check` de `provider` (migration).
  Banco, telas e regras não mudam.

## Como acrescentar

**Uma funcionalidade nova com limite**

1. Migration: `insert into features` + uma linha em `plan_features` para cada plano.
2. `packages/core/src/plans.ts`: valor em `PlanFeature`/`PLAN_FEATURES`, rótulo em
   `PLAN_FEATURE_LABELS` e texto em `planUpsellCopy`, no padrão acima (o TypeScript aponta o que falta).
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
