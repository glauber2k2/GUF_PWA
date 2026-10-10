-- =====================================================================
-- GUF APP · Migration 2 · Documentos legais e consentimentos (LGPD)
-- =====================================================================

-- ---------------------------------------------------------------------
-- VERSÕES DOS DOCUMENTOS LEGAIS
-- Cadastradas pelo administrador (painel/SQL). Leitura pública.
-- ---------------------------------------------------------------------
create table public.legal_documents (
  id                uuid primary key default gen_random_uuid(),
  doc_type          text not null check (doc_type in ('terms', 'privacy', 'health_consent', 'age_declaration')),
  version           text not null,
  url               text not null,
  content_hash      text not null,            -- SHA-256 do texto completo apresentado
  summary_hash      text,                     -- SHA-256 do resumo visível (consentimento em camadas)
  requires_reaccept boolean not null default true,
  published_at      timestamptz not null default now(),
  unique (doc_type, version)
);

create index legal_documents_type_idx on public.legal_documents (doc_type, published_at desc);

-- ---------------------------------------------------------------------
-- REGISTROS DE ACEITE/CONSENTIMENTO (somente inclusão, nunca editados)
-- Revogar = inserir novo registro com action = 'revoked'
-- ---------------------------------------------------------------------
create table public.consent_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  document_id   uuid not null references public.legal_documents (id) on delete restrict,
  action        text not null check (action in ('granted', 'revoked')),
  source        text not null check (char_length(source) <= 50),   -- 'signup_email', 'signup_google', 'reaccept', 'health_module', 'settings'
  platform      text check (platform in ('web', 'ios', 'android')),
  created_at    timestamptz not null default now()
);

create index consent_records_user_doc_idx on public.consent_records (user_id, document_id, created_at desc);

-- ---------------------------------------------------------------------
-- Versão vigente de cada tipo de documento
-- ---------------------------------------------------------------------
create or replace function public.current_legal_document(p_doc_type text)
returns public.legal_documents
language sql stable
set search_path = ''
as $$
  select d.*
    from public.legal_documents d
   where d.doc_type = p_doc_type
   order by d.published_at desc
   limit 1;
$$;

-- ---------------------------------------------------------------------
-- Consentimento de saúde ativo do usuário logado
-- Considera apenas a versão vigente do termo e a última ação do usuário sobre ela.
-- SECURITY DEFINER para ser usada dentro das políticas de RLS.
-- Sem parâmetro de usuário: ninguém consegue consultar o consentimento de outra pessoa.
-- ---------------------------------------------------------------------
create or replace function public.has_health_consent()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((
    select c.action = 'granted'
      from public.consent_records c
     where c.user_id = (select auth.uid())
       and c.document_id = (public.current_legal_document('health_consent')).id
     order by c.created_at desc
     limit 1
  ), false);
$$;

-- ---------------------------------------------------------------------
-- Documentos obrigatórios (termos, privacidade, declaração de idade)
-- ainda não aceitos pelo usuário na versão vigente → alimenta o portão /aceite
-- ---------------------------------------------------------------------
create or replace function public.pending_documents()
returns setof public.legal_documents
language sql stable
set search_path = ''
as $$
  select d.*
    from public.legal_documents d
   where d.id in (
           select (public.current_legal_document(t)).id
             from unnest(array['terms', 'privacy', 'age_declaration']) as t
         )
     and not exists (
           select 1
             from public.consent_records c
            where c.user_id = (select auth.uid())
              and c.document_id = d.id
              and c.action = 'granted'
         );
$$;

-- ---------------------------------------------------------------------
-- Registrar aceite de documentos (cadastro, portão /aceite)
-- Aceita apenas versões vigentes de termos, privacidade e declaração de idade.
-- ---------------------------------------------------------------------
create or replace function public.accept_documents(
  p_document_ids uuid[],
  p_source text,
  p_platform text default 'web'
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_valid_count integer;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  select count(*) into v_valid_count
    from unnest(p_document_ids) as doc_id
   where doc_id in (
           select (public.current_legal_document(t)).id
             from unnest(array['terms', 'privacy', 'age_declaration']) as t
         );

  if v_valid_count <> coalesce(array_length(p_document_ids, 1), 0) then
    raise exception 'Documento inválido ou desatualizado' using errcode = '22023';
  end if;

  insert into public.consent_records (user_id, document_id, action, source, platform)
  select v_uid, doc_id, 'granted', p_source, p_platform
    from unnest(p_document_ids) as doc_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Conceder consentimento de saúde (módulo de medidas)
-- ---------------------------------------------------------------------
create or replace function public.grant_health_consent(p_platform text default 'web')
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_doc uuid := (public.current_legal_document('health_consent')).id;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if v_doc is null then
    raise exception 'Termo de saúde não publicado' using errcode = '22023';
  end if;

  insert into public.consent_records (user_id, document_id, action, source, platform)
  values (v_uid, v_doc, 'granted', 'health_module', p_platform);
end;
$$;

-- ---------------------------------------------------------------------
-- Revogar consentimento de saúde E apagar todas as medidas (operação única)
-- A revogação é registrada na versão vigente do termo.
-- ---------------------------------------------------------------------
create or replace function public.revoke_health_consent(p_platform text default 'web')
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_doc uuid := (public.current_legal_document('health_consent')).id;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  if v_doc is not null then
    insert into public.consent_records (user_id, document_id, action, source, platform)
    values (v_uid, v_doc, 'revoked', 'settings', p_platform);
  end if;

  delete from public.body_measurements where user_id = v_uid;   -- cascata apaga os valores
end;
$$;
