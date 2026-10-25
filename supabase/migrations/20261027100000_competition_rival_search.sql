-- =====================================================================
-- GUF APP · Competição: escolher o adversário do duelo com busca e paginação no banco.
--
-- O seletor do duelo listava só as pessoas da página aberta do ranking. Com muitos competidores, a
-- pessoa precisa achar qualquer um: o banco filtra (nome sem acento/maiúscula, ou início do @) e
-- devolve 5 por vez (o app pede 5; no máximo 20), com o total depois do filtro. Você não aparece.
-- A ordem é a da classificação (mesma regra de competition_standings).
-- VOLATILE: passa por get_competition_participants, que pode gravar o perfil social
-- (ver 20261026140000_competition_standings_volatile).
-- =====================================================================

-- Chave de busca de texto (sem acento, minúsculas, espaços únicos). Mesma regra dos nomes do catálogo.
create or replace function public.search_text_key(p_text text)
returns text
language sql immutable
set search_path = ''
as $$
  select public.exercise_name_key(p_text);
$$;

create function public.search_competition_rivals(
  p_from date, p_to date, p_metric text, p_query text default null, p_offset integer default 0, p_limit integer default 5
)
returns table (
  user_id uuid, handle text, name text, avatar_url text, is_me boolean, current_streak integer,
  points numeric, workouts bigint, volume_kg numeric, records bigint, fulfilled_weeks bigint, valid_sessions bigint,
  value numeric, rank bigint, previous_rank bigint, "position" bigint, total_count bigint
)
language sql volatile security invoker
set search_path = ''
as $$
  with filtered as (
    select s.*
      from public.competition_standings(p_from, p_to, p_metric) s
     where not s.is_me
       and (public.search_text_key(p_query) = ''
            or public.search_text_key(s.name) like '%' || public.search_text_key(p_query) || '%'
            or s.handle like public.normalize_handle(p_query) || '%')
  )
  select f.user_id, f.handle, f.name, f.avatar_url, f.is_me, f.current_streak,
         f.points, f.workouts, f.volume_kg, f.records, f.fulfilled_weeks, f.valid_sessions,
         f.value, f.rank, f.previous_rank, f."position",
         count(*) over () as total_count
    from filtered f
   order by f."position"
  offset greatest(coalesce(p_offset, 0), 0)
   limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

revoke execute on function public.search_competition_rivals(date, date, text, text, integer, integer) from public, anon;
grant execute on function public.search_competition_rivals(date, date, text, text, integer, integer) to authenticated;
