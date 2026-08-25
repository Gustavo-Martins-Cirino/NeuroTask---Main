-- NeuroTask · Fuso horário por aparelho no push
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente. Depende de push.sql (cria push_subscriptions).
--
-- POR QUÊ: `reminders` guarda hora de parede sem fuso ("09:00"), porque é assim
-- que a pessoa pensa no lembrete. O dispatcher roda em UTC e, sem esta coluna,
-- assumia que toda parede era a do Brasil (DEFAULT_TZ_OFFSET_MIN=180) — quem
-- estivesse fora recebia o push na hora errada. Quem sabe o fuso é o aparelho.
--
-- Minutos ATRÁS do UTC, igual ao `Date.getTimezoneOffset()` do navegador:
-- Brasil = 180, Lisboa no verão = -60. NULL = inscrição feita antes desta
-- coluna existir; o servidor trata como o padrão até o aparelho se reinscrever.

alter table public.push_subscriptions
  add column if not exists tz_offset_min int;

comment on column public.push_subscriptions.tz_offset_min is
  'Minutos atrás do UTC (Date.getTimezoneOffset): Brasil=180. NULL = usar DEFAULT_TZ_OFFSET_MIN.';
