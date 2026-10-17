-- Limite diário por pessoa na Neuro IA e na transcrição de áudio.
--
-- POR QUÊ: as duas gastam a cota do Groq, que é UMA só para o app inteiro
-- (no plano gratuito, 200 mil tokens/dia — umas 30 mensagens da Neuro somando
-- todo mundo). Sem teto por pessoa, uma conta só (ou um script) esgota o dia de
-- todos, e no plano pago vira conta a pagar.
--
-- O contador mora no banco, e não na memória do servidor: na Vercel cada pedido
-- pode cair numa instância diferente, e um contador em memória zera a cada uma.
--
-- Quem decide o TETO é a rota (env NEURO_LIMITE_DIARIO / TRANSCRICAO_LIMITE_DIARIO),
-- e não este arquivo — trocar de plano no Groq não pede SQL novo. Chamar a função
-- direto pela API com um teto maior não adianta nada: ela só SOMA no contador da
-- própria pessoa, e quem barra é a rota, com o teto dela.
--
-- O "dia" é o de Brasília: é o público do app, e o contador vira à meia-noite dele.
--
-- Idempotente. Depende só de auth.users. Sem este SQL, a rota deixa passar
-- (e avisa no log) — o app não para por falta dele.

create table if not exists public.ia_uso (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia     date not null,
  tipo    text not null check (tipo in ('neuro', 'transcricao')),
  usos    integer not null default 0,
  primary key (user_id, dia, tipo)
);

-- Ninguém lê nem escreve a tabela direto: só pela função abaixo. Sem política
-- nenhuma, o RLS nega tudo — e o revoke tira até a tentativa.
alter table public.ia_uso enable row level security;
revoke all on public.ia_uso from anon, authenticated;

create or replace function public.consumir_cota_ia(p_tipo text, p_limite integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid  uuid := auth.uid();
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  n    integer;
begin
  if uid is null then
    raise exception 'sem sessão' using errcode = '42501';
  end if;
  if p_tipo not in ('neuro', 'transcricao') then
    raise exception 'tipo inválido: %', p_tipo using errcode = '22023';
  end if;

  if p_limite is null or p_limite < 1 then
    return json_build_object('ok', false, 'usos', 0);
  end if;

  -- Dias passados não servem para nada: cada pessoa fica com no máximo uma
  -- linha por tipo, e a tabela não cresce para sempre.
  delete from public.ia_uso where user_id = uid and dia < hoje;

  -- Atômico: dois pedidos ao mesmo tempo não passam os dois no último uso. Com o
  -- teto batido o `where` recusa o update, nada volta, e `n` fica nulo.
  insert into public.ia_uso as u (user_id, dia, tipo, usos)
  values (uid, hoje, p_tipo, 1)
  on conflict (user_id, dia, tipo)
    do update set usos = u.usos + 1
    where u.usos < p_limite
  returning u.usos into n;

  if n is null then
    return json_build_object('ok', false, 'usos', p_limite);
  end if;
  return json_build_object('ok', true, 'usos', n);
end;
$$;

-- Só quem está logado chama (o `seguranca_banco.sql` faz as funções novas
-- nascerem fechadas, então a liberação vem aqui mesmo).
revoke execute on function public.consumir_cota_ia(text, integer) from public, anon;
grant execute on function public.consumir_cota_ia(text, integer) to authenticated;
