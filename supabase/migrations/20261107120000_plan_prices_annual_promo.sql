-- =====================================================================
-- GUF APP · Plano anual e preço promocional por tempo limitado
--
-- 1. plan_prices.regular_amount_cents: preço normal que vale depois da promoção (null = sem
--    promoção). O app mostra "Promoção por tempo limitado. Depois, R$ 19,80/mês" a partir daqui;
--    nenhum texto de preço fica no código. Trocar o preço = desativar a linha e inserir outra
--    (quem assinou pela antiga continua reconhecido, como antes).
-- 2. Preço mensal atual (R$ 14,80) passa a ser promocional: depois, R$ 19,80.
--    O anual (R$ 118,00, equivale a R$ 11,80/mês; depois R$ 148,00 = R$ 14,80/mês) é inserido
--    quando o preço existir no Stripe (docs/stripe-payments-plan.md § 11.7): o price_ref é do gateway.
-- 3. subscriptions.billing_interval: periodicidade da assinatura (mensal/anual), gravada pela
--    sincronização a partir do preço; mostrada em my_billing.
-- 4. billing_checkout_context ganha p_interval (padrão 'month', compatível com o app antigo).
-- 5. my_billing devolve o gateway (provider) e a periodicidade da assinatura.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 e 2. Preço normal depois da promoção
-- ---------------------------------------------------------------------
alter table public.plan_prices
  add column regular_amount_cents integer,
  add constraint plan_prices_regular_above_promo check (regular_amount_cents is null or regular_amount_cents > amount_cents);

comment on column public.plan_prices.regular_amount_cents is
  'Preço normal depois da promoção (centavos). null = o preço não é promocional.';

update public.plan_prices
   set regular_amount_cents = 1980
 where plan_code = 'pro' and billing_interval = 'month' and is_active and amount_cents = 1480;

-- ---------------------------------------------------------------------
-- 3. Periodicidade da assinatura
-- ---------------------------------------------------------------------
alter table public.subscriptions
  add column billing_interval text check (billing_interval is null or billing_interval in ('month', 'year'));

update public.subscriptions s
   set billing_interval = 'month'
 where s.billing_interval is null;

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
  v_interval    text;
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
  select pp.plan_code, pp.billing_interval into v_plan, v_interval
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
                                    cancel_at_period_end, canceled_at, billing_interval)
  values (v_user, v_plan, p_provider, p_provider_ref, p_status, p_current_period_end,
          coalesce(p_cancel_at_period_end, false), p_canceled_at, v_interval)
  on conflict (provider, provider_ref) do update
    set plan_code = excluded.plan_code,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        canceled_at = excluded.canceled_at,
        billing_interval = excluded.billing_interval
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

-- ---------------------------------------------------------------------
-- 4. Checkout escolhe a periodicidade
-- ---------------------------------------------------------------------
drop function if exists public.billing_checkout_context(uuid, text, text);

create function public.billing_checkout_context(p_user_id uuid, p_plan_code text, p_provider text, p_interval text default 'month')
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
   where pp.plan_code = p_plan_code and pp.provider = p_provider and pp.billing_interval = p_interval and pp.is_active;
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

revoke execute on function public.billing_checkout_context(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.billing_checkout_context(uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 5. my_billing com gateway e periodicidade
-- ---------------------------------------------------------------------
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
      'provider', v_sub.provider,
      'billing_interval', v_sub.billing_interval,
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
