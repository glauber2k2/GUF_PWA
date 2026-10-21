-- =====================================================================
-- GUF APP · Guf AI (assistente sobre os dados do próprio usuário)
-- Conversas e mensagens gravadas pela Edge Function guf-ai com o token do usuário (RLS):
-- nunca há acesso aos dados de outra pessoa. O app só lê, apaga e marca "útil"/"não ajudou".
-- Prazo: conversa sem mensagem nova há 180 dias é eliminada (job diário).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------
create table public.ai_conversations (
  id          uuid primary key,  -- gerado no aparelho (id da conversa no useChat)
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.ai_conversations is
  'Conversas com o Guf AI. Eliminadas 180 dias depois da última mensagem (purge_expired_ai_conversations).';

create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
create index ai_conversations_updated_idx on public.ai_conversations (updated_at);

create table public.ai_messages (
  id               uuid primary key,
  conversation_id  uuid not null references public.ai_conversations (id) on delete cascade,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null check (char_length(content) between 1 and 12000),
  used_history     boolean not null default false,
  feedback         smallint check (feedback in (-1, 1)),
  created_at       timestamptz not null default now()
);

comment on column public.ai_messages.used_history is
  'A resposta consultou os dados de treino do usuário (selo "Usou seu histórico").';
comment on column public.ai_messages.feedback is
  '1 = resposta útil, -1 = não ajudou, null = sem avaliação. Única coluna que o app pode alterar.';

create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);
create index ai_messages_user_idx on public.ai_messages (user_id, created_at) where role = 'user';

-- Mensagem nova mantém a conversa viva (ordem da lista e prazo de retenção).
create or replace function public.touch_ai_conversation()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.ai_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger ai_messages_touch_conversation
  after insert on public.ai_messages
  for each row execute function public.touch_ai_conversation();

revoke execute on function public.touch_ai_conversation() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Acesso (RLS): só o dono; mensagem só em conversa própria
-- ---------------------------------------------------------------------
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

revoke all on public.ai_conversations, public.ai_messages from anon;
revoke update on public.ai_conversations, public.ai_messages from authenticated;
grant select, insert, delete on public.ai_conversations, public.ai_messages to authenticated;
grant update (feedback) on public.ai_messages to authenticated;

create policy ai_conversations_select on public.ai_conversations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ai_conversations_insert on public.ai_conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ai_conversations_delete on public.ai_conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy ai_messages_select on public.ai_messages
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ai_messages_insert on public.ai_messages
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.ai_conversations c
       where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
create policy ai_messages_update on public.ai_messages
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ai_messages_delete on public.ai_messages
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 3. Retenção: 180 dias sem mensagem nova
-- ---------------------------------------------------------------------
alter table public.audit_log drop constraint audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check
  check (action in (
    'consent_granted', 'consent_revoked', 'health_data_deleted', 'data_exported',
    'account_deleted', 'consent_proofs_purged', 'audit_log_purged',
    'social_data_deleted', 'social_visibility_changed', 'follow_accepted', 'follow_ended', 'user_blocked',
    'ai_conversations_purged'));

create or replace function public.purge_expired_ai_conversations()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.ai_conversations where updated_at < now() - interval '180 days';
  get diagnostics v_count = row_count;
  if v_count > 0 then
    perform public.audit_log_append('ai_conversations_purged', null, jsonb_build_object('rows', v_count));
  end if;
  return v_count;
end;
$$;

revoke execute on function public.purge_expired_ai_conversations() from public, anon, authenticated;

select cron.schedule(
  'purge-expired-ai-conversations',
  '29 3 * * *',                                     -- todo dia, 03:29 UTC
  $$select public.purge_expired_ai_conversations()$$
);

-- ---------------------------------------------------------------------
-- 4. Exportar meus dados: formato guf-export/5 (com as conversas do Guf AI)
-- Cópia de 20261019225621_push_alerts com o bloco 'conversas_guf_ai'.
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
    'formato',                   'guf-export/5',
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
    'plano',                     (select to_jsonb(e) from public.entitlements e where e.user_id = v_uid),
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
    'format', 'guf-export/5',
    'workouts', jsonb_array_length(v_result -> 'treinos'),
    'measurements', jsonb_array_length(v_result -> 'medidas')
  ));

  return v_result;
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
