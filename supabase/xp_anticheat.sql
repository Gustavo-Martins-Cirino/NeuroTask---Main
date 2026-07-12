-- NeuroTask · Anti-farm de XP (Fase 3 — gamificação com propósito)
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Idempotente. Teto DIÁRIO de XP aplicado no servidor (não dá pra burlar
-- pelo cliente). As outras regras (idade mínima da tarefa, redução sem
-- prazo/duração) são aplicadas no app antes de chamar award_xp.

alter table public.user_stats add column if not exists xp_today integer not null default 0;
alter table public.user_stats add column if not exists xp_day date;

create or replace function public.award_xp(p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  daily_cap constant integer := 150;
  granted   integer;
  new_total integer;
begin
  -- garante a linha do usuário
  insert into public.user_stats (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  -- vira o dia → zera o contador diário
  update public.user_stats
     set xp_today = 0, xp_day = current_date
   where user_id = auth.uid()
     and (xp_day is null or xp_day < current_date);

  -- ganhos respeitam o teto diário; estornos (negativos) passam direto
  if p_amount > 0 then
    select least(p_amount, greatest(0, daily_cap - xp_today))
      into granted
      from public.user_stats
     where user_id = auth.uid();
  else
    granted := p_amount;
  end if;

  update public.user_stats
     set total_xp   = greatest(0, total_xp + granted),
         xp_today   = greatest(0, xp_today + granted),
         updated_at = now()
   where user_id = auth.uid()
  returning total_xp into new_total;

  return new_total;
end;
$$;
