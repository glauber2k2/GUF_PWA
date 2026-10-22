-- =====================================================================
-- GUF APP · Termo de Saúde 0.2-dev e Política de Privacidade 0.7-dev (rascunhos, sem revisão jurídica)
--
-- Módulo de medidas corporais com tela (body_measurements_module): o termo passa a listar exatamente
-- o que é registrado (circunferências em cm; peso e % de gordura saíram), diz que só a pessoa vê,
-- que o GUF AI não tem acesso e que as medidas não ficam salvas no aparelho.
-- Termo de Saúde: requires_reaccept = true (consentimento do art. 11, I vale para a versão vigente;
--   ninguém tinha autorizado a 0.1-dev, conferido antes de aplicar).
-- Política: requires_reaccept = false — a mudança só reduz o que é coletado e quem vê.
-- Hashes gerados por `pnpm --filter @guf/core legal:hashes`. PUBLICAR JUNTO COM O DEPLOY DO APP.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('health_consent', '0.2-dev', '/termo-de-saude',
   '72bf277e65007d67c1cb7f39910a71d0dbcd18c2715c790cf4be856eb012c2e3',
   '19f6d560fd77afed0182ac5cff9e53764ce32a94949b4eb36212f7dcb4e1607d', true),
  ('privacy', '0.7-dev', '/privacidade',
   'a28811d336cb68445d5a42adb05cde3bc0d8881c85224a2c19e92a15dbd0295b', null, false)
on conflict (doc_type, version) do nothing;
