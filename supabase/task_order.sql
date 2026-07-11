-- NeuroTask · Ordenação manual de tarefas (arrastar e soltar)
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente.

alter table public.tasks add column if not exists sort_order integer;
