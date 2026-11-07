-- =====================================================================
-- GUF APP · Termos de Uso 1.6, Política de Privacidade 1.8 e Termos da Assinatura 1.5
--
-- 1. Copiar do perfil (20261108170000_copy_member_routines): quem vê o projeto ativo pode copiar
--    uma rotina ou o projeto inteiro para a própria conta (dias, exercícios, séries, repetições e
--    descanso; sem cargas nem observações). Termos: requires_reaccept = true (aumenta o que outras
--    pessoas podem fazer com os seus dados). Política: false (o aceite vai pelos Termos, como na 1.7).
-- 2. Novo canal de contato e de pedidos do titular: suporte@gufapp.com.br (antes, o e-mail pessoal
--    do controlador, que continua identificado: LGPD, art. 9º; Decreto 7.962/2013). Termos da
--    Assinatura: só o contato muda, requires_reaccept = false.
-- "O que mudou" da 1.6 e da 1.8 repete o da 1.5 e da 1.7, que nunca valeram sozinhas: o /aceite
-- mostra só a versão atual.
--
-- Aplicar DEPOIS de 20261108130100_legal_docs_active_project (Termos 1.5 e Política 1.7) e SÓ
-- depois de o app com este texto estar no ar. Hashes de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '1.6', '/termos',
   'd71a008b69b0dc9f47df39930e054e047e779347ecd0c7577f056f6aea027f4f', null, true),
  ('privacy', '1.8', '/privacidade',
   '3d24b053066ebcfe7be04000c024574520d54d6d8f416cc7f70eae3a2adf8c82', null, false),
  ('subscription_terms', '1.5', '/termos-da-assinatura',
   '77f1f06b248db147955f1a982a41f055aa6afa3b14129dfaa0d3b3031184135d', null, false)
on conflict (doc_type, version) do nothing;
