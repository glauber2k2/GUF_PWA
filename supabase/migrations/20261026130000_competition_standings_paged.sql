-- =====================================================================
-- GUF APP · Competição: classificação ordenada e paginada no banco.
--
-- Antes, o app baixava pontos por semana e números por dia de TODOS os competidores e ordenava no
-- aparelho (packages/core/src/competition-ranking.ts). Com centenas ou milhares de competidores isso
-- não escala. Agora o banco ordena com a MESMA regra e o app pede só o que mostra:
--   · get_competition_standings ........ uma página da classificação (10 por vez no app) + total
--   · get_competition_standings_near_me . você e quem está logo à frente e logo atrás
--   · get_competition_standings_of ...... pessoas específicas (você e o adversário do duelo)
--   · get_competition_series ............ semanas e dias só das pessoas pedidas (gráfico e duelo)
-- Regra de ordem (igual a rankCompetitors): pontos → semanas cumpridas → sessões válidas → volume;
-- nas outras métricas, o valor dela e depois os pontos. Empate total = mesma posição (rank()).
-- "Subiu/Caiu" compara com a posição na data em que 70% do período tinha passado.
-- A visibilidade continua nas funções que já existiam (competidores, janela do plano): estas só
-- leem delas, com os privilégios de quem chama.
-- =====================================================================

create or replace function public.competition_standings(p_from date, p_to date, p_metric text)
returns table (
  user_id uuid, handle text, name text, avatar_url text, is_me boolean, current_streak integer,
  points numeric, workouts bigint, volume_kg numeric, records bigint, fulfilled_weeks bigint, valid_sessions bigint,
  value numeric, rank bigint, previous_rank bigint, "position" bigint, total_count bigint
)
language plpgsql stable security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_days   integer := (p_to - p_from) + 1;
  v_cutoff date := p_from + greatest(0, floor(((p_to - p_from) + 1) * 0.7)::integer - 1);
begin
  if p_metric not in ('points', 'volume', 'workouts', 'records') then
    raise exception 'Métrica inválida' using errcode = '22023';
  end if;
  if p_from > p_to or v_days > 400 then
    raise exception 'Período inválido' using errcode = '22023';
  end if;

  return query
  with participants as (
    select * from public.get_competition_participants()
  ),
  weeks as (
    select w.user_id,
           sum(w.points) as points,
           count(*) filter (where w.fulfilled) as fulfilled_weeks,
           sum(w.valid_sessions) as valid_sessions,
           sum(w.points) filter (where w.week_start <= v_cutoff) as points_c,
           count(*) filter (where w.fulfilled and w.week_start <= v_cutoff) as fulfilled_weeks_c,
           sum(w.valid_sessions) filter (where w.week_start <= v_cutoff) as valid_sessions_c
      from public.get_competition_weeks(p_from, p_to) w
     group by w.user_id
  ),
  days as (
    select d.user_id,
           sum(d.workouts) as workouts,
           sum(d.volume_kg) as volume_kg,
           sum(d.records) as records,
           sum(d.workouts) filter (where d.day <= v_cutoff) as workouts_c,
           sum(d.volume_kg) filter (where d.day <= v_cutoff) as volume_kg_c,
           sum(d.records) filter (where d.day <= v_cutoff) as records_c
      from public.get_competition_days(p_from, p_to) d
     group by d.user_id
  ),
  totals as (
    select p.user_id, p.handle, p.name, p.avatar_url, p.is_me, coalesce(p.current_streak, 0) as current_streak,
           coalesce(w.points, 0)::numeric as points, coalesce(d.workouts, 0)::bigint as workouts,
           coalesce(d.volume_kg, 0)::numeric as volume_kg, coalesce(d.records, 0)::bigint as records,
           coalesce(w.fulfilled_weeks, 0)::bigint as fulfilled_weeks, coalesce(w.valid_sessions, 0)::bigint as valid_sessions,
           coalesce(w.points_c, 0)::numeric as points_c, coalesce(d.workouts_c, 0)::numeric as workouts_c,
           coalesce(d.volume_kg_c, 0)::numeric as volume_kg_c, coalesce(d.records_c, 0)::numeric as records_c,
           coalesce(w.fulfilled_weeks_c, 0)::numeric as fulfilled_weeks_c, coalesce(w.valid_sessions_c, 0)::numeric as valid_sessions_c
      from participants p
      left join weeks w on w.user_id = p.user_id
      left join days d on d.user_id = p.user_id
  ),
  keyed as (
    select t.*,
           case p_metric when 'points' then t.points when 'volume' then t.volume_kg
                         when 'workouts' then t.workouts::numeric else t.records::numeric end as value,
           -- Chaves de ordem (atual e na data de corte): em pontos, o desempate da regra; nas outras, os pontos.
           case p_metric when 'points' then t.points when 'volume' then t.volume_kg
                         when 'workouts' then t.workouts::numeric else t.records::numeric end as k1,
           case when p_metric = 'points' then t.fulfilled_weeks::numeric else t.points end as k2,
           case when p_metric = 'points' then t.valid_sessions::numeric else 0 end as k3,
           case when p_metric = 'points' then t.volume_kg else 0 end as k4,
           case p_metric when 'points' then t.points_c when 'volume' then t.volume_kg_c
                         when 'workouts' then t.workouts_c else t.records_c end as c1,
           case when p_metric = 'points' then t.fulfilled_weeks_c else t.points_c end as c2,
           case when p_metric = 'points' then t.valid_sessions_c else 0 end as c3,
           case when p_metric = 'points' then t.volume_kg_c else 0 end as c4
      from totals t
  ),
  ranked as (
    select k.*,
           rank() over (order by k.k1 desc, k.k2 desc, k.k3 desc, k.k4 desc) as rank,
           rank() over (order by k.c1 desc, k.c2 desc, k.c3 desc, k.c4 desc) as previous_rank
      from keyed k
  )
  select r.user_id, r.handle, r.name, r.avatar_url, r.is_me, r.current_streak,
         r.points, r.workouts, r.volume_kg, r.records, r.fulfilled_weeks, r.valid_sessions,
         r.value, r.rank, r.previous_rank,
         row_number() over (order by r.rank, r.is_me desc, r.user_id::text) as "position",
         count(*) over () as total_count
    from ranked r;
end;
$$;

-- Uma página da classificação (o app pede 10 por vez; no máximo 50).
create function public.get_competition_standings(
  p_from date, p_to date, p_metric text, p_offset integer default 0, p_limit integer default 10
)
returns table (
  user_id uuid, handle text, name text, avatar_url text, is_me boolean, current_streak integer,
  points numeric, workouts bigint, volume_kg numeric, records bigint, fulfilled_weeks bigint, valid_sessions bigint,
  value numeric, rank bigint, previous_rank bigint, "position" bigint, total_count bigint
)
language sql stable security invoker
set search_path = ''
as $$
  select s.* from public.competition_standings(p_from, p_to, p_metric) s
   order by s."position"
  offset greatest(coalesce(p_offset, 0), 0)
   limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

-- Você e quem está até p_radius posições à frente e atrás (cartão "Sua posição").
create function public.get_competition_standings_near_me(p_from date, p_to date, p_metric text, p_radius integer default 1)
returns table (
  user_id uuid, handle text, name text, avatar_url text, is_me boolean, current_streak integer,
  points numeric, workouts bigint, volume_kg numeric, records bigint, fulfilled_weeks bigint, valid_sessions bigint,
  value numeric, rank bigint, previous_rank bigint, "position" bigint, total_count bigint
)
language sql stable security invoker
set search_path = ''
as $$
  with s as (select * from public.competition_standings(p_from, p_to, p_metric)),
       me as (select s."position" from s where s.is_me)
  select s.* from s, me
   where s."position" between me."position" - least(greatest(coalesce(p_radius, 1), 0), 5)
                          and me."position" + least(greatest(coalesce(p_radius, 1), 0), 5)
   order by s."position";
$$;

-- Pessoas específicas com a posição na classificação geral (você e o adversário; no máximo 10).
create function public.get_competition_standings_of(p_from date, p_to date, p_metric text, p_user_ids uuid[])
returns table (
  user_id uuid, handle text, name text, avatar_url text, is_me boolean, current_streak integer,
  points numeric, workouts bigint, volume_kg numeric, records bigint, fulfilled_weeks bigint, valid_sessions bigint,
  value numeric, rank bigint, previous_rank bigint, "position" bigint, total_count bigint
)
language sql stable security invoker
set search_path = ''
as $$
  select s.* from public.competition_standings(p_from, p_to, p_metric) s
   where s.user_id = any (p_user_ids[1:10])
   order by s."position";
$$;

-- Semanas e dias só das pessoas pedidas (gráfico da corrida e duelo; no máximo 10).
create function public.get_competition_series(p_from date, p_to date, p_user_ids uuid[])
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'weeks', coalesce((select jsonb_agg(to_jsonb(w)) from public.get_competition_weeks(p_from, p_to) w
                        where w.user_id = any (p_user_ids[1:10])), '[]'::jsonb),
    'days', coalesce((select jsonb_agg(to_jsonb(d)) from public.get_competition_days(p_from, p_to) d
                       where d.user_id = any (p_user_ids[1:10])), '[]'::jsonb));
$$;

revoke execute on function public.competition_standings(date, date, text) from public, anon;
grant execute on function public.competition_standings(date, date, text) to authenticated;
revoke execute on function
  public.get_competition_standings(date, date, text, integer, integer),
  public.get_competition_standings_near_me(date, date, text, integer),
  public.get_competition_standings_of(date, date, text, uuid[]),
  public.get_competition_series(date, date, uuid[])
  from public, anon;
grant execute on function
  public.get_competition_standings(date, date, text, integer, integer),
  public.get_competition_standings_near_me(date, date, text, integer),
  public.get_competition_standings_of(date, date, text, uuid[]),
  public.get_competition_series(date, date, uuid[])
  to authenticated;
