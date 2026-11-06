-- =====================================================================
-- GUF APP · Termos da Assinatura 1.4 e Política de Privacidade 1.6 (assinatura pelo Google Play)
--
-- Termos da Assinatura 1.4: no app Android baixado na Play Store o Pro é comprado pelo Google Play;
-- cancelar continua no guf com a regra dos 7 dias (o guf pede a devolução ao Google); forma de
-- pagamento, recibos e reativação ficam na página de assinaturas da Play; cobrança que falha segue o
-- prazo do Google Play; devolução feita pelo Google encerra o Pro; cupons do Stripe não valem na Play.
-- requires_reaccept = true (aceito na caixa da assinatura).
--
-- Política 1.6: Google Play entre os prestadores (o que recebe e o que o guf recebe dele),
-- transferência internacional, prazos (vínculo da compra enquanto a conta existir; avisos 90 dias).
-- requires_reaccept = false: só muda para quem assinar pelo app Android, e a caixa da assinatura
-- mostra o link da Política (mesmo critério da 1.5).
--
-- Aplicar SÓ depois da cadeia da assinatura (1.1, 1.2, 1.3) e com o app com estes textos no ar,
-- junto com a abertura da venda. Hash de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('subscription_terms', '1.4', '/termos-da-assinatura',
   '31efbe9d96fb439ffd3e5998430f936bee4cc23dc9b35b866fe0789dc92b1cc2', null, true),
  ('privacy', '1.6', '/privacidade',
   '5d70bd2f40f71437a224b1327b8c4727718073747b47c62b1afe8d505a021f1b', null, false)
on conflict (doc_type, version) do nothing;
