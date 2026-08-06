-- Feed de calendário assinável (.ics): um token secreto por usuário funciona como
-- a "URL secreta" que o Google Calendar / Outlook assinam (igual ao "endereço
-- secreto em formato iCal" do próprio Google). O feed é SÓ-LEITURA e mostra os
-- time_blocks do dono do token. Idempotente — pode rodar de novo sem medo.
--
-- Sem dependência de outros SQLs. Rodar no SQL Editor do Supabase.

create table if not exists public.calendar_feeds (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists calendar_feeds_token_idx on public.calendar_feeds(token);

alter table public.calendar_feeds enable row level security;

-- Cada um cuida só do próprio token. A ROTA do feed lê por token com a service
-- role (bypassa RLS), então NÃO existe policy de select público aqui — sem o
-- token secreto, ninguém lê a agenda de ninguém.
drop policy if exists "own feed select" on public.calendar_feeds;
create policy "own feed select" on public.calendar_feeds
  for select using (auth.uid() = user_id);

drop policy if exists "own feed insert" on public.calendar_feeds;
create policy "own feed insert" on public.calendar_feeds
  for insert with check (auth.uid() = user_id);

drop policy if exists "own feed update" on public.calendar_feeds;
create policy "own feed update" on public.calendar_feeds
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own feed delete" on public.calendar_feeds;
create policy "own feed delete" on public.calendar_feeds
  for delete using (auth.uid() = user_id);
