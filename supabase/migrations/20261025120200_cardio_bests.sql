-- =====================================================================
-- GUF APP · Melhores marcas de cardio calculadas no banco (recorde a bater)
--
-- Antes: o app lia TODAS as séries de cardio com distância de cada exercício e calculava as marcas;
-- acima de 1.000 linhas (limite de resposta da API) parte do histórico ficava de fora.
-- Agora: get_cardio_bests devolve UMA linha por exercício — menor tempo por km (séries de pelo menos
-- 1 km) e maior distância —, de todos os treinos concluídos ou só dos anteriores a um treino (mesma
-- ordem de session_cardio_records: término do treino). Mesma regra de packages/core/src/cardio-records.ts.
-- =====================================================================

-- Séries de cardio concluídas com distância, por exercício e dono (a consulta filtra por esses dois).
create index if not exists set_logs_cardio_distance_idx
  on public.set_logs (user_id, exercise_id)
  where is_completed and distance_km is not null;

create or replace function public.get_cardio_bests(p_exercise_ids uuid[], p_before_session_id uuid default null)
returns table (exercise_id uuid, best_seconds_per_km numeric, best_distance_km numeric)
language sql stable
set search_path = ''
as $$
  with target as (
    select s.finished_at, s.id
      from public.workout_sessions s
     where s.id = p_before_session_id and s.user_id = (select auth.uid())
  )
  select sl.exercise_id,
         min(sl.duration_seconds / sl.distance_km) filter (where sl.distance_km >= 1 and sl.duration_seconds > 0),
         max(sl.distance_km) filter (where sl.distance_km > 0)
    from public.set_logs sl
    join public.workout_sessions s on s.id = sl.session_id
   where sl.user_id = (select auth.uid())
     and sl.exercise_id = any (p_exercise_ids)
     and sl.is_completed and sl.set_type <> 'warmup'
     and sl.distance_km is not null
     and s.status = 'completed'
     and (
       p_before_session_id is null
       or exists (select 1 from target t where (s.finished_at, s.id) < (t.finished_at, t.id))
     )
   group by sl.exercise_id;
$$;

comment on function public.get_cardio_bests(uuid[], uuid) is
  'Melhor ritmo (séries de 1 km ou mais) e maior distância de cada exercício de cardio do usuário, em todos os treinos concluídos ou antes de um treino.';

revoke execute on function public.get_cardio_bests(uuid[], uuid) from public, anon;
grant execute on function public.get_cardio_bests(uuid[], uuid) to authenticated;
