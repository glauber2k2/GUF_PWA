-- =====================================================================
-- GUF APP · Termos de Uso 0.3-dev e Política de Privacidade 0.5-dev
-- (rascunhos genéricos do beta, sem revisão jurídica)
--
-- A competição deixou de usar o esforço do treino (RPE): a nota de 1 a 10 não é mais coletada e o
-- ajuste automático do esforço saiu (migration competition_scoring_without_rpe). Os textos tiram
-- essas menções e descrevem a pontuação nova (constância, recordes de carga e volume).
-- Quem já usa o app passa pelo /aceite e vê "O que mudou" (changes["0.3-dev"] e changes["0.5-dev"]).
-- A declaração de idade (seção #idade dos Termos) não mudou: continua na versão atual.
-- Hashes gerados por `pnpm --filter @guf/core legal:hashes` a partir de legal-content.ts.
--
-- PUBLICAR JUNTO COM O DEPLOY DO APP (senão o /aceite mostra o texto antigo).
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '0.3-dev', '/termos',
   '2a2147d912ae70cb999a7eb336ac0476732dea2deff16553e6b086be0ea567c0', null, true),
  ('privacy', '0.5-dev', '/privacidade',
   '8474386324b84a6f02bc98358233b8b4d86a94e9f2bf11116a28e887227ed90e', null, true)
on conflict (doc_type, version) do nothing;
