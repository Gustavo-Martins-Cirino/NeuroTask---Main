-- NeuroTask · Remove a feature de tempo de tela (extensão de navegador) — abandonada.
-- Rode no SQL Editor do Supabase SÓ SE quiser apagar os dados já coletados; nada no
-- app depende mais dessas tabelas, então rodar isso é opcional e não é urgente.

drop table if exists public.screen_time_log;
drop table if exists public.extension_tokens;
drop table if exists public.extension_pairing_codes;
