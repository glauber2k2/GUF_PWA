-- =====================================================================
-- GUF APP · Termos de Uso 1.6, Política de Privacidade 1.8 e Termos da Assinatura 1.5
--
-- Novo canal de contato e de pedidos do titular: suporte@gufapp.com.br (antes, o e-mail pessoal do
-- controlador). O controlador continua identificado como antes (LGPD, art. 9º; Decreto 7.962/2013).
-- Só o contato muda, sem mudar o que é feito com os dados: requires_reaccept = false nos três.
-- Quem ainda não aceitou os Termos 1.5 (requires_reaccept) continua tendo de aceitar: pending_documents_of
-- usa a última versão que pediu novo aceite. Por isso "O que mudou" da 1.6 e da 1.8 repete o da 1.5 e da 1.7.
--
-- Aplicar DEPOIS de 20261108130100_legal_docs_active_project (Termos 1.5 e Política 1.7) e SÓ
-- depois de o app com este texto estar no ar. Hashes de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '1.6', '/termos',
   '8bc9a120afb46f636e4109113a7eb4bead1ae178fce7966e4dab897925a08666', null, false),
  ('privacy', '1.8', '/privacidade',
   '9f0945fd09c6a023de8ab041374082341a12a0d41e263efbae46322159b0ccd5', null, false),
  ('subscription_terms', '1.5', '/termos-da-assinatura',
   '77f1f06b248db147955f1a982a41f055aa6afa3b14129dfaa0d3b3031184135d', null, false)
on conflict (doc_type, version) do nothing;
