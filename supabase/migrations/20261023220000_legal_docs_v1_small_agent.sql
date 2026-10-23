-- =====================================================================
-- GUF APP · Termos de Uso 1.0, Política de Privacidade 1.0 e Termos da Assinatura 1.0
--
-- Primeiras versões oficiais (saem do "rascunho"): o guf é mantido por Glauber Monteiro, pessoa
-- física, agente de tratamento de pequeno porte (Res. CD/ANPD nº 2/2022), sem encarregado designado
-- (art. 11), com o canal devglaubermonteiro@gmail.com. Sem revisão por advogado (decisão do
-- controlador; revisão depois dos primeiros clientes pagantes — .lgpd/STATUS.md).
-- O que mudou: controlador identificado; suspensão e exclusão por violação como o painel faz;
-- seções do GUF AI (Google Gemini, plano gratuito), do atendimento da equipe e dos comunicados;
-- prazos de guarda completos; o que fica no aparelho; Pro ainda não à venda.
-- Termos e Política: requires_reaccept = true (todos aceitam a versão oficial no /aceite).
-- Termos da Assinatura: requires_reaccept = false (ninguém assinou; o Pro não está à venda).
-- Termo de Saúde e declaração de idade: sem mudança (hashes iguais), continuam 0.2-dev e 0.1-dev.
-- Hashes de `pnpm --filter @guf/core legal:hashes`.
-- APLICAR DEPOIS DE O APP COM ESTES TEXTOS ESTAR NO AR (senão o /aceite mostra o texto antigo).
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '1.0', '/termos',
   '992d558b7ccfa8e75a39391d1747c13060a047042dbee42b89640748c4edd549', null, true),
  ('privacy', '1.0', '/privacidade',
   'd8f51e91134e99ebc029eba66a67613765d1ede153bbed0ada1c0ff40980a5dc', null, true),
  ('subscription_terms', '1.0', '/termos-da-assinatura',
   '31204b41437dd3dfda75df0e715b28868f49d8c664d5893862281130c013a1ca', null, false)
on conflict (doc_type, version) do nothing;
