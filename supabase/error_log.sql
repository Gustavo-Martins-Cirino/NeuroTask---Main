-- NeuroTask · Registro de erros (Fase 5 — pronto para outras pessoas usarem)
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente.
--
-- Por que uma tabela e não um Sentry: o volume aqui é de amigos e família, o
-- projeto já tem Supabase e o princípio da casa é manter o determinístico sob
-- controle próprio. Se um dia o volume justificar, troca-se o destino do
-- /api/errors sem mexer em mais nada.
--
-- Segurança: NINGUÉM escreve daqui direto. A rota /api/errors valida e insere
-- pela service role, então não há política de insert para o cliente — senão
-- qualquer visitante poderia inflar a tabela à vontade. user_id é opcional
-- de propósito: erro na tela de login acontece sem sessão, e é justamente o
-- que mais precisamos ver.

create table if not exists public.error_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  mensagem    text not null,
  stack       text,
  digest      text,          -- error.digest do Next: liga o relato ao log do servidor
  rota        text,          -- pathname onde quebrou
  origem      text not null, -- 'boundary-app' | 'boundary-publico' | 'boundary-global' | 'window' | 'promise'
  commit_sha  text,          -- versão no ar (de /api/version)
  user_agent  text,
  criado_em   timestamptz not null default now()
);

create index if not exists error_log_criado_idx on public.error_log (criado_em desc);
create index if not exists error_log_user_idx   on public.error_log (user_id);

alter table public.error_log enable row level security;

-- Leitura: cada um vê os próprios erros (o dono lê tudo pelo painel do
-- Supabase, que usa service role e ignora RLS). Sem policy de insert/update
-- /delete: escrita é exclusiva do servidor.
drop policy if exists "error_log_owner_select" on public.error_log;
create policy "error_log_owner_select" on public.error_log
  for select using (auth.uid() = user_id);

-- Faxina: erro com mais de 30 dias não serve mais pra nada e a tabela não
-- deve crescer para sempre. Chamada pelo mesmo pg_cron do push (push_cron.sql).
create or replace function public.purge_error_log()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.error_log where criado_em < now() - interval '30 days';
$$;
