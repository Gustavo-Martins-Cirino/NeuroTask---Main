-- Compartilhar a agenda com quem NÃO usa o NeuroTask.
--
-- O app já mostra "ocupado/livre" entre amigos (friends_agenda.sql), mas isso
-- exige conta, amizade aceita e a flag ligada. Para combinar horário com um
-- cliente, um professor ou a tia, nada disso existe — e mandar print de
-- calendário é o que as pessoas fazem hoje.
--
-- Mesma ideia do calendar_feed.sql: um token secreto na URL é a credencial,
-- como o "endereço secreto em formato iCal" do Google. A diferença é o que sai
-- do outro lado: o feed leva os blocos INTEIROS (é a sua agenda indo para o seu
-- outro calendário), e aqui vão só os HORÁRIOS OCUPADOS — nunca título,
-- descrição, local ou link. Quem abre o link vê quando você está ocupado, e
-- jamais com o quê.
--
-- Sem dependência de outros SQLs. Rodar no SQL Editor do Supabase. Idempotente.

create table if not exists public.agenda_shares (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text unique not null,
  -- Horizonte do link. Curto de propósito: um link público não deve virar o
  -- histórico da pessoa, e ninguém marca reunião para daqui a três meses.
  dias       integer not null default 14 check (dias between 1 and 60),
  created_at timestamptz not null default now()
);

create index if not exists agenda_shares_token_idx on public.agenda_shares(token);

alter table public.agenda_shares enable row level security;

-- Cada um cuida só do próprio link. A PÁGINA pública lê por token com a service
-- role (bypassa RLS), então NÃO existe policy de select público aqui — sem o
-- token secreto, ninguém lê a agenda de ninguém.
drop policy if exists "own agenda share select" on public.agenda_shares;
create policy "own agenda share select" on public.agenda_shares
  for select using (auth.uid() = user_id);

drop policy if exists "own agenda share insert" on public.agenda_shares;
create policy "own agenda share insert" on public.agenda_shares
  for insert with check (auth.uid() = user_id);

drop policy if exists "own agenda share update" on public.agenda_shares;
create policy "own agenda share update" on public.agenda_shares
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Revogar é apagar a linha: o link antigo passa a dar 404 na hora.
drop policy if exists "own agenda share delete" on public.agenda_shares;
create policy "own agenda share delete" on public.agenda_shares
  for delete using (auth.uid() = user_id);
