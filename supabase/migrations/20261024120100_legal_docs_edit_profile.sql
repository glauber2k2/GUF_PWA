-- =====================================================================
-- GUF APP · Termos de Uso 1.1 e Política de Privacidade 1.2 (Editar perfil)
--
-- Novos dados opcionais, escritos pela própria pessoa (migration 20261024120000_edit_profile):
-- foto enviada pelo app (reduzida no aparelho, sem EXIF), bio (no cartão do perfil, como nome e
-- foto) e objetivos/experiência (só para quem pode ver os treinos). Nada vai para o GUF AI.
-- requires_reaccept = false: nada muda para quem não preencher; quem preenche escolhe na hora,
-- com o aviso na própria tela (RIPD social v0.5).
-- Publicar junto com o app que tem estes textos. Hash de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '1.1', '/termos',
   'ea6c59dfd023a4f249bc536c0afbb57f5f154b8f1f1ad44ed7a32c7d19fa2981', null, false),
  ('privacy', '1.2', '/privacidade',
   'a03e05a778ad947d0b4f338b03e1ed65368cf1e0b8ae20730aab1d86d1bcec7a', null, false)
on conflict (doc_type, version) do nothing;
