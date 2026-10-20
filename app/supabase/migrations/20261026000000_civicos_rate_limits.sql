-- 20261026000000_civicos_rate_limits.sql
--
-- Rate limits and the public register's harvesting watch shared by every
-- instance of the platform (acceptance hardening): with CIVICOS_STATE=postgres
-- several servers answer the same callers, and limits counted in each
-- server's memory let a caller multiply them by the number of servers. These
-- tables are protection, not records: never backed up or restored, and old
-- rows are pruned by the platform (app/src/lib/ops/shared-limits.ts).
--
--   rate_bucket          one token bucket per scope and caller; taken by one
--                        atomic statement, so concurrent requests on any
--                        instance never take the same token twice
--   register_watch       public register checks per caller (salted hash,
--                        never an address) and hour: lookups and misses
--   register_watch_flag  the day a caller was flagged, so the audit chain
--                        gets one entry per caller and day across instances
--   runtime_secret       the salt the callers are hashed with, the same on
--                        every instance
--
-- Only the service role (on the substrate) or the database owner may use it.

create schema if not exists civicos;

create table if not exists civicos.rate_bucket (
  key      text primary key,
  tokens   double precision not null,
  at_ms    bigint not null,
  last_ok  boolean not null
);

create table if not exists civicos.register_watch (
  caller        text not null,
  window_start  bigint not null,
  lookups       integer not null default 0,
  misses        integer not null default 0,
  primary key (caller, window_start)
);

create table if not exists civicos.register_watch_flag (
  caller  text not null,
  day     date not null,
  primary key (caller, day)
);

create table if not exists civicos.runtime_secret (
  name   text primary key,
  value  text not null
);

do $access$
declare t text;
begin
  foreach t in array array['rate_bucket', 'register_watch', 'register_watch_flag', 'runtime_secret'] loop
    execute format('alter table civicos.%I enable row level security', t);
    execute format('revoke all on civicos.%I from public', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on civicos.%I from anon', t); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on civicos.%I from authenticated', t); end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant all on civicos.%I to service_role', t); end if;
  end loop;
end
$access$;
