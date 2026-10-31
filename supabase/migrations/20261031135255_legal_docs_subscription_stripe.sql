-- =====================================================================
-- GUF APP · Termos da Assinatura 1.1 e Política de Privacidade 1.5 (venda do Pro pelo Stripe)
--
-- Termos da Assinatura 1.1: preço na tela antes de confirmar, pagamento e renovação pelo Stripe,
-- cobrança que falha (Pro por até 14 dias), desistência em 7 dias do primeiro pagamento pelo
-- próprio app (devolução inteira e fim na hora), cancelamento depois (até o fim do período),
-- cobrança indevida (devolve o valor indevido) e outros pedidos por e-mail (5 dias úteis), contestação, exclusão
-- (app ou equipe: cancela a assinatura antes) e suspensão. requires_reaccept = true: quem assinar aceita na
-- caixa da assinatura (pending_subscription_documents); ninguém assinou a 1.0 com cobrança.
--
-- Política 1.5: Stripe entre os prestadores (o que recebe, papel próprio para fraude e obrigações
-- legais, fora do Brasil), dados de cobrança guardados, prazos (pagamentos e devoluções 5 anos,
-- sem identificação depois de excluir a conta; avisos do Stripe 90 dias) e o painel do Stripe no
-- atendimento. requires_reaccept = false: só muda para quem assinar, e a caixa da assinatura
-- mostra o link da Política (docs/stripe-payments-plan.md § 6.2).
--
-- Aplicar SÓ depois de o app com estes textos estar no ar (senão o leitor mostra o texto antigo
-- com a versão nova). Hash de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('subscription_terms', '1.1', '/termos-da-assinatura',
   '6e8aba5a7db31ac1382d67049c056cb3bf85dc1cfd0712cba92d93513b27aeec', null, true),
  ('privacy', '1.5', '/privacidade',
   'c5f418655cc955c42d557a1c2e7e8ec4428e243de96e4e899eba88ec7bb97ca0', null, false)
on conflict (doc_type, version) do nothing;
