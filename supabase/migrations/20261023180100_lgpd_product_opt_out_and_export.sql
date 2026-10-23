-- =====================================================================
-- GUF APP · LGPD: opção de não receber comunicados de produto (G24) e exportação completa (G25)
-- LGPD: .lgpd/gaps.md G24 e G25; A023 (comunicados) · Arts. 10, § 2º; 18, II e V; 6º, VI
--
-- 1. profiles.product_announcements_opt_out: a pessoa desliga em Configurações › Preferências os
--    comunicados de produto (novidades do guf). Avisos de serviço e legais continuam (são parte do
--    contrato ou obrigação). A regra fica numa função só (announcement_allowed_for), usada pela lista
--    da pessoa (my_announcements) e pelo alcance gravado ao publicar.
-- 2. export_my_data → guf-export/7: entram os comunicados vistos/fechados/tocados, as suspensões da
--    conta, a exclusão agendada e as conversões de ficha (só o horário).
-- =====================================================================

alter table public.profiles
  add column product_announcements_opt_out boolean not null default false;

comment on column public.profiles.product_announcements_opt_out is
  'A pessoa não quer comunicados de produto (finalidade product). Serviço e legal continuam.';

-- A pessoa recebe comunicados desta finalidade? (produto respeita a opção do perfil)
create or replace function public.announcement_allowed_for(p_purpose text, p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_purpose <> 'product'
      or not coalesce((select p.product_announcements_opt_out from public.profiles p where p.id = p_user_id), false);
$$;

revoke execute on function public.announcement_allowed_for(text, uuid) from public, anon, authenticated;

create or replace function public.my_announcements()
returns table (
  id uuid, format text, tone text, title text, body text, cta_label text, cta_path text,
  priority smallint, frequency text, published_at timestamptz
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
  select a.id, a.format, a.tone, a.title, a.body, a.cta_label, a.cta_path, a.priority, a.frequency, a.published_at
    from public.announcements a
    left join public.announcement_receipts r on r.announcement_id = a.id and r.user_id = v_uid
   where a.status = 'published'
     and a.starts_at <= now()
     and (a.ends_at is null or a.ends_at > now())
     and case a.frequency when 'once' then r.seen_at is null
                          else r.dismissed_at is null and r.cta_at is null end
     and public.announcement_allowed_for(a.purpose, v_uid)
     and public.audience_matches(a.audience, v_uid,
           exists (select 1 from public.announcement_targets t where t.announcement_id = a.id and t.user_id = v_uid))
   order by a.priority desc, a.published_at desc
   limit 10;
end;
$$;

-- Igual à versão do painel, com o alcance descontando quem recusou comunicados de produto.
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
  if v_ann.ends_at is null or v_ann.ends_at <= greatest(v_ann.starts_at, now()) then
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
    jsonb_build_object('announcement_id', p_id, 'format', v_ann.format, 'purpose', v_ann.purpose, 'reach', v_reach));
end;
$$;

-- Exportação guf-export/7 (Art. 18, II e V): + comunicados, suspensões, exclusão agendada e conversões de ficha.
create or replace function public.export_my_data()
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  v_result := jsonb_build_object(
    'formato',                   'guf-export/7',
    'exportado_em',              now(),
    'conta',                     (select jsonb_build_object(
                                     'id',                  u.id,
                                     'email',               u.email,
                                     'criada_em',           u.created_at,
                                     'email_confirmado_em', u.email_confirmed_at,
                                     'ultimo_acesso_em',    u.last_sign_in_at,
                                     'provedores',          u.raw_app_meta_data -> 'providers',
                                     'dados_do_cadastro',   u.raw_user_meta_data
                                   )
                                    from auth.users u where u.id = v_uid),
    'contas_vinculadas',         (select coalesce(jsonb_agg(jsonb_build_object(
                                     'provedor',         i.provider,
                                     'dados_recebidos',  i.identity_data,
                                     'vinculada_em',     i.created_at,
                                     'ultimo_acesso_em', i.last_sign_in_at
                                   ) order by i.created_at), '[]')
                                    from auth.identities i where i.user_id = v_uid),
    'perfil',                    (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'plano',                     jsonb_build_object(
                                   'plano_atual', public.plan_of(v_uid),
                                   'direitos',    (select coalesce(jsonb_agg(to_jsonb(g) order by g.valid_from), '[]')
                                                     from public.plan_grants g where g.user_id = v_uid),
                                   'assinaturas', (select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at), '[]')
                                                     from public.subscriptions s where s.user_id = v_uid)
                                 ),
    'exercicios_personalizados', (select coalesce(jsonb_agg(e), '[]') from public.exercises e where e.user_id = v_uid),
    'projetos',                  (select coalesce(jsonb_agg(p), '[]') from public.projects p where p.user_id = v_uid),
    'rotinas',                   (select coalesce(jsonb_agg(r), '[]') from public.routines r where r.user_id = v_uid),
    'exercicios_das_rotinas',    (select coalesce(jsonb_agg(re), '[]') from public.routine_exercises re where re.user_id = v_uid),
    'treinos',                   (select coalesce(jsonb_agg(s), '[]') from public.workout_sessions s where s.user_id = v_uid),
    'periodos_ativos',           (select coalesce(jsonb_agg(ap order by ap.started_at), '[]') from public.workout_active_periods ap where ap.user_id = v_uid),
    'exercicios_dos_treinos',    (select coalesce(jsonb_agg(se), '[]') from public.session_exercises se where se.user_id = v_uid),
    'series',                    (select coalesce(jsonb_agg(sl), '[]') from public.set_logs sl where sl.user_id = v_uid),
    'medidas',                   (select coalesce(jsonb_agg(m), '[]') from public.body_measurements m where m.user_id = v_uid),
    'valores_das_medidas',       (select coalesce(jsonb_agg(v), '[]') from public.measurement_values v where v.user_id = v_uid),
    'perfil_social',             (select to_jsonb(sp) from public.social_profiles sp where sp.user_id = v_uid),
    'seguidores_e_seguindo',     (select coalesce(jsonb_agg(jsonb_build_object(
                                     'tipo',            case when f.follower_id = v_uid then 'seguindo' else 'seguidor' end,
                                     'pessoa_id',       case when f.follower_id = v_uid then f.followee_id else f.follower_id end,
                                     'pessoa_usuario',  osp.handle,
                                     'status',          f.status,
                                     'pedido_em',       f.created_at,
                                     'aceito_em',       f.accepted_at
                                   ) order by f.created_at), '[]')
                                    from public.follows f
                                    left join public.social_profiles osp
                                      on osp.user_id = case when f.follower_id = v_uid then f.followee_id else f.follower_id end
                                   where f.follower_id = v_uid or f.followee_id = v_uid),
    'bloqueios',                 (select coalesce(jsonb_agg(jsonb_build_object(
                                     'pessoa_id',     b.blocked_id,
                                     'bloqueado_em',  b.created_at
                                   ) order by b.created_at), '[]')
                                    from public.blocks b where b.blocker_id = v_uid),
    'aparelhos_com_avisos',      (select coalesce(jsonb_agg(jsonb_build_object(
                                     'endereco_do_servico_de_push', ps.endpoint,
                                     'inscrito_em',                 ps.created_at,
                                     'ultimo_aviso_em',             ps.last_sent_at
                                   ) order by ps.created_at), '[]')
                                    from public.push_subscriptions ps where ps.user_id = v_uid),
    'avisos_da_competicao',      (select coalesce(jsonb_agg(jsonb_build_object(
                                     'competidor_id',  cas.rival_id,
                                     'temporada',      cas.season,
                                     'posicao',        cas.state,
                                     'atualizado_em',  cas.updated_at
                                   ) order by cas.season, cas.updated_at), '[]')
                                    from public.competition_alert_states cas where cas.watcher_id = v_uid),
    'conversas_guf_ai',          (select coalesce(jsonb_agg(jsonb_build_object(
                                     'id',             c.id,
                                     'titulo',         c.title,
                                     'criada_em',      c.created_at,
                                     'atualizada_em',  c.updated_at,
                                     'mensagens',      (select coalesce(jsonb_agg(jsonb_build_object(
                                                          'autor',            case m.role when 'user' then 'voce' else 'guf_ai' end,
                                                          'texto',            m.content,
                                                          'usou_historico',   m.used_history,
                                                          'avaliacao',        m.feedback,
                                                          'enviada_em',       m.created_at
                                                        ) order by m.created_at), '[]')
                                                         from public.ai_messages m where m.conversation_id = c.id)
                                   ) order by c.created_at), '[]')
                                    from public.ai_conversations c where c.user_id = v_uid),
    'comunicados',               (select coalesce(jsonb_agg(jsonb_build_object(
                                     'titulo',      an.title,
                                     'finalidade',  an.purpose,
                                     'visto_em',    ar.seen_at,
                                     'fechado_em',  ar.dismissed_at,
                                     'botao_em',    ar.cta_at
                                   ) order by coalesce(ar.seen_at, ar.dismissed_at, ar.cta_at)), '[]')
                                    from public.announcement_receipts ar
                                    join public.announcements an on an.id = ar.announcement_id
                                   where ar.user_id = v_uid),
    'suspensoes_da_conta',       (select coalesce(jsonb_agg(jsonb_build_object(
                                     'inicio',        b.created_at,
                                     'fim',           b.ends_at,
                                     'motivo',        b.reason,
                                     'observacao',    b.note,
                                     'encerrada_em',  b.lifted_at
                                   ) order by b.created_at), '[]')
                                    from public.account_bans b where b.user_id = v_uid),
    'exclusao_agendada',         (select jsonb_build_object(
                                     'para',        d.scheduled_for,
                                     'motivo',      d.reason,
                                     'agendada_em', d.created_at
                                   )
                                    from public.account_deletion_schedules d where d.user_id = v_uid),
    'conversoes_de_ficha',       (select coalesce(jsonb_agg(pi.created_at order by pi.created_at), '[]')
                                    from public.ai_plan_imports pi where pi.user_id = v_uid),
    'consentimentos',            (select coalesce(jsonb_agg(jsonb_build_object(
                                     'id',             c.id,
                                     'documento',      d.doc_type,
                                     'versao',         d.version,
                                     'hash_do_texto',  d.content_hash,
                                     'acao',           c.action,
                                     'origem',         c.source,
                                     'plataforma',     c.platform,
                                     'registrado_em',  c.created_at
                                   ) order by c.created_at), '[]')
                                    from public.consent_records c
                                    join public.legal_documents d on d.id = c.document_id
                                   where c.user_id = v_uid)
  );

  perform public.audit_log_append('data_exported', v_uid, jsonb_build_object(
    'format', 'guf-export/7',
    'workouts', jsonb_array_length(v_result -> 'treinos'),
    'measurements', jsonb_array_length(v_result -> 'medidas')
  ));

  return v_result;
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
