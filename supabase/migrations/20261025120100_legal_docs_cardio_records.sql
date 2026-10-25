-- =====================================================================
-- GUF APP · Termos de Uso 1.2 e Política de Privacidade 1.3 (recordes de cardio na competição)
--
-- A pontuação da competição passa a contar os recordes de cardio (melhor ritmo ou maior
-- distância) como os de carga (migration 20261025120000_competition_cardio_records). Nenhum dado
-- novo é coletado nem mostrado a outras pessoas: os pontos vêm das séries que a pessoa já registra.
-- requires_reaccept = false: só a descrição da regra muda.
-- Publicar junto com o app que tem estes textos. Hash de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '1.2', '/termos',
   'ea1c4353bdaa11c4b5a873e39e6e013f75cb363d9d2e3428fc5c019bde572042', null, false),
  ('privacy', '1.3', '/privacidade',
   'b382422b688cf08e2b2b9006cb18056070a3a402188362ca0a7e33342fa259fa', null, false)
on conflict (doc_type, version) do nothing;
