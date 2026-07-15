-- NeuroTask · Amigos e comparação (Fase 3 — social)
-- Rode no SQL Editor do Supabase. Idempotente.
--
-- Privacidade em primeiro lugar:
--   · profiles guarda username público + flags do que compartilhar.
--   · Aceitar a amizade é o portão de entrada; cada flag pode ser desligada.
--   · NADA sensível é lido direto pelo cliente: busca, lista de amigos,
--     status ocupado/livre e escritório do amigo passam por RPCs
--     (security definer) que validam amizade aceita + flag — o indicador
--     de ocupado é um booleano derivado dos blocos, NUNCA os detalhes.

-- ---- Perfil público ----
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text,
  share_status boolean not null default true,  -- amigos veem ocupado/livre
  share_office boolean not null default true,  -- amigos visitam o escritório
  share_level  boolean not null default true,  -- amigos veem o nível
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- Amizades ----
create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null references auth.users (id) on delete cascade,
  addressee  uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester, addressee),
  check (requester <> addressee)
);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own" on public.friendships
  for select to authenticated using (auth.uid() in (requester, addressee));

-- Aceitar: só quem recebeu o pedido
drop policy if exists "friendships_accept" on public.friendships;
create policy "friendships_accept" on public.friendships
  for update to authenticated
  using (auth.uid() = addressee)
  with check (auth.uid() = addressee and status = 'accepted');

-- Desfazer/recusar/cancelar: qualquer um dos dois
drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships
  for delete to authenticated using (auth.uid() in (requester, addressee));

-- INSERT sem policy de propósito: pedido só pela RPC send_friend_request.

-- ---- Buscar usuários (expõe apenas username/nome, nunca e-mail) ----
create or replace function public.search_users(p_query text)
returns table (user_id uuid, username text, display_name text)
language sql
security definer
set search_path = public
as $$
  select p.user_id, p.username, p.display_name
    from public.profiles p
   where p.user_id <> auth.uid()
     and (p.username ilike '%' || p_query || '%'
          or coalesce(p.display_name, '') ilike '%' || p_query || '%')
   order by p.username
   limit 10
$$;

-- ---- Enviar pedido (se o outro já pediu, vira amizade na hora) ----
create or replace function public.send_friend_request(p_to uuid)
returns text -- 'pending' | 'accepted'
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reverse uuid;
begin
  if p_to = auth.uid() then
    raise exception 'AUTO_AMIZADE';
  end if;
  if not exists (select 1 from public.profiles where user_id = p_to) then
    raise exception 'USUARIO_INEXISTENTE';
  end if;
  if exists (select 1 from public.friendships
              where (requester = auth.uid() and addressee = p_to)
                 or (requester = p_to and addressee = auth.uid() and status = 'accepted')) then
    raise exception 'JA_EXISTE';
  end if;

  select id into v_reverse
    from public.friendships
   where requester = p_to and addressee = auth.uid() and status = 'pending';

  if v_reverse is not null then
    update public.friendships set status = 'accepted' where id = v_reverse;
    return 'accepted';
  end if;

  insert into public.friendships (requester, addressee) values (auth.uid(), p_to);
  return 'pending';
end;
$$;

-- ---- Minha lista (amigos + pedidos), com ocupado/livre calculado ----
-- busy: null = amigo não compartilha (ou pedido pendente); true/false = agora.
-- Cobre blocos literais e recorrentes (diário/dias úteis/semanal) que não
-- cruzam a meia-noite — o suficiente para o indicador binário.
create or replace function public.my_friends()
returns table (
  friendship_id uuid,
  friend_id     uuid,
  username      text,
  display_name  text,
  state         text,    -- accepted | pending_in | pending_out
  busy          boolean,
  can_visit     boolean
)
language sql
security definer
set search_path = public
as $$
  select
    f.id,
    p.user_id,
    p.username,
    p.display_name,
    case when f.status = 'accepted' then 'accepted'
         when f.addressee = auth.uid() then 'pending_in'
         else 'pending_out' end,
    case when f.status = 'accepted' and p.share_status then exists (
      select 1 from public.time_blocks b
       where b.user_id = p.user_id
         and (
           (now() between b.start_time and b.end_time)
           or (
             b.is_recurring
             and b.start_time <= now()
             and b.end_time::time > b.start_time::time
             and now()::time between b.start_time::time and b.end_time::time
             and (
               b.recurrence_rule = 'daily'
               or (b.recurrence_rule = 'weekdays' and extract(isodow from now()) < 6)
               or (b.recurrence_rule = 'weekly'
                   and extract(isodow from now()) = extract(isodow from b.start_time))
             )
           )
         )
    ) else null end,
    (f.status = 'accepted' and p.share_office)
  from public.friendships f
  join public.profiles p
    on p.user_id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
  order by f.created_at desc
$$;

-- ---- Visitar o escritório do amigo ----
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

  if v_profile.share_level then
    select floor(coalesce(total_xp, 0) / 100) + 1 into v_level
      from public.user_stats where user_id = p_friend;
  end if;

  return json_build_object(
    'username', v_profile.username,
    'display_name', v_profile.display_name,
    'items', v_items,
    'level', v_level
  );
end;
$$;
