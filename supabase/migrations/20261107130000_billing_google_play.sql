-- =====================================================================
-- GUF APP · Assinatura pelo Google Play (app Android / TWA)
--
-- Dentro do app da Play a compra é feita pelo Google Play Billing; fora dele, pelo Stripe. As duas
-- passam pelo mesmo espelho (subscriptions, plan_grants, billing_payments) e pelas mesmas regras
-- (7 dias, uma assinatura viva por pessoa). Diferença: a compra na loja não tem "cliente" criado
-- pelo guf, então o dono vem do VÍNCULO gravado quando a pessoa confirma a compra no app
-- (billing_link_purchase), conferido no Google antes (Edge Function `billing`, ação store-confirm).
--
-- 1. billing_purchase_links: compra na loja (purchase token) → pessoa. Sem acesso pelo app.
-- 2. billing_link_purchase: grava o vínculo; token de outra pessoa → GB005.
-- 3. billing_owner_of: dono pelo cliente (Stripe) ou pelo vínculo da compra (Google Play).
-- 4. billing_sync_subscription e billing_record_payment passam a usar billing_owner_of.
-- 5. Preços no Google Play (ids dos produtos de assinatura da Play Console: pro_mensal, pro_anual),
--    com os mesmos valores promocionais do Stripe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 e 2. Vínculo da compra na loja
-- ---------------------------------------------------------------------
create table public.billing_purchase_links (
  provider     text not null check (provider in ('google', 'apple')),
  purchase_ref text not null check (char_length(purchase_ref) between 1 and 512),
  user_id      uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (provider, purchase_ref)
);

create index billing_purchase_links_user_idx on public.billing_purchase_links (user_id);

alter table public.billing_purchase_links enable row level security;

comment on table public.billing_purchase_links is
  'Compra feita na loja de apps (Google Play) → pessoa. Gravado só pela Edge Function billing depois de conferir a compra no Google.';

create or replace function public.billing_link_purchase(p_user_id uuid, p_provider text, p_purchase_ref text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  insert into public.billing_purchase_links (provider, purchase_ref, user_id)
  values (p_provider, p_purchase_ref, p_user_id)
  on conflict (provider, purchase_ref) do nothing;

  select l.user_id into v_owner
    from public.billing_purchase_links l
   where l.provider = p_provider and l.purchase_ref = p_purchase_ref;

  -- A mesma compra nunca vale para duas contas (token copiado de outro aparelho).
  if v_owner <> p_user_id then
    raise exception 'Compra de outra conta' using errcode = 'GB005';
  end if;
  return v_owner;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Dono da assinatura ou do pagamento
-- ---------------------------------------------------------------------
create or replace function public.billing_owner_of(p_provider text, p_customer_ref text, p_subscription_ref text)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select c.user_id from public.billing_customers c
      where c.provider = p_provider and c.customer_ref = p_customer_ref),
    (select l.user_id from public.billing_purchase_links l
      where l.provider = p_provider and l.purchase_ref = p_subscription_ref)
  );
$$;

-- ---------------------------------------------------------------------
-- 4. Sincronização e pagamento com o dono por cliente OU por compra
-- ---------------------------------------------------------------------
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

  v_user := public.billing_owner_of(p_provider, p_customer_ref, p_provider_ref);
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

-- Pagamento confirmado (idempotente pela fatura/pedido). A assinatura já foi espelhada antes.
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
  v_user := public.billing_owner_of(p_provider, p_customer_ref, p_subscription_ref);
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

revoke execute on function
  public.billing_link_purchase(uuid, text, text),
  public.billing_owner_of(text, text, text)
  from public, anon, authenticated;

grant execute on function
  public.billing_link_purchase(uuid, text, text),
  public.billing_owner_of(text, text, text)
  to service_role;

-- ---------------------------------------------------------------------
-- 5. Preços no Google Play (produtos de assinatura da Play Console)
-- ---------------------------------------------------------------------
-- Os ids precisam ser EXATAMENTE os da Play Console (docs/play-store-twa.md § 5); os valores, os
-- mesmos configurados lá (a Edge Function confere o produto da compra, e a tela mostra estes números).
insert into public.plan_prices (plan_code, provider, price_ref, billing_interval, amount_cents, regular_amount_cents, currency)
values
  ('pro', 'google', 'pro_mensal', 'month', 1480, 1980, 'brl'),
  ('pro', 'google', 'pro_anual', 'year', 11800, 14800, 'brl')
on conflict (provider, price_ref) do nothing;
