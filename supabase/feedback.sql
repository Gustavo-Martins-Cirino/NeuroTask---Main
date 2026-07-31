-- NeuroTask · Feedback dos usuários-teste (Fase 5)
-- Rode no SQL Editor do Supabase. Idempotente (pode reexecutar). Sem dependências.
--
-- Guarda o feedback enviado pelo botão dentro do app, junto com a ROTA e o
-- COMMIT (versão) do momento — pra dar pra reproduzir o que a pessoa viu.

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  message    text not null,
  kind       text not null default 'geral', -- bug | ideia | geral
  route      text,
  commit     text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Cada um insere só o próprio feedback. NÃO há policy de SELECT de propósito:
-- o feedback é lido pelo dono do projeto no painel do Supabase (service role),
-- nunca pelos usuários entre si.
drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert to authenticated with check (auth.uid() = user_id);
