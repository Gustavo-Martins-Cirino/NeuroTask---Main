-- NeuroTask · Amigos v3: sugestões por região + push de convite (Fase 3)
-- Rode no SQL Editor do Supabase. Idempotente. Requer friends.sql,
-- social_v2.sql e friends_agenda.sql já executados.
--
-- Privacidade:
--   · A cidade é digitada pelo usuário (decisão: nada de GPS) e NUNCA é
--     devolvida a outros usuários — vira só o booleano same_region, no mesmo
--     espírito do ocupado/livre (booleano derivado, nunca o dado bruto).
--   · Continua valendo o portão do discoverable: quem não tem perfil aberto
--     não aparece em sugestão nenhuma, com ou sem cidade.

-- ---- Cidade no perfil ----
-- city     = texto como o usuário digitou (só ele vê)
-- city_key = versão normalizada no app (minúsculas, sem acento) p/ o match
alter table public.profiles add column if not exists city     text;
alter table public.profiles add column if not exists city_key text;

create index if not exists profiles_city_key_idx on public.profiles (city_key);

-- ---- Sugestões: mesma região primeiro ----
drop function if exists public.suggested_users();
create or replace function public.suggested_users()
returns table (user_id uuid, username text, display_name text, same_region boolean)
language sql
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.username,
    p.display_name,
    coalesce(
      p.city_key is not null
      and p.city_key = (select c.city_key from public.profiles c where c.user_id = auth.uid()),
      false
    ) as same_region
  from public.profiles p
  where p.discoverable
    and p.user_id <> auth.uid()
    and not exists (
      select 1 from public.friendships f
       where (f.requester = auth.uid() and f.addressee = p.user_id)
          or (f.requester = p.user_id and f.addressee = auth.uid())
    )
  order by same_region desc, p.created_at desc
  limit 6
$$;

-- ---- Push de convite recebido ----
-- Evita notificar o mesmo convite duas vezes (mesmo padrão de reminders.pushed).
alter table public.meeting_invites add column if not exists pushed boolean not null default false;

-- Convites que já existiam antes desta migração não devem disparar push agora.
update public.meeting_invites set pushed = true where status <> 'pending';
