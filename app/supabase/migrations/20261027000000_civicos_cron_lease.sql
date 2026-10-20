-- 20261027000000_civicos_cron_lease.sql
--
-- One lease per scheduled job, shared by every instance of the platform
-- (register 18.39). On a serverless host each call of /api/cron/<job> may land
-- on a different instance; counted in one server's memory, two instances could
-- run the same job at once, or run a slot twice. The lease is taken by one
-- atomic statement (app/src/lib/ops/cron-runs.ts):
--
--   job        the job's name (scripts/cron-jobs.json)
--   run_key    the run that holds or last held the job (a scheduled slot
--              "slot:2026-10-20T14:05Z", or the caller's own key)
--   holder     the run's id while it runs; null when free
--   until_ms   when a run that never finished stops holding the job
--   done_key   the run key that last succeeded: a second call with it is a
--              duplicate and changes nothing
--
-- Coordination, not records (the run history is the platform's store
-- __civicosCronRuns): never backed up or restored (lib/backup/state.ts
-- SKIP_TABLES). Only the service role (on the substrate) or the database owner
-- may use it.

create schema if not exists civicos;

create table if not exists civicos.cron_lease (
  job       text primary key,
  run_key   text not null,
  holder    text,
  until_ms  bigint not null default 0,
  done_key  text
);

do $access$
begin
  alter table civicos.cron_lease enable row level security;
  revoke all on civicos.cron_lease from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on civicos.cron_lease from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on civicos.cron_lease from authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then grant all on civicos.cron_lease to service_role; end if;
end
$access$;
