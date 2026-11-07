-- =====================================================================
-- GUF APP · Comunicados recorrentes (painel de administração)
--
-- Um comunicado pode se repetir: todo dia, toda semana, todo mês ou todo ano, a cada N unidades.
-- Três colunas, nulas quando não repete (nulo só ocupa um bit):
--   repeat_unit       day · week · month · year (a regra; unidade nova = valor no check e em
--                     announcement_repeat_step/announcement_period_hours, e no core)
--   repeat_every      a cada N unidades (1–99)
--   occurrence_hours  quanto tempo cada vez fica no app (1 h a 1 ano; nunca mais que o intervalo)
-- starts_at = começo da 1ª vez (o dia da semana, o dia do mês e a hora vêm dele, no horário de
-- Brasília); ends_at = fim da campanha (nulo = repete até alguém encerrar).
-- Mês: a partir do dia de início; dia 31 cai no último dia dos meses mais curtos.
--
-- Sem uma linha por vez: cada pessoa continua com UMA linha em announcement_receipts. Ela vê de
-- novo quando o visto/fechado/botão é de antes do começo da vez atual.
-- =====================================================================

alter table public.announcements
  add column repeat_unit      text check (repeat_unit in ('day', 'week', 'month', 'year')),
  add column repeat_every     smallint check (repeat_every between 1 and 99),
  add column occurrence_hours smallint check (occurrence_hours between 1 and 8784);

-- Intervalo entre duas vezes.
create function public.announcement_repeat_step(p_unit text, p_every integer)
returns interval
language sql immutable
set search_path = ''
as $$
  select p_every * case p_unit
    when 'day' then interval '1 day'
    when 'week' then interval '7 days'
    when 'month' then interval '1 month'
    when 'year' then interval '1 year'
  end;
$$;

-- Menor duração possível do intervalo, em horas (mês = 28 dias, ano = 365): cada vez termina
-- antes da próxima começar.
create function public.announcement_period_hours(p_unit text, p_every integer)
returns integer
language sql immutable
set search_path = ''
as $$
  select p_every * case p_unit
    when 'day' then 24
    when 'week' then 168
    when 'month' then 672
    when 'year' then 8760
  end;
$$;

alter table public.announcements
  add constraint announcements_recurrence_complete
    check ((repeat_unit is null) = (repeat_every is null) and (repeat_unit is null) = (occurrence_hours is null)),
  add constraint announcements_occurrence_fits
    check (occurrence_hours is null or occurrence_hours <= public.announcement_period_hours(repeat_unit, repeat_every));

comment on column public.announcements.repeat_unit is 'Repetição: day · week · month · year (nulo = não repete).';
comment on column public.announcements.repeat_every is 'A cada N unidades de repeat_unit.';
comment on column public.announcements.occurrence_hours is 'Quanto tempo cada vez fica no app, em horas (cabe no intervalo).';

-- Começo da vez que está valendo em p_at (nulo = fora de uma vez). Sem repetição: a janela
-- starts_at–ends_at de sempre. Contas no horário de Brasília (o painel agenda nesse fuso).
create function public.announcement_occurrence_start(p_ann public.announcements, p_at timestamptz)
returns timestamptz
language plpgsql stable
set search_path = ''
as $$
declare
  v_tz     constant text := 'America/Sao_Paulo';
  v_start  timestamp;
  v_at     timestamp;
  v_step   interval;
  v_k      integer;
  v_months integer;
  v_occ    timestamptz;
begin
  if p_ann.starts_at is null or p_at < p_ann.starts_at then
    return null;
  end if;
  if p_ann.ends_at is not null and p_at >= p_ann.ends_at then
    return null;
  end if;
  if p_ann.repeat_unit is null then
    return p_ann.starts_at;
  end if;

  v_start := p_ann.starts_at at time zone v_tz;
  v_at := p_at at time zone v_tz;
  v_step := public.announcement_repeat_step(p_ann.repeat_unit, p_ann.repeat_every);
  if p_ann.repeat_unit in ('day', 'week') then
    v_k := floor(extract(epoch from (v_at - v_start)) / extract(epoch from v_step))::integer;
  else
    v_months := (extract(year from age(v_at, v_start)) * 12 + extract(month from age(v_at, v_start)))::integer;
    v_k := v_months / (p_ann.repeat_every * case p_ann.repeat_unit when 'month' then 1 else 12 end);
    -- age() conta meses inteiros: no dia 28/fev, a vez "31/jan + 1 mês" (28/fev) já começou.
    if v_start + (v_k + 1) * v_step <= v_at then
      v_k := v_k + 1;
    end if;
  end if;

  v_occ := (v_start + v_k * v_step) at time zone v_tz;
  if p_at >= v_occ + p_ann.occurrence_hours * interval '1 hour' then
    return null;
  end if;
  return v_occ;
end;
$$;

comment on function public.announcement_occurrence_start(public.announcements, timestamptz) is
  'Começo da vez do comunicado que vale no instante (nulo fora de uma vez). Sem repetição, starts_at dentro da janela.';

-- ---------------------------------------------------------------------
-- App: lista e marcação por vez
-- ---------------------------------------------------------------------
drop function public.my_announcements();

create function public.my_announcements()
returns table (
  id uuid, format text, tone text, title text, body text, cta_label text, cta_path text,
  priority smallint, frequency text, published_at timestamptz, occurrence_starts_at timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  return query
  select a.id, a.format, a.tone, a.title, a.body, a.cta_label, a.cta_path, a.priority, a.frequency, a.published_at, occ.starts_at
    from public.announcements a
    cross join lateral (select public.announcement_occurrence_start(a, now()) as starts_at) occ
    left join public.announcement_receipts r on r.announcement_id = a.id and r.user_id = v_uid
   where a.status = 'published'
     and occ.starts_at is not null
     -- O que conta é o que a pessoa fez NESTA vez (recorrente: vezes anteriores não valem).
     and case a.frequency when 'once' then r.seen_at is null or r.seen_at < occ.starts_at
                          else (r.dismissed_at is null or r.dismissed_at < occ.starts_at)
                           and (r.cta_at is null or r.cta_at < occ.starts_at) end
     and public.announcement_allowed_for(a.purpose, v_uid)
     and public.audience_matches(a.audience, v_uid,
           exists (select 1 from public.announcement_targets t where t.announcement_id = a.id and t.user_id = v_uid))
   order by a.priority desc, a.published_at desc
   limit 10;
end;
$$;

create or replace function public.mark_announcement(p_id uuid, p_event text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_occ timestamptz;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_event not in ('seen', 'dismissed', 'cta') then
    raise exception 'Evento inválido' using errcode = '22023';
  end if;
  if not exists (select 1 from public.my_announcements() m where m.id = p_id)
     and not exists (select 1 from public.announcement_receipts r where r.announcement_id = p_id and r.user_id = v_uid) then
    return;
  end if;
  -- Marca de uma vez anterior é trocada pela da vez atual (sem vez atual: fica a primeira).
  v_occ := coalesce((select public.announcement_occurrence_start(a, now()) from public.announcements a where a.id = p_id), '-infinity');
  insert into public.announcement_receipts (announcement_id, user_id, seen_at, dismissed_at, cta_at)
  values (p_id, v_uid, now(),
          case when p_event = 'dismissed' then now() end,
          case when p_event = 'cta' then now() end)
  on conflict (announcement_id, user_id) do update
    set seen_at = case when public.announcement_receipts.seen_at is null or public.announcement_receipts.seen_at < v_occ
                       then excluded.seen_at else public.announcement_receipts.seen_at end,
        dismissed_at = case when excluded.dismissed_at is not null
                             and (public.announcement_receipts.dismissed_at is null or public.announcement_receipts.dismissed_at < v_occ)
                            then excluded.dismissed_at else public.announcement_receipts.dismissed_at end,
        cta_at = case when excluded.cta_at is not null
                       and (public.announcement_receipts.cta_at is null or public.announcement_receipts.cta_at < v_occ)
                      then excluded.cta_at else public.announcement_receipts.cta_at end;
end;
$$;

-- ---------------------------------------------------------------------
-- Painel: salvar, publicar, listar e duplicar com a repetição
-- ---------------------------------------------------------------------
-- p_draft.recurrence: { unit, every, window_hours } ou nulo (não repete).
create or replace function public.admin_save_announcement(p_id uuid, p_draft jsonb, p_target_ids uuid[] default '{}')
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('support');
  v_ann   public.announcements;
  v_found integer := 0;
  v_ids   uuid[] := coalesce(p_target_ids, '{}');
  v_rec   jsonb := nullif(p_draft -> 'recurrence', 'null'::jsonb);
begin
  if cardinality(v_ids) > 10000 then
    raise exception 'Lista de ids muito grande' using errcode = 'GA008';
  end if;
  if p_id is not null then
    select * into v_ann from public.announcements a where a.id = p_id and not a.is_account_notice for update;
    if not found then
      raise exception 'Comunicado não encontrado' using errcode = 'GA007';
    end if;
    if v_ann.status <> 'draft' then
      raise exception 'Só rascunhos podem ser editados' using errcode = 'GA007';
    end if;
  end if;

  v_ann.title            := btrim(coalesce(p_draft ->> 'title', ''));
  v_ann.body             := btrim(coalesce(p_draft ->> 'body', ''));
  v_ann.format           := coalesce(p_draft ->> 'format', 'modal');
  v_ann.tone             := coalesce(p_draft ->> 'tone', 'news');
  v_ann.cta_label        := nullif(btrim(coalesce(p_draft ->> 'cta_label', '')), '');
  v_ann.cta_path         := case when v_ann.cta_label is null then null else p_draft ->> 'cta_path' end;
  v_ann.audience         := coalesce(p_draft -> 'audience', '{"rules":[{"type":"all"}]}');
  v_ann.purpose          := coalesce(p_draft ->> 'purpose', 'service');
  v_ann.priority         := coalesce((p_draft ->> 'priority')::smallint, 50);
  v_ann.frequency        := coalesce(p_draft ->> 'frequency', 'until_dismissed');
  v_ann.starts_at        := (p_draft ->> 'starts_at')::timestamptz;
  v_ann.ends_at          := (p_draft ->> 'ends_at')::timestamptz;
  v_ann.repeat_unit      := v_rec ->> 'unit';
  v_ann.repeat_every     := (v_rec ->> 'every')::smallint;
  v_ann.occurrence_hours := (v_rec ->> 'window_hours')::smallint;
  perform public.assert_announcement_valid(v_ann);

  if p_id is null then
    insert into public.announcements (title, body, format, tone, cta_label, cta_path, audience, purpose,
                                      priority, frequency, starts_at, ends_at, repeat_unit, repeat_every,
                                      occurrence_hours, created_by)
    values (v_ann.title, v_ann.body, v_ann.format, v_ann.tone, v_ann.cta_label, v_ann.cta_path, v_ann.audience,
            v_ann.purpose, v_ann.priority, v_ann.frequency, v_ann.starts_at, v_ann.ends_at, v_ann.repeat_unit,
            v_ann.repeat_every, v_ann.occurrence_hours, v_staff.user_id)
    returning * into v_ann;
  else
    update public.announcements a
       set title = v_ann.title, body = v_ann.body, format = v_ann.format, tone = v_ann.tone,
           cta_label = v_ann.cta_label, cta_path = v_ann.cta_path, audience = v_ann.audience,
           purpose = v_ann.purpose, priority = v_ann.priority, frequency = v_ann.frequency,
           starts_at = v_ann.starts_at, ends_at = v_ann.ends_at, repeat_unit = v_ann.repeat_unit,
           repeat_every = v_ann.repeat_every, occurrence_hours = v_ann.occurrence_hours
     where a.id = p_id;
  end if;

  delete from public.announcement_targets t where t.announcement_id = v_ann.id;
  if public.audience_has_rule(v_ann.audience, 'ids') then
    insert into public.announcement_targets (announcement_id, user_id)
    select v_ann.id, u.id from auth.users u where u.id = any(v_ids) and u.deleted_at is null;
    get diagnostics v_found = row_count;
  end if;

  return jsonb_build_object('id', v_ann.id, 'targets_found', v_found,
    'targets_ignored', case when public.audience_has_rule(v_ann.audience, 'ids')
                            then (select count(distinct x) from unnest(v_ids) x) - v_found else 0 end);
end;
$$;

-- Recorrente pode não ter fim (ends_at nulo: repete até alguém encerrar); sem repetição, o fim
-- continua obrigatório.
create or replace function public.admin_publish_announcement(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('admin');
  v_ann   public.announcements;
  v_reach integer;
begin
  select * into v_ann from public.announcements a where a.id = p_id and not a.is_account_notice for update;
  if not found or v_ann.status <> 'draft' then
    raise exception 'Comunicado não encontrado' using errcode = 'GA007';
  end if;
  perform public.assert_announcement_valid(v_ann);
  if v_ann.title = '' or v_ann.body = '' then
    raise exception 'Título e texto são obrigatórios' using errcode = 'GA008';
  end if;
  v_ann.starts_at := coalesce(v_ann.starts_at, now());
  if v_ann.repeat_unit is null and v_ann.ends_at is null then
    raise exception 'Fim precisa ser depois do início e no futuro' using errcode = 'GA008';
  end if;
  if v_ann.ends_at is not null and v_ann.ends_at <= greatest(v_ann.starts_at, now()) then
    raise exception 'Fim precisa ser depois do início e no futuro' using errcode = 'GA008';
  end if;
  if public.audience_has_rule(v_ann.audience, 'plans')
     and exists (select 1 from jsonb_array_elements(v_ann.audience -> 'rules') r, jsonb_array_elements_text(r -> 'plans') pc
                  where r ->> 'type' = 'plans' and not exists (select 1 from public.plans pl where pl.code = pc)) then
    raise exception 'Plano inexistente no público' using errcode = 'GA008';
  end if;
  if public.audience_has_rule(v_ann.audience, 'ids')
     and not exists (select 1 from public.announcement_targets t where t.announcement_id = p_id) then
    raise exception 'Lista de ids vazia' using errcode = 'GA008';
  end if;

  select count(*)::integer into v_reach from auth.users u
   where u.deleted_at is null
     and public.announcement_allowed_for(v_ann.purpose, u.id)
     and public.audience_matches(v_ann.audience, u.id,
           exists (select 1 from public.announcement_targets t where t.announcement_id = p_id and t.user_id = u.id));

  update public.announcements a
     set status = 'published', starts_at = v_ann.starts_at, reach_estimate = v_reach,
         published_by = v_staff.user_id, published_at = now()
   where a.id = p_id;
  perform public.audit_log_append('announcement_published', null,
    jsonb_build_object('announcement_id', p_id, 'format', v_ann.format, 'purpose', v_ann.purpose, 'reach', v_reach,
                       'repeat_unit', v_ann.repeat_unit));
end;
$$;

drop function public.admin_list_announcements();

create function public.admin_list_announcements()
returns table (
  id uuid, title text, tone text, format text, audience jsonb, purpose text, state text,
  starts_at timestamptz, ends_at timestamptz, reach_estimate integer, seen_count integer,
  dismissed_count integer, cta_count integer, targets_count integer, updated_at timestamptz,
  repeat_unit text, repeat_every smallint, occurrence_hours smallint
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_staff('viewer');
  return query
  select a.id, a.title, a.tone, a.format, a.audience, a.purpose, public.announcement_state(a),
         a.starts_at, a.ends_at, a.reach_estimate,
         (select count(*) from public.announcement_receipts r where r.announcement_id = a.id and r.seen_at is not null)::integer,
         (select count(*) from public.announcement_receipts r where r.announcement_id = a.id and r.dismissed_at is not null)::integer,
         (select count(*) from public.announcement_receipts r where r.announcement_id = a.id and r.cta_at is not null)::integer,
         (select count(*) from public.announcement_targets t where t.announcement_id = a.id)::integer,
         a.updated_at, a.repeat_unit, a.repeat_every, a.occurrence_hours
    from public.announcements a
   where not a.is_account_notice
   order by coalesce(a.starts_at, a.updated_at) desc
   limit 300;
end;
$$;

create or replace function public.admin_duplicate_announcement(p_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('support');
  v_new   uuid;
begin
  insert into public.announcements (title, body, format, tone, cta_label, cta_path, audience, purpose, priority, frequency,
                                    repeat_unit, repeat_every, occurrence_hours, created_by)
  select a.title, a.body, a.format, a.tone, a.cta_label, a.cta_path, a.audience, a.purpose, a.priority, a.frequency,
         a.repeat_unit, a.repeat_every, a.occurrence_hours, v_staff.user_id
    from public.announcements a where a.id = p_id and not a.is_account_notice
  returning id into v_new;
  if v_new is null then
    raise exception 'Comunicado não encontrado' using errcode = 'GA007';
  end if;
  insert into public.announcement_targets (announcement_id, user_id)
  select v_new, t.user_id from public.announcement_targets t where t.announcement_id = p_id;
  return v_new;
end;
$$;

-- announcement_repeat_step e announcement_period_hours ficam liberadas: são contas puras e o check
-- da tabela as chama com o papel de quem grava.
revoke execute on function public.announcement_occurrence_start(public.announcements, timestamptz) from public, anon, authenticated;

revoke execute on function public.my_announcements(), public.admin_list_announcements() from public, anon;
grant execute on function public.my_announcements(), public.admin_list_announcements() to authenticated;
