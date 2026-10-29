-- =====================================================================
-- GUF APP · Termos de Uso 1.3 e Política de Privacidade 1.4 (observações, responsabilidades, pontos por treino)
--
-- As observações do treino e dos exercícios passam a seguir a visibilidade dos treinos
-- (migration 20261029150000_workout_notes_visible): quem pode ver os treinos vê também as
-- observações, inclusive as já escritas; ocultar o histórico esconde as observações junto.
-- As versões anteriores prometiam que observações nunca apareciam para outras pessoas.
-- Também: Termos com a seção "Suas escolhas e responsabilidades" e a limitação de responsabilidade
-- pelo CDC (art. 14, § 3º, II); pontos de cada treino visíveis a quem compete; pódio do mês anterior.
--
-- requires_reaccept = true: muda o que outras pessoas veem de um texto que a pessoa escreveu
-- esperando que fosse só dela; o /aceite mostra "O que mudou nesta versão" antes de liberar o app.
-- Aplicar SÓ depois de o app com estes textos estar no ar (senão o /aceite mostra o texto antigo).
-- Hash de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '1.3', '/termos',
   'a317ff8a61f13e1d8788ef86a9d27202412c0b46c546918c9cbee8815c53e37e', null, true),
  ('privacy', '1.4', '/privacidade',
   '0d327f468389499b3b5ad1deb549e51f4c4a014477b9699f79141cf132f3eee9', null, true)
on conflict (doc_type, version) do nothing;
