-- =====================================================================
-- GUF APP · Política de Privacidade 0.2-dev (rascunho do beta, sem revisão jurídica)
--
-- O texto do app (packages/core/src/legal-content.ts) passou a trazer os dados já conhecidos:
-- banco no Brasil, prestadores (Supabase, Vercel, Google), e-mail de contato do beta, eliminação
-- na hora e prova dos aceites por 5 anos. Mudou o texto → nova versão (regra da F3), com o hash
-- gerado por `pnpm --filter @guf/core legal:hashes`. Quem já usa o app passa pelo /aceite e vê
-- "O que mudou" (changes["0.2-dev"]).
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values ('privacy', '0.2-dev', '/privacidade', '10a8cc5212a827783b66d1c33ef178e312c0654e4ac7c2987d5cc111b455cbd0', null, true)
on conflict (doc_type, version) do nothing;
