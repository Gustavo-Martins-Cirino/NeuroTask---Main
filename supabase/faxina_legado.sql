-- NeuroTask · Faxina do que sobrou de versões antigas no banco. DESTRUTIVO.
--
-- Nada disto existe em outro SQL desta pasta nem é usado pelo app. Veio do
-- scaffold FastAPI/Alembic do primeiro commit, do bot do Telegram (removido em
-- 21/09) e da extensão de tempo de tela (abandonada). Quem começou o banco do
-- zero a partir do README nunca teve nada disto, e os `if exists` deixam o
-- script rodar sem erro nesse caso.
--
-- POR QUE apagar, e não deixar quieto (achado do teste com duas contas, 17/10):
--   · `ai_consume(p_user_id, ...)` recebe o id da pessoa como PARÂMETRO e
--     qualquer conta logada a chamava com o id de outra. O app não a usa mais,
--     então o efeito era nulo, mas é exatamente o formato de função que este
--     repositório não aceita: o id sai da sessão (`auth.uid()`), nunca de quem chama.
--   · `alembic_version` não tem RLS: qualquer conta logada lia a linha.
--   · os códigos de pareamento do Telegram e da extensão são dado de pessoa,
--     guardado para uma função que não existe mais.
--
-- O SQL Editor roda tudo numa transação só: se um `drop` falhar (algo inesperado
-- dependendo de uma destas tabelas), nada é apagado. Me mande o erro.

-- Função antiga de cota da IA (todas as assinaturas que existirem com esse nome).
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'ai_consume'
  loop
    execute format('drop function %s', f.assinatura);
  end loop;
end $$;

drop table if exists public.ai_usage;

-- Scaffold FastAPI/Alembic (nunca usado).
drop table if exists public.alembic_version;
drop table if exists public.users;

-- Bot do Telegram (removido em 21/09).
drop table if exists public.telegram_pairing_codes;
drop table if exists public.telegram_links;

-- Extensão de tempo de tela (abandonada).
drop table if exists public.screen_time_log;
drop table if exists public.extension_tokens;
drop table if exists public.extension_pairing_codes;

-- Conferência: tem de voltar VAZIA.
select c.relname as sobrou
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('ai_usage', 'alembic_version', 'users', 'telegram_pairing_codes', 'telegram_links',
                    'screen_time_log', 'extension_tokens', 'extension_pairing_codes')
union all
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'ai_consume';
