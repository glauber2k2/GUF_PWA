-- =====================================================================
-- GUF APP · Foto da conta social copiada para o perfil
--
-- Problema: profiles.avatar_url só era preenchido no cadastro (handle_new_user). Quem criou a
-- conta por e-mail e vinculou o Google depois ficava sem foto para as outras pessoas
-- (competição, busca, seguidores, perfil), que leem só profiles.avatar_url — a própria pessoa
-- via a foto porque o app também lê a sessão.
--
-- Agora: ao vincular uma conta social (insert em auth.identities) ou a cada login que atualiza os
-- dados dela (update de identity_data), a foto vai para profiles.avatar_url. Nunca sobrescreve a
-- foto enviada pelo usuário (caminho do Storage, sem http) — convenção em packages/core/src/avatar.ts.
-- =====================================================================

create or replace function public.sync_social_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := coalesce(new.identity_data ->> 'avatar_url', new.identity_data ->> 'picture');
begin
  if v_url is null or v_url !~* '^https?://' then
    return new;
  end if;

  update public.profiles p
     set avatar_url = v_url
   where p.id = new.user_id
     and (p.avatar_url is null or p.avatar_url ~* '^https?://')
     and p.avatar_url is distinct from v_url;

  return new;
end;
$$;

revoke all on function public.sync_social_avatar() from public, anon, authenticated;

create trigger on_auth_identity_avatar
  after insert or update of identity_data on auth.identities
  for each row execute function public.sync_social_avatar();

-- Contas que já existem: perfil sem foto e conta social com foto (a identidade mais recente).
update public.profiles p
   set avatar_url = src.url
  from (
    select distinct on (i.user_id)
           i.user_id,
           coalesce(i.identity_data ->> 'avatar_url', i.identity_data ->> 'picture') as url
      from auth.identities i
     where coalesce(i.identity_data ->> 'avatar_url', i.identity_data ->> 'picture') ~* '^https?://'
     order by i.user_id, i.updated_at desc nulls last
  ) src
 where p.id = src.user_id
   and p.avatar_url is null;
