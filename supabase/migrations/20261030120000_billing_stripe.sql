-- =====================================================================
-- GUF APP · Assinatura paga (Stripe hoje, qualquer gateway depois)
-- Plano: docs/stripe-payments-plan.md (§ 2 a 4).
--
-- Princípios:
--   * O banco não conhece o Stripe: guarda referências opacas (`*_ref`) e um `provider`.
--   * Só o servidor grava (Edge Functions com service_role). O app lê `my_billing()` e `plan_prices`.
--   * O plano vem do PREÇO cadastrado aqui (plan_prices), nunca de metadados enviados pelo gateway
--     ou pelo app; o dono vem do CLIENTE criado pelo guf (billing_customers).
--   * A regra dos 7 dias (CDC, art. 49) mora só aqui: withdrawal_window.
-- Erros: GB000 venda indisponível · GB001 assinatura não encontrada (ou de outra pessoa) ·
--        GB004 já existe assinatura ativa.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Preços à venda (catálogo; escrita só por migration ou SQL do controlador)
-- ---------------------------------------------------------------------
create table public.plan_prices (
  id               uuid primary key default gen_random_uuid(),
  plan_code        text not null references public.plans (code) on update cascade,
  provider         text not null check (provider in ('stripe', 'mercadopago', 'apple', 'google')),
  price_ref        text not null check (char_length(price_ref) between 1 and 200),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  amount_cents     integer not null check (amount_cents > 0),
  currency         text not null default 'brl' check (currency ~ '^[a-z]{3}$'),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (provider, price_ref)
);

-- Um preço à venda por plano, gateway e periodicidade (trocar preço = desativar o antigo e inserir o novo;
-- quem assinou pelo antigo continua reconhecido, porque a busca do plano não olha is_active).
create unique index plan_prices_one_active_idx on public.plan_prices (plan_code, provider, billing_interval) where is_active;

alter table public.plan_prices enable row level security;
create policy plan_prices_read_active on public.plan_prices
  for select to anon, authenticated using (is_active);

-- ---------------------------------------------------------------------
-- 2. Cliente no gateway (sem acesso pelo app)
-- ---------------------------------------------------------------------
create table public.billing_customers (
  user_id      uuid not null references auth.users (id) on delete cascade,
  provider     text not null check (provider in ('stripe', 'mercadopago', 'apple', 'google')),
  customer_ref text not null check (char_length(customer_ref) between 1 and 200),
  created_at   timestamptz not null default now(),
  primary key (user_id, provider),
  unique (provider, customer_ref)
);

alter table public.billing_customers enable row level security;

-- ---------------------------------------------------------------------
-- 3. Assinaturas: datas do cancelamento e da contratação
-- ---------------------------------------------------------------------
alter table public.subscriptions
  add column started_at           timestamptz,   -- 1º pagamento confirmado: daqui contam os 7 dias
  add column cancel_at_period_end boolean not null default false,
  add column canceled_at          timestamptz;

-- No máximo uma assinatura viva por pessoa: a 2ª cobrança seria indevida (CDC, art. 42).
create unique index subscriptions_one_live_per_user_idx on public.subscriptions (user_id)
  where status in ('trialing', 'active', 'past_due');

-- ---------------------------------------------------------------------
-- 4. Pagamentos e reembolsos (5 anos, sem identificação depois da exclusão da conta)
-- ---------------------------------------------------------------------
create table public.billing_payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  provider        text not null check (provider in ('stripe', 'mercadopago', 'apple', 'google')),
  provider_ref    text not null check (char_length(provider_ref) between 1 and 200),  -- fatura
  payment_ref     text check (payment_ref is null or char_length(payment_ref) between 1 and 200), -- o que se reembolsa
  amount_cents    integer not null check (amount_cents >= 0),
  refunded_cents  integer not null default 0,
  currency        text not null check (currency ~ '^[a-z]{3}$'),
  status          text not null default 'paid' check (status in ('paid', 'partially_refunded', 'refunded', 'disputed')),
  paid_at         timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (provider, provider_ref),
  check (refunded_cents between 0 and amount_cents)
);

create index billing_payments_user_idx on public.billing_payments (user_id);
create index billing_payments_subscription_idx on public.billing_payments (subscription_id);

create trigger billing_payments_updated_at before update on public.billing_payments
  for each row execute function public.set_updated_at();

create table public.billing_refunds (
  id                  uuid primary key default gen_random_uuid(),
  payment_id          uuid not null references public.billing_payments (id) on delete cascade,
  user_id             uuid references auth.users (id) on delete set null,
  -- withdrawal = cancelar em 7 dias pelo app · account_deletion = exclusão da conta em 7 dias ·
  -- duplicate = 2ª assinatura simultânea · stripe_dashboard = feito pelo controlador no gateway ·
  -- staff = reservado (reembolso pelo painel do guf, futuro)
  origin              text not null check (origin in ('withdrawal', 'account_deletion', 'duplicate', 'stripe_dashboard', 'staff')),
  amount_cents        integer not null check (amount_cents > 0),
  status              text not null default 'processing' check (status in ('processing', 'refunded', 'failed')),
  provider_refund_ref text unique check (provider_refund_ref is null or char_length(provider_refund_ref) between 1 and 200),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index billing_refunds_payment_idx on public.billing_refunds (payment_id);
create index billing_refunds_user_idx on public.billing_refunds (user_id);

create trigger billing_refunds_updated_at before update on public.billing_refunds
  for each row execute function public.set_updated_at();

alter table public.billing_payments enable row level security;
alter table public.billing_refunds enable row level security;
create policy billing_payments_read_own on public.billing_payments
  for select to authenticated using (user_id = (select auth.uid()));
create policy billing_refunds_read_own on public.billing_refunds
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 5. Eventos do webhook: só idempotência e diagnóstico (90 dias, sem o corpo)
-- ---------------------------------------------------------------------
create table public.billing_events (
  provider     text not null,
  event_id     text not null check (char_length(event_id) between 1 and 200),
  type         text not null check (char_length(type) between 1 and 100),
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  error_code   text check (error_code is null or char_length(error_code) <= 100),
  primary key (provider, event_id)
);

alter table public.billing_events enable row level security;

-- ---------------------------------------------------------------------
-- 6. Auditoria: ações novas (detalhes sem e-mail, valor ou cartão)
-- ---------------------------------------------------------------------
alter table public.audit_log drop constraint audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check
  check (action in (
    'consent_granted', 'consent_revoked', 'health_data_deleted', 'data_exported',
    'account_deleted', 'consent_proofs_purged', 'audit_log_purged',
    'social_data_deleted', 'social_visibility_changed', 'follow_accepted', 'follow_ended', 'user_blocked',
    'ai_conversations_purged', 'plan_granted', 'plan_revoked',
    'staff_viewed_user', 'staff_revealed_email', 'staff_changed_plan', 'staff_changed_handle',
    'staff_changed_name', 'staff_unlinked_identity',
    'staff_member_added', 'staff_member_role_changed', 'staff_member_disabled', 'staff_member_enabled',
    'announcement_published', 'announcement_ended', 'announcements_purged',
    'staff_banned_user', 'staff_unbanned_user', 'staff_deleted_account',
    'staff_scheduled_deletion', 'staff_cancelled_deletion', 'scheduled_deletion_executed',
    'staff_sent_password_reset', 'staff_created_exercises',
    'staff_updated_exercise', 'staff_deleted_exercise',
    'subscription_started', 'subscription_canceled', 'subscription_reactivated', 'subscription_withdrawn',
    'refund_completed', 'refund_failed', 'payment_disputed', 'billing_purged'));

-- ---------------------------------------------------------------------
-- 7. Regra dos 7 dias (única)
-- ---------------------------------------------------------------------
create or replace function public.withdrawal_window(p_subscription_id uuid)
returns table (is_within boolean, ends_at timestamptz, refundable_cents integer)
language sql stable security definer
set search_path = ''
as $$
  -- CDC, art. 49: 7 dias a contar da contratação (1º pagamento confirmado). Renovação não reabre.
  with sub as (
    select s.started_at + interval '7 days' as ends_at
      from public.subscriptions s
     where s.id = p_subscription_id
  ),
  open_amount as (
    select coalesce(sum(p.amount_cents - p.refunded_cents - coalesce((
             select sum(r.amount_cents) from public.billing_refunds r
              where r.payment_id = p.id and r.status = 'processing'), 0)), 0)::integer as cents
      from public.billing_payments p
     where p.subscription_id = p_subscription_id and p.status in ('paid', 'partially_refunded')
  )
  select coalesce(sub.ends_at > now(), false), sub.ends_at, greatest(open_amount.cents, 0)
    from sub cross join open_amount;
$$;

-- ---------------------------------------------------------------------
-- 8. Funções do servidor (Edge Functions com service_role)
-- ---------------------------------------------------------------------

-- Webhook idempotente: true = processar; false = este evento já foi processado.
create or replace function public.billing_event_begin(p_provider text, p_event_id text, p_type text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_processed timestamptz;
begin
  insert into public.billing_events (provider, event_id, type)
  values (p_provider, p_event_id, left(p_type, 100))
  on conflict (provider, event_id) do nothing;

  select e.processed_at into v_processed
    from public.billing_events e
   where e.provider = p_provider and e.event_id = p_event_id
     for update;
  return v_processed is null;
end;
$$;

create or replace function public.billing_event_finish(p_provider text, p_event_id text, p_error_code text default null)
returns void
language sql security definer
set search_path = ''
as $$
  update public.billing_events
     set processed_at = case when p_error_code is null then now() end,
         error_code = left(p_error_code, 100)
   where provider = p_provider and event_id = p_event_id;
$$;

-- Antes do checkout: plano à venda, preço ativo, nenhuma assinatura viva. Devolve o preço e o
-- cliente já existente (nulo = criar). Conta suspensa já foi barrada pelo accept_documents (GU001).
create or replace function public.billing_checkout_context(p_user_id uuid, p_plan_code text, p_provider text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_price public.plan_prices;
begin
  if not exists (select 1 from public.plans p where p.code = p_plan_code and p.is_purchasable) then
    raise exception 'Plano não está à venda' using errcode = 'GB000';
  end if;

  select pp.* into v_price
    from public.plan_prices pp
   where pp.plan_code = p_plan_code and pp.provider = p_provider and pp.is_active
   order by case pp.billing_interval when 'month' then 0 else 1 end
   limit 1;
  if v_price.id is null then
    raise exception 'Preço não configurado' using errcode = 'GB000';
  end if;

  if exists (select 1 from public.subscriptions s
              where s.user_id = p_user_id and s.status in ('trialing', 'active', 'past_due')) then
    raise exception 'Assinatura já ativa' using errcode = 'GB004';
  end if;

  return jsonb_build_object(
    'price_ref', v_price.price_ref,
    'amount_cents', v_price.amount_cents,
    'currency', v_price.currency,
    'billing_interval', v_price.billing_interval,
    'customer_ref', (select c.customer_ref from public.billing_customers c
                      where c.user_id = p_user_id and c.provider = p_provider)
  );
end;
$$;

-- Liga o cliente criado no gateway à pessoa. Em corrida, vale o primeiro; devolve o que ficou.
create or replace function public.billing_link_customer(p_user_id uuid, p_provider text, p_customer_ref text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_ref text;
begin
  insert into public.billing_customers (user_id, provider, customer_ref)
  values (p_user_id, p_provider, p_customer_ref)
  on conflict (user_id, provider) do nothing;

  select c.customer_ref into v_ref
    from public.billing_customers c
   where c.user_id = p_user_id and c.provider = p_provider;
  return v_ref;
end;
$$;

-- Espelha a assinatura como o gateway a vê AGORA (o webhook relê o objeto no gateway antes de chamar,
-- então eventos fora de ordem não voltam o estado). Atualiza o direito ligado a ela.
-- Saída: outcome = synced · unknown_customer (cliente que o guf não criou: ignorar) ·
--        duplicate (a pessoa já tem outra assinatura viva: o servidor cancela e devolve esta).
create or replace function public.billing_sync_subscription(
  p_provider             text,
  p_customer_ref         text,
  p_provider_ref         text,
  p_price_ref            text,
  p_status               text,
  p_current_period_end   timestamptz,
  p_cancel_at_period_end boolean,
  p_canceled_at          timestamptz
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  -- Folga depois do fim do período: a renovação chega minutos depois da virada; em atraso, o gateway
  -- tenta cobrar de novo por alguns dias e o Pro continua (docs/stripe-payments-plan.md § 2.2).
  c_renewal_grace  constant interval := interval '1 day';
  c_past_due_grace constant interval := interval '14 days';
  v_user        uuid;
  v_plan        text;
  v_live        boolean := p_status in ('trialing', 'active', 'past_due');
  v_previous    public.subscriptions;
  v_sub_id      uuid;
  v_valid_until timestamptz;
begin
  if p_status not in ('trialing', 'active', 'past_due', 'canceled', 'expired') then
    raise exception 'Situação inválida: %', p_status using errcode = '22023';
  end if;

  select c.user_id into v_user
    from public.billing_customers c
   where c.provider = p_provider and c.customer_ref = p_customer_ref;
  if v_user is null then
    return jsonb_build_object('outcome', 'unknown_customer');
  end if;

  -- Sem preço conhecido não há plano: erro de propósito (o gateway reenvia depois da correção).
  select pp.plan_code into v_plan
    from public.plan_prices pp
   where pp.provider = p_provider and pp.price_ref = p_price_ref;
  if v_plan is null then
    raise exception 'Preço desconhecido' using errcode = '22023';
  end if;

  select s.* into v_previous
    from public.subscriptions s
   where s.provider = p_provider and s.provider_ref = p_provider_ref
     for update;

  if v_live and exists (select 1 from public.subscriptions s
                         where s.user_id = v_user and s.status in ('trialing', 'active', 'past_due')
                           and not (s.provider = p_provider and s.provider_ref = p_provider_ref)) then
    return jsonb_build_object('outcome', 'duplicate', 'user_id', v_user);
  end if;

  insert into public.subscriptions (user_id, plan_code, provider, provider_ref, status, current_period_end,
                                    cancel_at_period_end, canceled_at)
  values (v_user, v_plan, p_provider, p_provider_ref, p_status, p_current_period_end,
          coalesce(p_cancel_at_period_end, false), p_canceled_at)
  on conflict (provider, provider_ref) do update
    set plan_code = excluded.plan_code,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        canceled_at = excluded.canceled_at
  returning id into v_sub_id;

  v_valid_until := case
    when not v_live or p_current_period_end is null then null
    when p_cancel_at_period_end then greatest(p_current_period_end, now() + interval '1 minute')
    when p_status = 'past_due' then greatest(p_current_period_end, now()) + c_past_due_grace
    else greatest(p_current_period_end, now()) + c_renewal_grace
  end;

  insert into public.plan_grants (user_id, plan_code, source, subscription_id, valid_until, revoked_at)
  values (v_user, v_plan, 'subscription', v_sub_id, v_valid_until, case when v_live then null else now() end)
  on conflict (subscription_id) where subscription_id is not null do update
    set plan_code = excluded.plan_code,
        valid_until = coalesce(excluded.valid_until, public.plan_grants.valid_until),
        revoked_at = case when v_live then null else coalesce(public.plan_grants.revoked_at, now()) end;

  -- Auditoria só nas mudanças (o mesmo estado repetido não grava nada).
  if v_live and (v_previous.id is null or v_previous.status not in ('trialing', 'active', 'past_due')) then
    perform public.audit_log_append('plan_granted', v_user,
      jsonb_build_object('plan', v_plan, 'source', 'subscription', 'provider', p_provider, 'status', p_status));
  elsif not v_live and v_previous.id is not null and v_previous.status in ('trialing', 'active', 'past_due') then
    perform public.audit_log_append('plan_revoked', v_user,
      jsonb_build_object('plan', v_plan, 'source', 'subscription', 'provider', p_provider, 'status', p_status));
  end if;
  if v_live and p_cancel_at_period_end and not coalesce(v_previous.cancel_at_period_end, false) then
    perform public.audit_log_append('subscription_canceled', v_user,
      jsonb_build_object('provider', p_provider, 'mode', 'period_end'));
  elsif v_live and not p_cancel_at_period_end and coalesce(v_previous.cancel_at_period_end, false) then
    perform public.audit_log_append('subscription_reactivated', v_user, jsonb_build_object('provider', p_provider));
  end if;

  return jsonb_build_object('outcome', 'synced', 'user_id', v_user, 'subscription_id', v_sub_id,
                            'was_live', coalesce(v_previous.status in ('trialing', 'active', 'past_due'), false),
                            'is_live', v_live);
end;
$$;

-- Pagamento confirmado (idempotente pela fatura). A assinatura já foi espelhada antes.
-- O 1º pagamento com valor marca a contratação (started_at), de onde contam os 7 dias.
create or replace function public.billing_record_payment(
  p_provider         text,
  p_customer_ref     text,
  p_subscription_ref text,
  p_provider_ref     text,
  p_payment_ref      text,
  p_amount_cents     integer,
  p_currency         text,
  p_paid_at          timestamptz
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user       uuid;
  v_sub        public.subscriptions;
  v_payment_id uuid;
  v_started    boolean := false;
begin
  select c.user_id into v_user
    from public.billing_customers c
   where c.provider = p_provider and c.customer_ref = p_customer_ref;
  if v_user is null then
    return jsonb_build_object('outcome', 'unknown_customer');
  end if;

  select s.* into v_sub
    from public.subscriptions s
   where s.provider = p_provider and s.provider_ref = p_subscription_ref and s.user_id = v_user
     for update;

  insert into public.billing_payments (user_id, subscription_id, provider, provider_ref, payment_ref,
                                       amount_cents, currency, paid_at)
  values (v_user, v_sub.id, p_provider, p_provider_ref, p_payment_ref, p_amount_cents, lower(p_currency), p_paid_at)
  on conflict (provider, provider_ref) do update
    set payment_ref = coalesce(excluded.payment_ref, public.billing_payments.payment_ref),
        subscription_id = coalesce(public.billing_payments.subscription_id, excluded.subscription_id)
  returning id into v_payment_id;

  if v_sub.id is not null and v_sub.started_at is null and p_amount_cents > 0 then
    update public.subscriptions set started_at = p_paid_at where id = v_sub.id;
    v_started := true;
    perform public.audit_log_append('subscription_started', v_user,
      jsonb_build_object('provider', p_provider, 'plan', v_sub.plan_code));
  end if;

  return jsonb_build_object('outcome', 'recorded', 'user_id', v_user, 'payment_id', v_payment_id, 'started', v_started);
end;
$$;

-- Cancelamento (pela pessoa no app ou pela exclusão da conta). Decide pelos 7 dias e, dentro deles,
-- cria os reembolsos em `processing` (o id vira a chave de idempotência no gateway). Chamar de novo
-- devolve os reembolsos ainda em andamento: repetir é seguro.
-- Saída: mode = refund_and_end · end_now · end_at_period_end.
create or replace function public.billing_begin_cancellation(p_user_id uuid, p_subscription_id uuid, p_origin text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_sub     public.subscriptions;
  v_window  record;
  v_created integer := 0;
begin
  if p_origin not in ('withdrawal', 'account_deletion') then
    raise exception 'Origem inválida' using errcode = '22023';
  end if;

  select s.* into v_sub
    from public.subscriptions s
   where s.id = p_subscription_id and s.user_id = p_user_id
     for update;
  -- Já encerrada só segue se ainda houver devolução pendente (retomar uma tentativa interrompida).
  if v_sub.id is null
     or (v_sub.status not in ('trialing', 'active', 'past_due')
         and not exists (select 1 from public.billing_refunds r join public.billing_payments p on p.id = r.payment_id
                          where p.subscription_id = v_sub.id and r.status = 'processing'
                            and r.provider_refund_ref is null)) then
    raise exception 'Assinatura não encontrada' using errcode = 'GB001';
  end if;

  select * into v_window from public.withdrawal_window(v_sub.id);

  if v_sub.status in ('trialing', 'active', 'past_due') and v_window.is_within and v_window.refundable_cents > 0 then
    with created as (
      insert into public.billing_refunds (payment_id, user_id, origin, amount_cents)
      select p.id, p_user_id, p_origin,
             p.amount_cents - p.refunded_cents - coalesce((select sum(r.amount_cents) from public.billing_refunds r
                                                           where r.payment_id = p.id and r.status = 'processing'), 0)
        from public.billing_payments p
       where p.subscription_id = v_sub.id and p.status in ('paid', 'partially_refunded') and p.payment_ref is not null
         and p.amount_cents - p.refunded_cents - coalesce((select sum(r.amount_cents) from public.billing_refunds r
                                                          where r.payment_id = p.id and r.status = 'processing'), 0) > 0
      returning 1
    )
    select count(*) into v_created from created;

    if v_created > 0 then
      perform public.audit_log_append('subscription_withdrawn', p_user_id,
        jsonb_build_object('provider', v_sub.provider, 'origin', p_origin));
    end if;
  end if;

  -- Pedidos sem resposta do gateway (sem referência) são retomados; os que já têm referência estão
  -- em andamento lá (ex.: Pix) e não são pedidos de novo.
  if exists (select 1 from public.billing_refunds r join public.billing_payments p on p.id = r.payment_id
              where p.subscription_id = v_sub.id and r.status = 'processing' and r.provider_refund_ref is null) then
    return jsonb_build_object(
      'mode', 'refund_and_end',
      'provider', v_sub.provider,
      'subscription_ref', v_sub.provider_ref,
      'refunds', (select jsonb_agg(jsonb_build_object('id', r.id, 'payment_ref', p.payment_ref, 'amount_cents', r.amount_cents))
                    from public.billing_refunds r join public.billing_payments p on p.id = r.payment_id
                   where p.subscription_id = v_sub.id and r.status = 'processing' and r.provider_refund_ref is null));
  end if;

  return jsonb_build_object(
    'mode', case when p_origin = 'account_deletion' then 'end_now' else 'end_at_period_end' end,
    'provider', v_sub.provider,
    'subscription_ref', v_sub.provider_ref,
    'refunds', '[]'::jsonb);
end;
$$;

-- Resultado de um reembolso pedido pelo guf (processing → refunded/failed). Auditado na transição.
create or replace function public.billing_mark_refund(p_refund_id uuid, p_status text, p_provider_refund_ref text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_refund public.billing_refunds;
begin
  if p_status not in ('processing', 'refunded', 'failed') then
    raise exception 'Situação inválida' using errcode = '22023';
  end if;

  update public.billing_refunds r
     set status = p_status,
         provider_refund_ref = coalesce(p_provider_refund_ref, r.provider_refund_ref)
   where r.id = p_refund_id and r.status <> p_status
  returning r.* into v_refund;

  if v_refund.id is not null and p_status in ('refunded', 'failed') then
    perform public.audit_log_append(case p_status when 'refunded' then 'refund_completed' else 'refund_failed' end,
      v_refund.user_id, jsonb_build_object('origin', v_refund.origin));
  end if;
end;
$$;

-- Reembolsos de um pagamento como o gateway os vê (webhook). `p_refunded_cents` é o total devolvido
-- (absoluto, nunca somado: repetir o evento não muda nada). `p_refunds` = [{ref, amount_cents,
-- status, guf_refund_id}]; reembolso sem guf_refund_id foi feito fora do app (stripe_dashboard).
create or replace function public.billing_record_refunds(
  p_provider       text,
  p_payment_ref    text,
  p_refunded_cents integer,
  p_refunds        jsonb
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_payment     public.billing_payments;
  v_item        jsonb;
  v_status      text;
  v_existing    uuid;
  v_new_outside boolean := false;
  v_origin      text;
  v_sub         public.subscriptions;
begin
  select p.* into v_payment
    from public.billing_payments p
   where p.provider = p_provider and p.payment_ref = p_payment_ref
     for update;
  if v_payment.id is null then
    return jsonb_build_object('outcome', 'unknown_payment');
  end if;

  update public.billing_payments p
     set refunded_cents = least(greatest(p_refunded_cents, 0), p.amount_cents),
         status = case
           when p.status = 'disputed' then 'disputed'
           when p_refunded_cents >= p.amount_cents then 'refunded'
           when p_refunded_cents > 0 then 'partially_refunded'
           else 'paid' end
   where p.id = v_payment.id;

  for v_item in select * from jsonb_array_elements(coalesce(p_refunds, '[]'::jsonb)) loop
    v_status := case v_item ->> 'status' when 'succeeded' then 'refunded' when 'pending' then 'processing' else 'failed' end;
    -- Reembolso pedido pelo guf: só vale se a linha for deste mesmo pagamento.
    if v_item ->> 'guf_refund_id' ~ '^[0-9a-f-]{36}$'
       and exists (select 1 from public.billing_refunds r
                    where r.id = (v_item ->> 'guf_refund_id')::uuid and r.payment_id = v_payment.id) then
      perform public.billing_mark_refund((v_item ->> 'guf_refund_id')::uuid, v_status, v_item ->> 'ref');
      continue;
    end if;

    select r.id into v_existing from public.billing_refunds r where r.provider_refund_ref = v_item ->> 'ref';
    if v_existing is not null then
      perform public.billing_mark_refund(v_existing, v_status, null);
      continue;
    end if;

    -- duplicate = devolução automática da 2ª assinatura; qualquer outra sem linha foi feita no gateway.
    v_origin := case when v_item ->> 'origin' = 'duplicate' then 'duplicate' else 'stripe_dashboard' end;
    insert into public.billing_refunds (payment_id, user_id, origin, amount_cents, status, provider_refund_ref)
    values (v_payment.id, v_payment.user_id, v_origin, (v_item ->> 'amount_cents')::integer, v_status, v_item ->> 'ref');
    v_new_outside := v_new_outside or v_origin = 'stripe_dashboard';
    if v_status = 'refunded' then
      perform public.audit_log_append('refund_completed', v_payment.user_id, jsonb_build_object('origin', v_origin));
    end if;
  end loop;

  select s.* into v_sub from public.subscriptions s where s.id = v_payment.subscription_id;

  return jsonb_build_object(
    'outcome', 'recorded',
    'user_id', v_payment.user_id,
    'new_outside_refund', v_new_outside,
    'fully_refunded', p_refunded_cents >= v_payment.amount_cents,
    'subscription_ref', v_sub.provider_ref,
    'subscription_live', coalesce(v_sub.status in ('trialing', 'active', 'past_due'), false),
    -- Só o pagamento mais recente da assinatura cobre o período atual.
    'is_latest_payment', not exists (select 1 from public.billing_payments o
                                      where o.subscription_id = v_payment.subscription_id and o.paid_at > v_payment.paid_at));
end;
$$;

-- Contestação no cartão: marca o pagamento; o servidor cancela a assinatura (evita nova cobrança).
create or replace function public.billing_record_dispute(p_provider text, p_payment_ref text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_payment public.billing_payments;
begin
  update public.billing_payments p set status = 'disputed'
   where p.provider = p_provider and p.payment_ref = p_payment_ref and p.status <> 'disputed'
  returning p.* into v_payment;

  if v_payment.id is null then
    return jsonb_build_object('outcome', 'unchanged');
  end if;

  perform public.audit_log_append('payment_disputed', v_payment.user_id, jsonb_build_object('provider', p_provider));
  return jsonb_build_object(
    'outcome', 'recorded',
    'user_id', v_payment.user_id,
    'subscription_ref', (select s.provider_ref from public.subscriptions s
                          where s.id = v_payment.subscription_id and s.status in ('trialing', 'active', 'past_due')));
end;
$$;

-- Assinaturas vivas de uma conta (exclusão da conta cancela todas antes de apagar).
create or replace function public.billing_live_subscriptions(p_user_id uuid)
returns table (id uuid, provider text, provider_ref text)
language sql stable security definer
set search_path = ''
as $$
  select s.id, s.provider, s.provider_ref
    from public.subscriptions s
   where s.user_id = p_user_id and s.status in ('trialing', 'active', 'past_due');
$$;

-- Prazos (docs/stripe-payments-plan.md § 4.1, .lgpd/retention.md): eventos 90 dias; pagamentos e
-- reembolsos 5 anos (obrigação fiscal ⚖).
create or replace function public.purge_expired_billing()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_events   integer;
  v_payments integer;
begin
  delete from public.billing_events where received_at < now() - interval '90 days';
  get diagnostics v_events = row_count;
  delete from public.billing_payments where paid_at < now() - interval '5 years';
  get diagnostics v_payments = row_count;

  if v_events + v_payments > 0 then
    perform public.audit_log_append('billing_purged', null,
      jsonb_build_object('events', v_events, 'payments', v_payments));
  end if;
end;
$$;

select cron.schedule(
  'purge-expired-billing',
  '41 3 * * *',                                     -- todo dia, 03:41 UTC
  $$select public.purge_expired_billing()$$
);

revoke execute on function
  public.withdrawal_window(uuid),
  public.billing_event_begin(text, text, text),
  public.billing_event_finish(text, text, text),
  public.billing_checkout_context(uuid, text, text),
  public.billing_link_customer(uuid, text, text),
  public.billing_sync_subscription(text, text, text, text, text, timestamptz, boolean, timestamptz),
  public.billing_record_payment(text, text, text, text, text, integer, text, timestamptz),
  public.billing_begin_cancellation(uuid, uuid, text),
  public.billing_mark_refund(uuid, text, text),
  public.billing_record_refunds(text, text, integer, jsonb),
  public.billing_record_dispute(text, text),
  public.billing_live_subscriptions(uuid),
  public.purge_expired_billing()
  from public, anon, authenticated;

grant execute on function
  public.billing_event_begin(text, text, text),
  public.billing_event_finish(text, text, text),
  public.billing_checkout_context(uuid, text, text),
  public.billing_link_customer(uuid, text, text),
  public.billing_sync_subscription(text, text, text, text, text, timestamptz, boolean, timestamptz),
  public.billing_record_payment(text, text, text, text, text, integer, text, timestamptz),
  public.billing_begin_cancellation(uuid, uuid, text),
  public.billing_mark_refund(uuid, text, text),
  public.billing_record_refunds(text, text, integer, jsonb),
  public.billing_record_dispute(text, text),
  public.billing_live_subscriptions(uuid)
  to service_role;

-- A versão antiga escrevia o direito sem olhar o preço nem a pessoa dona do cliente: sai de uso.
revoke execute on function public.apply_subscription_event(uuid, text, text, text, text, timestamptz) from service_role;

-- ---------------------------------------------------------------------
-- 9. Leitura pelo app
-- ---------------------------------------------------------------------
-- Assinatura (a viva ou a mais recente), janela dos 7 dias, pagamentos e reembolsos do próprio usuário.
-- Nada de referências do gateway nem de cartão.
create or replace function public.my_billing()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_sub      public.subscriptions;
  v_window   record;
  v_payments jsonb;
  v_refunds  jsonb;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  select s.* into v_sub
    from public.subscriptions s
   where s.user_id = v_uid
   order by (s.status in ('trialing', 'active', 'past_due')) desc, s.updated_at desc
   limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'amount_cents', p.amount_cents, 'refunded_cents', p.refunded_cents,
           'currency', p.currency, 'status', p.status, 'paid_at', p.paid_at) order by p.paid_at desc), '[]'::jsonb)
    into v_payments
    from (select * from public.billing_payments where user_id = v_uid order by paid_at desc limit 24) p;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'payment_id', r.payment_id, 'amount_cents', r.amount_cents, 'status', r.status,
           'origin', r.origin, 'created_at', r.created_at) order by r.created_at desc), '[]'::jsonb)
    into v_refunds
    from (select * from public.billing_refunds where user_id = v_uid order by created_at desc limit 24) r;

  if v_sub.id is null then
    return jsonb_build_object('subscription', null, 'payments', v_payments, 'refunds', v_refunds);
  end if;

  select * into v_window from public.withdrawal_window(v_sub.id);

  return jsonb_build_object(
    'subscription', jsonb_build_object(
      'id', v_sub.id,
      'plan_code', v_sub.plan_code,
      'plan_name', (select p.name from public.plans p where p.code = v_sub.plan_code),
      'status', v_sub.status,
      'started_at', v_sub.started_at,
      'current_period_end', v_sub.current_period_end,
      'cancel_at_period_end', v_sub.cancel_at_period_end,
      'canceled_at', v_sub.canceled_at,
      'withdrawal_ends_at', v_window.ends_at,
      'can_withdraw', coalesce(v_window.is_within and v_window.refundable_cents > 0, false),
      'withdrawal_refund_cents', coalesce(v_window.refundable_cents, 0),
      'has_processing_refund', exists (select 1 from public.billing_refunds r join public.billing_payments p on p.id = r.payment_id
                                        where p.subscription_id = v_sub.id and r.status = 'processing'),
      'can_manage_payment', exists (select 1 from public.billing_customers c where c.user_id = v_uid and c.provider = v_sub.provider)),
    'payments', v_payments,
    'refunds', v_refunds
  );
end;
$$;

revoke execute on function public.my_billing() from public, anon;
grant execute on function public.my_billing() to authenticated;
