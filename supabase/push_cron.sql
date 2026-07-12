-- NeuroTask · Agendador de push (pg_cron, roda no próprio Supabase — grátis)
-- ⚠️ ANTES DE RODAR: troque COLE_AQUI_O_CRON_SECRET pelo valor de CRON_SECRET
--    do seu frontend/.env.local (o mesmo que vai nas envs da Vercel).
-- Rode no SQL Editor do Supabase. Reexecutar substitui o job (mesmo nome).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'neurotask-push-dispatch',
  '* * * * *', -- a cada minuto
  $$
  select net.http_post(
    url     := 'https://neuro-task-main.vercel.app/api/push/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'COLE_AQUI_O_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para desligar: select cron.unschedule('neurotask-push-dispatch');
