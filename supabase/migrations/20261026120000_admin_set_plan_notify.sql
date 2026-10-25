-- =====================================================================
-- GUF APP · Painel: avisar (ou não) a pessoa quando a equipe muda o plano dela.
-- Documento: docs/admin-panel.md §5.7
--
-- admin_set_plan ganha p_notify (padrão: não avisa, como antes). Com aviso, o banco decide o tipo
-- pela ordem dos planos (plans.rank) e manda o aviso pelo mesmo canal de @ e nome
-- (notify_account_change: modal no app, uma vez, 30 dias): upgrade, downgrade ou alteração (mesmo
-- nível, ex.: só a validade mudou). O texto não leva o motivo nem quem mudou.
-- A assinatura antiga é removida: com o parâmetro novo opcional, as duas versões ficariam ambíguas.
-- =====================================================================

drop function public.admin_set_plan(uuid, text, timestamptz, text, text);

create function public.admin_set_plan(
  p_user_id uuid, p_plan_code text, p_valid_until timestamptz, p_reason text, p_note text default null,
  p_notify boolean default false
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_plan     public.plans;
  v_previous public.plans;
  v_grant    record;
  v_until    text;
begin
  perform public.require_staff('admin');
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id and u.deleted_at is null) then
    raise exception 'Conta não encontrada' using errcode = 'GA004';
  end if;
  select * into v_plan from public.plans pl where pl.code = p_plan_code;
  if not found then
    raise exception 'Plano inexistente' using errcode = 'GA012';
  end if;
  if p_valid_until is not null and p_valid_until <= now() then
    raise exception 'Validade no passado' using errcode = 'GA012';
  end if;
  if exists (select 1 from public.plan_grants g
              where g.user_id = p_user_id and g.source = 'subscription' and g.revoked_at is null
                and (g.valid_until is null or g.valid_until > now())) then
    raise exception 'Assinatura paga ativa' using errcode = 'GA005';
  end if;
  if public.plan_of(p_user_id) = p_plan_code and not v_plan.is_default
     and p_valid_until is not distinct from (select max(g.valid_until) from public.plan_grants g
                                              where g.user_id = p_user_id and g.plan_code = p_plan_code and g.revoked_at is null) then
    raise exception 'Nada mudou' using errcode = 'GA012';
  end if;

  select * into v_previous from public.plans pl where pl.code = public.plan_of(p_user_id);

  for v_grant in
    select g.id from public.plan_grants g
     where g.user_id = p_user_id and g.source in ('manual', 'trial') and g.revoked_at is null
       and (g.valid_until is null or g.valid_until > now())
  loop
    perform public.revoke_plan_grant(v_grant.id);
  end loop;
  if not v_plan.is_default then
    perform public.grant_plan(p_user_id, p_plan_code, p_valid_until, 'manual');
  end if;

  if p_notify then
    v_until := case when p_valid_until is null then ''
                    else ' até ' || to_char(p_valid_until at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') end;
    if v_plan.rank > coalesce(v_previous.rank, v_plan.rank) then
      perform public.notify_account_change(p_user_id, 'Seu plano mudou para ' || v_plan.name,
        'A equipe do guf liberou o plano ' || v_plan.name || ' na sua conta' || v_until || '. Aproveite!');
    elsif v_plan.rank < coalesce(v_previous.rank, v_plan.rank) then
      perform public.notify_account_change(p_user_id, 'Sua conta voltou para o plano ' || v_plan.name,
        'A equipe do guf mudou o seu plano para ' || v_plan.name || '. Seus dados continuam salvos.');
    else
      perform public.notify_account_change(p_user_id, 'Seu plano foi atualizado',
        'A equipe do guf atualizou o plano ' || v_plan.name || ' da sua conta' || v_until || '.');
    end if;
  end if;

  perform public.staff_audit('staff_changed_plan', p_user_id, p_reason, p_note,
    jsonb_build_object('plan', p_plan_code, 'valid_until', p_valid_until, 'notified', p_notify));
end;
$$;

revoke execute on function public.admin_set_plan(uuid, text, timestamptz, text, text, boolean) from public, anon;
grant execute on function public.admin_set_plan(uuid, text, timestamptz, text, text, boolean) to authenticated;
