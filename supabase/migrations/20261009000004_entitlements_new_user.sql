-- =====================================================================
-- GUF APP · Migration 4 · Planos (preparação para monetização) e novo usuário
-- =====================================================================

-- ---------------------------------------------------------------------
-- DIREITOS DE ACESSO (independente do gateway de pagamento)
-- Alterado apenas pelo servidor (Edge Functions com service_role / webhooks).
-- ---------------------------------------------------------------------
create table public.entitlements (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  plan         text not null default 'free' check (plan in ('free', 'premium')),
  source       text check (source in ('stripe', 'mercadopago', 'apple', 'google', 'manual')),
  valid_until  timestamptz,
  updated_at   timestamptz not null default now()
);

create trigger entitlements_updated_at before update on public.entitlements
  for each row execute function public.set_updated_at();

alter table public.entitlements enable row level security;

create policy "plano: ler o próprio" on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()));
-- Sem políticas de escrita: o usuário não consegue se promover a premium.

-- ---------------------------------------------------------------------
-- O usuário logado é premium? (para uso futuro em políticas de RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_premium()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entitlements e
     where e.user_id = (select auth.uid())
       and e.plan = 'premium'
       and (e.valid_until is null or e.valid_until > now())
  );
$$;

-- ---------------------------------------------------------------------
-- NOVO USUÁRIO: cria perfil e plano gratuito automaticamente
-- Funciona para cadastro por e-mail e por Google (lê name/full_name e foto)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'), 100),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );

  insert into public.entitlements (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
