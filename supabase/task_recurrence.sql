-- NeuroTask · Repetição de tarefas
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente.
-- Valores de recurrence_rule: daily | weekly | monthly | yearly | every:N (a cada N dias)

alter table public.tasks add column if not exists recurrence_rule text;
