-- NeuroTask · Amigos v4 — a lista passa a mostrar o bonequinho, não a inicial
-- Rode no SQL Editor do Supabase. Idempotente (pode reexecutar).
--
-- Depende de friends_agenda.sql (versão anterior de my_friends) e de
-- social_v2.sql (user_stats.avatar).
--
-- Por que uma RPC nova: desenhar o avatar de cada amigo na LISTA precisa do
-- avatar e dos acessórios de todo mundo de uma vez. Hoje só friend_office traz
-- isso, uma pessoa por vez — a lista faria N chamadas para desenhar N amigos.
--
-- Privacidade: avatar e acessórios saem apenas para amizade ACEITA (mesma regra
-- de sempre — nada de dado de outra pessoa sem vínculo). Não usam o portão
-- share_office de propósito: aquilo é sobre visitar o escritório; a aparência do
-- bonequinho é o que a pessoa já mostra ao ser amiga.

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
  can_schedule  boolean,
  avatar        jsonb,
  accessories   text[]
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
    (f.status = 'accepted' and p.share_schedule),
    case when f.status = 'accepted' then s.avatar else null end,
    case when f.status = 'accepted' then (
      select coalesce(array_agg(ui.item_id), '{}')
        from public.user_items ui
       where ui.user_id = p.user_id
         and ui.equipped
         and ui.item_id in (
           'chapeu-bone', 'chapeu-social', 'chapeu-coroa',
           'oculos-grau', 'oculos-escuros'
         )
    ) else null end
  from public.friendships f
  join public.profiles p
    on p.user_id = case when f.requester = auth.uid() then f.addressee else f.requester end
  left join public.user_stats s
    on s.user_id = p.user_id
  where auth.uid() in (f.requester, f.addressee)
  order by f.created_at desc
$$;
