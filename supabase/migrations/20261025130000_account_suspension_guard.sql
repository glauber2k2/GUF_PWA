-- =====================================================================
-- GUF APP · Conta suspensa barrada em toda chamada à API (middleware do PostgREST).
-- Documento: docs/admin-panel.md §5.3 · LGPD: .lgpd/ (A022 administração da conta)
--
-- Por quê: suspender (admin_ban_user) encerra as sessões e o Supabase Auth recusa login e renovação,
-- mas o token de acesso já emitido vale até expirar (até 1 h). Nesse intervalo o app continuava
-- lendo e gravando. O PostgREST chama `pgrst.db_pre_request` antes de toda requisição (tabelas e
-- RPC, inclusive as feitas pelas Edge Functions com o token do usuário): conta com suspensão aberta
-- recebe o erro GU001 e o app mostra o aviso e sai da conta.
-- O prazo da suspensão vai no `hint` (ISO 8601 em UTC; vazio = indeterminado).
-- Só o papel `authenticated` é conferido: visitante e service_role (jobs, webhooks) passam direto.
-- =====================================================================

create or replace function public.guard_suspended_account()
returns void
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_ends timestamptz;
begin
  if v_user is null or coalesce(auth.role(), '') <> 'authenticated' then
    return;
  end if;

  -- account_bans_open_idx (user_id where lifted_at is null): uma leitura por índice por requisição.
  select b.ends_at into v_ends
    from public.account_bans b
   where b.user_id = v_user and b.lifted_at is null and (b.ends_at is null or b.ends_at > now())
   limit 1;
  if not found then
    return;
  end if;

  raise exception 'Conta suspensa'
    using errcode = 'GU001',
          hint = coalesce(to_char(v_ends at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '');
end;
$$;

comment on function public.guard_suspended_account() is
  'Middleware do PostgREST (pgrst.db_pre_request): recusa com GU001 toda requisição de conta com suspensão aberta.';

-- O PostgREST executa a função com o papel da requisição: os três precisam poder chamá-la.
revoke execute on function public.guard_suspended_account() from public;
grant execute on function public.guard_suspended_account() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request = 'public.guard_suspended_account';
notify pgrst, 'reload config';
