-- =====================================================================
-- GUF APP · Exclusão de conta: o Favoritos sai junto (direito de eliminação, LGPD Art. 18, VI)
--
-- protect_favorites_project só deixava apagar o Favoritos sem usuário na sessão (auth.uid() nulo):
-- valia para a Edge Function delete-account e para o job de exclusão agendada, mas a exclusão pelo
-- painel (admin_delete_user) roda com o token do colaborador, e a cascata de auth.users → projects
-- era barrada com GP002 ("O projeto Favoritos não pode ser excluído"). Agora o DELETE passa quando o
-- dono não existe mais em auth.users (é a cascata da exclusão da conta); apagar o Favoritos de uma
-- conta ativa continua proibido. SECURITY DEFINER para poder ler auth.users.
-- =====================================================================

create or replace function public.protect_favorites_project()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' and new.is_favorites then
    raise exception 'O projeto Favoritos é criado automaticamente' using errcode = 'GP002';
  elsif tg_op = 'UPDATE' and (
        new.is_favorites <> old.is_favorites
     or (old.is_favorites and (new.name <> old.name or new.archived_at is not null))
  ) then
    raise exception 'O projeto Favoritos não pode ser renomeado nem arquivado' using errcode = 'GP002';
  elsif tg_op = 'DELETE' and old.is_favorites
        and exists (select 1 from auth.users u where u.id = old.user_id) then
    raise exception 'O projeto Favoritos não pode ser excluído' using errcode = 'GP002';
  end if;

  return coalesce(new, old);
end;
$$;

revoke execute on function public.protect_favorites_project() from public, anon, authenticated;
