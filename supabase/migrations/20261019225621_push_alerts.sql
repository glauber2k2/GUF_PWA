-- =====================================================================
-- GUF APP · Avisos no celular (Web Push): competição e seguidores
--
-- Quem liga "Notificações" em Configurações recebe neste aparelho:
--   · competição: um competidor (seguimento mútuo aceito) fica a menos de 20 pontos de
--     ultrapassá-lo na temporada atual ("Este mês") e quando ultrapassa;
--   · seguidores: alguém começou a seguir (perfil aberto), pediu para seguir (perfil privado)
--     ou aceitou o seu pedido.
--
-- Fluxo: treino concluído ou esforço (RPE) informado, ou mudança em follows → gatilho → pg_net
-- chama a Edge Function push-alerts (só se quem receberia tem aparelho inscrito) → a função
-- monta os avisos por funções só de service_role e envia o push aos aparelhos inscritos.
--
-- Configuração (uma vez por ambiente, fora das migrations porque são segredos):
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<segredo aleatório>', 'push_alerts_secret');
-- e o mesmo segredo na função: npx supabase secrets set PUSH_ALERTS_SECRET=<segredo>
-- Sem os segredos do Vault, o gatilho não faz nada (o app funciona normalmente).
--
-- LGPD: opt-in por aparelho (a permissão do sistema é pedida ao ligar); avaliação em
-- .lgpd/RIPD/ripd-social.md (A020). Inscrições saem ao desligar, ao sair da conta, ao excluir
-- a conta (cascata) ou quando o serviço de push diz que o aparelho não existe mais.
-- =====================================================================

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Aparelhos inscritos
-- ---------------------------------------------------------------------
-- O endpoint identifica o aparelho no serviço de push (Google, Apple, Mozilla). p256dh e auth são
-- as chaves públicas do navegador para cifrar a mensagem (só o aparelho consegue ler o conteúdo).
create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  endpoint      text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1024),
  p256dh        text not null check (length(p256dh) <= 256),
  auth          text not null check (length(auth) <= 64),
  created_at    timestamptz not null default now(),
  last_sent_at  timestamptz
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- O app só lê e apaga as próprias inscrições; grava pela função abaixo.
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Inscreve este aparelho para a conta logada (avisos de competição e de seguidores). O mesmo aparelho (endpoint) usado por outra conta
-- passa para a conta atual: avisos de uma conta nunca chegam a quem entrou depois.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
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

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_uid, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        created_at = case when public.push_subscriptions.user_id = excluded.user_id
                          then public.push_subscriptions.created_at else now() end;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Último estado de cada par (quem observa × competidor) na temporada
-- ---------------------------------------------------------------------
-- Guarda só a posição relativa (ahead · close · behind), para avisar UMA vez a cada mudança.
-- Só existe para quem tem aparelho inscrito; temporadas antigas são apagadas no cálculo.
create table public.competition_alert_states (
  watcher_id  uuid not null references auth.users (id) on delete cascade,
  rival_id    uuid not null references auth.users (id) on delete cascade,
  season      date not null,
  state       text not null check (state in ('ahead', 'close', 'behind')),
  updated_at  timestamptz not null default now(),
  primary key (watcher_id, rival_id, season)
);

alter table public.competition_alert_states enable row level security;
-- Sem políticas: nenhum acesso pelo app.

-- Pontos de uma pessoa na temporada (mesma soma da tela "Este mês": semanas cujo sábado cai no mês).
create or replace function public.competition_season_points(p_user_id uuid, p_season date)
returns integer
language sql stable
set search_path = ''
as $$
  select coalesce(sum(w.points), 0)::integer
    from public.competition_week_scores(p_user_id, public.local_today(p_user_id)) w
   where public.competition_season_of(w.week_start) = p_season;
$$;

-- Posição de quem observa em relação ao competidor.
create or replace function public.competition_alert_state(p_watcher_points integer, p_rival_points integer)
returns text
language sql immutable
set search_path = ''
as $$
  select case
           when p_rival_points > p_watcher_points then 'behind'
           when p_watcher_points - p_rival_points < 20 then 'close'
           else 'ahead'
         end;
$$;

-- Avisos gerados pela mudança de pontos de p_user_id (quem treinou ou informou o esforço).
-- Só avisa quem tem pontos na temporada (com 0 pontos ninguém "ultrapassa" você) e só na
-- transição: ahead → close ("chegando"), qualquer → behind ("ultrapassou"). A posição de quem
-- treinou em relação aos outros é atualizada sem aviso (foi a própria pessoa que mudou).
create or replace function public.compute_competition_alerts(p_user_id uuid)
returns table (recipient_id uuid, rival_id uuid, rival_name text, kind text, gap integer)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_today  date := public.local_today(p_user_id);
  v_season date := public.competition_season_of(v_today - extract(dow from v_today)::integer);
  v_mine   integer;
  v_name   text;
  v_watch_me boolean := exists (select 1 from public.push_subscriptions ps where ps.user_id = p_user_id);
  r        record;
  v_theirs integer;
  v_old    text;
  v_new    text;
begin
  delete from public.competition_alert_states s
   where (s.watcher_id = p_user_id or s.rival_id = p_user_id) and s.season < v_season;

  v_mine := public.competition_season_points(p_user_id, v_season);
  select coalesce(nullif(btrim(pr.name), ''), '@' || sp.handle) into v_name
    from public.social_profiles sp
    left join public.profiles pr on pr.id = sp.user_id
   where sp.user_id = p_user_id;

  for r in
    select c.competitor_id as cid,
           exists (select 1 from public.push_subscriptions ps where ps.user_id = c.competitor_id) as subscribed
      from public.competitors_of(p_user_id) c
  loop
    if not r.subscribed and not v_watch_me then
      continue;
    end if;
    v_theirs := public.competition_season_points(r.cid, v_season);

    if r.subscribed then
      v_new := public.competition_alert_state(v_theirs, v_mine);
      select s.state into v_old from public.competition_alert_states s
       where s.watcher_id = r.cid and s.rival_id = p_user_id and s.season = v_season;
      v_old := coalesce(v_old, 'ahead');

      if v_theirs > 0 and v_new = 'behind' and v_old <> 'behind' then
        recipient_id := r.cid; rival_id := p_user_id; rival_name := v_name;
        kind := 'overtaken'; gap := v_mine - v_theirs;
        return next;
      elsif v_theirs > 0 and v_new = 'close' and v_old = 'ahead' then
        recipient_id := r.cid; rival_id := p_user_id; rival_name := v_name;
        kind := 'close'; gap := v_theirs - v_mine;
        return next;
      end if;

      insert into public.competition_alert_states as s (watcher_id, rival_id, season, state)
      values (r.cid, p_user_id, v_season, v_new)
      on conflict (watcher_id, rival_id, season) do update set state = excluded.state, updated_at = now();
    end if;

    if v_watch_me then
      insert into public.competition_alert_states as s (watcher_id, rival_id, season, state)
      values (p_user_id, r.cid, v_season, public.competition_alert_state(v_mine, v_theirs))
      on conflict (watcher_id, rival_id, season) do update set state = excluded.state, updated_at = now();
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Avisos de seguidores
-- ---------------------------------------------------------------------
-- Último aviso por (quem recebe, quem agiu, tipo): seguir e deixar de seguir em sequência não
-- vira uma enxurrada de avisos (no máximo 1 por dia de cada tipo). Linhas com mais de 1 dia são
-- apagadas a cada chamada.
create table public.follow_alerts_sent (
  recipient_id  uuid not null references auth.users (id) on delete cascade,
  actor_id      uuid not null references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('new_follower', 'follow_request', 'request_accepted')),
  sent_at       timestamptz not null default now(),
  primary key (recipient_id, actor_id, kind)
);

alter table public.follow_alerts_sent enable row level security;
-- Sem políticas: nenhum acesso pelo app.

-- Aviso de seguidor, se o vínculo ainda está como no evento e não houve o mesmo aviso nas últimas
-- 24 h. new_follower e follow_request vão para quem é seguido; request_accepted, para quem seguiu.
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

  delete from public.follow_alerts_sent fas where fas.sent_at < now() - interval '1 day';

  if not exists (select 1 from public.follows f
                  where f.follower_id = p_follower_id and f.followee_id = p_followee_id and f.status = v_status)
     or public.is_blocked_between(p_follower_id, p_followee_id) then
    return;
  end if;

  insert into public.follow_alerts_sent as fas (recipient_id, actor_id, kind)
  values (v_recipient, v_actor, p_kind)
  on conflict (recipient_id, actor_id, kind) do nothing;
  if not found then
    return;
  end if;

  return query
  select v_recipient, v_actor, coalesce(nullif(btrim(pr.name), ''), '@' || sp.handle), sp.handle, p_kind
    from public.social_profiles sp
    left join public.profiles pr on pr.id = sp.user_id
   where sp.user_id = v_actor;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Gatilhos → Edge Function push-alerts
-- ---------------------------------------------------------------------
-- pg_net envia só depois do commit e em segundo plano: gravar o treino ou o vínculo não espera
-- nem falha por causa do aviso.
create or replace function public.post_push_alert(p_body jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select ds.decrypted_secret into v_url from vault.decrypted_secrets ds where ds.name = 'project_url';
  select ds.decrypted_secret into v_secret from vault.decrypted_secrets ds where ds.name = 'push_alerts_secret';
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/push-alerts',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-guf-secret', v_secret),
    body := p_body,
    timeout_milliseconds := 10000
  );
exception when others then
  -- O aviso é um extra: nunca impede a gravação que o disparou.
  return;
end;
$$;

create or replace function public.request_competition_alerts()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.competitors_of(new.user_id) c
      join public.push_subscriptions ps on ps.user_id = c.competitor_id
  ) then
    perform public.post_push_alert(jsonb_build_object('kind', 'competition', 'user_id', new.user_id));
  end if;
  return null;
end;
$$;

create or replace function public.request_follow_alert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_kind      text;
  v_recipient uuid;
begin
  if tg_op = 'INSERT' then
    v_kind := case new.status when 'accepted' then 'new_follower' else 'follow_request' end;
    v_recipient := new.followee_id;
  elsif old.status = 'pending' and new.status = 'accepted' then
    v_kind := 'request_accepted';
    v_recipient := new.follower_id;
  else
    return null;
  end if;

  if exists (select 1 from public.push_subscriptions ps where ps.user_id = v_recipient) then
    perform public.post_push_alert(jsonb_build_object(
      'kind', v_kind, 'follower_id', new.follower_id, 'followee_id', new.followee_id));
  end if;
  return null;
end;
$$;

create trigger on_workout_session_competition_alerts
  after update of status, session_rpe on public.workout_sessions
  for each row
  when (new.status = 'completed'
        and (old.status is distinct from 'completed' or new.session_rpe is distinct from old.session_rpe))
  execute function public.request_competition_alerts();

create trigger on_follow_push_alert
  after insert or update of status on public.follows
  for each row
  execute function public.request_follow_alert();

-- ---------------------------------------------------------------------
-- 5. Exportar meus dados (guf-export/4): inclui aparelhos inscritos e estado dos avisos
-- ---------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  v_result := jsonb_build_object(
    'formato',                   'guf-export/4',
    'exportado_em',              now(),
    'conta',                     (select jsonb_build_object(
                                     'id',                  u.id,
                                     'email',               u.email,
                                     'criada_em',           u.created_at,
                                     'email_confirmado_em', u.email_confirmed_at,
                                     'ultimo_acesso_em',    u.last_sign_in_at,
                                     'provedores',          u.raw_app_meta_data -> 'providers',
                                     'dados_do_cadastro',   u.raw_user_meta_data
                                   )
                                    from auth.users u where u.id = v_uid),
    'contas_vinculadas',         (select coalesce(jsonb_agg(jsonb_build_object(
                                     'provedor',         i.provider,
                                     'dados_recebidos',  i.identity_data,
                                     'vinculada_em',     i.created_at,
                                     'ultimo_acesso_em', i.last_sign_in_at
                                   ) order by i.created_at), '[]')
                                    from auth.identities i where i.user_id = v_uid),
    'perfil',                    (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'plano',                     (select to_jsonb(e) from public.entitlements e where e.user_id = v_uid),
    'exercicios_personalizados', (select coalesce(jsonb_agg(e), '[]') from public.exercises e where e.user_id = v_uid),
    'projetos',                  (select coalesce(jsonb_agg(p), '[]') from public.projects p where p.user_id = v_uid),
    'rotinas',                   (select coalesce(jsonb_agg(r), '[]') from public.routines r where r.user_id = v_uid),
    'exercicios_das_rotinas',    (select coalesce(jsonb_agg(re), '[]') from public.routine_exercises re where re.user_id = v_uid),
    'treinos',                   (select coalesce(jsonb_agg(s), '[]') from public.workout_sessions s where s.user_id = v_uid),
    'periodos_ativos',           (select coalesce(jsonb_agg(ap order by ap.started_at), '[]') from public.workout_active_periods ap where ap.user_id = v_uid),
    'exercicios_dos_treinos',    (select coalesce(jsonb_agg(se), '[]') from public.session_exercises se where se.user_id = v_uid),
    'series',                    (select coalesce(jsonb_agg(sl), '[]') from public.set_logs sl where sl.user_id = v_uid),
    'medidas',                   (select coalesce(jsonb_agg(m), '[]') from public.body_measurements m where m.user_id = v_uid),
    'valores_das_medidas',       (select coalesce(jsonb_agg(v), '[]') from public.measurement_values v where v.user_id = v_uid),
    'perfil_social',             (select to_jsonb(sp) from public.social_profiles sp where sp.user_id = v_uid),
    'seguidores_e_seguindo',     (select coalesce(jsonb_agg(jsonb_build_object(
                                     'tipo',            case when f.follower_id = v_uid then 'seguindo' else 'seguidor' end,
                                     'pessoa_id',       case when f.follower_id = v_uid then f.followee_id else f.follower_id end,
                                     'pessoa_usuario',  osp.handle,
                                     'status',          f.status,
                                     'pedido_em',       f.created_at,
                                     'aceito_em',       f.accepted_at
                                   ) order by f.created_at), '[]')
                                    from public.follows f
                                    left join public.social_profiles osp
                                      on osp.user_id = case when f.follower_id = v_uid then f.followee_id else f.follower_id end
                                   where f.follower_id = v_uid or f.followee_id = v_uid),
    'bloqueios',                 (select coalesce(jsonb_agg(jsonb_build_object(
                                     'pessoa_id',     b.blocked_id,
                                     'bloqueado_em',  b.created_at
                                   ) order by b.created_at), '[]')
                                    from public.blocks b where b.blocker_id = v_uid),
    'aparelhos_com_avisos',      (select coalesce(jsonb_agg(jsonb_build_object(
                                     'endereco_do_servico_de_push', ps.endpoint,
                                     'inscrito_em',                 ps.created_at,
                                     'ultimo_aviso_em',             ps.last_sent_at
                                   ) order by ps.created_at), '[]')
                                    from public.push_subscriptions ps where ps.user_id = v_uid),
    'avisos_da_competicao',      (select coalesce(jsonb_agg(jsonb_build_object(
                                     'competidor_id',  cas.rival_id,
                                     'temporada',      cas.season,
                                     'posicao',        cas.state,
                                     'atualizado_em',  cas.updated_at
                                   ) order by cas.season, cas.updated_at), '[]')
                                    from public.competition_alert_states cas where cas.watcher_id = v_uid),
    'consentimentos',            (select coalesce(jsonb_agg(jsonb_build_object(
                                     'id',             c.id,
                                     'documento',      d.doc_type,
                                     'versao',         d.version,
                                     'hash_do_texto',  d.content_hash,
                                     'acao',           c.action,
                                     'origem',         c.source,
                                     'plataforma',     c.platform,
                                     'registrado_em',  c.created_at
                                   ) order by c.created_at), '[]')
                                    from public.consent_records c
                                    join public.legal_documents d on d.id = c.document_id
                                   where c.user_id = v_uid)
  );

  perform public.audit_log_append('data_exported', v_uid, jsonb_build_object(
    'format', 'guf-export/4',
    'workouts', jsonb_array_length(v_result -> 'treinos'),
    'measurements', jsonb_array_length(v_result -> 'medidas')
  ));

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Permissões
-- ---------------------------------------------------------------------
revoke all on public.competition_alert_states from anon, authenticated;
revoke all on public.follow_alerts_sent from anon, authenticated;
revoke insert, update on public.push_subscriptions from anon, authenticated;
revoke all on public.push_subscriptions from anon;

revoke execute on function
  public.competition_season_points(uuid, date),
  public.competition_alert_state(integer, integer),
  public.compute_competition_alerts(uuid),
  public.build_follow_alert(uuid, uuid, text),
  public.post_push_alert(jsonb),
  public.request_competition_alerts(),
  public.request_follow_alert()
from public, anon, authenticated;

grant execute on function
  public.compute_competition_alerts(uuid),
  public.build_follow_alert(uuid, uuid, text)
to service_role;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
