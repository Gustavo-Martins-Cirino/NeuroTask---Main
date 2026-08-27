-- NeuroTask · Acessórios vestíveis do avatar (Escritório 3D)
-- Rode no SQL Editor do Supabase. Idempotente. Requer coins_shop.sql.
--
-- Fecha o item do ROADMAP "Roupas/acessórios do avatar COMPRÁVEIS na loja".
-- Chapéu e óculos são SLOTS separados (dá para usar os dois juntos); a
-- exclusividade dentro de cada slot é aplicada no app (EXCLUSIVE_CATEGORIES).
-- Como sempre, o preço que vale é este aqui — o cliente só exibe.

insert into public.shop_items (id, name, price, category) values
  ('oculos-grau',    'Óculos de grau',  35,  'oculos'),
  ('oculos-escuros', 'Óculos escuros',  70,  'oculos'),
  ('chapeu-bone',    'Boné',            45,  'chapeu'),
  ('chapeu-gorro',   'Gorro de lã',     60,  'chapeu'),
  ('chapeu-social',  'Chapéu social',   90,  'chapeu'),
  ('chapeu-capuz',   'Capuz',           130, 'chapeu'),
  ('chapeu-coroa',   'Coroa dourada',   220, 'chapeu'),
  ('chapeu-aureola', 'Auréola',         260, 'chapeu')
on conflict (id) do update
  set name = excluded.name, price = excluded.price, category = excluded.category;
