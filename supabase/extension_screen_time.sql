-- NeuroTask · Extensão de navegador — tempo de tela em redes sociais (Fase 4)
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente. Pareamento por código + tokens de dispositivo + log agregado de tempo de tela.

-- Código de pareamento de 6 dígitos, gerado pelo app (sessão do usuário), trocado
-- por um token pela extensão via /api/extension/exchange (service role).
create table if not exists public.extension_pairing_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  code       text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists extension_pairing_codes_user_idx on public.extension_pairing_codes (user_id);

alter table public.extension_pairing_codes enable row level security;

drop policy if exists "extension_pairing_codes_owner_all" on public.extension_pairing_codes;
create policy "extension_pairing_codes_owner_all" on public.extension_pairing_codes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tokens de dispositivo (extensão). Nunca guarda o token em texto puro — só o hash.
-- Sem policy de insert: só a rota de exchange (service role) cria linhas aqui.
create table if not exists public.extension_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  token_hash    text not null unique,
  label         text not null default 'Chrome',
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

create index if not exists extension_tokens_user_idx on public.extension_tokens (user_id);

alter table public.extension_tokens enable row level security;

drop policy if exists "extension_tokens_owner_select" on public.extension_tokens;
create policy "extension_tokens_owner_select" on public.extension_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "extension_tokens_owner_delete" on public.extension_tokens;
create policy "extension_tokens_owner_delete" on public.extension_tokens
  for delete using (auth.uid() = user_id);

-- Log agregado (1 linha por usuário+domínio+dia). Só a rota de ingestão (service
-- role) escreve; o dashboard lê via RLS normal.
create table if not exists public.screen_time_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  domain     text not null,
  log_date   date not null,
  seconds    integer not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists screen_time_log_user_domain_date_idx
  on public.screen_time_log (user_id, domain, log_date);

alter table public.screen_time_log enable row level security;

drop policy if exists "screen_time_log_owner_select" on public.screen_time_log;
create policy "screen_time_log_owner_select" on public.screen_time_log
  for select using (auth.uid() = user_id);
