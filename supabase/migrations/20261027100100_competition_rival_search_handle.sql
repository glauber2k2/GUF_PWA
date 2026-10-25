-- =====================================================================
-- GUF APP · Competição: busca de adversário sem depender de normalize_handle.
--
-- 20261027100000 usava public.normalize_handle, que o papel authenticated não pode executar (a busca
-- roda com os privilégios de quem chama). O início do @ agora é comparado direto: sem espaços, sem o
-- "@" do começo e em minúsculas (os @ do guf já são guardados em minúsculas).
-- =====================================================================

create or replace function public.search_competition_rivals(
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
            or s.handle like ltrim(lower(btrim(p_query)), '@') || '%')
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
