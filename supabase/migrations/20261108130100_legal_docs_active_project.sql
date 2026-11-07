-- =====================================================================
-- GUF APP · Termos de Uso 1.5 e Política de Privacidade 1.7 (projeto ativo no perfil)
--
-- O perfil passa a mostrar o projeto ativo (nome, descrição e rotinas com dias, exercícios,
-- séries e repetições; sem cargas nem observações) para quem já pode ver os treinos
-- (20261108130000_member_active_project). A opção "Visibilidade de treino" (antes "Ocultar
-- histórico de treinos") mostra ou esconde o histórico e o projeto ativo juntos.
-- Termos: requires_reaccept = true (aumenta o que outras pessoas veem dos seus dados).
-- Política: requires_reaccept = false (o aceite vai pelos Termos, como na 1.4 dos Termos).
--
-- Aplicar SÓ depois de o app com este texto estar no ar (senão o /aceite mostra o texto antigo
-- com a versão nova). Hashes de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '1.5', '/termos',
   '6af7c6df2f56a02f0523a8b05677fa5d2b2a538c61d68bc58a10e89c38f3a8ed', null, true),
  ('privacy', '1.7', '/privacidade',
   '04c26cfc3c60cac2003cafaeb68052d7e45c2e1028f04724da252e1c1309ee12', null, false)
on conflict (doc_type, version) do nothing;
