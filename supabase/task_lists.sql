-- NeuroTask · Listas de tarefas
-- Rode no SQL Editor do Supabase. Idempotente.

create table if not exists public.task_lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_lists_user_idx on public.task_lists (user_id, created_at);

-- Vincula tarefas a uma lista (null = lista "Geral"). Ao excluir a lista,
-- as tarefas voltam para a Geral (set null).
alter table public.tasks
  add column if not exists list_id uuid references public.task_lists(id) on delete set null;

alter table public.task_lists enable row level security;

drop policy if exists "task_lists_owner_all" on public.task_lists;
create policy "task_lists_owner_all" on public.task_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime
do $$
begin
  alter publication supabase_realtime add table public.task_lists;
exception when duplicate_object then null;
end $$;
