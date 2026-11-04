-- =====================================================================
-- GUF APP · Termos de Uso 1.4 (histórico completo no perfil de outra pessoa)
--
-- Seção "Perfil, seguidores e competição": quem pode ver os seus treinos passa a ver todo o
-- histórico de treinos, não só o mês atual; o gráfico de evolução continua no mês atual
-- (20261104120000_member_history_full).
-- requires_reaccept = true: aumenta o que outras pessoas veem dos seus dados já registrados.
--
-- Aplicar SÓ junto com 20261104120000_member_history_full e depois de o app com este texto estar
-- no ar (senão o leitor mostra o texto antigo com a versão nova). Hash de
-- `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('terms', '1.4', '/termos',
   '258bb9d310d260e1661328675c830d7250549c4a8528061cb3a1543d12ecdfc5', null, true)
on conflict (doc_type, version) do nothing;
