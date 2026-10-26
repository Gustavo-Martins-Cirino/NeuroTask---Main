-- Ambientes pagos do Modo Foco: entram na loja como itens da categoria 'foco',
-- comprados com moedas pela mesma RPC buy_item do Escritório (que cobra no
-- servidor e grava em user_items). Nada novo de permissão: só o catálogo.
--
-- Os preços aqui são os que valem (quem cobra é o banco); os da tela moram em
-- frontend/lib/foco-cenas.ts, e um teste confere que são iguais.
--
-- Idempotente. Depende de coins_shop.sql (shop_items, user_items, buy_item).

insert into public.shop_items (id, name, price, category) values
  ('foco-correnteza',   'Foco · Correnteza',   60,  'foco'),
  ('foco-formulas',     'Foco · Fórmulas',     120, 'foco'),
  ('foco-folego',       'Foco · Fôlego',       200, 'foco'),
  ('foco-buraco-negro', 'Foco · Buraco negro', 320, 'foco'),
  ('foco-constelacao',  'Foco · Constelação',  480, 'foco')
on conflict (id) do update
  set name = excluded.name, price = excluded.price, category = excluded.category;
