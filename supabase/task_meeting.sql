-- NeuroTask · Reunião na tarefa (link + local)
-- Rode no SQL Editor do Supabase. Idempotente.
--
-- Espaço agnóstico de provedor: qualquer link (Meet, Zoom, Teams...) e um
-- local opcional para reuniões presenciais. O horário usa o próprio
-- due_date da tarefa (que já integra com calendário/IA).

alter table public.tasks add column if not exists meeting_url text;
alter table public.tasks add column if not exists location text;
