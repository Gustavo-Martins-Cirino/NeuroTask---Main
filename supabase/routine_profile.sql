-- NeuroTask · Perfil de rotina (Fase 2 — copiloto)
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente. Uma linha por usuário: tempos pessoais usados pelo
-- planejamento retroativo e pelos avisos inteligentes do calendário.

create table if not exists public.routine_profile (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  get_ready_minutes integer not null default 45,  -- tempo para se arrumar
  meal_minutes      integer not null default 20,  -- tempo de refeição
  commute_minutes   integer not null default 30,  -- deslocamento
  sleep_hours       numeric not null default 8,   -- horas de sono desejadas
  calendar_warnings boolean not null default true, -- avisos inteligentes no calendário
  updated_at        timestamptz not null default now()
);

alter table public.routine_profile enable row level security;

drop policy if exists "routine_profile_owner_all" on public.routine_profile;
create policy "routine_profile_owner_all" on public.routine_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
