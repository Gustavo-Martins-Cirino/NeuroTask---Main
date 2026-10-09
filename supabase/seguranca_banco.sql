-- NeuroTask · Segurança do banco — o que a auditoria de 09/10 achou aberto.
-- Rode no SQL Editor (Dashboard → SQL Editor → New query → Run), DEPOIS de todos
-- os outros (depende de foto_perfil.sql e error_log.sql). Idempotente.
--
-- Medido antes, com a chave PÚBLICA e sem login (só leitura, nada escrito):
--   · as 20 tabelas devolvem zero linhas — o RLS segura quem não entrou;
--   · o bucket `avatars` se deixa LISTAR: devolve a pasta de cada pessoa que tem
--     foto, e o nome da pasta é o id dela;
--   · nenhum SQL desta pasta tem `revoke`, e no Supabase isso quer dizer que toda
--     função do schema public pode ser chamada pela API, até sem login.

-- ---- 1. O bucket de fotos para de se deixar listar ----
-- A política de leitura era `to public using (bucket_id = 'avatars')`, e no
-- Storage é a política de SELECT que libera LISTAR. Mostrar a foto não precisa
-- dela: o bucket é público, e a URL pública é servida sem passar pelas
-- políticas. Quem precisa ler é o dono — o `upsert` da troca de foto lê o
-- arquivo antes de reescrever (sem isso, a segunda foto falharia).
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_read_own" on storage.objects;
create policy "avatars_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---- 2. Quem não está logado não chama função `security definer` ----
-- Toda função do app confere `auth.uid()` por dentro, então ninguém de fora
-- conseguia efeito — mas a porta não precisa ficar aberta. Quem está logado
-- continua chamando (o app inteiro depende disso). A `purge_error_log` é faxina
-- do pg_cron, que roda como `postgres`: ninguém pela API precisa dela.
-- Função de gatilho fica de fora: ela não é chamável pela API.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura, p.proname as nome
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prorettype <> 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon', f.assinatura);
    if f.nome = 'purge_error_log' then
      execute format('revoke execute on function %s from authenticated', f.assinatura);
    else
      execute format('grant execute on function %s to authenticated', f.assinatura);
    end if;
  end loop;
end $$;

-- E a função que nascer daqui para frente já nasce fechada para quem não está
-- logado — sem isso, o próximo SQL desta pasta reabriria a porta sem ninguém ver.
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---- 3. Conferência ----
-- Volta VAZIO quando está tudo trancado. Cada linha é um buraco, com o nome dele.
select 'tabela sem RLS' as problema, c.relname::text as objeto
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
union all
select 'security definer sem search_path', p.oid::regprocedure::text
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
union all
select 'função que quem não está logado pode chamar', p.oid::regprocedure::text
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
  and has_function_privilege('anon', p.oid, 'execute')
union all
select 'leitura aberta no bucket avatars', policyname::text
from pg_policies
where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
  and qual ilike '%avatars%' and qual not ilike '%auth.uid()%';
