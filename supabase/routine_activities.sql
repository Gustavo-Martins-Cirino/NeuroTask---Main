-- NeuroTask · Atividades de rotina (Fase 2 — copiloto)
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente. Biblioteca nomeada de atividades com duração — ex.:
-- "Deslocamento → Trabalho" 30min, "Se arrumar (evento)" 60min.
-- Categorias: preparo | deslocamento | refeicao | outro

create table if not exists public.routine_activities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  category         text not null default 'outro',
  duration_minutes integer not null default 30,
  created_at       timestamptz not null default now()
);

create index if not exists routine_activities_user_idx on public.routine_activities (user_id, created_at);

alter table public.routine_activities enable row level security;

drop policy if exists "routine_activities_owner_all" on public.routine_activities;
create policy "routine_activities_owner_all" on public.routine_activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
