-- =====================================================================
-- GUF APP · Limite diário do GUF AI conferido e registrado no banco
--
-- Antes: a Edge Function contava as perguntas (ai_messages, role user) e as fichas convertidas
-- (ai_plan_imports) das últimas 24 h e só depois gravava. Três furos:
--   1. a pessoa podia apagar as próprias mensagens pela API e a contagem voltava a zero;
--   2. "gerar de novo" e "tentar de novo" (mesmo id) chamavam o provedor sem contar uso;
--   3. pedidos em paralelo passavam todos pela conferência antes de qualquer gravação.
-- Agora:
--   1. ai_usage: uma linha por chamada ao provedor no chat (pergunta ou "gerar de novo"), só o tipo
--      e o horário, sem conteúdo. O app não lê, não grava e não apaga (só a função abaixo).
--      Eliminada em 2 dias, como ai_plan_imports.
--   2. consume_ai_quota(p_kind): numa transação, trava por pessoa, conta ai_usage + ai_plan_imports
--      das últimas 24 h contra o limite do plano (my_entitlements) e, se couber, registra o uso.
--      É o único caminho para registrar; a Edge Function chama antes de falar com o provedor.
--   3. export_my_data → guf-export/8: + usos do GUF AI (horários).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Registro de uso
-- ---------------------------------------------------------------------
create table public.ai_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('chat', 'regenerate')),
  created_at  timestamptz not null default now()
);

comment on table public.ai_usage is
  'Uma linha por chamada do chat do GUF AI ao provedor (só tipo e horário), para o limite diário. Gravada só por consume_ai_quota; eliminada em 2 dias.';

create index ai_usage_user_idx on public.ai_usage (user_id, created_at);
create index ai_usage_created_idx on public.ai_usage (created_at);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- A ficha passa a ser registrada só pela função (apagar ou inserir à mão não muda a cota).
revoke insert on public.ai_plan_imports from authenticated;

-- ---------------------------------------------------------------------
-- 2. Conferir e registrar numa transação
-- ---------------------------------------------------------------------
-- p_kind: 'chat' (pergunta nova ou reenvio), 'regenerate' (gerar de novo) ou 'plan_import' (ficha).
-- Devolve { allowed, limit, upgradable }; limit nulo = sem limite.
create or replace function public.consume_ai_quota(p_kind text)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_uid        uuid := (select auth.uid());
  v_feature    jsonb;
  v_limit      integer;
  v_upgradable boolean;
  v_used       integer;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_kind not in ('chat', 'regenerate', 'plan_import') then
    raise exception 'Tipo de uso inválido' using errcode = '22023';
  end if;

  -- Uma conferência por pessoa de cada vez: pedidos em paralelo esperam e contam o anterior.
  perform pg_advisory_xact_lock(hashtextextended('ai_quota:' || v_uid::text, 0));

  -- Sem a funcionalidade no catálogo = nenhum uso; "limit" nulo no JSON = sem limite.
  v_feature := public.my_entitlements() -> 'features' -> 'guf_ai_daily_messages';
  v_limit := case when v_feature is null then 0 else (v_feature ->> 'limit')::integer end;
  v_upgradable := coalesce((v_feature ->> 'upgradable')::boolean, false);

  if v_limit is not null then
    select (select count(*) from public.ai_usage u
             where u.user_id = v_uid and u.created_at > now() - interval '24 hours')
         + (select count(*) from public.ai_plan_imports pi
             where pi.user_id = v_uid and pi.created_at > now() - interval '24 hours')
      into v_used;
    if v_used >= v_limit then
      return jsonb_build_object('allowed', false, 'limit', v_limit, 'upgradable', v_upgradable);
    end if;
  end if;

  if p_kind = 'plan_import' then
    insert into public.ai_plan_imports (user_id) values (v_uid);
  else
    insert into public.ai_usage (user_id, kind) values (v_uid, p_kind);
  end if;

  return jsonb_build_object('allowed', true, 'limit', v_limit, 'upgradable', v_upgradable);
end;
$$;

revoke execute on function public.consume_ai_quota(text) from public, anon;
grant execute on function public.consume_ai_quota(text) to authenticated;

comment on function public.consume_ai_quota(text) is
  'Confere o limite diário do GUF AI (ai_usage + ai_plan_imports, 24 h) e registra o uso numa transação travada por pessoa.';

create or replace function public.purge_expired_ai_usage()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.ai_usage where created_at < now() - interval '2 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.purge_expired_ai_usage() from public, anon, authenticated;

select cron.schedule(
  'purge-expired-ai-usage',
  '43 3 * * *',                                     -- todo dia, 03:43 UTC
  $$select public.purge_expired_ai_usage()$$
);

-- ---------------------------------------------------------------------
-- 3. Exportação guf-export/8 (Art. 18, II e V): + usos do GUF AI
-- ---------------------------------------------------------------------
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
    'formato',                   'guf-export/8',
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
    'usos_guf_ai',               (select coalesce(jsonb_agg(jsonb_build_object('tipo', u.kind, 'em', u.created_at) order by u.created_at), '[]')
                                    from public.ai_usage u where u.user_id = v_uid),
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
    'format', 'guf-export/8',
    'workouts', jsonb_array_length(v_result -> 'treinos'),
    'measurements', jsonb_array_length(v_result -> 'medidas')
  ));

  return v_result;
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
