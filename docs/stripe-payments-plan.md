# Pagamento do Pro pelo Stripe — plano de implementação

| Feito por | Glauber (com Claude Code) |
| --- | --- |
| Data | 30/10/2026 |
| Situação | **Fases 1 a 3 implementadas** (branch `feat/assinatura-stripe`): contratar, renovar, cancelar com devolução em 7 dias, portal, reembolso e contestação pelo webhook, exclusão da conta cancelando no Stripe. **A venda fica desligada até existir um preço em `plan_prices`** (seção 11). Faltam o suporte (fase 4), o painel (fase 5), os textos e a exportação (fase 6) |
| Vendedor | Glauber Monteiro, pessoa física, conta Stripe no CPF. Venda inicial **sem identificação pública** por decisão do controlador (risco R9 em [`lgpd-riscos-e-lancamento.md`](lgpd-riscos-e-lancamento.md)) |
| Base | [`plans-and-access.md`](plans-and-access.md) (catálogo, `subscriptions`, `plan_grants`, `apply_subscription_event`) e [`admin-panel.md`](admin-panel.md) |

> Documento técnico, **não é parecer jurídico**. Cada regra de consumidor ou de dados cita a norma. O que depende de leitura jurídica está marcado com ⚖.

---

## 1. Decisões

| # | Decisão | Por quê |
|---|---|---|
| D1 | **Stripe Checkout hospedado pelo Stripe** (o app só redireciona); o **Customer Portal** fica só para trocar cartão e ver faturas | O cartão nunca passa pelo app nem pelo Supabase (menor escopo de PCI e de LGPD); o app continua estático; nenhuma biblioteca nova no front |
| D2 | **O webhook é a única porta para o Pro pago nascer ou acabar** | O retorno do checkout pode ser forjado ou falhar; só o evento assinado do Stripe vale |
| D3 | **O gateway fica atrás de uma interface** (`BillingProvider`) nas Edge Functions | Trocar o Stripe (ou somar Apple/Google no app nativo) = um adaptador novo, sem mexer no banco, nas telas nem nas regras (SOLID: aberto/fechado e inversão de dependência) |
| D4 | **Cancelar é um botão do app**, não do portal do Stripe | Só assim o app sabe, na hora, se o cancelamento está dentro dos 7 dias e precisa reembolsar |
| D5 | **Cancelar em até 7 dias da contratação = reembolso total automático** e o Pro termina na hora | Direito de arrependimento (CDC, art. 49), exercido pela mesma ferramenta usada para contratar (Decreto 7.962/2013, art. 5º, § 1º). Sem análise, sem painel |
| D6 | **Cancelar depois dos 7 dias = Pro até o fim do período pago**, sem reembolso | É o que os Termos da Assinatura já prometem |
| D7 | **"Falar com o suporte"** no app: a pessoa escreve, o pedido chega por escrito no painel | Qualquer outro caso (cobrança indevida, renovação, problema no serviço, dúvida) é analisado por uma pessoa da equipe, com registro |
| D8 | **Reembolso manual e cancelamento pela equipe: no painel do Stripe**, por enquanto. O painel do guf só recebe e responde os pedidos de suporte, com o atalho "Abrir no Stripe" | Segurança: a tela do Stripe já tem segundo fator, histórico e alertas; o guf não precisa de código nem de chave capaz de reembolsar a pedido da equipe. O webhook mantém o app e a auditoria em dia. Reembolso pelo painel do guf fica para o futuro (seção 10) |
| D9 | **Regra dos 7 dias só no banco** (`withdrawal_window`) | Um lugar decide; Edge Function, painel e app só perguntam. `packages/core` guarda só textos e formatação |
| D10 | **Planos e preços no banco** (`plan_prices`) | Mudar preço ou criar plano anual = migration, como o resto do catálogo |
| D11 | **Sem biblioteca: API REST do Stripe com `fetch`** e assinatura do webhook conferida com Web Crypto (decidido em 30/10/2026) | Nenhuma dependência nova; versão da API fixa (`2024-06-20`) no adaptador, então mudanças do Stripe não quebram o formato |

**Ordem de lançamento:** primeiro o app gratuito (seção 4 de `lgpd-riscos-e-lancamento.md`); a venda entra depois, com as fases da seção 9.

---

## 2. Fluxos de ponta a ponta

### 2.1 Contratar o Pro

```
/planos ─ caixa de aceite (Termos da Assinatura + pendências) ─ "Assinar"
   │
   ▼  startSubscription (packages/api) → Edge Function billing-checkout
   │     1. confere sessão, plano à venda (`is_purchasable`) e ids dos documentos vigentes
   │     2. accept_documents(ids, 'subscribe', plataforma)    ← prova do aceite ANTES de pagar (CDC, art. 46)
   │     3. cria ou reaproveita o Customer do Stripe (billing_customers)
   │     4. cria a Checkout Session (mode=subscription, price de plan_prices,
   │        client_reference_id = user_id, metadata { user_id, plan_code })
   │     5. devolve a URL
   ▼
Stripe Checkout (cartão ou Pix, recibo por e-mail do Stripe)
   │
   ├──► retorno: /planos?assinatura=confirmando → tela "Confirmando pagamento"
   │       (recarrega my_entitlements a cada 2 s por até 30 s; depois "Assim que o pagamento
   │        for confirmado, o Pro aparece aqui")
   │
   └──► webhook billing-webhook (assinado)
          checkout.session.completed      → liga Customer ↔ usuário
          customer.subscription.created   → apply_subscription_event(... 'active', fim do período)
          invoice.paid                    → record_billing_payment (valor, data, fatura)
                                          → Pro liberado; toast "Bem-vindo ao Pro"
```

- **Aceite antes do pagamento:** quem desiste no checkout fica com o aceite registrado e sem Pro. É inofensivo e é a prova de que leu antes de pagar.
- **Quem já tem Pro ativo** não vê "Assinar"; vê a seção da assinatura (seção 3).
- **Data da contratação** = data do primeiro pagamento confirmado da assinatura (`subscriptions.started_at`). É dela que contam os 7 dias.
- **Pix na assinatura:** conferir no painel do Stripe se o Pix aceita cobrança recorrente na conta brasileira. Se não aceitar, a assinatura recorrente fica só no cartão e o Pix pode vender o **plano anual** como pagamento único (`plan_prices` com `interval = 'year'` e `mode = 'payment'`; o direito vale 12 meses por `plan_grants.valid_until`).

### 2.2 Renovação e falha de pagamento

| Evento do Stripe | Situação no guf | O que a pessoa vê |
|---|---|---|
| `invoice.paid` (renovação) | `active`, novo fim do período; pagamento registrado | Nada muda; recibo do Stripe por e-mail |
| `invoice.payment_failed` → assinatura `past_due` | Pro **continua** enquanto o Stripe tenta de novo (Smart Retries) | Faixa na Início e em Configurações › Plano: "Não conseguimos cobrar seu cartão. Atualize o pagamento para manter o Pro." + "Atualizar pagamento" (portal) |
| Tentativas esgotadas → `canceled`/`unpaid` | `expired`; `plan_grants.revoked_at` | Volta ao Free sem perder dados (Termos da Assinatura, "Quando o Pro termina") |

Renovação **não** reabre os 7 dias (o art. 49 do CDC fala da contratação). Quem reclamar de uma renovação usa "Falar com o suporte", e o Admin decide no painel.

### 2.3 Cancelar (pela própria pessoa)

Configurações › Plano → **"Cancelar assinatura"** → confirmação → Edge Function `billing-cancel`, que pergunta ao banco `withdrawal_window(subscription)`:

| Quando | Confirmação mostrada | O que acontece |
|---|---|---|
| **Até 7 dias da contratação** | "Você está dentro dos 7 dias para desistir. Vamos devolver R$ X ao seu cartão e o Pro termina agora." · Voltar · Cancelar e receber de volta (`ConfirmDialog` `balanced`) | Reembolso total de todos os pagamentos da assinatura → assinatura cancelada na hora (`prorate = false`) → Pro termina → toast "Assinatura cancelada. O valor volta ao seu cartão em até 10 dias úteis, conforme o banco." |
| **Depois de 7 dias** | "O Pro continua até 12 dez e não haverá nova cobrança." · Voltar · Cancelar assinatura | `cancel_at_period_end = true` no Stripe → Pro até o fim do período → Free. Botão "Reativar" até lá |

- **Configuração do portal do Stripe:** cancelamento **desligado** (só trocar cartão e ver faturas), para todo cancelamento passar pela regra dos 7 dias. Cancelar fica a um toque de onde se assina (Decreto 7.962/2013, art. 5º).
- **Se o pedido ao Stripe falhar** (queda, erro): o cancelamento fica `processing` e o job `retry-pending-refunds` (a cada 15 min) tenta de novo. Depois de 24 h sem sucesso, aparece em destaque no painel. A tela mostra "Recebemos seu cancelamento. Estamos processando o reembolso."
- **Cancelamento dentro dos 7 dias feito fora do app** (pela pessoa no banco, ou pelo Stripe por fraude): o webhook registra; reembolso, se faltar, é feito pelo Admin no painel.
- **Exclusão da conta com assinatura ativa:** a Edge Function `delete-account` passa pela mesma regra **antes** de apagar a conta: dentro dos 7 dias reembolsa e cancela; depois, cancela na hora (a conta deixa de existir, então não há período a usar) ⚖. Sem isso o Stripe continuaria cobrando quem já não tem conta (cobrança indevida, CDC, art. 42).

### 2.4 Falar com o suporte

- **Onde:** Configurações › Plano › "Falar com o suporte" e Configurações › Sobre (o mesmo componente). Também em Configurações › Privacidade, ao lado de "Outros pedidos sobre seus dados".
- **Formulário (folha):** assunto (lista: Pagamento ou reembolso · Minha conta · Problema no app · Outro), pagamento relacionado (aparece quando o assunto é pagamento; lista dos pagamentos da pessoa) e mensagem de até 1.000 caracteres. Aviso fixo: "Não escreva dados de cartão, documentos ou de saúde." → `createSupportRequest` (RPC com o token do usuário).
- **Depois de enviar:** "Pedido enviado. Respondemos em até 5 dias úteis." A seção "Seus pedidos" mostra cada pedido com a situação (Recebido · Respondido · Resolvido) e a resposta da equipe.
- **Resposta:** o colaborador responde no painel; a resposta aparece em "Seus pedidos" e chega como aviso dirigido no app (`notify_account_change`, comunicado de serviço). Não é conversa: um pedido, uma resposta; para continuar, a pessoa abre outro pedido (mantém o escopo do RIPD: nada de chat).
- **Pedidos de dados (LGPD)** continuam pelo e-mail do canal (`PRIVACY_CONTACT_EMAIL`), com o prazo próprio de 15 dias (`.lgpd/dsar/workflow.md`). Se um pedido de dados chegar pelo suporte, o colaborador marca "Pedido de dados" e segue o mesmo fluxo e prazo.
- **Pedido recebido por e-mail:** o colaborador registra no painel em nome da pessoa ("Registrar pedido recebido por e-mail"), com a data em que o e-mail chegou.

### 2.5 Reembolso e cancelamento pela equipe (no painel do Stripe)

**Quem:** você, na conta do Stripe (segundo fator obrigatório). O painel do guf **não** reembolsa nem cancela por enquanto.

**Passo a passo:**
1. O pedido chega por "Falar com o suporte" na tela **Suporte** do painel do guf.
2. No pedido de pagamento, o botão **"Abrir no Stripe"** leva direto ao pagamento daquela pessoa no painel do Stripe (link montado com o id da fatura de `billing_payments`; nenhum dado sai do guf).
3. No Stripe: **Reembolsar** (total ou parcial) e, se for o caso, **Cancelar assinatura** (agora ou no fim do período).
4. O webhook recebe o evento e o guf se atualiza sozinho (abaixo).
5. No painel do guf, você responde o pedido ("Reembolso feito, o valor volta ao seu cartão em até 10 dias úteis, conforme o banco") e fecha.

**O que o webhook faz com um reembolso feito no Stripe** (`charge.refunded`):
- registra em `billing_refunds` com origem `stripe_dashboard` e atualiza `billing_payments.refunded_cents` (entra no Carnê-Leão como valor devolvido);
- **reembolso total do período atual → encerra o Pro** (o dinheiro voltou, o acesso acaba) e cancela a assinatura se ela ainda estiver ativa, para não haver nova cobrança;
- **reembolso parcial → o Pro continua** até o fim do período (se quiser encerrar, cancele também no Stripe);
- avisa a pessoa no app (`notify_account_change`, comunicado de serviço) e grava a auditoria `refund_completed` (origem `stripe_dashboard`).

Cancelamento feito no painel do Stripe chega como `customer.subscription.updated`/`deleted` e segue a tabela da seção 3.

**Casos para lembrar** (ficam como texto de apoio na tela Suporte do painel):

| Caso | Sugestão |
|---|---|
| Cobrança depois de cancelar, cobrança duplicada | Reembolso total. Sem engano justificável, o CDC manda devolver o **dobro** (art. 42, parágrafo único); o Stripe só devolve até o valor pago, então a outra metade sai por Pix seu ou como Pro grátis equivalente (`grant_plan`), anotado na resposta ⚖ |
| App fora do ar, Pro não liberado | Total ou proporcional |
| Conta de menor identificada (ECA Digital; contrato de menor é anulável) | Total + exclusão da conta pelo fluxo normal |
| Exclusão da conta pelo guf por violação dos Termos ⚖ | Proporcional ao período não usado |
| Contestação aberta no cartão | **Não reembolsar** (o banco já devolve se a pessoa ganhar; reembolsar também pagaria duas vezes) |

**Prazo do guf:** responder pedido de suporte em até **5 dias úteis** (prazo do guf, não da lei). Pedido sem resposta há mais de 3 dias úteis aparece como "Atrasado".

**Custos a saber:** a taxa do Stripe da venda **não volta** no reembolso; contestação no cartão tem taxa própria e conta contra a conta. Reembolso rápido é mais barato que contestação.

### 2.6 Contestação no cartão (chargeback)

`charge.dispute.created` → assinatura cancelada na hora (evita nova cobrança a quem contestou), Pro termina, a conta mostra "Contestação aberta" no painel (só leitura: a resposta é dada no painel do Stripe, com o aceite registrado em `consent_records` como prova). `charge.dispute.closed` atualiza o resultado.

### 2.7 Suspensão pelo painel

Suspender a conta **não** mexe na assinatura (a suspensão pode ser revertida). O diálogo de suspender por prazo indeterminado lembra: "A assinatura continua sendo cobrada. Cancele a assinatura se a suspensão não for revertida." Excluir a conta segue 2.3.

---

## 3. Efeito no app (situação → tela)

| Situação no banco | Plano efetivo | Configurações › Plano | Outras telas |
|---|---|---|---|
| Sem assinatura | Free | "Conhecer o Pro" · Falar com o suporte | Portões do Pro como hoje |
| `active`, até 7 dias da contratação | Pro | "Pro · renova em 12 dez" · **Cancelar assinatura** ("Você ainda pode desistir e receber o valor de volta até 5 nov") · Atualizar pagamento · Pagamentos · Falar com o suporte | Sem portões; selo Pro no seu perfil |
| `active`, depois de 7 dias | Pro | "Pro · renova em 12 dez" · Cancelar assinatura · Atualizar pagamento · Pagamentos · Falar com o suporte | Igual |
| `active` + `cancel_at_period_end` | Pro até o fim | "Cancelada · Pro até 12 dez" · Reativar | Faixa discreta nos 3 últimos dias |
| `past_due` | Pro | Faixa de aviso + Atualizar pagamento | Faixa na Início |
| Cancelamento em processamento | Free | "Recebemos seu cancelamento. Estamos processando o reembolso." | — |
| `expired` / reembolsada / contestada | Free | "Conhecer o Pro" · histórico de pagamentos (com "Reembolsado R$ X em 30 out") | Volta aos limites do Free; nada é apagado (quem passou do limite mantém o que tem) |
| Retorno do checkout sem webhook ainda | Free (por enquanto) | "Confirmando pagamento…" | — |

Depois de qualquer mudança, `invalidateQueries([PLANS_KEY])` (e a cópia `entitlements:<user>` no aparelho). Offline: o plano vem da cópia; cancelar, pagar e falar com o suporte ficam indisponíveis ("Conecte-se à internet para gerenciar sua assinatura").

---

## 4. Banco (migrations)

### 4.1 Tabelas novas

| Tabela | Colunas principais | Leitura pelo app | Retenção |
|---|---|---|---|
| `plan_prices` | `id`, `plan_code`, `provider`, `price_ref` (id do Price no Stripe), `interval` (`month`/`year`), `amount_cents`, `currency`, `is_active` | Pública (tela de planos mostra o preço) | Catálogo |
| `billing_customers` | `user_id` (PK, cascata), `provider`, `customer_ref` (único) | Não | Enquanto a conta existir |
| `billing_payments` | `id`, `user_id` (**set null** na exclusão), `subscription_id` (set null), `provider`, `provider_ref` (fatura, único), `amount_cents`, `currency`, `paid_at`, `refunded_cents`, `status` (`paid`, `refunded`, `partially_refunded`, `disputed`) | Só o dono | **5 anos** após o pagamento (obrigação fiscal; CTN, arts. 173 e 195, parágrafo único ⚖) — sem e-mail, sem cartão |
| `billing_refunds` | `id`, `payment_id`, `user_id` (set null), `origin` (`withdrawal` = cancelamento em 7 dias, `account_deletion`, `stripe_dashboard` = feito por você no Stripe; `staff` reservado para o futuro), `amount_cents`, `status` (`processing`, `refunded`, `failed`), `provider_refund_ref`, `created_at` | Só o dono | **5 anos** (prova em reclamação de consumidor; CDC, art. 27 ⚖) |
| `support_requests` | `id`, `user_id` (set null), `topic` (`billing`, `account`, `app_issue`, `other`), `payment_id` (opcional), `message` (≤ 1000), `source` (`app`, `staff_email`), `received_at`, `status` (`open`, `answered`, `closed`), `is_data_request`, `reply` (≤ 1000), `replied_by`, `replied_at` | Só o dono (sem `replied_by`) | Registro (assunto, datas, situação) **5 anos**; **texto da mensagem e da resposta: 180 dias** após fechar (minimização) |
| `billing_events` | `provider`, `event_id` (único), `type`, `received_at`, `processed_at`, `error_code` | Não | **90 dias** (só idempotência e diagnóstico; **sem o corpo do evento**) |

`subscriptions` ganha `started_at` (1º pagamento), `cancel_at_period_end boolean` e `canceled_at timestamptz`. O `check` de `status` já tem `canceled` e `expired`; `unpaid` do Stripe vira `expired`.

**Por que `set null` e não cascata nos pagamentos:** a exclusão da conta apaga a pessoa, mas o registro do dinheiro recebido e devolvido precisa ficar para o imposto e para uma eventual reclamação. Sem `user_id` nem e-mail, sobra só valor, data e id da fatura (o Stripe guarda o resto pelo prazo dele, como controlador das obrigações dele).

### 4.2 Funções

| Função | Quem chama | O que faz |
|---|---|---|
| `apply_subscription_event(...)` | webhook (service_role) | **Nova versão** com `p_cancel_at_period_end` e `p_started_at` (mantém a antiga funcionando até o app novo) |
| `record_billing_payment(...)` | webhook | Grava ou atualiza o pagamento (idempotente por `provider_ref`) |
| `withdrawal_window(p_subscription_id)` | interna e `my_billing` | **Regra única dos 7 dias**: `within` (bool), `ends_at`, valor a devolver |
| `begin_cancellation(p_subscription_id)` | Edge `billing-cancel` com o token do usuário | Confere que a assinatura é do usuário; decide pelos 7 dias; cria o `billing_refunds` (`withdrawal`, `processing`) quando houver; audita |
| `mark_refund_result(p_refund_id, p_status, p_provider_ref)` | Edge e webhook (service_role) | Avança o reembolso; encerra o Pro quando pedido |
| `my_billing()` | app | Assinatura, janela dos 7 dias, pagamentos e reembolsos do próprio usuário |
| `create_support_request(p_topic, p_payment_id, p_message)` | app | Grava o pedido (no máximo 5 abertos por pessoa, contra abuso); audita sem o texto |
| `my_support_requests()` | app | Pedidos e respostas do próprio usuário |
| `admin_list_support_requests(p_status, p_topic, p_limit, p_offset)` | painel (Suporte+) | Fila com conta mascarada, assunto, prazo e "Atrasado" |
| `admin_reply_support_request(p_id, p_reply, p_close, p_is_data_request)` | painel (Suporte+) | Responde, avisa a pessoa no app (`notify_account_change`), audita sem o texto |
| `admin_register_support_request(p_user_id, p_topic, p_payment_id, p_message, p_received_at)` | painel (Suporte+) | Pedido recebido por e-mail |
| `admin_account_billing(p_user_id)` | painel (Suporte+) | Assinatura, pagamentos (com o id da fatura para o "Abrir no Stripe"), reembolsos e pedidos de uma conta (sem cartão, sem e-mail completo); só leitura |
| `retry_pending_refunds()` | pg_cron, a cada 15 min | Reenvia os `processing` sem resposta (pela Edge Function) |
| `purge_expired_billing()` | pg_cron, diário | `billing_events` > 90 dias; textos de `support_requests` 180 dias após fechar; pagamentos, reembolsos e pedidos > 5 anos |

Novos códigos de erro: `GB001` pagamento ou assinatura não encontrado ou de outra pessoa → `payment_not_found`; `GB002` cancelamento já em andamento → `cancellation_in_progress`; `GB004` assinatura já ativa → `subscription_already_active`; `GB005` muitos pedidos abertos → `support_request_limit`. `billing_unavailable` continua para "venda desligada".

Auditoria (`audit_log_append`, incluir no `check` por migration; sem e-mail, valor ou texto de mensagem nos detalhes): `subscription_started`, `subscription_canceled`, `subscription_withdrawn` (cancelamento em 7 dias), `subscription_expired`, `refund_completed`, `refund_failed`, `payment_disputed`, `support_request_created`, `staff_support_replied`, `staff_support_registered`. As do painel saem com `actor_type = 'staff'`, como as demais `admin_*`. Reembolsos e cancelamentos feitos no painel do Stripe entram pelo webhook com a origem `stripe_dashboard` (o histórico de quem fez fica no próprio Stripe).

---

## 5. Edge Functions e arquitetura (SOLID)

```
supabase/functions/
├── _shared/http.ts                      # CORS e respostas JSON
├── _shared/billing/
│   ├── provider.ts                      # contrato BillingProvider (interfaces separadas: Checkout, Subscription, Payment, Portal, Webhook) + tipos normalizados
│   ├── registry.ts                      # BILLING_PROVIDERS: gateway novo = uma entrada; BILLING_PROVIDER escolhe o das vendas novas
│   ├── providers/stripe/                # ÚNICA pasta que conhece o Stripe
│   │   ├── stripe-client.ts             # REST com fetch, versão fixa, chave de idempotência
│   │   ├── stripe-webhook.ts            # assinatura HMAC-SHA256 (Web Crypto), tolerância de 5 min
│   │   └── stripe-provider.ts           # adaptador: situação do Stripe → guf, eventos → BillingEvent
│   ├── store.ts                         # BillingStore (interface) + implementação Supabase (só RPCs)
│   ├── subscription-sync.ts             # relê a assinatura no gateway e espelha (único caminho do Pro pago)
│   ├── payments.ts                      # pagamento, reembolso (inclusive feito no painel do Stripe) e contestação
│   ├── cancellation.ts                  # cancelar pela regra dos 7 dias, reativar, exclusão da conta
│   └── event-handlers.ts                # BILLING_EVENT_HANDLERS: um por tipo normalizado
├── billing/                             # ações do app: checkout · cancel · reactivate · portal
└── billing-webhook/                     # --no-verify-jwt; ?provider=stripe
```

**Mudança em relação ao plano:** uma Edge Function `billing` com ações (cada ação num arquivo: `checkout.ts`, `manage.ts`) no lugar de três funções (`billing-checkout`, `billing-portal`, `billing-cancel`): um deploy, um CORS, a mesma separação por responsabilidade.

O suporte (2.4) não precisa de Edge Function: são RPCs com RLS, como o resto do app.

- **S (responsabilidade única):** cada Edge Function faz um fluxo; validar sessão e CORS reaproveita o `http.ts` que as outras já usam; a regra dos 7 dias está só no banco.
- **O (aberto/fechado):** evento novo = uma entrada em `BILLING_EVENT_HANDLERS`; gateway novo = um adaptador; plano ou preço novo = migration em `plan_prices`; assunto novo do suporte = um valor no `check` + rótulo em `SUPPORT_TOPICS` (core).
- **L (substituição):** qualquer adaptador devolve os mesmos `BillingEvent` normalizados; os handlers não testam "é Stripe?".
- **I (segregação):** o app vê `BillingApi` e `SupportApi`; o painel vê `AdminBillingApi` (só leitura) e `AdminSupportApi` em `@guf/api/admin`; nenhum deles vê o gateway.
- **D (inversão):** as funções recebem um `BillingProvider`; nos testes, um provedor falso.

**Contratos (`packages/api`)** — `(client, input) => Promise<{ data, error }>`, mocks com a mesma assinatura e `?estado=`:

| App | Painel |
|---|---|
| `BillingApi`: `startSubscription` (já existe em `PlansApi`; passa a chamar `billing-checkout`), `cancelSubscription`, `reactivateSubscription`, `openBillingPortal`, `getMyBilling` | `AdminBillingApi`: `getAccountBilling` (só leitura) |
| `SupportApi`: `createSupportRequest`, `listMySupportRequests` | `AdminSupportApi`: `listSupportRequests`, `replySupportRequest`, `registerSupportRequest` |

**App:**
- `features/plans`: `useStartSubscription`, `useCancelSubscription`, `useBillingPortal`, `useMyBilling`; componentes `SubscriptionStatusCard`, `CancelSubscriptionDialog` (texto muda pelos 7 dias), `PaymentHistoryList`, `CheckoutConfirmingScreen`.
- `features/support` (nova): `SupportRequestSheet`, `SupportRequestList`, `useSupportRequests`; o botão `SupportEntry` é exportado pelo barrel e composto em `app/` nas telas de Plano, Sobre e Privacidade.
- Textos e formatações em `packages/core/src/billing.ts` (`subscriptionStatusLabel`, `withdrawalNotice`, `refundStatusLabel`, `formatMoney`) e `packages/core/src/support.ts` (`SUPPORT_TOPICS`, `SUPPORT_MESSAGE_MAX_CHARS`, `supportStatusLabel`); validação em `packages/schemas/src/support.ts`.
- Mocks `?estado=assinante`, `assinante-7dias`, `cancelada`, `atraso`, `reembolsando`, `reembolsada`, `confirmando`, `suporte-respondido`.

**Painel:**
- `apps/admin/features/support` (nova): tela **Suporte** (fila: Atrasados → Abertos → Respondidos; filtros por assunto; `ReplySupportDialog`; "Registrar pedido recebido por e-mail"; atalhos do vocabulário do painel: `↑↓`, `Enter` abrir, `N` registrar).
- `apps/admin/features/billing` (nova): seção **Assinatura e pagamentos** no detalhe da conta, **só leitura**, com "Abrir no Stripe" em cada pagamento (o mesmo botão aparece no pedido de suporte de pagamento). Nenhuma ação que mexa em dinheiro.
- Permissões em `STAFF_PERMISSIONS` (igual ao banco): Leitura vê as filas sem valores por pessoa; Suporte e Admin respondem e registram pedidos (`answer_support`). Abrir no Stripe só funciona para quem tem login no Stripe.

**Segredos (Supabase secrets, nunca no front):** `STRIPE_SECRET_KEY` (**chave restrita** só com Checkout, Customers, Subscriptions, Billing Portal e Refunds — reembolso usado só pelo cancelamento em 7 dias e pela exclusão da conta), `STRIPE_WEBHOOK_SECRET`, `APP_URL`, `ALLOWED_ORIGINS`. Logs das funções sem e-mail, sem corpo do evento e sem texto de pedido (só tipo e id do evento).

**Hospedagem:** antes da primeira cobrança, sair do Vercel Hobby (uso comercial fora do contrato) para Cloudflare Pages (gratuito), recriando os cabeçalhos em `_headers`.

---

## 6. LGPD

### 6.1 Atividade nova: A024 — Pagamentos, assinaturas, reembolsos e suporte

| Campo | Valor |
|---|---|
| Finalidade | Cobrar a assinatura do Pro, liberar e encerrar o acesso, devolver valores (desistência em 7 dias automática; demais pelo painel), atender pedidos de suporte, cumprir obrigação fiscal |
| Base legal | Assinatura, pagamento, reembolso e suporte: **Art. 7º, V** (execução de contrato a pedido do titular); registros de pagamento por 5 anos: **Art. 7º, II** (obrigação legal fiscal ⚖); prova de aceite, reembolso e atendimento: **Art. 7º, VI** (exercício regular de direitos) |
| Dados no guf | id do Customer, situação e datas da assinatura, valor/data/situação de cada pagamento e reembolso, pedidos de suporte (assunto, mensagem e resposta de até 1.000 caracteres) |
| Dados enviados ao Stripe | `user_id` (pseudônimo, em metadata) e o e-mail da conta para o recibo. **Nunca**: nome, @, treinos, medidas, observações, pedidos de suporte ou qualquer dado de uso |
| Dados que o titular dá direto ao Stripe | Cartão ou Pix, nome no cartão, endereço de cobrança se pedido. **O guf não recebe nem guarda** (nem os 4 últimos dígitos) |
| Operador | Stripe (ficha `.lgpd/vendors/stripe.md`) — operador no processamento; **controlador independente** para prevenção a fraude e obrigações legais dele ⚖ |
| Transferência internacional | Sim (EUA e Irlanda); Art. 33 — DPA do Stripe com cláusulas-padrão próprias; cláusulas-padrão brasileiras (Res. CD/ANPD nº 19/2024) não assinadas: mesmo risco R3 |
| Sensíveis | Não. A mensagem livre pode conter dado sensível escrito pela pessoa: aviso na tela + eliminação do texto em 180 dias após fechar |
| Alto risco? | Não (Res. CD/ANPD nº 2/2022, art. 4º: sem larga escala, sem decisão automatizada que afete direitos — o automático só **concede** o reembolso da desistência; qualquer recusa é humana) |
| Quem da equipe vê | Suporte e Admin: pedidos de suporte e pagamentos (valor, data, situação). Nunca dados de cartão |
| Direitos do titular | Exportar (`export_my_data` → `guf-export/8` com assinatura, pagamentos, reembolsos e pedidos de suporte); excluir conta (cancela no Stripe; pagamentos e reembolsos ficam sem identificação por 5 anos); faturas pelo portal do Stripe |

### 6.2 Documentos (nova versão antes da primeira cobrança) ⏸ CHECKPOINT

| Documento | Mudança | Novo aceite? |
|---|---|---|
| **Termos da Assinatura 1.1** | Preço e periodicidade (da tela, por `plan_prices`), Stripe como prestador, Pix/cartão, renovação, falha de pagamento, **cancelar pelo app: em até 7 dias da contratação devolve tudo e o Pro termina na hora; depois, vale até o fim do período**, outros pedidos por "Falar com o suporte" com resposta em até 5 dias úteis, cobrança indevida, contestação, exclusão da conta cancela a assinatura. **Sem CPF e endereço** (decisão R9) e **sem afirmar conformidade com o Decreto 7.962/2013** | Sim, por quem assinar (aceito no checkout) |
| **Política 1.5** | Stripe entre os prestadores (países, dados enviados, papel), dados de pagamento e de suporte guardados e prazos (5 anos sem identificação; textos do suporte 180 dias), base legal fiscal, quem da equipe vê | `requires_reaccept = false` ⚖: só muda para quem assinar ou usar o suporte, e a caixa da assinatura mostra o link da Política |
| **Termos de Uso** | Sem mudança (já remetem aos Termos da Assinatura) | — |

Hash pelo `pnpm --filter @guf/core legal:hashes`; publicar o app **antes** de aplicar a migration dos documentos (mesma regra das versões anteriores).

### 6.3 Riscos novos

| # | Risco | Como o plano reduz |
|---|---|---|
| R9 | Venda sem identificação (decisão do controlador) | Seção 5 de `lgpd-riscos-e-lancamento.md`: aceite antes, cancelamento fácil, devolução automática em 7 dias, suporte por escrito |
| R10 | Vazamento da chave secreta do Stripe | Chave restrita, só em secrets, MFA na conta do Stripe, troca imediata pelo runbook de incidente |
| R11 | Webhook falso liberando Pro | Assinatura do evento conferida; idempotência por `event_id`; o app nunca concede Pro sozinho |
| R12 | Cobrança depois da exclusão da conta | `delete-account` cancela no Stripe antes; job diário confere assinaturas ativas sem conta e cancela |
| R13 | Devolução dos 7 dias parada | Automática + reenvio a cada 15 min + destaque no painel depois de 24 h |
| R15 | Reembolso feito no Stripe sem resposta ao pedido | O pedido só fecha quando respondido; "Atrasado" no painel |
| R14 | Pedido de suporte sem resposta (reclamação no Procon) | Prazo de 5 dias úteis na tela, "Atrasado" no painel; pedido de dados segue o prazo da LGPD |

---

## 7. Testes

- **Modo de teste do Stripe** com a CLI (`stripe listen --forward-to <url da função>`) e `stripe trigger` para cada evento da seção 2.
- **Test clocks** do Stripe para renovação, falha de pagamento e fim do período sem esperar um mês.
- **Banco** (`npx supabase db query --linked` em `begin … rollback`, como usuário): `withdrawal_window` no dia 0, 7 e 8 da contratação; renovação não reabre a janela; cancelar assinatura de outra pessoa (GB001); cancelar duas vezes (GB002); exclusão da conta com pagamento (vira `user_id` nulo, valor fica); 6º pedido de suporte aberto (GB005).
- **Idempotência:** o mesmo evento enviado duas vezes não duplica pagamento, reembolso nem auditoria.
- **Painel:** Leitura não vê valores por pessoa; Suporte e Admin respondem; nenhuma tela do painel mexe em dinheiro.
- **Reembolso feito no painel do Stripe** (modo de teste): total encerra o Pro e cancela a assinatura; parcial mantém o Pro; o aviso chega ao app.
- **App:** todos os `?estado=` da seção 5; checkout cancelado volta para `/planos` sem mudar nada.

---

## 8. Pendências antes de cobrar

1. ~~Aprovar a biblioteca `npm:stripe`~~ — decidido: API REST sem biblioteca (D11).
2. Criar a conta Stripe no CPF e conferir: aceita pessoa física; Pix em assinatura recorrente; prazo de reembolso por Pix; portal com cancelamento desligado; **alertas por e-mail de reembolso e contestação ligados**.
3. Aceitar o DPA do Stripe e arquivar em `.lgpd/vendors/` (G33).
4. MFA na conta do Stripe.
5. Definir preço(s) e periodicidade.
6. ⏸ Aprovar os textos dos Termos da Assinatura 1.1 e da Política 1.5.
7. Hospedagem com uso comercial.

---

## 9. Fases de implementação (cada uma numa branch a partir da `main`)

| Fase | Entrega | Pronto quando |
|---|---|---|
| 1 | Migrations (tabelas, funções, auditoria, jobs) + tipos + `packages/core` (`billing.ts`, `support.ts`) + schemas + contratos e mocks | Testes de banco da seção 7 passam |
| 2 | `_shared/billing` + `billing-webhook` | Eventos do `stripe trigger` mudam o plano no banco, sem duplicar |
| 3 | `billing-checkout` + `billing-portal` + `billing-cancel` + telas de Plano no app | Assinar, cancelar em 7 dias (com devolução) e depois (até o fim do período) no modo de teste |
| 4 | Suporte no app (`features/support`) e no painel (tela Suporte) | Pedido enviado no app aparece no painel; resposta volta ao app |
| 5 | Painel: Assinatura e pagamentos (só leitura) com "Abrir no Stripe", permissões, `retry_pending_refunds` | Reembolso feito no Stripe aparece no painel e no app; Leitura limitada |
| 6 | `delete-account` cancelando no Stripe + exportação `guf-export/8` + documentos 1.1/1.5 + `CLAUDE.md`, `plans-and-access.md`, `business-rules.md`, `admin-panel.md` | Checkpoint dos textos aprovado |
| 7 | Hospedagem comercial, chaves de produção, webhook de produção, primeira venda real cancelada em 7 dias pelo próprio fluxo | Uma compra real devolvida pelo botão do app |

---

## 10. Futuro: tudo pelo guf

Decisão de 30/10/2026: **por agora, a segurança fica com o Stripe** (checkout, portal e reembolso manual na tela dele). Mais tarde, tudo pode passar pelo guf. A arquitetura acima já prepara isso:

| Futuro | O que entra | O que já está pronto |
|---|---|---|
| Reembolso e cancelamento pelo painel do guf | Edge Function `admin-billing-refund`, `admin_begin_refund` e `admin_cancel_subscription` (Admin + segundo fator + nota + "CONFIRMAR" + auditoria `staff_refund_issued`/`staff_subscription_canceled`), `RefundDialog`, ações `issueRefund`/`cancelSubscription` em `ACCOUNT_ACTIONS`, permissão `manage_billing`, limite diário de reembolsos | `billing_refunds` já tem a origem `staff` reservada; o webhook já trata o reembolso igual venha de onde vier |
| Pagamento no próprio app (formulário de cartão embutido) | Stripe.js no front (biblioteca nova, aprovar), CSP, controle dos scripts da página de pagamento (PCI DSS 4.0) | `BillingProvider` isola o Stripe; `startSubscription` continua o mesmo contrato |
| App nativo (Apple e Google) | Adaptadores novos no `BillingProvider` | `subscriptions.provider` já aceita `apple` e `google` |

**Antes de mover o reembolso para o guf:** revisar o RIPD/A024 (a equipe passa a mexer em dinheiro), limitar valores e quantidade por dia, e só dar o papel a quem precisa.


---

## 11. O que foi implementado e como ligar

### 11.1 Proteções contra burla

| Tentativa | Por que não funciona |
|---|---|
| Voltar do checkout com `?assinatura=confirmando` sem pagar | A tela só espera; o Pro nasce só pelo webhook assinado |
| Webhook falso ou reenviado | Assinatura HMAC do Stripe conferida em tempo constante, evento com mais de 5 min recusado; idempotência por id do evento (`billing_events`) |
| Evento verdadeiro fora de ordem | O webhook relê a assinatura, a fatura ou a cobrança na API do Stripe antes de gravar: vale o estado de agora, não o do evento |
| Metadados alterados (outro `user_id`, outro plano) | O dono vem do cliente criado pelo guf (`billing_customers`) e o plano vem do preço cadastrado (`plan_prices`); metadados não são lidos |
| Preço diferente do mostrado | Antes do checkout, o preço do banco é comparado com o do Stripe (valor, moeda, periodicidade, ativo); diferente = venda recusada |
| Cancelar a assinatura de outra pessoa | A Edge Function pega a pessoa pelo token; o banco confere o dono (GB001, mesma resposta para "não existe") |
| Duas abas, dois pagamentos | Páginas de pagamento abertas são encerradas antes de criar outra; se mesmo assim nascer uma 2ª assinatura, ela é cancelada e devolvida na hora (índice único de assinatura viva por pessoa) |
| Devolução em dobro (tocar duas vezes, falha de rede) | Cada devolução tem uma linha em `billing_refunds` e o id dela é a chave de idempotência no Stripe; repetir retoma, não duplica |
| Desistir depois de 7 dias com devolução | A regra está só no banco (`withdrawal_window`, a partir do 1º pagamento); renovação não reabre |
| Assinar sem aceitar os Termos da Assinatura | A Edge Function grava o aceite com o token da pessoa e confere `pending_subscription_documents()` vazio antes de abrir o pagamento |
| Conta suspensa assinando | O aceite passa pelo middleware do PostgREST (GU001) |
| Redirecionamento para site falso | `success_url`, `cancel_url` e `return_url` vêm do secret `APP_URL`, nunca do pedido; o app só segue endereços `https` |
| Pro pago para sempre se um evento se perder | O direito vence sozinho: fim do período + 1 dia (14 dias em atraso de pagamento) |
| App ou painel gravando assinatura | Funções `billing_*` só para `service_role`; `apply_subscription_event` (versão antiga, sem conferir preço nem dono) teve a execução revogada |

### 11.2 Banco (`20261030120000_billing_stripe.sql`)

Tabelas `plan_prices` (leitura pública dos ativos), `billing_customers`, `billing_payments`, `billing_refunds`, `billing_events`; `subscriptions` ganhou `started_at`, `cancel_at_period_end`, `canceled_at`. Funções `withdrawal_window`, `billing_event_begin/finish`, `billing_checkout_context`, `billing_link_customer`, `billing_sync_subscription`, `billing_record_payment`, `billing_begin_cancellation`, `billing_mark_refund`, `billing_record_refunds`, `billing_record_dispute`, `billing_live_subscriptions`, `purge_expired_billing` (job `purge-expired-billing`, 03:41 UTC) e `my_billing()` (app). Auditoria: `subscription_started`, `subscription_canceled`, `subscription_reactivated`, `subscription_withdrawn`, `refund_completed`, `refund_failed`, `payment_disputed`, `billing_purged`.

Testada em 30/10/2026 no banco remoto dentro de uma transação desfeita (32 verificações: dono, preço desconhecido, duplicada, idempotência, 7 dias no dia 0 e no dia 8, retomada da devolução, reembolso pelo painel do Stripe, contestação, permissões e cadeia da auditoria).

### 11.3 App

- `packages/core/src/billing.ts`: tipos, `subscriptionViewOf`, `formatMoney`, `formatPlanPrice`, textos de situação, confirmação e resultado.
- `packages/api/src/billing.ts` (`BillingApi`): `getPlanPrices`, `getMyBilling`, `cancelSubscription`, `reactivateSubscription`, `openBillingPortal`; `startSubscription` (`PlansApi`) agora devolve `{ checkoutUrl }`. Erros novos: `billing_provider_error`, `subscription_not_found`, `subscription_already_active`, `subscription_documents_outdated`.
- `features/plans`: preço na oferta e na barra `SubscribeBar` (também na tela do Pro), `SubscriptionManageList` (cancelar com a confirmação que muda pelos 7 dias, reativar, pagamento e recibos, concluir devolução), `PaymentHistory`, espera do pagamento na volta do checkout (`useCheckoutConfirmation`).
- Mocks: `/planos?estado=` `assinante-7dias` · `assinante` · `cancelada` · `atraso` · `reembolsando` · `reembolsada` (junte `,pro` para o plano Pro).

### 11.4 Como ligar (modo de teste primeiro)

1. **Aplicar a migration:** `npx supabase db push` e regenerar os tipos (`gen types`, regra 6 do `CLAUDE.md`).
2. **Stripe (modo de teste):** criar o produto "guf Pro" e um preço mensal recorrente em BRL; no portal do cliente (Settings › Billing › Customer portal), **desligar o cancelamento** e deixar só trocar forma de pagamento e ver faturas; salvar o id da configuração se não for a padrão.
3. **Chave restrita** (Developers › API keys › Create restricted key), com escrita em: Checkout Sessions, Customers, Subscriptions, Refunds, Customer portal; leitura em Prices, Invoices, Charges.
4. **Webhook** (Developers › Webhooks): endpoint `https://<ref>.supabase.co/functions/v1/billing-webhook?provider=stripe`, eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.refund.updated`, `refund.updated`, `charge.dispute.created`.
5. **Secrets:**
   ```
   npx supabase secrets set STRIPE_SECRET_KEY=rk_test_... STRIPE_WEBHOOK_SECRET=whsec_... APP_URL=https://<app>
   # opcional: STRIPE_PORTAL_CONFIGURATION=bpc_...  BILLING_PROVIDER=stripe
   ```
6. **Deploy:** `npx supabase functions deploy billing --use-api` · `npx supabase functions deploy billing-webhook --no-verify-jwt --use-api` · `npx supabase functions deploy delete-account --use-api`.
7. **Ligar a venda** (só depois dos textos da seção 6.2 publicados):
   ```sql
   insert into public.plan_prices (plan_code, provider, price_ref, billing_interval, amount_cents, currency)
   values ('pro', 'stripe', 'price_...', 'month', 1990, 'brl');
   ```
   Desligar: `update public.plan_prices set is_active = false where price_ref = 'price_...';` (quem já assinou continua reconhecido).
8. **Testar** com o cartão `4242 4242 4242 4242`: assinar, ver o Pro, cancelar no mesmo dia (devolução), assinar de novo e reembolsar pelo painel do Stripe (Pro encerra e aviso no app).

### 11.5 Ainda falta antes de vender de verdade

- ⏸ Termos da Assinatura 1.1 e Política 1.5 (seção 6.2): **escritos** em `packages/core/src/legal-content.ts`, migration `20261031135255_legal_docs_subscription_stripe` (não aplicada; aplicar depois de o app com os textos estar no ar). Diferenças do plano: sem "Falar com o suporte" no app (fase 4 não feita), pedidos de cobrança pelo e-mail do canal em até 5 dias úteis; sem reenvio automático de devoluções, o texto descreve o botão "Concluir devolução"; sem Pix (só as formas mostradas na página do Stripe). Falta aprovar o texto.
- **Exclusão pelo painel cancela a assinatura** (migration `20261031140000_account_deletion_cancels_subscription` + Edge Function `admin-delete-account`): o banco recusa excluir conta com assinatura viva (GA023); excluir agora e as exclusões agendadas passam pela função, que cancela com a regra da exclusão pelo app (7 dias: devolve tudo; depois, encerra sem devolver o restante). Cobrança indevida: devolve só o valor indevido (decisão do controlador, 31/10/2026; o CDC, art. 42, parágrafo único, prevê o dobro salvo engano justificável ⚖).
- Exportação (`export_my_data` → `guf-export/8` com pagamentos e devoluções).
- Reenvio automático de devoluções sem resposta (`retry_pending_refunds`); hoje a pessoa toca em "Concluir devolução" e a exclusão da conta não prossegue sem resposta do Stripe.
- Fases 4 e 5 (suporte e painel) e a seção 8 (conta, DPA, MFA, hospedagem).
