-- Limite por pessoa na Neuro IA e na transcrição de áudio: por dia e por minuto.
--
-- POR QUÊ: as duas gastam a cota do Groq, que é UMA só para o app inteiro
-- (no plano gratuito, 200 mil tokens/dia — umas 28 mensagens da Neuro somando
-- todo mundo — e 8 mil tokens POR MINUTO). Sem teto por pessoa, uma conta só (ou
-- um script) esgota o dia de todos; sem teto por minuto, uma rajada de mensagens
-- trava a Neuro de todos por alguns minutos.
--
-- O contador mora no banco, e não na memória do servidor: na Vercel cada pedido
-- pode cair numa instância diferente, e um contador em memória zera a cada uma.
--
-- Quem decide os TETOS é a rota (lib/cota-ia.ts: a cota da Neuro cresce com o
-- nível, e o teto vem da env), e não este arquivo. Chamar a função direto pela
-- API com um teto maior não adianta nada: ela só SOMA no contador da própria
-- pessoa, e quem barra é a rota, com o teto dela.
--
-- O "dia" é o de Brasília: é o público do app, e o contador vira à meia-noite dele.
-- O "minuto" é uma janela que começa no primeiro pedido dela.
--
-- Idempotente — rodar de novo atualiza a versão antiga (só por dia) para esta.
-- Depende só de auth.users. Sem este SQL, a rota deixa passar (e avisa no log):
-- o app não para por falta dele.

create table if not exists public.ia_uso (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia     date not null,
  tipo    text not null check (tipo in ('neuro', 'transcricao')),
  usos    integer not null default 0,
  primary key (user_id, dia, tipo)
);

alter table public.ia_uso add column if not exists janela      timestamptz;
alter table public.ia_uso add column if not exists usos_janela integer not null default 0;

-- Ninguém lê nem escreve a tabela direto: só pela função abaixo. Sem política
-- nenhuma, o RLS nega tudo — e o revoke tira até a tentativa.
alter table public.ia_uso enable row level security;
revoke all on public.ia_uso from anon, authenticated;

-- A versão anterior tinha dois parâmetros. Mantida ao lado desta, a chamada com
-- nomes ficaria ambígua para o PostgREST (as duas casam) e falharia.
drop function if exists public.consumir_cota_ia(text, integer);

create or replace function public.consumir_cota_ia(p_tipo text, p_limite integer, p_por_minuto integer default 0)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  hoje  date := (now() at time zone 'America/Sao_Paulo')::date;
  linha public.ia_uso%rowtype;
begin
  if uid is null then
    raise exception 'sem sessão' using errcode = '42501';
  end if;
  if p_tipo not in ('neuro', 'transcricao') then
    raise exception 'tipo inválido: %', p_tipo using errcode = '22023';
  end if;
  if p_limite is null or p_limite < 1 then
    return json_build_object('ok', false, 'motivo', 'dia', 'usos', 0);
  end if;

  -- Dias passados não servem para nada: cada pessoa fica com no máximo uma
  -- linha por tipo, e a tabela não cresce para sempre.
  delete from public.ia_uso where user_id = uid and dia < hoje;

  insert into public.ia_uso (user_id, dia, tipo, usos, janela, usos_janela)
  values (uid, hoje, p_tipo, 0, now(), 0)
  on conflict (user_id, dia, tipo) do nothing;

  -- A linha fica TRAVADA até o fim da função: dois pedidos ao mesmo tempo não
  -- passam os dois no último uso do dia nem no último do minuto.
  select * into linha
  from public.ia_uso
  where user_id = uid and dia = hoje and tipo = p_tipo
  for update;

  if linha.usos >= p_limite then
    return json_build_object('ok', false, 'motivo', 'dia', 'usos', linha.usos);
  end if;

  if coalesce(p_por_minuto, 0) > 0 then
    if linha.janela is null or now() - linha.janela >= interval '1 minute' then
      linha.janela := now();
      linha.usos_janela := 0;
    end if;
    if linha.usos_janela >= p_por_minuto then
      return json_build_object(
        'ok', false, 'motivo', 'minuto', 'usos', linha.usos,
        'espera', ceil(extract(epoch from (linha.janela + interval '1 minute' - now())))
      );
    end if;
  end if;

  update public.ia_uso
  set usos = linha.usos + 1,
      janela = coalesce(linha.janela, now()),
      usos_janela = linha.usos_janela + 1
  where user_id = uid and dia = hoje and tipo = p_tipo;

  return json_build_object('ok', true, 'usos', linha.usos + 1);
end;
$$;

-- Só quem está logado chama (o `seguranca_banco.sql` faz as funções novas
-- nascerem fechadas, então a liberação vem aqui mesmo).
revoke execute on function public.consumir_cota_ia(text, integer, integer) from public, anon;
grant execute on function public.consumir_cota_ia(text, integer, integer) to authenticated;
