-- 20261027010000_civicos_cron_schedule.sql
--
-- The platform's scheduled jobs driven by the database (register 18.39).
-- Vercel's Hobby plan runs only daily cron jobs, and most of the platform's
-- jobs run every minute to every hour, so on Vercel with Supabase Postgres the
-- database scheduler calls them: pg_cron fires each job on its schedule and
-- pg_net makes the HTTP call to the deployment, through civicos.cron_call()
-- (migration 20261024110000), which reads the deployment's address
-- (civicos_base_url) and the cron secret (civicos_cron_secret) from Supabase
-- Vault at run time. Neither is ever written here or in a job body. Until both
-- are seeded every job sends nothing and records why in civicos.cron_skips.
--
-- The operator seeds them once, privately (docs/DISASTER_RECOVERY.md,
-- "Scheduled jobs on Vercel with Supabase"):
--
--   select vault.create_secret('https://<your deployment host>', 'civicos_base_url');
--   select vault.create_secret('<the app''s CIVICOS_CRON_SECRET>', 'civicos_cron_secret');
--
-- 1. cron_call now also names the caller and the run: X-CivicOS-Scheduler:
--    pg_cron and X-CivicOS-Run-Key: slot:<the scheduled minute, UTC>, so the
--    app records each run against its scheduled slot and a doubled call of
--    one slot changes nothing twice (app/src/lib/ops/cron-runs.ts). Everything
--    else is as before: no fallback host, plain origins only, cron paths only,
--    skips recorded.
-- 2. Every job in app/scripts/cron-jobs.json is scheduled here, under the same
--    names and schedules as app/supabase/cron/schedule.sql (re-runnable:
--    cron.schedule upserts by name). src/lib/ops/cron-jobs.test.ts holds the
--    three equal. Where pg_cron or pg_net is not available (a plain Postgres,
--    a database pg_cron does not run in) nothing is scheduled and a NOTICE
--    says so; the host's own scheduler calls the jobs instead (the self-host
--    script, the Helm chart's CronJobs).

set search_path = civicos, pg_catalog;

create or replace function civicos.cron_call(p_job text, p_path text, p_method text default 'GET')
returns bigint
language plpgsql security definer
set search_path = civicos, pg_catalog
as $$
declare
  v_base    text;
  v_secret  text;
  v_reason  text;
  v_url     text;
  v_headers jsonb;
begin
  if not civicos.is_service_context() then
    raise exception 'cron_call is for the scheduler only' using errcode = 'insufficient_privilege';
  end if;
  if p_path is null or p_path !~ '^/api/cron/[a-z0-9-]+$' then
    raise exception 'cron_call: path must be /api/cron/<job>';
  end if;

  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
      into v_base using 'civicos_base_url';
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
      into v_secret using 'civicos_cron_secret';
  else
    v_reason := 'Supabase Vault is not available, so civicos_base_url and civicos_cron_secret cannot be read';
  end if;

  v_reason := coalesce(v_reason, civicos.cron_base_url_refusal(v_base));
  if v_reason is null and (v_secret is null or length(v_secret) = 0) then
    v_reason := 'the Vault secret civicos_cron_secret is not set';
  end if;

  if v_reason is not null then
    raise notice 'civicos cron job % not run: %', p_job, v_reason;
    insert into civicos.cron_skips as s (job, reason) values (p_job, v_reason)
    on conflict (job) do update
      set reason = excluded.reason, last_at = now(), skipped = s.skipped + 1;
    return null;
  end if;

  delete from civicos.cron_skips where job = p_job;
  v_url := rtrim(trim(v_base), '/') || p_path;
  v_headers := jsonb_build_object(
    'Authorization', 'Bearer ' || v_secret,
    'X-CivicOS-Scheduler', 'pg_cron',
    'X-CivicOS-Run-Key', 'slot:' || to_char(date_trunc('minute', now() at time zone 'UTC'), 'YYYY-MM-DD"T"HH24:MI') || 'Z');
  if upper(coalesce(p_method, 'GET')) = 'POST' then
    return net.http_post(
      url := v_url,
      headers := v_headers || jsonb_build_object('Content-Type', 'application/json'),
      body := '{}'::jsonb);
  end if;
  return net.http_get(url := v_url, headers := v_headers);
end$$;

revoke all on function civicos.cron_call(text, text, text) from public, anon, authenticated;

do $schedule$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'civicos: pg_cron or pg_net is not available here; schedule the jobs with the host''s own scheduler';
    return;
  end if;
  begin
    create extension if not exists pg_net;
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'civicos: pg_cron could not be enabled in this database (%); schedule the jobs with the host''s own scheduler', sqlerrm;
    return;
  end;

  -- GET workers
  perform cron.schedule('civicos-deliver-events', '*/5 * * * *', $$select civicos.cron_call('civicos-deliver-events', '/api/cron/deliver-events')$$);
  perform cron.schedule('civicos-substrate-metrics', '*/10 * * * *', $$select civicos.cron_call('civicos-substrate-metrics', '/api/cron/substrate-metrics')$$);
  perform cron.schedule('civicos-audit-anchor', '*/10 * * * *', $$select civicos.cron_call('civicos-audit-anchor', '/api/cron/audit-anchor')$$);
  perform cron.schedule('civicos-witness-sweep', '*/15 * * * *', $$select civicos.cron_call('civicos-witness-sweep', '/api/cron/witness-sweep')$$);
  perform cron.schedule('civicos-witness-divergence', '*/15 * * * *', $$select civicos.cron_call('civicos-witness-divergence', '/api/cron/witness-divergence')$$);
  perform cron.schedule('civicos-posture-digest', '*/30 * * * *', $$select civicos.cron_call('civicos-posture-digest', '/api/cron/posture-digest')$$);
  perform cron.schedule('civicos-expire-consents', '0 * * * *', $$select civicos.cron_call('civicos-expire-consents', '/api/cron/expire-consents')$$);
  perform cron.schedule('civicos-audit-self', '0 * * * *', $$select civicos.cron_call('civicos-audit-self', '/api/cron/audit-self')$$);
  perform cron.schedule('civicos-update-watchdog', '* * * * *', $$select civicos.cron_call('civicos-update-watchdog', '/api/cron/update-watchdog')$$);
  perform cron.schedule('civicos-backup', '41 * * * *', $$select civicos.cron_call('civicos-backup', '/api/cron/backup')$$);
  perform cron.schedule('civicos-case-deadlines', '*/15 * * * *', $$select civicos.cron_call('civicos-case-deadlines', '/api/cron/case-deadlines')$$);
  perform cron.schedule('civicos-retention', '23 * * * *', $$select civicos.cron_call('civicos-retention', '/api/cron/retention')$$);
  perform cron.schedule('civicos-deliver-messages', '* * * * *', $$select civicos.cron_call('civicos-deliver-messages', '/api/cron/deliver-messages')$$);
  perform cron.schedule('civicos-site-feeds', '*/30 * * * *', $$select civicos.cron_call('civicos-site-feeds', '/api/cron/site-feeds')$$);
  perform cron.schedule('civicos-twin-ingest', '7 * * * *', $$select civicos.cron_call('civicos-twin-ingest', '/api/cron/twin-ingest')$$);
  perform cron.schedule('civicos-deliver-cloudevents', '*/2 * * * *', $$select civicos.cron_call('civicos-deliver-cloudevents', '/api/cron/deliver-cloudevents')$$);

  -- POST workers
  perform cron.schedule('civicos-sla', '0 * * * *', $$select civicos.cron_call('civicos-sla', '/api/cron/sla', 'POST')$$);
  perform cron.schedule('civicos-telemetry-stale', '0 * * * *', $$select civicos.cron_call('civicos-telemetry-stale', '/api/cron/telemetry-stale', 'POST')$$);
  perform cron.schedule('civicos-promote-directives', '0 * * * *', $$select civicos.cron_call('civicos-promote-directives', '/api/cron/promote-directives', 'POST')$$);

  raise notice 'civicos: 19 scheduled jobs set in pg_cron; seed civicos_base_url and civicos_cron_secret in Vault for them to run';
end
$schedule$;
