-- =====================================================================
-- GUF APP · Painel: redefinir a senha de uma pessoa (só individual, nunca em lote)
-- Documento: docs/admin-panel.md §5.4 · LGPD: .lgpd/ (A022 administração da conta)
--
-- A equipe nunca vê nem escolhe a senha: o painel pede à Edge Function admin-reset-password, que
-- confere aqui (com o token de quem pede) e manda o e-mail de redefinição do Supabase Auth. A pessoa
-- cria a senha nova no app (/redefinir-senha). O e-mail não passa pelo navegador da equipe.
-- =====================================================================

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
    'staff_sent_password_reset'));

-- Confere e audita o pedido. GA017 = conta suspensa (o link não funcionaria) · GA018 = sem e-mail.
-- Quem entra só com Google ganha uma senha ao usar o link (passa a ter dois jeitos de entrar).
create or replace function public.admin_request_password_reset(p_user_id uuid, p_reason text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user auth.users;
begin
  perform public.require_staff('support');
  v_user := public.assert_account_actionable(p_user_id);
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  if (public.active_ban_of(p_user_id)).id is not null then
    raise exception 'Conta suspensa' using errcode = 'GA017';
  end if;
  if coalesce(v_user.email, '') = '' then
    raise exception 'Conta sem e-mail' using errcode = 'GA018';
  end if;
  perform public.staff_audit('staff_sent_password_reset', p_user_id, p_reason, p_note);
end;
$$;

revoke execute on function public.admin_request_password_reset(uuid, text, text) from public, anon;
grant execute on function public.admin_request_password_reset(uuid, text, text) to authenticated;
