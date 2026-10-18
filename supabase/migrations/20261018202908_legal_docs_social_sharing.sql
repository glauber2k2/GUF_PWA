-- =====================================================================
-- GUF APP · Termo de compartilhamento 0.1-dev e Política de Privacidade 0.3-dev
-- (rascunhos genéricos do beta, sem revisão jurídica)
--
-- social_sharing: consentimento específico pedido ao aceitar o 1º seguidor ou abrir o perfil
-- (grant_social_consent). Não entra no /aceite (pending_documents só lista termos, política e idade).
-- privacy 0.3-dev: perfil social, seguidores, competição e o esforço (RPE) do treino. Quem já usa
-- o app passa pelo /aceite e vê "O que mudou" (changes["0.3-dev"]).
-- Hashes gerados por `pnpm --filter @guf/core legal:hashes` a partir de legal-content.ts.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('social_sharing', '0.1-dev', '/termo-de-compartilhamento',
   '6c1812acf18eb296c7608514d343fd1aa6c4a81f4c3a37f4fa055cfa3244f46f',
   '117ad5eb405a7ccdc7be57926a22d22cd05bff00d36b8ec562a166c5fef1005f', false),
  ('privacy', '0.3-dev', '/privacidade',
   'cfa75104e1eb19720b61fdea2b08cb340a5bf9ed7b0d573624dd7f54a050eac6', null, true)
on conflict (doc_type, version) do nothing;
