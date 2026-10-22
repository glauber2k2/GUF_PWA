-- =====================================================================
-- GUF APP · Termos de Uso 0.5-dev e Termos da Assinatura 0.2-dev (rascunhos, sem revisão jurídica)
--
-- Regra revista dos planos (charts_window_and_member_month): treinos, recordes e evolução ficam
-- completos em qualquer plano; o Free limita só o período dos gráficos. No perfil de outra pessoa,
-- o histórico de treinos mostra só o mês atual.
-- requires_reaccept = false: a mudança amplia o que a pessoa vê e reduz o que outras pessoas veem
-- dela; não tira direitos. Quem aceitou a 0.4-dev não precisa aceitar de novo; quem ainda não aceitou
-- vê esta versão no /aceite. A Política de Privacidade (0.6-dev) não mudou.
-- Hashes gerados por `pnpm --filter @guf/core legal:hashes`. PUBLICAR JUNTO COM O DEPLOY DO APP.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '0.5-dev', '/termos',
   'aa7b32c9fc630d37b3575321d3162c380d906f53ba02b4e91a98904ccd464e5d', null, false),
  ('subscription_terms', '0.2-dev', '/termos-da-assinatura',
   '6125d2013d3bc7a48daf309f0e9eb3766e3707d32f36198d42f29a195b6eb5f7', null, false)
on conflict (doc_type, version) do nothing;
