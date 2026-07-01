-- NeuroTask · Gamificação
-- Rode este script no SQL Editor do Supabase (Dashboard → SQL Editor → New query).
-- Cria a tabela de estatísticas do usuário, políticas de segurança (RLS),
-- a função atômica de XP e o trigger de criação automática no cadastro.

-- 1) Tabela de estatísticas (1 linha por usuário autenticado)
create table if not exists public.user_stats (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  total_xp   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security: cada usuário só enxerga/edita a própria linha
alter table public.user_stats enable row level security;

drop policy if exists "user_stats_select_own" on public.user_stats;
create policy "user_stats_select_own"
  on public.user_stats for select
  using (auth.uid() = user_id);

drop policy if exists "user_stats_insert_own" on public.user_stats;
create policy "user_stats_insert_own"
  on public.user_stats for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_stats_update_own" on public.user_stats;
create policy "user_stats_update_own"
  on public.user_stats for update
  using (auth.uid() = user_id);

-- 3) Concessão atômica de XP para o usuário atual.
--    Aceita valores negativos (ex.: desfazer conclusão), nunca deixa abaixo de 0.
--    Retorna o total de XP após a operação.
create or replace function public.award_xp(p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  insert into public.user_stats (user_id, total_xp)
  values (auth.uid(), greatest(0, p_amount))
  on conflict (user_id) do update
    set total_xp   = greatest(0, public.user_stats.total_xp + p_amount),
        updated_at = now()
  returning total_xp into new_total;
  return new_total;
end;
$$;

-- 4) Cria automaticamente a linha de stats quando um usuário se cadastra
create or replace function public.handle_new_user_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_stats on auth.users;
create trigger on_auth_user_created_stats
  after insert on auth.users
  for each row execute function public.handle_new_user_stats();

-- 5) (Opcional) Cria a linha para usuários que já existiam antes deste script
insert into public.user_stats (user_id)
select id from auth.users
on conflict (user_id) do nothing;
