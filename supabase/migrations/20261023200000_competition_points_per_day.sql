-- =====================================================================
-- GUF APP · Competição: constância por dia treinado, sem teto de dias
--
-- Antes: 20 pontos por treino válido, até 60 (3 treinos na semana); do 4º dia em diante, nada.
-- Agora: 15 pontos por dia com treino válido, todos os dias da semana (até 7 × 15 = 105).
-- Continua: treino válido = ≥ 20 min de tempo efetivo, no máximo 1 por dia (o de maior volume);
-- semana "cumprida" (sequência) = 3 ou mais dias (sessions_for_max_constancy); recordes, volume e
-- desempate iguais. O total da semana deixa de ter o máximo de 120.
--
-- Decisão de produto (2026-10-23): vale já, para todas as semanas (os pontos são recalculados a cada
-- consulta, então outubro muda na hora). A linha publicada dos parâmetros não é editada (o gatilho
-- protege): a coluna nova entra com o valor como padrão, que a linha existente recebe.
-- =====================================================================

alter table public.competition_parameters
  add column constancy_points_per_day numeric not null default 15 check (constancy_points_per_day > 0);

comment on column public.competition_parameters.constancy_points_per_day is
  'Pontos por dia com treino válido na semana, sem teto de dias (desde 2026-10-23).';
comment on column public.competition_parameters.constancy_max is
  'Sem uso desde 2026-10-23 (constância por dia, sem teto).';
comment on column public.competition_parameters.sessions_for_max_constancy is
  'Dias com treino válido para a semana contar como cumprida (sequência).';

create or replace function public.competition_week_scores(p_user_id uuid, p_to date)
returns table (
  week_start         date,
  valid_sessions     integer,
  weekly_volume      numeric,
  records            integer,
  constancy_points   numeric,
  record_points      numeric,
  volume_points      numeric,
  bonus_points       numeric,
  points             integer,
  fulfilled          boolean,
  consecutive_weeks  integer
)
language sql stable
set search_path = ''
as $$
  with sess as (
    select * from public.competition_session_scores(p_user_id, date '2000-01-01', p_to)
  ),
  agg as (
    select s.week_start as wk,
           (count(*) filter (where s.counted))::integer as n,
           coalesce(sum(s.volume), 0) as vol,
           coalesce(sum(s.records), 0)::integer as recs
      from sess s
     group by s.week_start
  ),
  weeks as (
    select g::date as wk
      from (select min(a.wk) as first_wk from agg a) b,
           generate_series(b.first_wk, p_to - extract(dow from p_to)::integer, interval '1 week') g
     where b.first_wk is not null
  ),
  base as (
    select w.wk, coalesce(a.n, 0) as n, coalesce(a.vol, 0) as vol, coalesce(a.recs, 0) as recs,
           cp.sessions_for_max_constancy as smax, cp.constancy_points_per_day as per_day, cp.bonus_per_week, cp.bonus_max,
           cp.record_points, cp.records_max, cp.volume_max, cp.volume_window_weeks
      from weeks w
      left join agg a on a.wk = w.wk
      cross join lateral public.competition_params_for(public.competition_season_of(w.wk)) cp
  ),
  -- Referência do volume: média das últimas N semanas anteriores em que houve volume.
  with_reference as (
    select b.*,
           (select avg(t.vol)
              from (select p.vol, row_number() over (order by p.wk desc) as recency
                      from base p
                     where p.vol > 0 and p.wk < b.wk) t
             where t.recency <= b.volume_window_weeks) as reference_volume
      from base b
  ),
  marked as (
    select r.*,
           r.n >= r.smax as ok,
           count(*) filter (where r.n < r.smax) over (order by r.wk) as grp
      from with_reference r
  ),
  streaked as (
    select m.*,
           (sum(case when m.ok then 1 else 0 end) over (partition by m.grp order by m.wk))::integer as consec
      from marked m
  ),
  pointed as (
    select s.*,
           s.n * s.per_day as constancy,
           least(s.records_max, s.recs * s.record_points) as record_pts,
           case
             when s.vol <= 0 then 0
             when s.reference_volume is null then s.volume_max
             else s.volume_max * least(1, s.vol / s.reference_volume)
           end as volume_pts,
           case when s.ok then least(s.bonus_max, s.bonus_per_week * s.consec) else 0 end as bonus
      from streaked s
  )
  select p.wk, p.n, round(p.vol, 1), p.recs,
         round(p.constancy, 2), round(p.record_pts, 2), round(p.volume_pts, 2), p.bonus,
         round(p.constancy + p.record_pts + p.volume_pts + p.bonus)::integer,
         p.ok, case when p.ok then p.consec else 0 end
    from pointed p;
$$;
