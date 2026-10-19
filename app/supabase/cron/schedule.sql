-- supabase/cron/schedule.sql
--
-- In-database scheduler for the 15 /api/cron/* worker jobs, using
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
-- The jobs below call civicos.cron_call(job, path[, 'POST'])
-- (migration 20261024110000_civicos_cron_dispatch.sql), which reads the
-- secret and the base URL from Vault at run time and sends the secret as
-- `Authorization: Bearer …`, which each route checks against
-- CIVICOS_CRON_SECRET.
--
-- Deployment base URL: each nation's deployment seeds its own, privately,
-- so this file never needs editing per deployment:
--
--   select vault.create_secret('https://<your-deployment-host>', 'civicos_base_url');
--
-- There is NO fallback host. Until both secrets are seeded (and the base URL
-- is a plain http(s) origin), every job sends nothing: it raises a NOTICE
-- and records why in civicos.cron_skips:
--
--   select job, reason, skipped, last_at from civicos.cron_skips order by job;
--
-- Rotate the cron secret if this schedule ever ran before civicos_base_url
-- was set: earlier versions of this file fell back to an outside reference
-- host and sent the secret there (go-live review H-2). Set a new
-- CIVICOS_CRON_SECRET in the app and the same value in Vault.

create extension if not exists pg_net;
create extension if not exists pg_cron;

do $$
begin
  if to_regprocedure('civicos.cron_call(text,text,text)') is null then
    raise exception 'civicos.cron_call is missing: apply the migrations (20261024110000_civicos_cron_dispatch.sql) before this schedule';
  end if;
end$$;

-- GET workers ───────────────────────────────────────────────────────────
select cron.schedule('civicos-deliver-events', '*/5 * * * *', $$select civicos.cron_call('civicos-deliver-events', '/api/cron/deliver-events')$$);
select cron.schedule('civicos-substrate-metrics', '*/10 * * * *', $$select civicos.cron_call('civicos-substrate-metrics', '/api/cron/substrate-metrics')$$);
select cron.schedule('civicos-audit-anchor', '*/10 * * * *', $$select civicos.cron_call('civicos-audit-anchor', '/api/cron/audit-anchor')$$);
select cron.schedule('civicos-witness-sweep', '*/15 * * * *', $$select civicos.cron_call('civicos-witness-sweep', '/api/cron/witness-sweep')$$);
select cron.schedule('civicos-witness-divergence', '*/15 * * * *', $$select civicos.cron_call('civicos-witness-divergence', '/api/cron/witness-divergence')$$);
select cron.schedule('civicos-posture-digest', '*/30 * * * *', $$select civicos.cron_call('civicos-posture-digest', '/api/cron/posture-digest')$$);
select cron.schedule('civicos-expire-consents', '0 * * * *', $$select civicos.cron_call('civicos-expire-consents', '/api/cron/expire-consents')$$);
select cron.schedule('civicos-audit-self', '0 * * * *', $$select civicos.cron_call('civicos-audit-self', '/api/cron/audit-self')$$);
-- Update Center watchdog: concludes due probations (pass, switch back to the
-- last known good release, or wait for the nation) and records overdue health
-- reports as missing. Never installs anything.
select cron.schedule('civicos-update-watchdog', '* * * * *', $$select civicos.cron_call('civicos-update-watchdog', '/api/cron/update-watchdog')$$);
-- Backups (lib/data/backups.ts): hourly check; takes an encrypted backup when the newest is older than the
-- policy's interval (default daily), verifies it by a dry-run restore, applies retention. Never restores.
select cron.schedule('civicos-backup', '41 * * * *', $$select civicos.cron_call('civicos-backup', '/api/cron/backup')$$);
-- Email and SMS outbox: alerts to officials and public-site email updates, through the nation's own providers (lib/messaging/deliver.ts).
select cron.schedule('civicos-deliver-messages', '* * * * *', $$select civicos.cron_call('civicos-deliver-messages', '/api/cron/deliver-messages')$$);
select cron.schedule('civicos-site-feeds', '*/30 * * * *', $$select civicos.cron_call('civicos-site-feeds', '/api/cron/site-feeds')$$);
select cron.schedule('civicos-twin-ingest', '7 * * * *', $$select civicos.cron_call('civicos-twin-ingest', '/api/cron/twin-ingest')$$);
-- Platform event outbox: CloudEvents 1.0 to webhook subscribers, HMAC-signed (lib/events/deliver.ts).
select cron.schedule('civicos-deliver-cloudevents', '*/2 * * * *', $$select civicos.cron_call('civicos-deliver-cloudevents', '/api/cron/deliver-cloudevents')$$);

-- POST workers ──────────────────────────────────────────────────────────
select cron.schedule('civicos-sla', '0 * * * *', $$select civicos.cron_call('civicos-sla', '/api/cron/sla', 'POST')$$);
select cron.schedule('civicos-telemetry-stale', '0 * * * *', $$select civicos.cron_call('civicos-telemetry-stale', '/api/cron/telemetry-stale', 'POST')$$);
select cron.schedule('civicos-promote-directives', '0 * * * *', $$select civicos.cron_call('civicos-promote-directives', '/api/cron/promote-directives', 'POST')$$);

-- Inspect:        select jobname, schedule, active from cron.job order by jobid;
-- Recent runs:    select * from cron.job_run_details order by start_time desc limit 20;
-- Unschedule one: select cron.unschedule('civicos-deliver-events');
