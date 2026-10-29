-- =====================================================================
-- GUF APP · Termos de Uso 1.3 e Política de Privacidade 1.4 (observações fazem parte do treino)
--
-- As observações do treino e dos exercícios passam a seguir a visibilidade dos treinos
-- (migration 20261029150000_workout_notes_visible): quem pode ver os treinos vê também as
-- observações, inclusive as já escritas; ocultar o histórico esconde as observações junto.
-- As versões anteriores prometiam que observações nunca apareciam para outras pessoas.
--
-- requires_reaccept = true: muda o que outras pessoas veem de um texto que a pessoa escreveu
-- esperando que fosse só dela; o /aceite mostra "O que mudou nesta versão" antes de liberar o app.
-- Aplicar SÓ depois de o app com estes textos estar no ar (senão o /aceite mostra o texto antigo).
-- Hash de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '1.3', '/termos',
   '9f53b56f21fa09f14635a0eb861ddde42ffe300cb810e86a8c734e2901d5a5d3', null, true),
  ('privacy', '1.4', '/privacidade',
   'd7ee3106b740e2da10d58008a101d2cfb566e761d278df9537ef6bd97d40f953', null, true)
on conflict (doc_type, version) do nothing;
