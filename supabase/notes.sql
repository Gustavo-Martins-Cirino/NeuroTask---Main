-- NeuroTask · Notas
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente.

create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default '',
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_owner_all" on public.notes;
create policy "notes_owner_all" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
