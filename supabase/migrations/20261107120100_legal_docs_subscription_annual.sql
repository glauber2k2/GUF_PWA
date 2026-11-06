-- =====================================================================
-- GUF APP · Termos da Assinatura 1.3 (plano anual e preço promocional)
--
-- Seção nova "Mensal ou anual": o anual cobra o ano de uma vez (o valor por mês é só comparação);
-- preço promocional por tempo limitado com o preço normal informado na tela; aumento para quem já
-- assina segue a regra de mudança de preço (aviso antes, vale na renovação seguinte); no anual,
-- cancelar depois dos 7 dias mantém o Pro até o fim do ano pago, sem devolução proporcional.
-- requires_reaccept = true (aceito na caixa da assinatura).
--
-- Aplicar SÓ depois da 1.1 (20261031135255) e da 1.2 (20261106120100), com o app com este texto
-- no ar, junto com a abertura da venda. Hash de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('subscription_terms', '1.3', '/termos-da-assinatura',
   '6c8b4339d63e6dd20579d28488952d335bfd22eb58fa278abe4d0d38909f15d3', null, true)
on conflict (doc_type, version) do nothing;
