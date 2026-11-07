-- =====================================================================
-- GUF APP · Botão de comunicado só para telas do app
--
-- A regra antiga de announcements.cta_path ('^/[A-Za-z0-9/_?=&#.-]{0,120}$') aceitava "//site.com",
-- que o navegador abre como outro site. O painel já limita a uma lista de destinos, mas a função
-- do banco pode ser chamada direto por um Admin. O app também confere (toInternalPath).
-- =====================================================================

alter table public.announcements drop constraint announcements_cta_path_check;

alter table public.announcements
  add constraint announcements_cta_path_check
  check (cta_path is null or cta_path ~ '^/([A-Za-z0-9_?=&#.-][A-Za-z0-9/_?=&#.-]{0,119})?$');
