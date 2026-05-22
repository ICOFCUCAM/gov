-- supabase/cron/schedule.sql
--
-- In-database scheduler for the 11 /api/cron/* worker endpoints, using
-- pg_cron + pg_net. This is the free (no Vercel Pro) path: Postgres itself
-- calls the deployed Next.js cron routes on a timer.
--
-- Re-runnable: cron.schedule(name, …) upserts by job name, so applying this
-- file again just updates the schedules/commands in place.
--
-- ── One-time operator step (run privately, NOT in any shared transcript) ──
-- Seed the shared cron secret into Vault so it never lives in a job body or
-- this file. Use the SAME value as the app's CIVICOS_CRON_SECRET env var:
--
--   select vault.create_secret('<YOUR_CIVICOS_CRON_SECRET>', 'civicos_cron_secret');
--
-- To rotate later:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'civicos_cron_secret'),
--     '<NEW_VALUE>');
--
-- The jobs below read it at run time via vault.decrypted_secrets and send it
-- as `Authorization: Bearer …`, which each route checks against
-- CIVICOS_CRON_SECRET. Until the secret is seeded the jobs run but get 401.
--
-- Deployed base URL is hard-coded below; update it if the app moves.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- GET workers ───────────────────────────────────────────────────────────
select cron.schedule('civicos-deliver-events',     '*/5 * * * *',  $$select net.http_get(url := 'https://gov-pied-seven.vercel.app/api/cron/deliver-events',     headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret')))$$);
select cron.schedule('civicos-substrate-metrics',  '*/10 * * * *', $$select net.http_get(url := 'https://gov-pied-seven.vercel.app/api/cron/substrate-metrics',  headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret')))$$);
select cron.schedule('civicos-audit-anchor',       '*/10 * * * *', $$select net.http_get(url := 'https://gov-pied-seven.vercel.app/api/cron/audit-anchor',       headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret')))$$);
select cron.schedule('civicos-witness-sweep',      '*/15 * * * *', $$select net.http_get(url := 'https://gov-pied-seven.vercel.app/api/cron/witness-sweep',      headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret')))$$);
select cron.schedule('civicos-witness-divergence', '*/15 * * * *', $$select net.http_get(url := 'https://gov-pied-seven.vercel.app/api/cron/witness-divergence', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret')))$$);
select cron.schedule('civicos-posture-digest',     '*/30 * * * *', $$select net.http_get(url := 'https://gov-pied-seven.vercel.app/api/cron/posture-digest',     headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret')))$$);
select cron.schedule('civicos-expire-consents',    '0 * * * *',    $$select net.http_get(url := 'https://gov-pied-seven.vercel.app/api/cron/expire-consents',    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret')))$$);
select cron.schedule('civicos-audit-self',         '0 * * * *',    $$select net.http_get(url := 'https://gov-pied-seven.vercel.app/api/cron/audit-self',         headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret')))$$);

-- POST workers ──────────────────────────────────────────────────────────
select cron.schedule('civicos-sla',                '0 * * * *',    $$select net.http_post(url := 'https://gov-pied-seven.vercel.app/api/cron/sla',                headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret'), 'Content-Type', 'application/json'), body := '{}'::jsonb)$$);
select cron.schedule('civicos-telemetry-stale',    '0 * * * *',    $$select net.http_post(url := 'https://gov-pied-seven.vercel.app/api/cron/telemetry-stale',    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret'), 'Content-Type', 'application/json'), body := '{}'::jsonb)$$);
select cron.schedule('civicos-promote-directives', '0 * * * *',    $$select net.http_post(url := 'https://gov-pied-seven.vercel.app/api/cron/promote-directives', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret'), 'Content-Type', 'application/json'), body := '{}'::jsonb)$$);

-- Inspect:        select jobname, schedule, active from cron.job order by jobid;
-- Recent runs:    select * from cron.job_run_details order by start_time desc limit 20;
-- Unschedule one: select cron.unschedule('civicos-deliver-events');
