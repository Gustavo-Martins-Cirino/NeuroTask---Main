-- NeuroTask · Escritório v6 — paredes novas
-- Rode no SQL Editor do Supabase. Idempotente (pode reexecutar).
--
-- Depende de coins_shop.sql (cria shop_items e a RPC buy_item). Sem esta linha
-- no banco a compra falha com ITEM_INEXISTENTE, mesmo com o modelo 3D pronto.
--
-- As três primeiras são cor; as três últimas são DESENHO (textura procedural,
-- em lib/office-textura.ts) e por isso custam mais.

insert into public.shop_items (id, name, price, category) values
  ('parede-terracota', 'Parede terracota',  40,  'parede'),
  ('parede-mostarda',  'Parede mostarda',   40,  'parede'),
  ('parede-oliva',     'Parede oliva',      40,  'parede'),
  ('parede-cimento',   'Cimento queimado',  110, 'parede'),
  ('parede-tijolinho', 'Tijolinho',         130, 'parede'),
  ('parede-ripada',    'Ripado de madeira', 150, 'parede')
on conflict (id) do update
  set name = excluded.name, price = excluded.price, category = excluded.category;
