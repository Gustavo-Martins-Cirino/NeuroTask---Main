-- NeuroTask · Cor da nota
-- Rode no SQL Editor do Supabase. Idempotente. Requer notes.sql.
--
-- Guarda o NOME da cor ('azul', 'ambar'…), nunca o hex. Com o hex aqui, mudar a
-- paleta um dia deixaria notas antigas apontando para uma cor que já não existe
-- em lugar nenhum — e não haveria como corrigi-las em bloco. A tabela de cores
-- mora em frontend/lib/nota-cor.ts, e o app trata nome desconhecido como
-- "sem cor" em vez de erro.
--
-- Sem CHECK de propósito: a lista de cores muda no código, e um CHECK aqui
-- viraria a mesma armadilha do `feedback_kind_check` — um constraint velho
-- recusando um valor novo, num banco onde ninguém lembra de ter criado.

alter table public.notes
  add column if not exists color text;
