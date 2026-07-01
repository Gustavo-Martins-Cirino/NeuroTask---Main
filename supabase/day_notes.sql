-- NeuroTask · Anotações do dia (antes em localStorage)
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente. Uma anotação por usuário por dia.

create table if not exists public.day_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  note_date  date not null,
  content    text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, note_date)
);

create index if not exists day_notes_user_date_idx on public.day_notes (user_id, note_date);

alter table public.day_notes enable row level security;

drop policy if exists "day_notes_owner_all" on public.day_notes;
create policy "day_notes_owner_all" on public.day_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime (ignora se já estiver na publicação)
do $$
begin
  alter publication supabase_realtime add table public.day_notes;
exception when duplicate_object then null;
end $$;
