-- NeuroTask · XP do Modo Foco, com cota própria
-- Rode no SQL Editor do Supabase. Idempotente (pode reexecutar).
-- Depende de: gamification.sql → xp_anticheat.sql → coins_shop.sql
--
-- O foco paga por TEMPO (+2 XP a cada 5 min com o timer correndo) e dobra a
-- tarefa concluída dentro dele. Esse XP fica FORA do teto diário de 150 do
-- award_xp: dentro dele, quem já encosta no teto não sentiria o foco — e é
-- justamente quem mais usa. Em troca, a cota do foco tem teto próprio.
--
-- Sem este arquivo o app não quebra: o cliente percebe que a função não existe
-- e manda o mesmo XP pelo award_xp comum (que o limita ao teto de 150).

alter table public.user_stats add column if not exists focus_xp_today integer not null default 0;
alter table public.user_stats add column if not exists focus_xp_day date;

-- Devolve o total novo E quanto de fato entrou: a tela do foco mostra "+N XP
-- neste foco" com o número do servidor, e não com o que o cliente pediu —
-- batido o teto, ela para de contar em vez de prometer XP que não veio.
create or replace function public.award_focus_xp(p_amount integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  focus_cap constant integer := 60;  -- espelho de TETO_DIARIO_DO_FOCO (lib/foco-pontos.ts)
  antes     integer;
  granted   integer;
  new_total integer;
begin
  insert into public.user_stats (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  -- Só ganho: estorno de tarefa continua indo pelo award_xp.
  if p_amount is null or p_amount <= 0 then
    select total_xp into new_total from public.user_stats where user_id = auth.uid();
    return json_build_object('total', coalesce(new_total, 0), 'concedido', 0);
  end if;

  update public.user_stats
     set focus_xp_today = 0, focus_xp_day = current_date
   where user_id = auth.uid()
     and (focus_xp_day is null or focus_xp_day < current_date);

  select focus_xp_today into antes
    from public.user_stats
   where user_id = auth.uid()
   for update;

  granted := least(p_amount, greatest(0, focus_cap - antes));

  -- Moedas pelo ACUMULADO do dia, não pela chamada: o award_xp faz
  -- `granted / 5` por chamada, e aqui as chamadas são de 2 XP — dariam zero
  -- moeda para sempre. Contando do total do dia, a sobra passa para a próxima.
  update public.user_stats
     set total_xp       = total_xp + granted,
         focus_xp_today = antes + granted,
         coins          = coins + (antes + granted) / 5 - antes / 5,
         updated_at     = now()
   where user_id = auth.uid()
  returning total_xp into new_total;

  return json_build_object('total', new_total, 'concedido', granted);
end;
$$;
