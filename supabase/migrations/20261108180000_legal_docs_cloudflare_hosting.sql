-- =====================================================================
-- GUF APP · Política de Privacidade 1.9
--
-- Prestadores atualizados para o que o sistema faz hoje:
-- 1. Hospedagem: Cloudflare no lugar da Vercel (Vercel desligada em 2026-11-07). A Cloudflare também
--    encaminha (Email Routing) as mensagens enviadas para suporte@gufapp.com.br.
-- 2. E-mails de acesso (confirmação de cadastro e recuperação de senha) enviados pelo Resend, como
--    SMTP do Supabase Auth (antes a política dizia que o próprio Supabase enviava).
-- 3. Caixa do suporte (inclusive pedidos de titular) no Gmail (Google).
-- Transferência internacional e prazos de guarda acompanham a lista.
--
-- requires_reaccept = false: só atualiza a lista de operadores e o que cada um recebe, sem nova
-- finalidade nem novo dado coletado (como a entrada do Stripe na 1.5).
--
-- Aplicar SÓ depois de o app com este texto estar no ar (senão o leitor e o /aceite mostram o texto
-- 1.8 com a versão 1.9). Hash de `pnpm --filter @guf/core legal:hashes`.
-- =====================================================================

insert into public.legal_documents (doc_type, version, url, content_hash, summary_hash, requires_reaccept)
values
  ('privacy', '1.9', '/privacidade',
   'a428ba4a710a0cee17b0ed55abdbe7cdc072f1b15b1e8a210f998066786e7867', null, false)
on conflict (doc_type, version) do nothing;
