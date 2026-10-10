-- =====================================================================
-- GUF APP · Migration 1 · Schema principal
-- Tabelas de perfil, exercícios, projetos, rotinas, treinos, séries e medidas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Função utilitária: atualiza updated_at automaticamente
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- PERFIL (1:1 com auth.users, criado automaticamente na migration 4)
-- ---------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text check (char_length(name) <= 100),
  avatar_url    text,
  weight_unit   text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  weekly_goal   smallint not null default 3 check (weekly_goal between 1 and 7),
  timezone      text not null default 'America/Sao_Paulo',
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- EXERCÍCIOS (globais: user_id nulo · personalizados: user_id do dono)
-- ---------------------------------------------------------------------
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 100),
  muscle_group  text not null check (muscle_group in (
                  'peito', 'costas', 'ombros', 'biceps', 'triceps', 'antebraco',
                  'quadriceps', 'posterior', 'gluteos', 'panturrilha', 'abdomen',
                  'corpo_inteiro', 'cardio')),
  equipment     text not null default 'outro' check (equipment in (
                  'barra', 'halter', 'maquina', 'polia', 'peso_corporal',
                  'kettlebell', 'smith', 'elastico', 'outro')),
  archived_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index exercises_user_idx on public.exercises (user_id);
create index exercises_muscle_idx on public.exercises (muscle_group);

-- ---------------------------------------------------------------------
-- PROJETOS (grupos de rotinas) · no máximo 1 projeto ativo por usuário
-- ---------------------------------------------------------------------
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 100),
  description   text check (char_length(description) <= 500),
  is_active     boolean not null default false,
  position      integer not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index projects_user_idx on public.projects (user_id);
create unique index projects_one_active_per_user
  on public.projects (user_id) where is_active;

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- ROTINAS (podem existir sem projeto)
-- ---------------------------------------------------------------------
create table public.routines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete set null,
  name          text not null check (char_length(name) between 1 and 100),
  notes         text check (char_length(notes) <= 1000),
  position      integer not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index routines_user_idx on public.routines (user_id);
create index routines_project_idx on public.routines (project_id, position);

create trigger routines_updated_at before update on public.routines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- EXERCÍCIOS PLANEJADOS NA ROTINA
-- ---------------------------------------------------------------------
create table public.routine_exercises (
  id            uuid primary key default gen_random_uuid(),
  routine_id    uuid not null references public.routines (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,  -- preenchido por gatilho
  exercise_id   uuid not null references public.exercises (id) on delete restrict,
  position      integer not null default 0,
  target_sets   smallint check (target_sets between 1 and 20),
  target_reps   text check (char_length(target_reps) <= 20),               -- "10", "8-12", "falha"
  rest_seconds  smallint check (rest_seconds between 0 and 900),
  notes         text check (char_length(notes) <= 500)
);

create index routine_exercises_routine_idx on public.routine_exercises (routine_id, position);
create index routine_exercises_user_idx on public.routine_exercises (user_id);

-- ---------------------------------------------------------------------
-- SESSÕES DE TREINO (por rotina ou treino livre: routine_id nulo)
-- No máximo 1 treino em andamento por usuário
-- ---------------------------------------------------------------------
create table public.workout_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  routine_id    uuid references public.routines (id) on delete set null,
  name          text check (char_length(name) <= 100),                    -- snapshot do nome no dia
  status        text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  performed_on  date not null default current_date,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  notes         text check (char_length(notes) <= 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (finished_at is null or finished_at >= started_at)
);

create index workout_sessions_user_date_idx on public.workout_sessions (user_id, performed_on desc);
create unique index workout_sessions_one_in_progress
  on public.workout_sessions (user_id) where status = 'in_progress';

create trigger workout_sessions_updated_at before update on public.workout_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- EXERCÍCIOS EXECUTADOS NA SESSÃO
-- ---------------------------------------------------------------------
create table public.session_exercises (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.workout_sessions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,  -- preenchido por gatilho
  exercise_id   uuid not null references public.exercises (id) on delete restrict,
  position      integer not null default 0,
  notes         text check (char_length(notes) <= 500)
);

create index session_exercises_session_idx on public.session_exercises (session_id, position);
create index session_exercises_user_idx on public.session_exercises (user_id);

-- ---------------------------------------------------------------------
-- SÉRIES (base de toda a evolução) · peso sempre em kg
-- user_id, session_id e exercise_id são preenchidos por gatilho a partir do pai
-- ---------------------------------------------------------------------
create table public.set_logs (
  id                  uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  session_id          uuid not null references public.workout_sessions (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  exercise_id         uuid not null references public.exercises (id) on delete restrict,
  set_number          smallint not null check (set_number between 1 and 50),
  weight_kg           numeric(6, 2) check (weight_kg >= 0 and weight_kg <= 2000),
  reps                smallint check (reps >= 0 and reps <= 1000),
  rpe                 numeric(3, 1) check (rpe between 1 and 10),
  set_type            text not null default 'normal' check (set_type in ('warmup', 'normal', 'dropset', 'failure')),
  is_completed        boolean not null default false,
  completed_at        timestamptz,
  created_at          timestamptz not null default now()
);

create index set_logs_history_idx on public.set_logs (user_id, exercise_id, created_at desc);
create index set_logs_session_exercise_idx on public.set_logs (session_exercise_id, set_number);
create index set_logs_session_idx on public.set_logs (session_id);

-- ---------------------------------------------------------------------
-- MEDIDAS CORPORAIS (dado sensível · gravação exige consentimento, ver migration 3)
-- ---------------------------------------------------------------------
create table public.body_measurements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  measured_on   date not null default current_date,
  body_weight_kg numeric(5, 2) check (body_weight_kg > 0 and body_weight_kg < 500),
  body_fat_pct  numeric(4, 1) check (body_fat_pct >= 0 and body_fat_pct <= 80),
  notes         text check (char_length(notes) <= 300),
  created_at    timestamptz not null default now()
);

create index body_measurements_user_date_idx on public.body_measurements (user_id, measured_on desc);

create table public.measurement_values (
  id              uuid primary key default gen_random_uuid(),
  measurement_id  uuid not null references public.body_measurements (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,  -- preenchido por gatilho
  site            text not null check (site in (
                    'pescoco', 'ombros', 'peitoral', 'cintura', 'abdomen', 'quadril',
                    'braco_d', 'braco_e', 'antebraco_d', 'antebraco_e',
                    'coxa_d', 'coxa_e', 'panturrilha_d', 'panturrilha_e')),
  value_cm        numeric(5, 1) not null check (value_cm > 0 and value_cm < 300),
  unique (measurement_id, site)
);

create index measurement_values_user_idx on public.measurement_values (user_id, site);

-- ---------------------------------------------------------------------
-- GATILHOS DE CONSISTÊNCIA
-- Copiam user_id (e outros campos) do registro pai, ignorando o que o cliente enviar.
-- Como rodam com as permissões do usuário, se o pai não pertencer a ele a leitura
-- retorna vazio, o campo fica nulo e a gravação é recusada.
-- ---------------------------------------------------------------------
create or replace function public.fill_from_routine()
returns trigger language plpgsql set search_path = '' as $$
begin
  select r.user_id into new.user_id from public.routines r where r.id = new.routine_id;
  return new;
end;
$$;

create trigger routine_exercises_fill before insert or update of routine_id
  on public.routine_exercises for each row execute function public.fill_from_routine();

create or replace function public.fill_from_session()
returns trigger language plpgsql set search_path = '' as $$
begin
  select s.user_id into new.user_id from public.workout_sessions s where s.id = new.session_id;
  return new;
end;
$$;

create trigger session_exercises_fill before insert or update of session_id
  on public.session_exercises for each row execute function public.fill_from_session();

create or replace function public.fill_from_session_exercise()
returns trigger language plpgsql set search_path = '' as $$
begin
  select se.user_id, se.session_id, se.exercise_id
    into new.user_id, new.session_id, new.exercise_id
    from public.session_exercises se
   where se.id = new.session_exercise_id;
  if new.is_completed and new.completed_at is null then
    new.completed_at = now();
  elsif not new.is_completed then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger set_logs_fill before insert or update
  on public.set_logs for each row execute function public.fill_from_session_exercise();

create or replace function public.fill_from_measurement()
returns trigger language plpgsql set search_path = '' as $$
begin
  select m.user_id into new.user_id from public.body_measurements m where m.id = new.measurement_id;
  return new;
end;
$$;

create trigger measurement_values_fill before insert or update of measurement_id
  on public.measurement_values for each row execute function public.fill_from_measurement();
