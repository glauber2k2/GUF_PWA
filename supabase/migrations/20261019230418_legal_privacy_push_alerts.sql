-- =====================================================================
-- GUF APP · Política de Privacidade 0.4-dev (rascunho genérico do beta, sem revisão jurídica)
--
-- Inclui os avisos no celular (Web Push, opcionais e desligados por padrão) da competição e de
-- seguidores (novo seguidor, pedido para seguir, pedido aceito):
-- dado coletado (endereço do aparelho no serviço de notificações), finalidade e base legal,
-- serviço de notificações como prestador (Google, Apple ou Mozilla; transferência internacional)
-- e prazo de guarda. Quem já usa o app passa pelo /aceite e vê "O que mudou" (changes["0.4-dev"]).
-- Hash gerado por `pnpm --filter @guf/core legal:hashes` a partir de legal-content.ts.
--
-- PUBLICAR JUNTO COM O DEPLOY DO APP (senão o /aceite mostra o texto antigo).
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('privacy', '0.4-dev', '/privacidade',
   '0a20c450d7ed0614898461f0a4434093ea10430bbeb53eec7a2c6a51c8d5bb04', null, true)
on conflict (doc_type, version) do nothing;
