-- =====================================================================
-- GUF APP · Termos da Assinatura 1.2 (cupons de desconto)
--
-- O checkout do Stripe passa a aceitar códigos promocionais (allow_promotion_codes). Seção nova
-- "Cupons de desconto": o código é digitado na página do Stripe, que mostra o valor com desconto,
-- por quantas cobranças ele vale e o valor das renovações antes de confirmar; o cupom não vira
-- dinheiro nem muda cobranças feitas; na desistência em 7 dias volta o valor efetivamente pago.
-- requires_reaccept = true (aceito na caixa da assinatura; ninguém assinou com cobrança ainda).
--
-- Aplicar SÓ depois de 20261031135255_legal_docs_subscription_stripe (1.1) e com o app com este
-- texto no ar, junto com a abertura da venda. Hash de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('subscription_terms', '1.2', '/termos-da-assinatura',
   '80e1306decf67d0197b8c1bfa5a1f7527fb6d707de9a28b2e4900570b3586547', null, true)
on conflict (doc_type, version) do nothing;
