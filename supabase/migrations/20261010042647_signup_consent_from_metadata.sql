-- =====================================================================
-- GUF APP · Aceite LGPD no cadastro por e-mail, gravado pelo gatilho de novo usuário
--
-- Motivo: com a confirmação de e-mail ligada, o signUp não devolve sessão e
-- accept_documents() (que exige usuário logado) falharia. O app envia em
-- options.data.accepted_document_ids os ids das versões vigentes que estavam na
-- tela quando o usuário marcou as confirmações; o gatilho registra o aceite.
--
-- Regras:
-- - Só para cadastro por e-mail (provider 'email').
-- - Só ids que sejam a versão VIGENTE de terms, privacy ou age_declaration.
-- - Ids inválidos/desatualizados/repetidos são ignorados, sem impedir o cadastro
--   (o portão /aceite cobre o que faltar via pending_documents()).
-- - signup_platform opcional ('web' | 'ios' | 'android'); outro valor vira null.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_ids      jsonb := new.raw_user_meta_data -> 'accepted_document_ids';
  v_platform text  := new.raw_user_meta_data ->> 'signup_platform';
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'), 100),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );

  insert into public.entitlements (user_id) values (new.id);

  if coalesce(new.raw_app_meta_data ->> 'provider', 'email') = 'email'
     and jsonb_typeof(v_ids) = 'array' then

    if v_platform is not null and v_platform not in ('web', 'ios', 'android') then
      v_platform := null;
    end if;

    -- Compara como texto: um id malformado não gera erro de conversão (seria ignorado).
    insert into public.consent_records (user_id, document_id, action, source, platform)
    select new.id, d.id, 'granted', 'signup_email', v_platform
      from public.legal_documents d
     where d.id::text in (
             select lower(trim(e.value))
               from jsonb_array_elements_text(v_ids) as e(value)
           )
       and d.id in (
             select (public.current_legal_document(t)).id
               from unnest(array['terms', 'privacy', 'age_declaration']) as t
           );
  end if;

  return new;
end;
$$;

-- O gatilho on_auth_user_created continua apontando para esta função (mesmo nome).
