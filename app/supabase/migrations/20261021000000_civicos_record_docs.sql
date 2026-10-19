-- 20261021000000_civicos_record_docs.sql
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
