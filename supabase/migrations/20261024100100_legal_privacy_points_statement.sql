-- =====================================================================
-- GUF APP · Política de Privacidade 1.1
--
-- O GUF AI passa a ler o extrato de pontos da competição do PRÓPRIO usuário quando ele pergunta
-- sobre os pontos (ferramenta extrato_de_pontos → get_my_points_statement). A seção do GUF AI cita
-- o extrato; nunca os pontos ou a posição de outras pessoas (RIPD do GUF AI 0.3, R11).
-- requires_reaccept = false: mesma finalidade e dado derivado dos treinos que já eram enviados.
-- Hash de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('privacy', '1.1', '/privacidade',
   'e12f8702e624c18386401040ce852731205743be305bd0fc82b8d8dc6d897197', null, false)
on conflict (doc_type, version) do nothing;
