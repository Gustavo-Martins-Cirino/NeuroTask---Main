-- NeuroTask · Bot do Telegram (Fase 4 — integrações externas)
-- Rode no SQL Editor do Supabase. Idempotente.
--
-- Fluxo "mensagem → tarefa" com o MESMO pareamento por código da extensão:
-- o app gera um código de 6 dígitos (sessão do usuário) e o bot troca esse
-- código pelo vínculo chat_id ↔ user_id. Nada de login dentro do Telegram.
--
-- Segurança: o webhook não tem sessão Supabase, então escreve pela service
-- role — e é o segredo do webhook (TELEGRAM_WEBHOOK_SECRET) que garante que
-- só o Telegram fala com a rota. Sem ele, qualquer um poderia forjar um
-- update com chat_id alheio e criar tarefa na conta de outra pessoa.

-- ---- Código de pareamento (curta duração) ----
create table if not exists public.telegram_pairing_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  code       text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists telegram_pairing_codes_user_idx on public.telegram_pairing_codes (user_id);

alter table public.telegram_pairing_codes enable row level security;

drop policy if exists "telegram_pairing_codes_owner_all" on public.telegram_pairing_codes;
create policy "telegram_pairing_codes_owner_all" on public.telegram_pairing_codes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- Vínculo com a conversa do Telegram ----
-- chat_id é único: uma conversa pertence a uma conta só.
-- Sem policy de insert: quem cria é o webhook (service role), depois de
-- validar o código. O dono pode ver e desconectar.
create table if not exists public.telegram_links (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  chat_id      bigint not null unique,
  username     text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists telegram_links_user_idx on public.telegram_links (user_id);

alter table public.telegram_links enable row level security;

drop policy if exists "telegram_links_owner_select" on public.telegram_links;
create policy "telegram_links_owner_select" on public.telegram_links
  for select using (auth.uid() = user_id);

drop policy if exists "telegram_links_owner_delete" on public.telegram_links;
create policy "telegram_links_owner_delete" on public.telegram_links
  for delete using (auth.uid() = user_id);
