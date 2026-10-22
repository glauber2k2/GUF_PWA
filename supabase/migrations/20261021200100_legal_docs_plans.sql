-- =====================================================================
-- GUF APP · Termos de Uso 0.4-dev, Política de Privacidade 0.6-dev e Termos da Assinatura 0.1-dev
-- (rascunhos genéricos do beta, sem revisão jurídica)
--
-- Planos Free e Pro (migration plans_and_entitlements). Os aceites ficam agrupados:
--   - Termos e Política: UMA nova aceitação no /aceite agora, já cobrindo a assinatura futura
--     (prestador de pagamento descrito com marcador), para o lançamento do pagamento não pedir outra;
--   - Termos da Assinatura: aceitos só na tela de assinatura, junto com qualquer pendência do
--     cadastro (pending_subscription_documents + accept_documents com source 'subscribe').
-- A declaração de idade não mudou. Hashes gerados por `pnpm --filter @guf/core legal:hashes`.
--
-- PUBLICAR JUNTO COM O DEPLOY DO APP (senão o /aceite mostra o texto antigo).
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '0.4-dev', '/termos',
   '744a7637d893936a55deea75d815317ec9eec2bad867360c22e24811e6946921', null, true),
  ('privacy', '0.6-dev', '/privacidade',
   'd4c298b5526df3d4f52485be45186f8ca2ffb8731d85278249de50fa0a82de1f', null, true),
  ('subscription_terms', '0.1-dev', '/termos-da-assinatura',
   'c55b8578289e2e4793cc2ec6a4bbdb560fae4c8a2c264ad3c3701d1354187811', null, true)
on conflict (doc_type, version) do nothing;
