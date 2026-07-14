-- NeuroTask · Moedas + Loja cosmética (Fase 3 — gamificação com propósito)
-- Rode no SQL Editor do Supabase. Idempotente (pode reexecutar).
--
-- Economia 100% no servidor (mesma filosofia do anti-farm):
--   · Moedas nascem DENTRO do award_xp: 1 moeda a cada 5 XP concedidos
--     (respeita o teto diário de XP → máx. ~30 moedas/dia).
--   · Estornos de XP também estornam moedas (evita farm por des/re-concluir).
--   · Preços moram na tabela shop_items; a compra é a RPC buy_item, atômica,
--     que valida saldo e posse — impossível burlar pelo cliente.

-- ---- Saldo ----
alter table public.user_stats add column if not exists coins integer not null default 0;

-- ---- award_xp agora também concede moedas ----
create or replace function public.award_xp(p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  daily_cap constant integer := 150;
  granted   integer;
  new_total integer;
begin
  insert into public.user_stats (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  update public.user_stats
     set xp_today = 0, xp_day = current_date
   where user_id = auth.uid()
     and (xp_day is null or xp_day < current_date);

  if p_amount > 0 then
    select least(p_amount, greatest(0, daily_cap - xp_today))
      into granted
      from public.user_stats
     where user_id = auth.uid();
  else
    granted := p_amount;
  end if;

  update public.user_stats
     set total_xp   = greatest(0, total_xp + granted),
         xp_today   = greatest(0, xp_today + granted),
         -- 1 moeda a cada 5 XP; estorno debita SEM travar em 0 (senão gastar
         -- moedas e des/re-concluir a tarefa viraria impressora de moedas)
         coins      = coins + granted / 5,
         updated_at = now()
   where user_id = auth.uid()
  returning total_xp into new_total;

  return new_total;
end;
$$;

-- ---- Catálogo (preços autoritativos no servidor) ----
create table if not exists public.shop_items (
  id       text primary key,
  name     text not null,
  price    integer not null check (price >= 0),
  category text not null
);

alter table public.shop_items enable row level security;

drop policy if exists "shop_items_read_all" on public.shop_items;
create policy "shop_items_read_all" on public.shop_items
  for select to authenticated using (true);

insert into public.shop_items (id, name, price, category) values
  ('planta-pequena',     'Plantinha',            20,  'decor'),
  ('luminaria',          'Luminária',            30,  'decor'),
  ('quadro-montanhas',   'Quadro · Montanhas',   40,  'decor'),
  ('tapete',             'Tapete',               50,  'decor'),
  ('planta-grande',      'Planta grande',        60,  'decor'),
  ('estante',            'Estante de livros',    80,  'decor'),
  ('quadro-neon',        'Neon "focus"',         90,  'decor'),
  ('janela-cidade',      'Janela · Cidade',      100, 'decor'),
  ('pet-gato',           'Gato de estimação',    120, 'decor'),
  ('trofeu',             'Troféu dourado',       150, 'decor'),
  ('cadeira-ergonomica', 'Cadeira ergonômica',   60,  'cadeira'),
  ('cadeira-gamer',      'Cadeira gamer',        130, 'cadeira'),
  ('setup-duplo',        'Setup · 2 monitores',  110, 'setup'),
  ('setup-ultrawide',    'Setup · Ultrawide',    200, 'setup'),
  ('parede-azul',        'Parede azul',          40,  'parede'),
  ('parede-verde',       'Parede verde',         40,  'parede'),
  ('parede-rosa',        'Parede rosa',          40,  'parede'),
  ('piso-madeira',       'Piso de madeira',      30,  'piso'),
  ('piso-carpete',       'Carpete',              30,  'piso')
on conflict (id) do update
  set name = excluded.name, price = excluded.price, category = excluded.category;

-- ---- Inventário ----
create table if not exists public.user_items (
  user_id      uuid not null references auth.users (id) on delete cascade,
  item_id      text not null references public.shop_items (id) on delete cascade,
  equipped     boolean not null default true,
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.user_items enable row level security;

-- Ler e equipar/desequipar: direto. INSERIR não tem policy de propósito —
-- compra só pela RPC buy_item (security definer), que cobra as moedas.
drop policy if exists "user_items_select_own" on public.user_items;
create policy "user_items_select_own" on public.user_items
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_items_update_own" on public.user_items;
create policy "user_items_update_own" on public.user_items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- Compra atômica ----
create or replace function public.buy_item(p_item_id text)
returns integer -- novo saldo de moedas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price integer;
  v_coins integer;
begin
  select price into v_price from public.shop_items where id = p_item_id;
  if v_price is null then
    raise exception 'ITEM_INEXISTENTE';
  end if;

  if exists (select 1 from public.user_items where user_id = auth.uid() and item_id = p_item_id) then
    raise exception 'JA_COMPRADO';
  end if;

  insert into public.user_stats (user_id) values (auth.uid())
  on conflict (user_id) do nothing;

  select coins into v_coins
    from public.user_stats
   where user_id = auth.uid()
   for update;

  if coalesce(v_coins, 0) < v_price then
    raise exception 'SALDO_INSUFICIENTE';
  end if;

  update public.user_stats
     set coins = coins - v_price, updated_at = now()
   where user_id = auth.uid();

  insert into public.user_items (user_id, item_id) values (auth.uid(), p_item_id);

  return v_coins - v_price;
end;
$$;
