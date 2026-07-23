-- NeuroTask · Itens novos do Escritório 3D
-- Rode no SQL Editor do Supabase. Idempotente (pode reexecutar).
--
-- Itens que nasceram já no plano 3D (os decorativos antigos do coins_shop.sql
-- continuam valendo; só ganharam malha 3D no cliente, sem mudar o banco).

insert into public.shop_items (id, name, price, category) values
  ('pet-cachorro', 'Cachorro (Beagle)', 120, 'decor')
on conflict (id) do update
  set name = excluded.name, price = excluded.price, category = excluded.category;
