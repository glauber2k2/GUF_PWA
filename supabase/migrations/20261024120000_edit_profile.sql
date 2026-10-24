-- =====================================================================
-- GUF APP · Editar perfil (protótipo Claude Design "Editar Perfil")
--
-- 1. profiles.bio (até 150 caracteres), training_goals (objetivos do catálogo) e
--    experience_level (iniciante · intermediário · avançado). Opcionais, escritos pela própria
--    pessoa (RLS "perfil: editar o próprio" já cobre).
-- 2. Quem vê (get_member_profile): a bio faz parte do cartão (qualquer conta logada, como nome e
--    foto); objetivos e experiência só para quem pode ver os treinos (`unlocked`). Nada disso vai
--    para o GUF AI, o painel ou as notificações. RIPD social v0.5.
-- 3. Foto enviada: bucket público `avatars`, pasta `<user_id>/` (só o dono grava, troca e apaga);
--    `profiles.avatar_url` guarda o caminho. Um caminho de outra pessoa é recusado pela regra
--    abaixo (NOT VALID: só vale para gravações novas).
-- 4. clear_uploaded_avatar(): ao remover a foto enviada, volta para a foto da conta social (a mesma
--    que sync_social_avatar copiaria) ou para a inicial.
-- export_my_data já leva as colunas novas (to_jsonb do perfil inteiro).
-- =====================================================================

alter table public.profiles
  add column bio text,
  add column training_goals text[] not null default '{}',
  add column experience_level text;

alter table public.profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) between 1 and 150),
  add constraint profiles_training_goals_known check (
    training_goals <@ array['hypertrophy', 'strength', 'weight_loss', 'conditioning', 'health']::text[]
  ),
  add constraint profiles_experience_level_known check (
    experience_level is null or experience_level in ('beginner', 'intermediate', 'advanced')
  ),
  add constraint profiles_avatar_url_owner check (
    avatar_url is null or avatar_url ~* '^https?://' or avatar_url like id::text || '/%'
  ) not valid;

comment on column public.profiles.bio is 'Bio do perfil social (até 150 caracteres). Visível no cartão do perfil.';
comment on column public.profiles.training_goals is 'Objetivos de treino (catálogo fixo). Visível só para quem pode ver os treinos.';
comment on column public.profiles.experience_level is 'Experiência de treino (beginner · intermediate · advanced). Visível só para quem pode ver os treinos.';

-- ---------------------------------------------------------------------
-- Foto do perfil (Storage)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars: ver os próprios arquivos" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: enviar na própria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: trocar na própria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: apagar da própria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Remover a foto enviada: volta para a foto da conta social mais recente (ou nenhuma).
create or replace function public.clear_uploaded_avatar()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  update public.profiles p
     set avatar_url = (
       select coalesce(i.identity_data ->> 'avatar_url', i.identity_data ->> 'picture')
         from auth.identities i
        where i.user_id = v_uid
          and coalesce(i.identity_data ->> 'avatar_url', i.identity_data ->> 'picture') ~* '^https?://'
        order by i.updated_at desc nulls last
        limit 1
     )
   where p.id = v_uid;
end;
$$;

revoke execute on function public.clear_uploaded_avatar() from public, anon;
grant execute on function public.clear_uploaded_avatar() to authenticated;

-- ---------------------------------------------------------------------
-- Perfil social: + bio (cartão), objetivos e experiência (desbloqueado)
-- O retorno muda: drop + create (mesmas permissões da versão anterior).
-- ---------------------------------------------------------------------
drop function public.get_member_profile(uuid);

create function public.get_member_profile(p_user_id uuid default null)
returns table (
  user_id             uuid,
  handle              text,
  name                text,
  avatar_url          text,
  bio                 text,
  training_goals      text[],
  experience_level    text,
  visibility          text,
  history_hidden      boolean,
  is_self             boolean,
  relationship        text,
  follows_you         boolean,
  is_competitor       boolean,
  unlocked            boolean,
  history_visible     boolean,
  followers_count     integer,
  following_count     integer,
  workouts_count      integer,
  first_workout_on    date,
  current_streak      integer,
  best_streak         integer,
  recent_weeks        boolean[]
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid      uuid := (select auth.uid());
  v_owner    uuid := coalesce(p_user_id, (select auth.uid()));
  v_unlocked boolean;
  v_today    date;
  v_week     date;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if v_owner = v_uid then
    perform public.ensure_social_profile(v_uid);
  end if;
  if not exists (select 1 from public.social_profiles sp where sp.user_id = v_owner)
     or public.is_blocked_between(v_uid, v_owner) then
    raise exception 'Pessoa não encontrada' using errcode = 'GS004';
  end if;

  v_unlocked := public.can_view_member(v_uid, v_owner);
  v_today    := public.local_today(v_owner);
  v_week     := v_today - extract(dow from v_today)::integer;

  return query
  with streak as (
    select * from public.streak_for(v_owner)
  ),
  trained_weeks as (
    select distinct (ws.performed_on - extract(dow from ws.performed_on)::integer) as wk
      from public.workout_sessions ws
     where ws.user_id = v_owner and ws.status = 'completed'
       and ws.performed_on >= v_week - 7 * 7
  )
  select sp.user_id, sp.handle, pr.name, pr.avatar_url, pr.bio,
         case when v_unlocked then coalesce(pr.training_goals, '{}') end,
         case when v_unlocked then pr.experience_level end,
         sp.visibility, sp.history_hidden,
         v_owner = v_uid,
         public.social_relationship(v_uid, v_owner),
         exists (select 1 from public.follows f
                  where f.follower_id = v_owner and f.followee_id = v_uid and f.status = 'accepted'),
         exists (select 1 from public.competitors_of(v_uid) c where c.competitor_id = v_owner),
         v_unlocked,
         public.can_view_member_history(v_uid, v_owner),
         (select count(*) from public.follows f where f.followee_id = v_owner and f.status = 'accepted')::integer,
         (select count(*) from public.follows f where f.follower_id = v_owner and f.status = 'accepted')::integer,
         case when v_unlocked then
           (select count(*) from public.workout_sessions ws where ws.user_id = v_owner and ws.status = 'completed')::integer
         end,
         case when v_unlocked then
           (select min(ws.performed_on) from public.workout_sessions ws where ws.user_id = v_owner and ws.status = 'completed')
         end,
         case when v_unlocked then (select s.current_streak from streak s) end,
         case when v_unlocked then (select s.best_streak from streak s) end,
         case when v_unlocked then
           array(select exists (select 1 from trained_weeks t where t.wk = v_week - 7 * g)
                   from generate_series(7, 0, -1) g order by g desc)
         end
    from public.social_profiles sp
    left join public.profiles pr on pr.id = sp.user_id
   where sp.user_id = v_owner;
end;
$$;

revoke execute on function public.get_member_profile(uuid) from public, anon;
grant execute on function public.get_member_profile(uuid) to authenticated;
