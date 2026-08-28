-- NeuroTask · Escritório — seção de MÓVEIS na loja
-- Rode no SQL Editor do Supabase. Idempotente. Requer coins_shop.sql.
--
-- `decor` era um saco onde cabia tudo: planta, quadro, relógio, pet, troféu,
-- LED e uma estante. Móvel é o que muda a PLANTA da sala — ocupa chão, tem
-- silhueta e você desviaria dele para andar. Pendurar um enfeite é outra coisa.
--
-- A estante MUDA DE CATEGORIA (o update abaixo), e por isso este arquivo não é
-- só um insert: quem já a comprou continua com ela, só que na aba nova.

-- Os três formam um canto de estar: sofá na parede, mesa de centro à frente
-- dele e a poltrona solta no chão. Junto com a estante, a aba tem quatro itens.
insert into public.shop_items (id, name, price, category) values
  ('mesa-centro', 'Mesa de centro',  70, 'movel'),
  ('poltrona',    'Poltrona',       120, 'movel'),
  ('sofa',        'Sofá',           170, 'movel')
on conflict (id) do update
  set name = excluded.name, price = excluded.price, category = excluded.category;

-- A estante já existia em 'decor' desde o coins_shop.sql.
update public.shop_items set category = 'movel' where id = 'estante';
