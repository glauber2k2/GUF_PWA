-- =====================================================================
-- Editar um treino concluído (resumo → "Editar treino")
--
-- 1. workout_sessions.measured_active_seconds: tempo efetivo MEDIDO ao finalizar (nunca muda).
--    active_seconds passa a poder ser corrigido pelo dono (save_workout_edit); todas as telas
--    continuam lendo active_seconds.
-- 2. Competição: a sessão vale pelo MENOR entre o tempo corrigido e o medido. Corrigir para
--    menos vale; aumentar o tempo não cria sessão válida (≥ 20 min) que não foi medida.
-- 3. save_workout_edit: grava numa transação o tempo, a observação, os exercícios (ordem,
--    observação) e as séries concluídas. Séries não concluídas e exercícios sem séries saem
--    (mesma regra do finish_workout). Recordes não são gravados: são calculados na leitura.
--
-- Erros próprios: GW001 treino concluído não encontrado · GW002 treino sem séries concluídas ·
-- GW003 exercício inexistente ou de outra pessoa.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tempo medido
-- ---------------------------------------------------------------------
alter table public.workout_sessions
  add column measured_active_seconds integer check (measured_active_seconds >= 0);

comment on column public.workout_sessions.measured_active_seconds is
  'Tempo efetivo medido pelo servidor ao finalizar (soma dos períodos). Não muda quando o dono corrige active_seconds; a competição usa o menor dos dois.';

update public.workout_sessions
   set measured_active_seconds = active_seconds
 where status = 'completed' and active_seconds is not null;

-- Guarda o tempo medido no momento em que o treino é concluído (finish_workout, escrita direta
-- do app ou finalização automática). O nome ordena DEPOIS de workout_sessions_guard, que é quem
-- calcula active_seconds na escrita direta.
create or replace function public.keep_measured_active_seconds()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.measured_active_seconds := new.active_seconds;
  elsif tg_op = 'UPDATE' then
    new.measured_active_seconds := old.measured_active_seconds;
  end if;
  return new;
end;
$$;

create trigger workout_sessions_measured_time
  before insert or update on public.workout_sessions
  for each row execute function public.keep_measured_active_seconds();

revoke execute on function public.keep_measured_active_seconds() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Competição: minutos = menor entre o corrigido e o medido
--    (mesmo corpo de 20261020012117_competition_scoring_without_rpe, só muda "minutes")
-- ---------------------------------------------------------------------
create or replace function public.competition_session_scores(p_user_id uuid, p_from date, p_to date)
returns table (
  session_id          uuid,
  training_day        date,
  week_start          date,
  minutes_considered  numeric,
  is_valid            boolean,
  volume              numeric,
  records             integer,
  counted             boolean
)
language sql stable
set search_path = ''
as $$
  with zone as (
    select coalesce((select p.timezone from public.profiles p where p.id = p_user_id), 'America/Sao_Paulo') as tz
  ),
  sessions as (
    select s.id as sid,
           (s.started_at at time zone z.tz)::date as day,
           least(
             coalesce(s.active_seconds, extract(epoch from (s.finished_at - s.started_at))),
             coalesce(s.measured_active_seconds, s.active_seconds, extract(epoch from (s.finished_at - s.started_at)))
           )::numeric / 60 as minutes
      from public.workout_sessions s
      cross join zone z
     where s.user_id = p_user_id and s.status = 'completed'
       and (s.started_at at time zone z.tz)::date between p_from and p_to
  ),
  volumes as (
    select sl.session_id as sid, sum(sl.weight_kg * sl.reps) as volume
      from public.set_logs sl
     where sl.session_id in (select x.sid from sessions x)
       and sl.is_completed and sl.set_type <> 'warmup'
       and sl.weight_kg is not null and sl.reps is not null
     group by sl.session_id
  ),
  records as (
    select r.session_id as sid, r.records from public.session_load_records(p_user_id) r
  ),
  scored as (
    select x.sid, x.day,
           x.day - extract(dow from x.day)::integer as wk,
           x.minutes,
           x.minutes >= cp.min_minutes as valid,
           least(x.minutes, cp.max_minutes) as considered,
           coalesce(v.volume, 0) as volume,
           coalesce(r.records, 0) as records
      from sessions x
      left join volumes v on v.sid = x.sid
      left join records r on r.sid = x.sid
      cross join lateral public.competition_params_for(
        public.competition_season_of(x.day - extract(dow from x.day)::integer)) cp
  )
  select sc.sid, sc.day, sc.wk, round(sc.considered, 1), sc.valid, round(sc.volume, 1), sc.records,
         sc.valid and row_number() over (partition by sc.day order by sc.valid desc, sc.volume desc, sc.sid) = 1
    from scored sc;
$$;

-- ---------------------------------------------------------------------
-- 3. Salvar a edição
-- ---------------------------------------------------------------------
-- p_exercises: [{ id, exercise_id, position, note, sets: [{ id, set_number, set_type, weight_kg, reps }] }]
-- ids gerados no aparelho (reenviar a mesma edição não duplica).
-- SECURITY DEFINER: o gatilho workout_sessions_guard impede o app de mudar o tempo de um treino
-- concluído; esta função é o único caminho e confere o dono de tudo o que toca.
create or replace function public.save_workout_edit(
  p_session_id     uuid,
  p_active_seconds integer,
  p_note           text,
  p_exercises      jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_exercise jsonb;
  v_set jsonb;
  v_exercise_ids uuid[] := '{}';
  v_set_ids uuid[] := '{}';
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  perform 1 from public.workout_sessions s
   where s.id = p_session_id and s.user_id = v_uid and s.status = 'completed'
   for update;
  if not found then
    raise exception 'Treino concluído não encontrado' using errcode = 'GW001';
  end if;

  if p_active_seconds is null or p_active_seconds not between 60 and 86400 then
    raise exception 'O tempo do treino vai de 1 minuto a 24 horas' using errcode = '22023';
  end if;
  if jsonb_typeof(p_exercises) is distinct from 'array' then
    raise exception 'Lista de exercícios inválida' using errcode = '22023';
  end if;

  -- Exercícios: só da biblioteca global ou do próprio usuário; um id já usado em outro treino é recusado.
  for v_exercise in select * from jsonb_array_elements(p_exercises) loop
    if jsonb_array_length(coalesce(v_exercise -> 'sets', '[]'::jsonb)) = 0 then
      continue;
    end if;
    if not exists (
      select 1 from public.exercises e
       where e.id = (v_exercise ->> 'exercise_id')::uuid and (e.user_id is null or e.user_id = v_uid)
    ) then
      raise exception 'Exercício não encontrado' using errcode = 'GW003';
    end if;
    if exists (
      select 1 from public.session_exercises se
       where se.id = (v_exercise ->> 'id')::uuid and se.session_id <> p_session_id
    ) then
      raise exception 'Exercício de outro treino' using errcode = '42501';
    end if;
    v_exercise_ids := v_exercise_ids || (v_exercise ->> 'id')::uuid;

    for v_set in select * from jsonb_array_elements(v_exercise -> 'sets') loop
      if exists (
        select 1 from public.set_logs sl
         where sl.id = (v_set ->> 'id')::uuid and sl.session_id <> p_session_id
      ) then
        raise exception 'Série de outro treino' using errcode = '42501';
      end if;
      v_set_ids := v_set_ids || (v_set ->> 'id')::uuid;
    end loop;
  end loop;

  if cardinality(v_set_ids) = 0 then
    raise exception 'O treino precisa de pelo menos uma série concluída' using errcode = 'GW002';
  end if;

  update public.workout_sessions
     set active_seconds = p_active_seconds,
         notes = nullif(btrim(p_note), '')
   where id = p_session_id;

  delete from public.set_logs
   where session_id = p_session_id and not (id = any (v_set_ids));
  delete from public.session_exercises
   where session_id = p_session_id and not (id = any (v_exercise_ids));

  for v_exercise in select * from jsonb_array_elements(p_exercises) loop
    if not ((v_exercise ->> 'id')::uuid = any (v_exercise_ids)) then
      continue;
    end if;

    insert into public.session_exercises (id, session_id, exercise_id, position, notes)
    values (
      (v_exercise ->> 'id')::uuid,
      p_session_id,
      (v_exercise ->> 'exercise_id')::uuid,
      (v_exercise ->> 'position')::integer,
      nullif(btrim(v_exercise ->> 'note'), '')
    )
    on conflict (id) do update
      set exercise_id = excluded.exercise_id,
          position = excluded.position,
          notes = excluded.notes;

    for v_set in select * from jsonb_array_elements(v_exercise -> 'sets') loop
      insert into public.set_logs (id, session_exercise_id, set_number, set_type, weight_kg, reps, is_completed)
      values (
        (v_set ->> 'id')::uuid,
        (v_exercise ->> 'id')::uuid,
        (v_set ->> 'set_number')::smallint,
        coalesce(v_set ->> 'set_type', 'normal'),
        (v_set ->> 'weight_kg')::numeric,
        (v_set ->> 'reps')::smallint,
        true
      )
      on conflict (id) do update
        set session_exercise_id = excluded.session_exercise_id,
            set_number = excluded.set_number,
            set_type = excluded.set_type,
            weight_kg = excluded.weight_kg,
            reps = excluded.reps,
            is_completed = true;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.save_workout_edit(uuid, integer, text, jsonb) from public, anon;
grant execute on function public.save_workout_edit(uuid, integer, text, jsonb) to authenticated;
