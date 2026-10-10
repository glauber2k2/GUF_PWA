-- =====================================================================
-- GUF APP · Migration 5 · Funções de negócio (RPC)
-- Todas rodam com as permissões do usuário (SECURITY INVOKER): o RLS continua valendo.
-- Chamadas no app: supabase.rpc('nome_da_funcao', { parametros })
-- 1RM estimado pela fórmula de Epley: carga × (1 + reps / 30). Aquecimentos são ignorados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FINALIZAR TREINO
-- Remove séries não concluídas e exercícios vazios, marca como concluído
-- e devolve o resumo com os recordes pessoais batidos (para a celebração).
-- ---------------------------------------------------------------------
create or replace function public.finish_workout(p_session_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.workout_sessions;
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

  update public.workout_sessions
     set status = 'completed', finished_at = now()
   where id = p_session_id
  returning * into v_session;

  -- Recordes: compara este treino com todos os treinos concluídos anteriores
  with current_best as (
    select sl.exercise_id,
           max(sl.weight_kg) as max_weight,
           max(sl.weight_kg * (1 + sl.reps / 30.0)) filter (where sl.reps > 0) as best_e1rm
      from public.set_logs sl
     where sl.session_id = p_session_id and sl.set_type <> 'warmup'
     group by sl.exercise_id
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
           c.max_weight as value, p.max_weight as previous
      from current_best c
      join public.exercises e on e.id = c.exercise_id
      join previous_best p on p.exercise_id = c.exercise_id
     where c.max_weight > p.max_weight
    union all
    select c.exercise_id, e.name, 'best_e1rm',
           round(c.best_e1rm, 1), round(p.best_e1rm, 1)
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
           'duration_seconds', extract(epoch from (v_session.finished_at - v_session.started_at))::integer,
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
-- COLUNA "ANTERIOR": séries da última vez em que cada exercício foi feito
-- ---------------------------------------------------------------------
create or replace function public.get_last_performance(p_exercise_ids uuid[])
returns table (
  exercise_id   uuid,
  set_number    smallint,
  weight_kg     numeric,
  reps          smallint,
  set_type      text,
  performed_on  date
)
language sql stable
set search_path = ''
as $$
  with last_session as (
    select distinct on (sl.exercise_id)
           sl.exercise_id, sl.session_id, ws.performed_on
      from public.set_logs sl
      join public.workout_sessions ws on ws.id = sl.session_id
     where sl.user_id = (select auth.uid())
       and sl.exercise_id = any (p_exercise_ids)
       and sl.is_completed
       and ws.status = 'completed'
     order by sl.exercise_id, ws.started_at desc
  )
  select sl.exercise_id, sl.set_number, sl.weight_kg, sl.reps, sl.set_type, ls.performed_on
    from last_session ls
    join public.set_logs sl
      on sl.session_id = ls.session_id
     and sl.exercise_id = ls.exercise_id
     and sl.is_completed
   order by sl.exercise_id, sl.set_number;
$$;

-- ---------------------------------------------------------------------
-- HISTÓRICO DE EVOLUÇÃO DE UM EXERCÍCIO (um ponto por treino, para os gráficos)
-- ---------------------------------------------------------------------
create or replace function public.get_exercise_history(
  p_exercise_id uuid,
  p_from date default null
)
returns table (
  session_id       uuid,
  performed_on     date,
  max_weight_kg    numeric,
  best_e1rm_kg     numeric,
  total_volume_kg  numeric,
  total_sets       integer,
  total_reps       integer
)
language sql stable
set search_path = ''
as $$
  select ws.id,
         ws.performed_on,
         max(sl.weight_kg),
         round(max(sl.weight_kg * (1 + sl.reps / 30.0)) filter (where sl.reps > 0), 1),
         coalesce(sum(sl.weight_kg * sl.reps), 0),
         count(*)::integer,
         coalesce(sum(sl.reps), 0)::integer
    from public.set_logs sl
    join public.workout_sessions ws on ws.id = sl.session_id
   where sl.user_id = (select auth.uid())
     and sl.exercise_id = p_exercise_id
     and sl.is_completed
     and sl.set_type <> 'warmup'
     and ws.status = 'completed'
     and (p_from is null or ws.performed_on >= p_from)
   group by ws.id, ws.performed_on
   order by ws.performed_on, ws.id;
$$;

-- ---------------------------------------------------------------------
-- RECORDES PESSOAIS DE UM EXERCÍCIO
-- ---------------------------------------------------------------------
create or replace function public.get_exercise_records(p_exercise_id uuid)
returns jsonb
language sql stable
set search_path = ''
as $$
  with h as (select * from public.get_exercise_history(p_exercise_id))
  select jsonb_build_object(
    'max_weight',  (select jsonb_build_object('value', max_weight_kg, 'performed_on', performed_on)
                      from h order by max_weight_kg desc nulls last, performed_on limit 1),
    'best_e1rm',   (select jsonb_build_object('value', best_e1rm_kg, 'performed_on', performed_on)
                      from h order by best_e1rm_kg desc nulls last, performed_on limit 1),
    'best_volume', (select jsonb_build_object('value', total_volume_kg, 'performed_on', performed_on)
                      from h order by total_volume_kg desc nulls last, performed_on limit 1),
    'sessions',    (select count(*) from h)
  );
$$;

-- ---------------------------------------------------------------------
-- CALENDÁRIO: dias treinados em um intervalo
-- ---------------------------------------------------------------------
create or replace function public.get_training_days(p_from date, p_to date)
returns table (
  performed_on     date,
  sessions         integer,
  total_volume_kg  numeric
)
language sql stable
set search_path = ''
as $$
  select ws.performed_on,
         count(distinct ws.id)::integer,
         coalesce(sum(sl.weight_kg * sl.reps) filter (where sl.set_type <> 'warmup'), 0)
    from public.workout_sessions ws
    left join public.set_logs sl on sl.session_id = ws.id and sl.is_completed
   where ws.user_id = (select auth.uid())
     and ws.status = 'completed'
     and ws.performed_on between p_from and p_to
   group by ws.performed_on
   order by ws.performed_on;
$$;

-- ---------------------------------------------------------------------
-- STREAK: semanas seguidas atingindo a meta semanal (semana de segunda a domingo)
-- A semana atual só conta quando a meta é atingida; enquanto não for,
-- ela não quebra a sequência (o usuário ainda tem tempo).
-- ---------------------------------------------------------------------
create or replace function public.get_streak()
returns table (
  current_streak      integer,
  best_streak         integer,
  current_week_count  integer,
  weekly_goal         integer
)
language sql stable
set search_path = ''
as $$
  with params as (
    select p.weekly_goal::integer as goal,
           date_trunc('week', (now() at time zone p.timezone))::date as cur_week
      from public.profiles p
     where p.id = (select auth.uid())
  ),
  weeks_done as (
    select date_trunc('week', ws.performed_on)::date as wk, count(*)::integer as n
      from public.workout_sessions ws
     where ws.user_id = (select auth.uid()) and ws.status = 'completed'
     group by 1
  ),
  series as (
    select g::date as wk
      from params,
           generate_series(
             (select coalesce(min(wk), params.cur_week) from weeks_done),
             params.cur_week,
             interval '1 week') as g
  ),
  marked as (
    select s.wk,
           coalesce(w.n, 0) >= p.goal as met,
           s.wk = p.cur_week as is_current
      from series s
      cross join params p
      left join weeks_done w on w.wk = s.wk
  ),
  counted as (
    select * from marked where not (is_current and not met)
  ),
  last_break as (
    select max(wk) as wk from counted where not met
  ),
  islands as (
    select met,
           row_number() over (order by wk) - row_number() over (partition by met order by wk) as grp
      from counted
  )
  select
    (select count(*)::integer from counted
      where met and wk > coalesce((select wk from last_break), '-infinity'::date)),
    coalesce((select max(cnt)::integer from (
               select count(*) as cnt from islands where met group by grp) t), 0),
    coalesce((select w.n from weeks_done w, params p where w.wk = p.cur_week), 0),
    (select goal from params);
$$;

-- ---------------------------------------------------------------------
-- LGPD · EXPORTAR MEUS DADOS (direito de portabilidade/acesso)
-- ---------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'exportado_em',            now(),
    'perfil',                  (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'plano',                   (select to_jsonb(e) from public.entitlements e where e.user_id = (select auth.uid())),
    'exercicios_personalizados', (select coalesce(jsonb_agg(e), '[]') from public.exercises e where e.user_id = (select auth.uid())),
    'projetos',                (select coalesce(jsonb_agg(p), '[]') from public.projects p where p.user_id = (select auth.uid())),
    'rotinas',                 (select coalesce(jsonb_agg(r), '[]') from public.routines r where r.user_id = (select auth.uid())),
    'exercicios_das_rotinas',  (select coalesce(jsonb_agg(re), '[]') from public.routine_exercises re where re.user_id = (select auth.uid())),
    'treinos',                 (select coalesce(jsonb_agg(s), '[]') from public.workout_sessions s where s.user_id = (select auth.uid())),
    'exercicios_dos_treinos',  (select coalesce(jsonb_agg(se), '[]') from public.session_exercises se where se.user_id = (select auth.uid())),
    'series',                  (select coalesce(jsonb_agg(sl), '[]') from public.set_logs sl where sl.user_id = (select auth.uid())),
    'medidas',                 (select coalesce(jsonb_agg(m), '[]') from public.body_measurements m where m.user_id = (select auth.uid())),
    'valores_das_medidas',     (select coalesce(jsonb_agg(v), '[]') from public.measurement_values v where v.user_id = (select auth.uid())),
    'consentimentos',          (select coalesce(jsonb_agg(c), '[]') from public.consent_records c where c.user_id = (select auth.uid()))
  );
$$;

-- ---------------------------------------------------------------------
-- PERMISSÕES DE EXECUÇÃO
-- Funções de dados só para usuários logados; funções de gatilho para ninguém.
-- ---------------------------------------------------------------------
revoke execute on function
  public.has_health_consent(),
  public.is_premium(),
  public.pending_documents(),
  public.accept_documents(uuid[], text, text),
  public.grant_health_consent(text),
  public.revoke_health_consent(text),
  public.finish_workout(uuid),
  public.get_last_performance(uuid[]),
  public.get_exercise_history(uuid, date),
  public.get_exercise_records(uuid),
  public.get_training_days(date, date),
  public.get_streak(),
  public.export_my_data()
from public, anon;

grant execute on function
  public.has_health_consent(),
  public.is_premium(),
  public.pending_documents(),
  public.accept_documents(uuid[], text, text),
  public.grant_health_consent(text),
  public.revoke_health_consent(text),
  public.finish_workout(uuid),
  public.get_last_performance(uuid[]),
  public.get_exercise_history(uuid, date),
  public.get_exercise_records(uuid),
  public.get_training_days(date, date),
  public.get_streak(),
  public.export_my_data()
to authenticated;

revoke execute on function
  public.handle_new_user(),
  public.set_updated_at(),
  public.fill_from_routine(),
  public.fill_from_session(),
  public.fill_from_session_exercise(),
  public.fill_from_measurement()
from public, anon, authenticated;
