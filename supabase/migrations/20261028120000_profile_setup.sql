-- Cadastro em passos (Claude Design "Cadastro Passo a Passo"): depois de criar a conta, a pessoa
-- escolhe nome e @, foto e amigos. Concluir ou pular grava a data aqui; vale em todos os aparelhos.
alter table public.profiles
  add column profile_setup_completed_at timestamptz;

comment on column public.profiles.profile_setup_completed_at is
  'Quando a pessoa concluiu (ou pulou) o cadastro em passos depois de criar a conta; null = ainda não passou.';

-- Contas que já existiam não passam pelos passos (já usam o app).
update public.profiles
   set profile_setup_completed_at = now()
 where profile_setup_completed_at is null;
