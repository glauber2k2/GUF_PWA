-- =====================================================================
-- GUF APP · Tempo efetivo de treino (períodos ativos, com pausas)
--
-- started_at / finished_at continuam sendo o início e o fim reais do treino.
-- workout_active_periods guarda cada trecho em que o treino estava RODANDO:
-- pausar fecha o período aberto; retomar abre outro. Tempo efetivo = soma dos períodos.
-- Ao finalizar, o total vai para workout_sessions.active_seconds (histórico sem recálculo).
-- pause_workout/resume_workout aceitam o horário real (p_at) para a fila offline do app.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PERÍODOS ATIVOS
-- ---------------------------------------------------------------------
create table public.workout_active_periods (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.workout_sessions (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,  -- preenchido por gatilho
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,                                               -- nulo = período em andamento
  created_at  timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create index workout_active_periods_session_idx on public.workout_active_periods (session_id, started_at);
create index workout_active_periods_user_idx on public.workout_active_periods (user_id);
-- No máximo 1 período aberto por treino (dois toques em "Retomar" não duplicam).
create unique index workout_active_periods_one_open
  on public.workout_active_periods (session_id) where ended_at is null;

-- user_id copiado da sessão (mesmo gatilho de session_exercises).
create trigger workout_active_periods_fill before insert or update of session_id
  on public.workout_active_periods for each row execute function public.fill_from_session();

alter table public.workout_active_periods enable row level security;

create policy "períodos do treino: acesso total aos próprios" on public.workout_active_periods
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Tempo efetivo gravado ao finalizar (segundos).
alter table public.workout_sessions
  add column active_seconds integer check (active_seconds >= 0);

-- ---------------------------------------------------------------------
-- Novo treino → abre o primeiro período no horário de início
-- ---------------------------------------------------------------------
create or replace function public.open_first_active_period()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'in_progress' then
    insert into public.workout_active_periods (session_id, started_at)
    values (new.id, new.started_at);
  end if;
  return new;
end;
$$;

create trigger workout_sessions_open_first_period
  after insert on public.workout_sessions
  for each row execute function public.open_first_active_period();

-- ---------------------------------------------------------------------
-- Pausar: fecha o período aberto (sem período aberto = já pausado → nada a fazer)
-- p_at: horário real da pausa (fila offline); nunca no futuro nem antes do início do período.
-- ---------------------------------------------------------------------
create or replace function public.pause_workout(p_session_id uuid, p_at timestamptz default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_at timestamptz := least(coalesce(p_at, now()), now());
begin
  if not exists (
    select 1 from public.workout_sessions
     where id = p_session_id and user_id = v_uid and status = 'in_progress'
  ) then
    raise exception 'Treino em andamento não encontrado' using errcode = 'P0002';
  end if;

  update public.workout_active_periods
     set ended_at = greatest(v_at, started_at)
   where session_id = p_session_id and ended_at is null;
end;
$$;

-- ---------------------------------------------------------------------
-- Retomar: abre um período novo (já rodando → nada a fazer)
-- p_at: horário real da retomada; nunca no futuro, antes do início do treino
-- nem antes do fim do período anterior.
-- ---------------------------------------------------------------------
create or replace function public.resume_workout(p_session_id uuid, p_at timestamptz default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.workout_sessions;
  v_at timestamptz := least(coalesce(p_at, now()), now());
  v_last_end timestamptz;
begin
  select * into v_session
    from public.workout_sessions
   where id = p_session_id and user_id = v_uid and status = 'in_progress';
  if not found then
    raise exception 'Treino em andamento não encontrado' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.workout_active_periods
     where session_id = p_session_id and ended_at is null
  ) then
    return;
  end if;

  select max(ended_at) into v_last_end
    from public.workout_active_periods
   where session_id = p_session_id;

  insert into public.workout_active_periods (session_id, started_at)
  values (p_session_id, greatest(v_at, v_session.started_at, coalesce(v_last_end, v_session.started_at)));
end;
$$;

-- ---------------------------------------------------------------------
-- FINALIZAR (redefinida): fecha o período aberto, grava o tempo efetivo e
-- devolve duration_seconds = tempo efetivo (+ elapsed_seconds e pauses).
-- Recorde de carga passa a trazer as repetições da série (reps).
-- ---------------------------------------------------------------------
create or replace function public.finish_workout(p_session_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_now timestamptz := now();
  v_session public.workout_sessions;
  v_active integer;
  v_periods integer;
  v_summary jsonb;
  v_prs jsonb;
begin
  select * into v_session
    from public.workout_sessions
   where id = p_session_id and user_id = v_uid and status = 'in_progress';

  if not found then
    raise exception 'Treino em andamento não encontrado' using errcode = 'P0002';
  end if;

  delete from public.set_logs
   where session_id = p_session_id and not is_completed;

  delete from public.session_exercises se
   where se.session_id = p_session_id
     and not exists (select 1 from public.set_logs sl where sl.session_exercise_id = se.id);

  -- Encerra o período em andamento no momento da finalização.
  update public.workout_active_periods
     set ended_at = greatest(v_now, started_at)
   where session_id = p_session_id and ended_at is null;

  select coalesce(sum(extract(epoch from (p.ended_at - p.started_at))), 0)::integer, count(*)::integer
    into v_active, v_periods
    from public.workout_active_periods p
   where p.session_id = p_session_id;

  -- Treino sem períodos (não deveria acontecer): usa início → fim.
  if v_periods = 0 then
    v_active := extract(epoch from (v_now - v_session.started_at))::integer;
  end if;

  update public.workout_sessions
     set status = 'completed', finished_at = v_now, active_seconds = greatest(v_active, 0)
   where id = p_session_id
  returning * into v_session;

  -- Recordes: compara este treino com todos os treinos concluídos anteriores
  with cur_sets as (
    select sl.exercise_id, sl.weight_kg, sl.reps
      from public.set_logs sl
     where sl.session_id = p_session_id and sl.set_type <> 'warmup'
  ),
  current_best as (
    select exercise_id,
           max(weight_kg) as max_weight,
           max(weight_kg * (1 + reps / 30.0)) filter (where reps > 0) as best_e1rm
      from cur_sets
     group by exercise_id
  ),
  current_best_reps as (
    select c.exercise_id, max(s.reps) as reps_at_max
      from current_best c
      join cur_sets s on s.exercise_id = c.exercise_id and s.weight_kg = c.max_weight
     group by c.exercise_id
  ),
  previous_best as (
    select sl.exercise_id,
           max(sl.weight_kg) as max_weight,
           max(sl.weight_kg * (1 + sl.reps / 30.0)) filter (where sl.reps > 0) as best_e1rm
      from public.set_logs sl
      join public.workout_sessions ws on ws.id = sl.session_id
     where sl.user_id = v_uid
       and sl.is_completed
       and sl.set_type <> 'warmup'
       and ws.status = 'completed'
       and ws.id <> p_session_id
       and sl.exercise_id in (select exercise_id from current_best)
     group by sl.exercise_id
  ),
  prs as (
    select c.exercise_id, e.name, 'max_weight' as pr_type,
           c.max_weight as value, p.max_weight as previous, r.reps_at_max as reps
      from current_best c
      join public.exercises e on e.id = c.exercise_id
      join previous_best p on p.exercise_id = c.exercise_id
      left join current_best_reps r on r.exercise_id = c.exercise_id
     where c.max_weight > p.max_weight
    union all
    select c.exercise_id, e.name, 'best_e1rm',
           round(c.best_e1rm, 1), round(p.best_e1rm, 1), null::smallint
      from current_best c
      join public.exercises e on e.id = c.exercise_id
      join previous_best p on p.exercise_id = c.exercise_id
     where c.best_e1rm > p.best_e1rm
  )
  select coalesce(jsonb_agg(to_jsonb(prs)), '[]'::jsonb) into v_prs from prs;
  -- Observação: a primeira vez de um exercício não conta como PR (não há base de comparação).

  select jsonb_build_object(
           'session_id', v_session.id,
           'name', v_session.name,
           'performed_on', v_session.performed_on,
           'duration_seconds', v_session.active_seconds,
           'elapsed_seconds', extract(epoch from (v_session.finished_at - v_session.started_at))::integer,
           'pauses', greatest(v_periods - 1, 0),
           'exercises', (select count(*) from public.session_exercises where session_id = p_session_id),
           'sets', (select count(*) from public.set_logs where session_id = p_session_id and set_type <> 'warmup'),
           'total_volume_kg', (select coalesce(sum(weight_kg * reps), 0)
                                 from public.set_logs
                                where session_id = p_session_id and set_type <> 'warmup'),
           'personal_records', v_prs
         ) into v_summary;

  return v_summary;
end;
$$;

-- ---------------------------------------------------------------------
-- Treinos já existentes: um período (início → fim) e o tempo efetivo
-- ---------------------------------------------------------------------
insert into public.workout_active_periods (session_id, user_id, started_at, ended_at)
select ws.id, ws.user_id, ws.started_at,
       case when ws.status = 'completed' then coalesce(ws.finished_at, ws.started_at) end
  from public.workout_sessions ws
 where not exists (select 1 from public.workout_active_periods p where p.session_id = ws.id);

update public.workout_sessions
   set active_seconds = greatest(extract(epoch from (finished_at - started_at))::integer, 0)
 where status = 'completed' and finished_at is not null and active_seconds is null;

-- ---------------------------------------------------------------------
-- PERMISSÕES: funções de dados só para usuários logados; gatilho para ninguém.
-- ---------------------------------------------------------------------
revoke execute on function
  public.pause_workout(uuid, timestamptz),
  public.resume_workout(uuid, timestamptz)
from public, anon;

grant execute on function
  public.pause_workout(uuid, timestamptz),
  public.resume_workout(uuid, timestamptz)
to authenticated;

revoke execute on function public.open_first_active_period() from public, anon, authenticated;
