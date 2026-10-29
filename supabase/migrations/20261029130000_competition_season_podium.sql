-- =====================================================================
-- GUF APP · Competição: pódio do campeão da temporada encerrada
--
-- Nos 3 primeiros dias de uma temporada nova (fuso do perfil), a tela da competição mostra o pódio
-- final da temporada anterior (Claude Design "Podio Encerrado" · 1c), com os pontos de cada um.
-- Depois disso, volta o pódio da temporada atual.
--
-- get_competition_season_podium() devolve o top 3 por pontos da temporada anterior, entre os seus
-- competidores de hoje (seguimento mútuo), com o mesmo desempate da classificação
-- (competition_standings: pontos → semanas cumpridas → sessões válidas → volume). Fora da janela de
-- 3 dias, ou sem ninguém com pontos, não devolve nada: o app decide só pelo que chega.
--
-- Plano: o Free só vê a temporada atual na competição (competition_visible_from). O pódio final da
-- anterior vale para todos por 3 dias (decisão de produto, 2026-10-29): por isso lê as funções
-- *_unrestricted, devolvendo só as 3 posições e os pontos (nada de semanas, dias ou outras métricas).
--
-- VOLATILE: get_competition_participants pode gravar o perfil social (ensure_social_profile);
-- marcada STABLE, o PostgREST a rodaria somente leitura e a gravação falharia (25006).
-- =====================================================================

create function public.get_competition_season_podium()
returns table (
  season      date,
  user_id     uuid,
  handle      text,
  name        text,
  avatar_url  text,
  is_me       boolean,
  points      numeric,
  rank        bigint
)
language plpgsql volatile security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid             uuid := (select auth.uid());
  v_champion_days   constant integer := 3;
  v_current_start   date;
  v_previous_season date;
  v_from            date;
begin
  if v_uid is null then
    raise exception 'Sessão expirada' using errcode = '28000';
  end if;

  v_current_start := public.current_season_start_of(v_uid);
  if public.local_today(v_uid) >= v_current_start + v_champion_days then
    return;
  end if;

  -- A semana anterior ao início da temporada atual é a última da temporada encerrada.
  v_previous_season := public.competition_season_of(v_current_start - 7);
  v_from := v_previous_season + ((6 - extract(dow from v_previous_season)::integer) % 7) - 6;

  return query
  with participants as (
    select * from public.get_competition_participants()
  ),
  weeks as (
    select w.user_id,
           sum(w.points) as points,
           count(*) filter (where w.fulfilled) as fulfilled_weeks,
           sum(w.valid_sessions) as valid_sessions
      from public.get_competition_weeks_unrestricted(v_from, v_current_start - 1) w
     group by w.user_id
  ),
  days as (
    select d.user_id, sum(d.volume_kg) as volume_kg
      from public.get_competition_days_unrestricted(v_from, v_current_start - 1) d
     group by d.user_id
  ),
  ranked as (
    select p.user_id, p.handle, p.name, p.avatar_url, p.is_me,
           coalesce(w.points, 0)::numeric as points,
           rank() over (order by coalesce(w.points, 0) desc, coalesce(w.fulfilled_weeks, 0) desc,
                                 coalesce(w.valid_sessions, 0) desc, coalesce(d.volume_kg, 0) desc) as rank
      from participants p
      left join weeks w on w.user_id = p.user_id
      left join days d on d.user_id = p.user_id
  )
  select v_previous_season, r.user_id, r.handle, r.name, r.avatar_url, r.is_me, r.points, r.rank
    from ranked r
   where r.points > 0
   order by r.rank, r.is_me desc, r.user_id::text
   limit 3;
end;
$$;

comment on function public.get_competition_season_podium() is
  'Top 3 por pontos da temporada anterior, só nos 3 primeiros dias da temporada atual (pódio do campeão).';

revoke execute on function public.get_competition_season_podium() from public, anon;
grant execute on function public.get_competition_season_podium() to authenticated;
