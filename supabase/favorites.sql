-- NeuroTask · Favoritos
-- Rode no SQL Editor do Supabase. Idempotente.

alter table public.tasks add column if not exists is_favorite boolean not null default false;
alter table public.notes add column if not exists is_favorite boolean not null default false;
