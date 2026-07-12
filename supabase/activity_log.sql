-- NeuroTask · Registro de atividades (Fase 2 — check-in + autoconhecimento)
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente. Cada linha = uma atividade concluída via check-in:
-- tempo planejado vs. tempo real, base do autoconhecimento.

create table if not exists public.activity_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  planned_minutes integer not null,
  actual_minutes  integer not null,
  done_at         timestamptz not null default now()
);

create index if not exists activity_log_user_idx on public.activity_log (user_id, done_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "activity_log_owner_all" on public.activity_log;
create policy "activity_log_owner_all" on public.activity_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
