-- ============================================================
--  Estudo PETROBRAS — configuração do banco (Supabase)
--  Cole TUDO isto no SQL Editor do Supabase e clique em Run.
--  Pode rodar mais de uma vez sem problema.
-- ============================================================

-- 1) Quem pode entrar no app -----------------------------------
create table if not exists public.perfis (
  id        uuid primary key references auth.users on delete cascade,
  email     text,
  nome      text,
  aprovado  boolean not null default false,
  criado_em timestamptz not null default now()
);

-- 2) O progresso de estudo de cada pessoa ----------------------
create table if not exists public.dados_estudo (
  user_id      uuid primary key references auth.users on delete cascade,
  dados        jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- 3) Ao se cadastrar, cria o perfil (bloqueado) e a linha de dados
create or replace function public.novo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfis (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome',''))
  on conflict (id) do nothing;

  insert into public.dados_estudo (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.novo_usuario();

-- 4) Segurança: cada pessoa só enxerga o que é dela -------------
alter table public.perfis       enable row level security;
alter table public.dados_estudo enable row level security;

drop policy if exists "ver o proprio perfil" on public.perfis;
create policy "ver o proprio perfil" on public.perfis
  for select using (auth.uid() = id);
-- Não existe política de UPDATE em perfis de propósito:
-- assim ninguém consegue se auto-aprovar. Só você, pelo painel.

drop policy if exists "ler os proprios dados" on public.dados_estudo;
create policy "ler os proprios dados" on public.dados_estudo
  for select using (auth.uid() = user_id);

drop policy if exists "gravar os proprios dados" on public.dados_estudo;
create policy "gravar os proprios dados" on public.dados_estudo
  for insert with check (auth.uid() = user_id);

drop policy if exists "atualizar os proprios dados" on public.dados_estudo;
create policy "atualizar os proprios dados" on public.dados_estudo
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) Atalho para você ver quem está esperando liberação ---------
create or replace view public.pendentes as
  select id, email, nome, criado_em
  from public.perfis
  where aprovado = false
  order by criado_em desc;

-- ============================================================
--  PARA LIBERAR UMA PESSOA (duas formas):
--
--  a) Pelo painel: Table Editor -> perfis -> marque "aprovado".
--
--  b) Por SQL, trocando o e-mail abaixo:
--     update public.perfis set aprovado = true
--     where email = 'pessoa@exemplo.com';
--
--  PARA BLOQUEAR DE NOVO:
--     update public.perfis set aprovado = false
--     where email = 'pessoa@exemplo.com';
-- ============================================================
