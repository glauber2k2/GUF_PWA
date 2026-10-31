-- =====================================================================
-- GUF APP · Exclusão de conta pelo painel cancela a assinatura antes
--
-- O banco não fala com o Stripe: quem cancela é a Edge Function admin-delete-account, com a mesma
-- regra da exclusão pelo app (dentro dos 7 dias do primeiro pagamento devolve tudo; depois, encerra).
-- Aqui fica a garantia: nenhuma exclusão pelo painel apaga uma conta com assinatura viva (GA023),
-- senão o Stripe continuaria cobrando quem já não tem conta (CDC, art. 42).
--
-- Excluir agora: o painel chama a Edge Function; ela tenta admin_delete_user com o token do
-- colaborador (que confere equipe, papel e motivo); recebendo GA023, cancela no Stripe e tenta de novo.
-- Exclusão agendada: o job, ao encontrar assinatura viva, chama a Edge Function pelo pg_net
-- (cabeçalho x-guf-secret, segredo `account_closure_secret` no Vault); ela cancela e executa a
-- exclusão vencida (execute_scheduled_deletion). Sem resposta, o job tenta de novo a cada 10 min.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Garantia: conta com assinatura viva não sai pelo painel
-- ---------------------------------------------------------------------
create or replace function public.account_has_live_subscription(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
     where s.user_id = p_user_id and s.status in ('trialing', 'active', 'past_due')
  );
$$;

create or replace function public.delete_account_now(p_user_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if public.account_has_storage_files(p_user_id) then
    raise exception 'A conta tem arquivos no Storage' using errcode = 'GA015';
  end if;
  if public.account_has_live_subscription(p_user_id) then
    raise exception 'A conta tem assinatura ativa' using errcode = 'GA023';
  end if;
  delete from auth.users u where u.id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Exclusão agendada com assinatura: o job pede à Edge Function
-- ---------------------------------------------------------------------
create or replace function public.post_account_closure(p_user_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select ds.decrypted_secret into v_url from vault.decrypted_secrets ds where ds.name = 'project_url';
  select ds.decrypted_secret into v_secret from vault.decrypted_secrets ds where ds.name = 'account_closure_secret';
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/admin-delete-account',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-guf-secret', v_secret),
    body := jsonb_build_object('scheduled', true, 'userId', p_user_id),
    timeout_milliseconds := 30000
  );
exception when others then
  -- O job tenta de novo na próxima rodada; uma falha aqui não pode parar as outras exclusões.
  return;
end;
$$;

create or replace function public.execute_scheduled_account_deletions()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_due record;
begin
  for v_due in
    select d.user_id, d.reason, d.created_by from public.account_deletion_schedules d
     where d.scheduled_for <= now()
     order by d.scheduled_for
     limit 200
  loop
    if public.account_has_live_subscription(v_due.user_id) then
      update public.account_deletion_schedules d set last_error = 'account_has_subscription' where d.user_id = v_due.user_id;
      perform public.post_account_closure(v_due.user_id);
      continue;
    end if;
    begin
      perform public.audit_log_append('scheduled_deletion_executed', v_due.user_id,
        jsonb_build_object('reason', v_due.reason, 'scheduled_by', v_due.created_by));
      perform public.delete_account_now(v_due.user_id);
    exception when others then
      update public.account_deletion_schedules d
         set last_error = case sqlstate when 'GA015' then 'account_has_files' when 'GA023' then 'account_has_subscription' else 'unknown' end
       where d.user_id = v_due.user_id;
    end;
  end loop;
end;
$$;

-- A Edge Function confere antes de cancelar: só conta com exclusão agendada e vencida.
create or replace function public.is_account_deletion_due(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.account_deletion_schedules d
     where d.user_id = p_user_id and d.scheduled_for <= now()
  );
$$;

-- Depois de a assinatura ser cancelada: executa a exclusão agendada (mesma auditoria do job).
create or replace function public.execute_scheduled_deletion(p_user_id uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_due record;
begin
  select d.reason, d.created_by into v_due from public.account_deletion_schedules d
   where d.user_id = p_user_id and d.scheduled_for <= now();
  if not found then
    return false;
  end if;
  perform public.audit_log_append('scheduled_deletion_executed', p_user_id,
    jsonb_build_object('reason', v_due.reason, 'scheduled_by', v_due.created_by));
  perform public.delete_account_now(p_user_id);
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Permissões: só o servidor
-- ---------------------------------------------------------------------
revoke execute on function
  public.account_has_live_subscription(uuid),
  public.delete_account_now(uuid),
  public.post_account_closure(uuid),
  public.execute_scheduled_account_deletions(),
  public.is_account_deletion_due(uuid),
  public.execute_scheduled_deletion(uuid)
  from public, anon, authenticated;

grant execute on function
  public.is_account_deletion_due(uuid),
  public.execute_scheduled_deletion(uuid)
  to service_role;
