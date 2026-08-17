-- NeuroTask · Foto de perfil — o bucket de Storage e quem pode escrever nele.
-- Rode no SQL Editor do Supabase. Idempotente (pode reexecutar). Sem dependências.
--
-- O ENDEREÇO da foto não mora aqui: ele vai para o user_metadata do próprio
-- usuário (auth.updateUser), no mesmo lugar em que o nome já mora. Por isso não
-- há tabela nem coluna nova — só o bucket e as políticas.
--
-- E vai numa chave PRÓPRIA, `foto_perfil`, e não em `avatar_url`. O motivo é que
-- o Supabase mescla os dados do provedor no user_metadata a CADA login social:
-- gravar em `avatar_url` faria o próximo "entrar com Google" apagar a foto que a
-- pessoa escolheu, e o bug apareceria dias depois, sem ninguém ligar uma coisa à
-- outra.

-- ---- O bucket ----
-- public = true: a URL da foto é pública e sem expiração, como a de um avatar de
-- rede social. Ela é impossível de adivinhar (contém o uuid do usuário) e a foto
-- de perfil é justamente o dado que se mostra aos outros — foi o que dispensou
-- URL assinada, que expiraria e exigiria renovação a cada carregamento.
--
-- Os dois limites abaixo são o cinto de segurança do que o app já faz no
-- navegador (recorta em 256px e exporta JPEG): sem eles, quem chamasse a API
-- direto poderia subir um vídeo de 2 GB para dentro da sua cota.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = 1048576,
      allowed_mime_types = array['image/jpeg'];

-- ---- Quem pode o quê ----
-- O caminho do arquivo é `<uid>/perfil.jpg`, e é a PRIMEIRA pasta do caminho que
-- serve de dono. Sem esta checagem qualquer pessoa autenticada sobrescreveria a
-- foto de qualquer outra — o bucket é um espaço só, não uma pasta por usuário.

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- O update existe por causa do upsert: trocar a foto reescreve o MESMO caminho
-- (`<uid>/perfil.jpg`), então não é um insert novo. Sem esta política, a
-- primeira foto subiria e a segunda falharia — o pior tipo de bug, o que só
-- aparece na segunda vez.
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
