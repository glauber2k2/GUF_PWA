-- =====================================================================
-- Exclusão agendada de conta com foto
-- O SQL não apaga arquivos do Storage, e delete_account_now recusa conta com foto (GA015): o job
-- marcava last_error = 'account_has_files' e tentava de novo para sempre. Agora, com foto ou com
-- assinatura viva, o job chama a Edge Function admin-delete-account (post_account_closure), que apaga
-- a foto, cancela a assinatura e executa a exclusão (execute_scheduled_deletion).
-- Aplicar DEPOIS de publicar a admin-delete-account que apaga a foto (senão a função não resolve).
-- =====================================================================

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
    if public.account_has_storage_files(v_due.user_id) then
      update public.account_deletion_schedules d set last_error = 'account_has_files' where d.user_id = v_due.user_id;
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

revoke execute on function public.execute_scheduled_account_deletions() from public, anon, authenticated;
