// The per-record tables of the postgres backend (architecture review R6),
// identical to app/supabase/migrations/20261020000000_civicos_records.sql
// (postgres-schema.test.ts holds them equal). The backend applies it at start
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
