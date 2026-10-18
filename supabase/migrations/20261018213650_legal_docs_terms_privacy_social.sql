-- =====================================================================
-- GUF APP · Termos de Uso 0.2-dev e Política de Privacidade 0.3-dev
-- (rascunhos genéricos do beta, sem revisão jurídica)
--
-- As regras do perfil social (perfil privado por padrão, seguidores, perfil aberto, histórico
-- oculto, remover e bloquear, competição) entram nos documentos aceitos no cadastro. Quem já
-- usa o app passa pelo /aceite e vê "O que mudou" (changes["0.2-dev"] e changes["0.3-dev"]).
-- A declaração de idade (seção #idade dos Termos) não mudou: continua na versão atual.
-- Hashes gerados por `pnpm --filter @guf/core legal:hashes` a partir de legal-content.ts.
--
-- PUBLICAR JUNTO COM O DEPLOY DO APP (senão o /aceite mostra o texto antigo).
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '0.2-dev', '/termos',
   '812beaa43cdcedd89a3e5024d5e0b33617499de6aac649874f38c2a08cf0a392', null, true),
  ('privacy', '0.3-dev', '/privacidade',
   '6d19870480e019ef576869fec7fc73dadb5105ea2c5214e3d6dd03f508c5dbc0', null, true)
on conflict (doc_type, version) do nothing;
