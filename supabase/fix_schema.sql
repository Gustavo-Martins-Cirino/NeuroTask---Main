-- NeuroTask · Correção/alinhamento do schema
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- É idempotente: pode rodar mais de uma vez sem problema.
-- Corrige: id sem geração automática (tasks/time_blocks) e colunas faltantes
-- em time_blocks (color, description, is_recurring, recurrence_rule).

-- 1) Geração automática de UUID para o id (causa do "null value in column id")
alter table public.tasks       alter column id set default gen_random_uuid();
alter table public.time_blocks alter column id set default gen_random_uuid();

-- 2) Timestamps com default (evita erro de not-null em created_at/updated_at)
alter table public.tasks       alter column created_at set default now();
alter table public.tasks       alter column updated_at set default now();
alter table public.time_blocks alter column created_at set default now();
alter table public.time_blocks alter column updated_at set default now();

-- 3) Colunas que o app espera em tasks (adiciona só se faltarem)
alter table public.tasks add column if not exists description       text;
alter table public.tasks add column if not exists category          text;
alter table public.tasks add column if not exists estimated_minutes integer;
alter table public.tasks add column if not exists completed_at       timestamptz;

-- Caso a tabela tenha a coluna legada is_ai_generated como NOT NULL, dá um default
-- para não quebrar inserts que não a informam.
alter table public.tasks add column if not exists is_ai_generated boolean default false;
alter table public.tasks alter column is_ai_generated set default false;

-- 4) Colunas que o app espera em time_blocks (causa do "color column not found")
alter table public.time_blocks add column if not exists description     text;
alter table public.time_blocks add column if not exists color           text default '#6366f1';
alter table public.time_blocks add column if not exists is_recurring    boolean default false;
alter table public.time_blocks add column if not exists recurrence_rule text;

-- 5) Garante RLS habilitado e políticas de acesso por usuário (caso ainda não existam)
alter table public.tasks       enable row level security;
alter table public.time_blocks enable row level security;

drop policy if exists "tasks_owner_all" on public.tasks;
create policy "tasks_owner_all" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "time_blocks_owner_all" on public.time_blocks;
create policy "time_blocks_owner_all" on public.time_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6) Re-aponta as foreign keys de user_id para auth.users (causa do
--    "violates foreign key constraint *_user_id_fkey"). O app usa o id do
--    usuário autenticado do Supabase (auth.users), não a tabela public.users.
alter table public.tasks       drop constraint if exists tasks_user_id_fkey;
alter table public.tasks
  add constraint tasks_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.time_blocks drop constraint if exists time_blocks_user_id_fkey;
alter table public.time_blocks
  add constraint time_blocks_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
