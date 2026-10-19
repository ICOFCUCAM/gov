-- 20261023000000_civicos_parcels.sql
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
