-- NeuroTask · Escritório v5 — pisos novos
-- Rode no SQL Editor do Supabase. Idempotente (pode reexecutar).
--
-- Depende de coins_shop.sql (cria shop_items e a RPC buy_item). Sem esta linha
-- no banco a compra falha com ITEM_INEXISTENTE, mesmo com o modelo 3D pronto.

insert into public.shop_items (id, name, price, category) values
  ('piso-madeira-escura', 'Madeira escura',   55,  'piso'),
  ('piso-porcelanato',    'Porcelanato',      90,  'piso'),
  ('piso-cimento',        'Cimento queimado', 110, 'piso')
on conflict (id) do update
  set name = excluded.name, price = excluded.price, category = excluded.category;
