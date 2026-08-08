-- NeuroTask · Escritório v4 — itens novos da loja
-- Rode no SQL Editor do Supabase. Idempotente (pode reexecutar).
--
-- Depende de coins_shop.sql (cria shop_items e a RPC buy_item). Sem esta linha
-- no banco a compra falha com ITEM_INEXISTENTE, mesmo com o modelo 3D pronto —
-- foi o que aconteceu com o beagle, que vive no office_3d.sql.

insert into public.shop_items (id, name, price, category) values
  -- Paredes
  ('parede-cinza',    'Parede cinza',        40,  'parede'),
  ('parede-preta',    'Parede preta',        55,  'parede'),
  ('parede-papel',    'Papel de parede',     70,  'parede'),
  -- Decoração
  ('relogio',         'Relógio de parede',   45,  'decor'),
  ('prateleira',      'Prateleira',          75,  'decor'),
  ('led-rgb',         'Fita de LED RGB',     140, 'decor'),
  -- Setup
  ('setup-notebook',  'Setup · Notebook',    90,  'setup')
on conflict (id) do update
  set name = excluded.name, price = excluded.price, category = excluded.category;
