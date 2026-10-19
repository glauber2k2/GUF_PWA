-- =====================================================================
-- GUF APP · Avisos de seguidores: intervalo mínimo de 24 h conferido no gatilho
--
-- Antes, o gatilho chamava a Edge Function a cada seguir/pedir/aceitar e só a função descartava
-- os repetidos. Agora o gatilho reserva o aviso em follow_alerts_sent (mesma pessoa, mesmo
-- destinatário e mesmo tipo, no máximo 1 a cada 24 h) e só chama a função quando a reserva
-- entra: seguir, deixar de seguir e seguir de novo dentro de 24 h = 1 aviso e 1 requisição.
-- build_follow_alert deixa de gravar: só confere o vínculo e monta o aviso.
-- =====================================================================

create or replace function public.request_follow_alert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_kind      text;
  v_recipient uuid;
  v_actor     uuid;
begin
  if tg_op = 'INSERT' then
    v_kind := case new.status when 'accepted' then 'new_follower' else 'follow_request' end;
    v_recipient := new.followee_id;
    v_actor := new.follower_id;
  elsif old.status = 'pending' and new.status = 'accepted' then
    v_kind := 'request_accepted';
    v_recipient := new.follower_id;
    v_actor := new.followee_id;
  else
    return null;
  end if;

  if not exists (select 1 from public.push_subscriptions ps where ps.user_id = v_recipient) then
    return null;
  end if;

  -- Reserva o aviso: só entra se não houve o mesmo nas últimas 24 h.
  insert into public.follow_alerts_sent as fas (recipient_id, actor_id, kind)
  values (v_recipient, v_actor, v_kind)
  on conflict (recipient_id, actor_id, kind) do update
    set sent_at = now()
    where fas.sent_at < now() - interval '1 day';
  if not found then
    return null;
  end if;

  perform public.post_push_alert(jsonb_build_object(
    'kind', v_kind, 'follower_id', new.follower_id, 'followee_id', new.followee_id));
  return null;
end;
$$;

create or replace function public.build_follow_alert(p_follower_id uuid, p_followee_id uuid, p_kind text)
returns table (recipient_id uuid, actor_id uuid, actor_name text, actor_handle text, kind text)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_status    text := case p_kind when 'follow_request' then 'pending' else 'accepted' end;
  v_recipient uuid := case p_kind when 'request_accepted' then p_follower_id else p_followee_id end;
  v_actor     uuid := case p_kind when 'request_accepted' then p_followee_id else p_follower_id end;
begin
  if p_kind not in ('new_follower', 'follow_request', 'request_accepted') then
    return;
  end if;

  -- Limpeza das reservas vencidas (a reserva em si é feita pelo gatilho request_follow_alert).
  delete from public.follow_alerts_sent fas where fas.sent_at < now() - interval '1 day';

  -- O vínculo pode ter mudado entre o gatilho e esta chamada (ex.: pedido cancelado na hora).
  if not exists (select 1 from public.follows f
                  where f.follower_id = p_follower_id and f.followee_id = p_followee_id and f.status = v_status)
     or public.is_blocked_between(p_follower_id, p_followee_id) then
    return;
  end if;

  return query
  select v_recipient, v_actor, coalesce(nullif(btrim(pr.name), ''), '@' || sp.handle), sp.handle, p_kind
    from public.social_profiles sp
    left join public.profiles pr on pr.id = sp.user_id
   where sp.user_id = v_actor;
end;
$$;

revoke execute on function
  public.request_follow_alert(),
  public.build_follow_alert(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function public.build_follow_alert(uuid, uuid, text) to service_role;
