-- NeuroTask · Amigos v2: agenda (horários ocupados) + convites de compromisso
-- Rode no SQL Editor do Supabase. Idempotente. Requer friends.sql + social_v2.sql.
--
-- Privacidade:
--   · share_schedule (padrão DESLIGADO — mais sensível): amigo vê os seus
--     HORÁRIOS ocupados de hoje, nunca títulos/descrições.
--   · Convites: qualquer amigo aceito pode convidar; aceitar cria o bloco
--     no calendário DOS DOIS via RPC (security definer).

-- ---- Flag de agenda ----
alter table public.profiles add column if not exists share_schedule boolean not null default false;

-- ---- my_friends agora expõe can_schedule ----
drop function if exists public.my_friends();
create or replace function public.my_friends()
returns table (
  friendship_id uuid,
  friend_id     uuid,
  username      text,
  display_name  text,
  state         text,
  busy          boolean,
  can_visit     boolean,
  can_schedule  boolean
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
    (f.status = 'accepted' and p.share_office),
    (f.status = 'accepted' and p.share_schedule)
  from public.friendships f
  join public.profiles p
    on p.user_id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
  order by f.created_at desc
$$;

-- ---- Agenda do amigo: SÓ horários (sem título/descrição/id) ----
-- Blocos literais recentes/futuros + mestres recorrentes; o app expande
-- as ocorrências de hoje no cliente.
create or replace function public.friend_schedule(p_friend uuid)
returns table (start_time timestamptz, end_time timestamptz, is_recurring boolean, recurrence_rule text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.friendships
                  where status = 'accepted'
                    and ((requester = auth.uid() and addressee = p_friend)
                      or (requester = p_friend and addressee = auth.uid()))) then
    raise exception 'NAO_SAO_AMIGOS';
  end if;
  if not exists (select 1 from public.profiles where user_id = p_friend and share_schedule) then
    raise exception 'AGENDA_PRIVADA';
  end if;

  return query
    select b.start_time, b.end_time, b.is_recurring, b.recurrence_rule
      from public.time_blocks b
     where b.user_id = p_friend
       and (b.is_recurring or b.end_time >= now() - interval '1 day')
       and b.start_time <= now() + interval '2 day'
     limit 200;
end;
$$;

-- ---- Convites de compromisso ----
create table if not exists public.meeting_invites (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references auth.users (id) on delete cascade,
  to_user     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  meeting_url text,
  location    text,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at),
  check (from_user <> to_user)
);

alter table public.meeting_invites enable row level security;

drop policy if exists "invites_select_own" on public.meeting_invites;
create policy "invites_select_own" on public.meeting_invites
  for select to authenticated using (auth.uid() in (from_user, to_user));

-- Cancelar convite pendente: só quem enviou
drop policy if exists "invites_delete_own" on public.meeting_invites;
create policy "invites_delete_own" on public.meeting_invites
  for delete to authenticated using (auth.uid() = from_user and status = 'pending');

-- INSERT/UPDATE sem policy de propósito: só pelas RPCs abaixo.

create or replace function public.send_meeting_invite(
  p_to uuid, p_title text, p_starts timestamptz, p_ends timestamptz,
  p_url text default null, p_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.friendships
                  where status = 'accepted'
                    and ((requester = auth.uid() and addressee = p_to)
                      or (requester = p_to and addressee = auth.uid()))) then
    raise exception 'NAO_SAO_AMIGOS';
  end if;
  if coalesce(trim(p_title), '') = '' or p_ends <= p_starts then
    raise exception 'CONVITE_INVALIDO';
  end if;

  insert into public.meeting_invites (from_user, to_user, title, starts_at, ends_at, meeting_url, location)
  values (auth.uid(), p_to, trim(p_title), p_starts, p_ends, nullif(trim(p_url), ''), nullif(trim(p_location), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- Aceitar cria o bloco no calendário DOS DOIS; recusar só marca o status.
create or replace function public.respond_meeting_invite(p_invite uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.meeting_invites%rowtype;
  v_desc text;
begin
  select * into v from public.meeting_invites
   where id = p_invite and to_user = auth.uid() and status = 'pending';
  if v.id is null then
    raise exception 'CONVITE_INEXISTENTE';
  end if;

  if not p_accept then
    update public.meeting_invites set status = 'declined' where id = v.id;
    return 'declined';
  end if;

  v_desc := concat_ws(E'\n',
    case when v.meeting_url is not null then '🔗 ' || v.meeting_url end,
    case when v.location is not null then '📍 ' || v.location end
  );

  insert into public.time_blocks (user_id, title, description, start_time, end_time, color)
  values
    (v.from_user, v.title, nullif(v_desc, ''), v.starts_at, v.ends_at, '#8b5cf6'),
    (v.to_user,   v.title, nullif(v_desc, ''), v.starts_at, v.ends_at, '#8b5cf6');

  update public.meeting_invites set status = 'accepted' where id = v.id;
  return 'accepted';
end;
$$;

-- ---- Meus convites (com nome de quem está do outro lado) ----
create or replace function public.my_invites()
returns table (
  id uuid, direction text, other_username text, other_display_name text,
  title text, starts_at timestamptz, ends_at timestamptz,
  meeting_url text, location text, status text
)
language sql
security definer
set search_path = public
as $$
  select
    i.id,
    case when i.from_user = auth.uid() then 'sent' else 'received' end,
    p.username,
    p.display_name,
    i.title, i.starts_at, i.ends_at, i.meeting_url, i.location, i.status
  from public.meeting_invites i
  join public.profiles p
    on p.user_id = case when i.from_user = auth.uid() then i.to_user else i.from_user end
  where auth.uid() in (i.from_user, i.to_user)
    and (i.status = 'pending' or i.ends_at >= now() - interval '1 day')
  order by i.starts_at
$$;
