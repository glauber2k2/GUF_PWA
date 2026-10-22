-- =====================================================================
-- GUF APP · Módulo de medidas corporais (tela: Perfil › Medidas corporais)
-- Dado referente à saúde (LGPD art. 5º, II): gravar exige o consentimento de saúde vigente
-- (art. 11, I) — as políticas de RLS já exigem has_health_consent(); a função confere antes
-- para devolver um erro claro. Ler e apagar continuam permitidos (acesso e eliminação).
-- Só o dono lê (RLS "medidas: ler as próprias"): nenhuma função social, de competição ou do
-- GUF AI consulta estas tabelas. RIPD: .lgpd/RIPD/ripd-medidas-corporais.md (A010).
-- Conferido antes de aplicar: nenhuma medida gravada (o módulo não tinha tela).
-- =====================================================================

-- Uma medição por dia: registrar de novo no mesmo dia substitui os valores preenchidos.
create unique index body_measurements_user_day_key on public.body_measurements (user_id, measured_on);

-- Salva os valores de um dia de uma vez. p_values = { "<site>": número em cm | null }:
-- número grava (ou substitui), null apaga aquele valor (usado pelo "Desfazer"); o dia que fica
-- sem nenhum valor é apagado. SECURITY INVOKER: RLS e consentimento valem como em qualquer gravação.
create or replace function public.save_body_measurement(p_measured_on date, p_values jsonb)
returns void
language plpgsql security invoker
set search_path = ''
as $$
declare
  c_sites constant text[] := array[
    'pescoco', 'ombros', 'peitoral', 'cintura', 'abdomen', 'quadril',
    'braco_d', 'braco_e', 'antebraco_d', 'antebraco_e',
    'coxa_d', 'coxa_e', 'panturrilha_d', 'panturrilha_e'];
  v_uid   uuid := (select auth.uid());
  v_id    uuid;
  v_site  text;
  v_value jsonb;
  v_cm    numeric;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if not public.has_health_consent() then
    raise exception 'Autorize o uso dos dados de saúde para registrar medidas' using errcode = 'GM001';
  end if;
  -- A data é a do aparelho, que pode estar um dia à frente do UTC (fusos a leste).
  if p_measured_on is null
     or p_measured_on > (now() at time zone 'utc')::date + 1
     or p_measured_on < date '2000-01-01' then
    raise exception 'Data da medição inválida' using errcode = 'GM002';
  end if;
  if p_values is null or jsonb_typeof(p_values) <> 'object'
     or (select count(*) from jsonb_object_keys(p_values)) not between 1 and cardinality(c_sites) then
    raise exception 'Medidas inválidas' using errcode = 'GM003';
  end if;

  -- Tudo conferido antes de gravar: um valor inválido não deixa o dia pela metade.
  for v_site, v_value in select key, value from jsonb_each(p_values) loop
    if not (v_site = any (c_sites)) then
      raise exception 'Medida desconhecida' using errcode = 'GM003';
    end if;
    if jsonb_typeof(v_value) = 'null' then
      continue;
    end if;
    if jsonb_typeof(v_value) <> 'number' then
      raise exception 'Medidas inválidas' using errcode = 'GM003';
    end if;
    v_cm := round((v_value #>> '{}')::numeric, 1);
    if v_cm <= 0 or v_cm >= 300 then
      raise exception 'Medidas inválidas' using errcode = 'GM003';
    end if;
  end loop;

  insert into public.body_measurements (user_id, measured_on)
  values (v_uid, p_measured_on)
  on conflict (user_id, measured_on) do nothing;

  select m.id into v_id
    from public.body_measurements m
   where m.user_id = v_uid and m.measured_on = p_measured_on;

  for v_site, v_value in select key, value from jsonb_each(p_values) loop
    if jsonb_typeof(v_value) = 'null' then
      delete from public.measurement_values v where v.measurement_id = v_id and v.site = v_site;
    else
      insert into public.measurement_values (measurement_id, site, value_cm)
      values (v_id, v_site, round((v_value #>> '{}')::numeric, 1))
      on conflict (measurement_id, site) do update set value_cm = excluded.value_cm;
    end if;
  end loop;

  if not exists (select 1 from public.measurement_values v where v.measurement_id = v_id) then
    delete from public.body_measurements m where m.id = v_id;
  end if;
end;
$$;

revoke execute on function public.save_body_measurement(date, jsonb) from public, anon;
grant execute on function public.save_body_measurement(date, jsonb) to authenticated;

comment on function public.save_body_measurement(date, jsonb) is
  'Medidas corporais de um dia (cm por local; null apaga o valor). Exige consentimento de saúde (GM001); data GM002; valores GM003.';
