-- =====================================================================
-- GUF APP · Painel: corrige o agendamento de exclusão
-- O aviso para a pessoa tinha 171 caracteres; announcements.body aceita até 160, então o insert
-- falhava e o agendamento inteiro era desfeito ("algumas contas não mudaram"). Texto encurtado.
-- =====================================================================

create or replace function public.admin_schedule_deletion(p_user_id uuid, p_at timestamptz, p_reason text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('admin');
begin
  perform public.assert_account_actionable(p_user_id);
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  if p_at is null or p_at <= now() then
    raise exception 'Data no passado' using errcode = 'GA016';
  end if;

  insert into public.account_deletion_schedules (user_id, scheduled_for, reason, note, created_by)
  values (p_user_id, p_at, p_reason, nullif(btrim(coalesce(p_note, '')), ''), v_staff.user_id)
  on conflict (user_id) do update
     set scheduled_for = excluded.scheduled_for, reason = excluded.reason, note = excluded.note,
         created_by = excluded.created_by, created_at = now(), last_error = null;

  perform public.staff_audit('staff_scheduled_deletion', p_user_id, p_reason, p_note,
    jsonb_build_object('scheduled_for', p_at));
  -- Transparência (Art. 6º, VI) e tempo para exportar os dados antes. Até 160 caracteres (announcements.body).
  perform public.notify_account_change(p_user_id, 'Sua conta será excluída',
    'Sua conta será excluída em '
      || to_char(p_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI')
      || '. Para guardar seus dados, exporte em Configurações › Privacidade antes disso.');
end;
$$;
