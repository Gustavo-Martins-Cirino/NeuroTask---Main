-- NeuroTask · Fuso horário do bot do Telegram
-- Rode no SQL Editor do Supabase. Idempotente. Requer telegram.sql.
--
-- O Telegram NÃO conta o fuso de quem manda a mensagem: um update traz chat_id,
-- texto e nada mais. Então o dado tem de vir do app — e o app só fala com o
-- Telegram em um momento, o pareamento. O fuso do navegador viaja dentro do
-- código de seis dígitos e fica gravado no vínculo.
--
-- Sem isto, o /hoje respondia sempre pela parede do Brasil: quem estivesse em
-- Lisboa às 23h já veria a agenda de amanhã, e às 00:30 ainda veria a de ontem.
--
-- Mesma convenção de push_subscriptions.tz_offset_min: minutos ATRÁS do UTC,
-- como o getTimezoneOffset() do navegador (Brasil = 180, Tóquio = −540).

alter table public.telegram_pairing_codes
  add column if not exists tz_offset_min int;

alter table public.telegram_links
  add column if not exists tz_offset_min int;

-- Quem já estava pareado antes desta coluna fica com NULL, e aí o webhook cai
-- no segundo palpite (a inscrição de push mais recente) e depois no padrão do
-- servidor. Parear de novo é o que grava o fuso certo.
