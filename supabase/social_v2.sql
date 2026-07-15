-- NeuroTask · Social v2: perfil aberto (sugestões) + avatar editável
-- Rode no SQL Editor do Supabase. Idempotente. Requer friends.sql e
-- coins_shop.sql já executados.

-- Perfil aberto: aparece na lista de sugestões de outros usuários.
-- Configurável nos chips de privacidade da aba Amigos.
alter table public.profiles add column if not exists discoverable boolean not null default true;

-- Avatar editável (paper-doll do Escritório) — jsonb validado no app
alter table public.user_stats add column if not exists avatar jsonb;

-- Sugestões: perfis abertos, fora das suas amizades/pedidos, mais recentes
create or replace function public.suggested_users()
returns table (user_id uuid, username text, display_name text)
language sql
security definer
set search_path = public
as $$
  select p.user_id, p.username, p.display_name
    from public.profiles p
   where p.discoverable
     and p.user_id <> auth.uid()
     and not exists (
       select 1 from public.friendships f
        where (f.requester = auth.uid() and f.addressee = p.user_id)
           or (f.requester = p.user_id and f.addressee = auth.uid())
     )
   order by p.created_at desc
   limit 6
$$;

-- friend_office agora devolve também o avatar (mesmo portão: share_office)
create or replace function public.friend_office(p_friend uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_items   text[];
  v_level   integer;
  v_avatar  jsonb;
begin
  if not exists (select 1 from public.friendships
                  where status = 'accepted'
                    and ((requester = auth.uid() and addressee = p_friend)
                      or (requester = p_friend and addressee = auth.uid()))) then
    raise exception 'NAO_SAO_AMIGOS';
  end if;

  select * into v_profile from public.profiles where user_id = p_friend;
  if not v_profile.share_office then
    raise exception 'ESCRITORIO_PRIVADO';
  end if;

  select coalesce(array_agg(item_id), '{}') into v_items
    from public.user_items
   where user_id = p_friend and equipped;

  select avatar into v_avatar from public.user_stats where user_id = p_friend;

  if v_profile.share_level then
    select floor(coalesce(total_xp, 0) / 100) + 1 into v_level
      from public.user_stats where user_id = p_friend;
  end if;

  return json_build_object(
    'username', v_profile.username,
    'display_name', v_profile.display_name,
    'items', v_items,
    'level', v_level,
    'avatar', v_avatar
  );
end;
$$;
