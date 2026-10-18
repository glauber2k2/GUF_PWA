-- =====================================================================
-- GUF APP · Regras do perfil social aceitas no cadastro (Termos e Política)
--
-- Decisão do produto (2026-10-18): nenhum consentimento é pedido no meio do uso. As regras
-- do perfil social (perfil privado por padrão, seguidores, perfil aberto, competição) fazem
-- parte dos Termos de Uso e da Política de Privacidade aceitos no cadastro (quem já tem conta
-- aceita a versão nova no /aceite). Abrir o perfil e aceitar seguidor são escolhas do
-- titular dentro do serviço (Art. 7º, V) ⚖.
--
-- - Abrir o perfil e aceitar seguidor deixam de exigir o consentimento social_sharing.
-- - Fechar o perfil (aberto → privado) NÃO remove seguidores: só quem chegar depois precisa
--   de aprovação. Seguidor sai só se o titular remover ou bloquear.
-- - Saem as funções de consentimento social (grant/revoke/has/require) e o campo
--   has_consent de get_my_social. O tipo 'social_sharing' continua permitido em
--   legal_documents (sem uso), para não reescrever a restrição.
-- =====================================================================

create or replace function public.update_social_settings(p_visibility text, p_history_hidden boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_old      public.social_profiles;
  v_accepted integer := 0;
begin
  perform public.ensure_social_profile(v_uid);
  if p_visibility not in ('private', 'open') or p_history_hidden is null then
    raise exception 'Configuração inválida' using errcode = '22023';
  end if;

  select * into v_old from public.social_profiles sp where sp.user_id = v_uid for update;
  if v_old.visibility = p_visibility and v_old.history_hidden = p_history_hidden then
    return;
  end if;

  update public.social_profiles
     set visibility = p_visibility, history_hidden = p_history_hidden
   where user_id = v_uid;

  -- Abrir aceita os pedidos pendentes (quem pediu passa a ver o que o perfil mostra).
  -- Fechar não mexe em quem já segue.
  if p_visibility = 'open' and v_old.visibility = 'private' then
    update public.follows
       set status = 'accepted', accepted_at = now()
     where followee_id = v_uid and status = 'pending';
    get diagnostics v_accepted = row_count;
  end if;

  perform public.audit_log_append('social_visibility_changed', v_uid, jsonb_build_object(
    'visibility', p_visibility, 'history_hidden', p_history_hidden, 'accepted_pending', v_accepted));
end;
$$;

create or replace function public.respond_follow_request(p_user_id uuid, p_accept boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  if p_accept then
    update public.follows
       set status = 'accepted', accepted_at = now()
     where follower_id = p_user_id and followee_id = v_uid and status = 'pending';
    if found then
      perform public.audit_log_append('follow_accepted', v_uid, jsonb_build_object('follower', p_user_id, 'mode', 'request'));
    end if;
  else
    delete from public.follows
     where follower_id = p_user_id and followee_id = v_uid and status = 'pending';
  end if;
end;
$$;

-- get_my_social sem has_consent (muda o retorno: precisa recriar).
drop function public.get_my_social();

create function public.get_my_social()
returns table (
  user_id                 uuid,
  handle                  text,
  visibility              text,
  history_hidden          boolean,
  followers_count         integer,
  following_count         integer,
  pending_requests_count  integer
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
begin
  perform public.ensure_social_profile(v_uid);

  return query
  select sp.user_id, sp.handle, sp.visibility, sp.history_hidden,
         (select count(*) from public.follows f where f.followee_id = v_uid and f.status = 'accepted')::integer,
         (select count(*) from public.follows f where f.follower_id = v_uid and f.status = 'accepted')::integer,
         (select count(*) from public.follows f where f.followee_id = v_uid and f.status = 'pending')::integer
    from public.social_profiles sp
   where sp.user_id = v_uid;
end;
$$;

revoke execute on function public.get_my_social() from public, anon;
grant execute on function public.get_my_social() to authenticated;

drop function public.grant_social_consent(text);
drop function public.revoke_social_consent(text);
drop function public.require_social_consent(uuid);
drop function public.has_social_consent(uuid);
