// The per-record tables of the postgres backend (architecture review R6),
// identical to app/supabase/migrations/20261020000000_civicos_records.sql,
// 20261021000000_civicos_record_docs.sql, 20261023000000_civicos_parcels.sql
// 20261026000000_civicos_rate_limits.sql and 20261027000000_civicos_cron_lease.sql
// (postgres-schema.test.ts holds them
// equal). The backend applies it at start
// (every statement is idempotent), so a nation's own Postgres needs no
// migration tool; on the substrate the migration applies it.

export const RECORDS_MIGRATION = '20261020000000_civicos_records.sql';

export const RECORDS_SCHEMA = String.raw`-- 20261020000000_civicos_records.sql
--
-- Per-record tables for the registers that left the JSON snapshots
-- (architecture review R6; register 1.1, 16.6). The application server keeps
-- these records in memory as its read model and writes every change through,
-- in order, inside one transaction per batch with its audit entry and an
-- outbox row (app/src/lib/data/repo/postgres.ts, CIVICOS_STATE=postgres):
--
--   audit_entry        the platform audit chain: append-only, each entry must
--                      chain from the one before (hash columns, trigger)
--   twin_entity, twin_key, twin_source, twin_run
--   twin_observation   bitemporal: valid (tstzrange, when it was true),
--                      recorded_at (when it was learnt), superseded_at (when
--                      its import was withdrawn); append-only apart from
--                      superseded_at, set once
--   facility           the national facility register (one row per site)
--   boundary_version, boundary_unit   boundary versions and their shapes
--   outbox             one row per change, written in the same transaction;
--                      other instances follow it (LISTEN civicos_outbox)
--   record_counter     blocks of record numbers (FAC-, RUN-, SRC-, bnd-)
--
-- Geometry: with PostGIS available, facility and twin_entity get a
-- geography(Point) column and a GiST index, and boundary_unit a
-- geometry(MultiPolygon, 4326) column (made valid, with ST_IsValid checked and
-- the validity of the shape as loaded kept) and a GiST index. Without PostGIS
-- the same tables keep plain double precision longitude/latitude and bounding
-- box columns with btree indexes, and the platform's own checks
-- (lib/geo/topology.ts) stay the only geometry checks.
--
-- The snapshot tables of migrations 20261017000000 and 20261019000000 are
-- repeated (if absent) so a plain Postgres has them: the stores not yet moved
-- keep their JSON snapshots there under the single writer's lease.
-- Only the service role (on the substrate) or the database owner may use any
-- of it.

create schema if not exists civicos;

create table if not exists civicos.platform_state (
  key        text primary key check (key ~ '^__civicos[A-Za-z0-9_]*$'),
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table civicos.platform_state add column if not exists version bigint not null default 0;
alter table civicos.platform_state add column if not exists writer text;
create table if not exists civicos.platform_state_lease (
  id          smallint primary key default 1 check (id = 1),
  writer      text not null,
  acquired_at timestamptz not null,
  renewed_at  timestamptz not null,
  expires_at  timestamptz not null
);

create table if not exists civicos.record_counter (
  name       text primary key,
  next_value bigint not null
);

-- ── Audit chain ─────────────────────────────────────────────────────────
create table if not exists civicos.audit_entry (
  seq         bigint primary key check (seq > 0),
  id          text not null unique,
  at          text not null,
  actor       text not null,
  action      text not null,
  resource    text not null,
  outcome     text not null,
  detail      text,
  prev_hash   text,
  hash        text not null unique,
  alg         text,
  instance    text,
  recorded_at timestamptz not null default now()
);

create or replace function civicos.audit_entry_guard() returns trigger
language plpgsql as $$
begin
  if tg_op <> 'INSERT' then
    raise exception 'civicos.audit_entry is append-only' using errcode = '42501';
  end if;
  if new.seq = 1 then
    if new.prev_hash is not null then
      raise exception 'the first audit entry chains from nothing' using errcode = '23514';
    end if;
  elsif not exists (select 1 from civicos.audit_entry p where p.seq = new.seq - 1 and p.hash = new.prev_hash) then
    raise exception 'audit entry % does not chain from entry %', new.seq, new.seq - 1 using errcode = '23514';
  end if;
  return new;
end $$;

create or replace function civicos.refuse_truncate() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end $$;

drop trigger if exists audit_entry_guard on civicos.audit_entry;
create trigger audit_entry_guard before insert or update or delete on civicos.audit_entry
  for each row execute function civicos.audit_entry_guard();
drop trigger if exists audit_entry_no_truncate on civicos.audit_entry;
create trigger audit_entry_no_truncate before truncate on civicos.audit_entry
  for each statement execute function civicos.refuse_truncate();

-- ── National twin ───────────────────────────────────────────────────────
create table if not exists civicos.twin_entity (
  id         text primary key,
  uri        text,
  kind       text not null,
  name       text not null,
  code       text,
  parent     text,
  region     boolean,
  ord        integer,
  lng        double precision,
  lat        double precision,
  doc        jsonb not null,
  pos        bigserial,
  updated_at timestamptz not null default now()
);

create table if not exists civicos.twin_key (
  system    text not null,
  key       text not null,
  entity_id text not null,
  pos       bigserial,
  primary key (system, key)
);

create table if not exists civicos.twin_source (
  id         text primary key,
  doc        jsonb not null,
  pos        bigserial,
  updated_at timestamptz not null default now()
);

create table if not exists civicos.twin_run (
  id         text primary key,
  source_id  text not null,
  at         timestamptz not null,
  doc        jsonb not null,
  pos        bigserial,
  updated_at timestamptz not null default now()
);

create table if not exists civicos.twin_observation (
  id            bigserial primary key,
  run_id        text not null,
  ord           integer not null,
  entity_id     text not null,
  metric        text not null,
  value         numeric not null,
  unit          text not null,
  valid         tstzrange not null check (not isempty(valid)),
  recorded_at   timestamptz not null,
  superseded_at timestamptz,
  source_id     text not null,
  quality       jsonb,
  unique (run_id, ord)
);
create index if not exists twin_observation_asof on civicos.twin_observation (metric, entity_id, lower(valid));
create index if not exists twin_observation_entity on civicos.twin_observation (entity_id, metric);

create or replace function civicos.twin_observation_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'civicos.twin_observation is append-only' using errcode = '42501';
  end if;
  -- An observation is never changed; withdrawing its import sets superseded_at once.
  if old.superseded_at is not null
     or (new.run_id, new.ord, new.entity_id, new.metric, new.value, new.unit, new.valid, new.recorded_at, new.source_id)
        is distinct from (old.run_id, old.ord, old.entity_id, old.metric, old.value, old.unit, old.valid, old.recorded_at, old.source_id)
     or new.quality is distinct from old.quality then
    raise exception 'an observation is never changed; only its supersession is recorded, once' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists twin_observation_guard on civicos.twin_observation;
create trigger twin_observation_guard before update or delete on civicos.twin_observation
  for each row execute function civicos.twin_observation_guard();
drop trigger if exists twin_observation_no_truncate on civicos.twin_observation;
create trigger twin_observation_no_truncate before truncate on civicos.twin_observation
  for each statement execute function civicos.refuse_truncate();

-- ── Facility register ───────────────────────────────────────────────────
create table if not exists civicos.facility (
  id          text primary key,
  national_id text,
  owner_id    text not null,
  category    text not null,
  state       text not null,
  lng         double precision not null check (lng between -180 and 180),
  lat         double precision not null check (lat between -90 and 90),
  doc         jsonb not null,
  pos         bigserial,
  updated_at  timestamptz not null default now()
);
create index if not exists facility_lnglat on civicos.facility (lng, lat);
create index if not exists facility_owner on civicos.facility (owner_id);

-- ── Boundary versions ───────────────────────────────────────────────────
create table if not exists civicos.boundary_version (
  id         text primary key,
  iso3       text not null,
  level      smallint not null check (level in (1, 2)),
  n          integer not null,
  state      text not null,
  valid_from date not null,
  sha256     text not null,
  doc        jsonb not null,
  pos        bigserial,
  updated_at timestamptz not null default now()
);

create table if not exists civicos.boundary_unit (
  version_id text not null references civicos.boundary_version (id),
  ord        integer not null,
  code       text not null,
  name       text not null,
  parent     text,
  lng        double precision,
  lat        double precision,
  min_lng    double precision,
  min_lat    double precision,
  max_lng    double precision,
  max_lat    double precision,
  geometry   jsonb not null,
  unit       jsonb not null,
  primary key (version_id, ord)
);
create index if not exists boundary_unit_bbox on civicos.boundary_unit (min_lng, min_lat, max_lng, max_lat);

-- ── Outbox ──────────────────────────────────────────────────────────────
create table if not exists civicos.outbox (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  instance  text not null,
  topic     text not null,
  record_id text,
  payload   jsonb not null
);
create index if not exists outbox_at on civicos.outbox (at);

-- ── PostGIS, where the database has it ──────────────────────────────────
do $postgis$
begin
  if exists (select 1 from pg_available_extensions where name = 'postgis') then
    execute 'create extension if not exists postgis';
    execute 'alter table civicos.facility add column if not exists geog geography(Point, 4326)
               generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored';
    execute 'create index if not exists facility_geog on civicos.facility using gist (geog)';
    execute 'alter table civicos.twin_entity add column if not exists geog geography(Point, 4326)
               generated always as (case when lng is null or lat is null then null
                                         else st_setsrid(st_makepoint(lng, lat), 4326)::geography end) stored';
    execute 'create index if not exists twin_entity_geog on civicos.twin_entity using gist (geog)';
    execute 'alter table civicos.boundary_unit add column if not exists valid_as_loaded boolean
               generated always as (st_isvalid(st_setsrid(st_geomfromgeojson(geometry::text), 4326))) stored';
    execute 'alter table civicos.boundary_unit add column if not exists geom geometry(MultiPolygon, 4326)
               generated always as (st_multi(st_collectionextract(st_makevalid(st_setsrid(st_geomfromgeojson(geometry::text), 4326)), 3))) stored';
    if not exists (select 1 from pg_constraint where conname = 'boundary_unit_geom_valid') then
      execute 'alter table civicos.boundary_unit add constraint boundary_unit_geom_valid check (st_isvalid(geom))';
    end if;
    execute 'create index if not exists boundary_unit_geom on civicos.boundary_unit using gist (geom)';
  end if;
end
$postgis$;

-- ── Access: the service role (substrate) or the owner only ──────────────
do $access$
declare
  t text;
begin
  foreach t in array array['platform_state', 'platform_state_lease', 'record_counter', 'audit_entry', 'twin_entity', 'twin_key',
                           'twin_source', 'twin_run', 'twin_observation', 'facility', 'boundary_version', 'boundary_unit', 'outbox'] loop
    execute format('alter table civicos.%I enable row level security', t);
    execute format('revoke all on civicos.%I from public', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on civicos.%I from anon', t); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on civicos.%I from authenticated', t); end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant all on civicos.%I to service_role', t); end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant usage on all sequences in schema civicos to service_role';
  end if;
end
$access$;
`;

export const DOCS_MIGRATION = '20261021000000_civicos_record_docs.sql';

export const DOCS_SCHEMA = String.raw`-- 20261021000000_civicos_record_docs.sql
--
-- Per-record documents for every store without a typed table (architecture
-- review R6, D1/D2, C2; register 1.1): the nation profile and ministries, the
-- platform officials, the Update Center, the public sites, the twin's
-- scenarios and metric definitions, the event outbox, the signed audit heads
-- and the other __civicos* stores. With CIVICOS_STATE=postgres the
-- application server writes each changed record through, in the same
-- transaction as its audit entry and an outbox row, and follows the other
-- instances through civicos.outbox (app/src/lib/data/repo/documents.ts and
-- postgres.ts). The whole-store snapshots in civicos.platform_state are then
-- only read once, to import an installation that moves from file or
-- supabase state.
--
--   record_doc   one row per record: the store's key, the record's path
--                inside the store (a JSON array of steps), its kind (value,
--                object, map, list: a list row holds its items' ids in
--                order), the record as jsonb and a version that every write
--                must name (optimistic concurrency; two instances that change
--                the same record are merged by the application)
--   record_item  the records that are items of a list (a permit, a release,
--                an account …) with their list and id, for queries
--
-- Only the service role (on the substrate) or the database owner may use it.

create schema if not exists civicos;

create table if not exists civicos.record_doc (
  store      text not null check (store ~ '^__civicos[A-Za-z0-9_]*$'),
  path       text not null check (path ~ '^\['),
  kind       text not null check (kind in ('value', 'object', 'map', 'list')),
  doc        jsonb not null,
  version    bigint not null check (version > 0),
  pos        bigserial,
  instance   text,
  updated_at timestamptz not null default now(),
  primary key (store, path)
);
create index if not exists record_doc_updated on civicos.record_doc (updated_at);

create or replace view civicos.record_item with (security_invoker = true) as
  select store,
         (path::jsonb - -1)::text as list,
         path::jsonb -> -1 ->> 1  as id,
         doc,
         version,
         updated_at
  from civicos.record_doc
  where kind = 'value' and path::jsonb -> -1 ->> 0 = 'i';

-- ── Access: the service role (substrate) or the owner only ──────────────
do $access$
begin
  alter table civicos.record_doc enable row level security;
  revoke all on civicos.record_doc from public;
  revoke all on civicos.record_item from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on civicos.record_doc from anon;
    revoke all on civicos.record_item from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on civicos.record_doc from authenticated;
    revoke all on civicos.record_item from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on civicos.record_doc to service_role;
    grant select on civicos.record_item to service_role;
    grant usage on all sequences in schema civicos to service_role;
  end if;
end
$access$;
`;

export const PARCELS_MIGRATION = '20261023000000_civicos_parcels.sql';

export const PARCELS_SCHEMA = String.raw`-- 20261023000000_civicos_parcels.sql
--
-- The land parcel register (the nation's cadastre; docs/PARCEL_REGISTER.md,
-- register 16.25) as a per-record table, beside the facility register and
-- the boundary versions of 20261020000000_civicos_records.sql. The
-- application server keeps the parcels in memory as its read model and
-- writes every change through, in order, inside one transaction per batch
-- with its audit entry and an outbox row (app/src/lib/data/repo/postgres.ts,
-- CIVICOS_STATE=postgres). The outbox row names only the parcel and its
-- state: a parcel's rights and holders are personal data and stay in this
-- table.
--
--   parcel   one row per parcel record (PCL-nnnnnn): the national parcel id,
--            state, land use, region and district (from the map), the area
--            computed by the platform, the bounding box, the outline as
--            GeoJSON and the whole record (with its rights and versions)
--
-- Geometry: with PostGIS available, a generated geometry(MultiPolygon, 4326)
-- column (made valid, the validity of the outline as loaded kept) with a GiST
-- index; without it, the bounding box columns with a btree index, and the
-- platform's own checks (lib/geo/parcel-geometry.ts) stay the only geometry
-- checks. Only the service role (on the substrate) or the database owner may
-- use it.

create schema if not exists civicos;

create table if not exists civicos.parcel (
  id            text primary key check (id ~ '^PCL-[0-9]+$'),
  parcel_id     text not null,
  state         text not null check (state in ('proposed', 'published', 'withdrawn')),
  land_use      text not null,
  region_code   text,
  district_code text,
  area_m2       double precision not null check (area_m2 > 0),
  min_lng       double precision not null check (min_lng between -180 and 180),
  min_lat       double precision not null check (min_lat between -90 and 90),
  max_lng       double precision not null check (max_lng between -180 and 180),
  max_lat       double precision not null check (max_lat between -90 and 90),
  geometry      jsonb not null,
  doc           jsonb not null,
  pos           bigserial,
  updated_at    timestamptz not null default now()
);
create index if not exists parcel_bbox on civicos.parcel (min_lng, min_lat, max_lng, max_lat);
create index if not exists parcel_parcel_id on civicos.parcel (upper(parcel_id));
create index if not exists parcel_place on civicos.parcel (region_code, district_code);

-- ── PostGIS, where the database has it ──────────────────────────────────
do $postgis$
begin
  if exists (select 1 from pg_available_extensions where name = 'postgis') then
    execute 'create extension if not exists postgis';
    execute 'alter table civicos.parcel add column if not exists valid_as_loaded boolean
               generated always as (st_isvalid(st_setsrid(st_geomfromgeojson(geometry::text), 4326))) stored';
    execute 'alter table civicos.parcel add column if not exists geom geometry(MultiPolygon, 4326)
               generated always as (st_multi(st_collectionextract(st_makevalid(st_setsrid(st_geomfromgeojson(geometry::text), 4326)), 3))) stored';
    if not exists (select 1 from pg_constraint where conname = 'parcel_geom_valid') then
      execute 'alter table civicos.parcel add constraint parcel_geom_valid check (st_isvalid(geom))';
    end if;
    execute 'create index if not exists parcel_geom on civicos.parcel using gist (geom)';
  end if;
end
$postgis$;

-- ── Access: the service role (substrate) or the owner only ──────────────
do $access$
begin
  alter table civicos.parcel enable row level security;
  revoke all on civicos.parcel from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on civicos.parcel from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on civicos.parcel from authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on civicos.parcel to service_role;
    grant usage on all sequences in schema civicos to service_role;
  end if;
end
$access$;
`;

export const LIMITS_MIGRATION = '20261026000000_civicos_rate_limits.sql';
export const LIMITS_SCHEMA = String.raw`-- 20261026000000_civicos_rate_limits.sql
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
`;

export const CRON_LEASE_MIGRATION = '20261027000000_civicos_cron_lease.sql';
export const CRON_LEASE_SCHEMA = String.raw`-- 20261027000000_civicos_cron_lease.sql
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
`;
