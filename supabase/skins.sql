-- NeuroTask · Skins do personagem do Escritório 3D
-- Rode no SQL Editor do Supabase. Idempotente (pode reexecutar).
--
-- Skins são itens da loja (categoria 'skin') — mesma mecânica de shop_items +
-- user_items + buy_item do coins_shop.sql. São um slot EXCLUSIVO no cliente
-- (equipar uma desequipa as outras). O manequim padrão é grátis (price 0); o
-- humano texturizado é premium. A cor/modelo de cada skin mora no frontend
-- (lib/skins.ts); aqui só o preço autoritativo e a existência do item.

insert into public.shop_items (id, name, price, category) values
  ('skin-manequim',       'Manequim',         0,   'skin'),
  ('skin-manequim-azul',  'Manequim azul',    20,  'skin'),
  ('skin-manequim-verde', 'Manequim verde',   20,  'skin'),
  ('skin-manequim-rosa',  'Manequim rosa',    20,  'skin'),
  ('skin-manequim-roxo',  'Manequim roxo',    20,  'skin'),
  ('skin-humano',         'Humano realista',  120, 'skin')
on conflict (id) do update
  set name = excluded.name, price = excluded.price, category = excluded.category;
