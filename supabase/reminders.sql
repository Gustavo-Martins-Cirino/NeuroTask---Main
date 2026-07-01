-- NeuroTask · Lembretes do dia
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente.

create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null default '',
  remind_date date not null,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Hora opcional do lembrete (para notificação). Idempotente: cobre tabelas já criadas.
alter table public.reminders add column if not exists remind_time time;

create index if not exists reminders_user_date_idx on public.reminders (user_id, remind_date);

alter table public.reminders enable row level security;

drop policy if exists "reminders_owner_all" on public.reminders;
create policy "reminders_owner_all" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime (ignora se já estiver na publicação)
do $$
begin
  alter publication supabase_realtime add table public.reminders;
exception when duplicate_object then null;
end $$;
