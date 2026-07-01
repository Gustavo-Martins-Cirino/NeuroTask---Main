-- NeuroTask · Habilita Supabase Realtime nas tabelas
-- Rode no SQL Editor do Supabase. Idempotente (ignora se já estiver na publicação).

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.time_blocks;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notes;
exception when duplicate_object then null;
end $$;
