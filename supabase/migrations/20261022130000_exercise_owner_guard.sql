-- =====================================================================
-- GUF APP · Exercício de outra pessoa nunca entra na rotina nem no treino
-- A chave estrangeira routine_exercises/session_exercises → exercises não passa pelo RLS: um id de
-- exercício criado por outra pessoa era aceito (save_routine, fila offline ou gravação direta).
-- O gatilho aceita só exercício do catálogo do guf (user_id nulo) ou do dono da rotina/treino.
-- Conferido antes de aplicar: nenhum registro existente viola a regra.
-- =====================================================================

-- SECURITY DEFINER: pelo RLS o exercício de outra pessoa nem aparece para quem grava, e a
-- conferência precisa ver o dono verdadeiro. A função não devolve dado nenhum, só barra.
create or replace function public.guard_exercise_owner()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_row_owner      uuid;
  v_exercise_owner uuid;
begin
  if tg_table_name = 'routine_exercises' then
    select r.user_id into v_row_owner from public.routines r where r.id = new.routine_id;
  else
    select s.user_id into v_row_owner from public.workout_sessions s where s.id = new.session_id;
  end if;

  select e.user_id into v_exercise_owner from public.exercises e where e.id = new.exercise_id;
  -- Exercício inexistente: a chave estrangeira responde.
  if not found or v_exercise_owner is null then
    return new;
  end if;

  if v_exercise_owner is distinct from v_row_owner then
    raise exception 'Exercício indisponível: use um do catálogo do guf ou um criado por você'
      using errcode = 'GE001';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_exercise_owner() from public, anon, authenticated;

comment on function public.guard_exercise_owner() is
  'Gatilho: exercício da rotina/treino só do catálogo do guf ou do próprio dono (erro GE001).';

create trigger routine_exercises_exercise_owner
  before insert or update of exercise_id, routine_id on public.routine_exercises
  for each row execute function public.guard_exercise_owner();

create trigger session_exercises_exercise_owner
  before insert or update of exercise_id, session_id on public.session_exercises
  for each row execute function public.guard_exercise_owner();
