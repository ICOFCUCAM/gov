// The records schema the postgres backend applies is the substrate's migration.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RECORDS_SCHEMA, RECORDS_MIGRATION, DOCS_SCHEMA, DOCS_MIGRATION, PARCELS_SCHEMA, PARCELS_MIGRATION, LIMITS_SCHEMA, LIMITS_MIGRATION, CRON_LEASE_SCHEMA, CRON_LEASE_MIGRATION } from './postgres-schema';

const migration = (name: string) => readFileSync(path.join(__dirname, '../../../../supabase/migrations', name), 'utf8');

describe('the records schema', () => {
  it('is exactly the migrations the substrate applies', () => {
    expect(migration(RECORDS_MIGRATION)).toBe(RECORDS_SCHEMA);
    expect(migration(DOCS_MIGRATION)).toBe(DOCS_SCHEMA);
    expect(migration(PARCELS_MIGRATION)).toBe(PARCELS_SCHEMA);
    expect(migration(LIMITS_MIGRATION)).toBe(LIMITS_SCHEMA);
    expect(migration(CRON_LEASE_MIGRATION)).toBe(CRON_LEASE_SCHEMA);
  });

  it('keeps parcels in a table with their box, a PostGIS multipolygon and GiST index where it can, closed to everyone but the service role', () => {
    expect(PARCELS_SCHEMA).toMatch(/create table if not exists civicos\.parcel/);
    expect(PARCELS_SCHEMA).toMatch(/parcel_bbox on civicos\.parcel \(min_lng, min_lat, max_lng, max_lat\)/);
    expect(PARCELS_SCHEMA).toMatch(/geometry\(MultiPolygon, 4326\)/);
    expect(PARCELS_SCHEMA).toMatch(/using gist \(geom\)/);
    expect(PARCELS_SCHEMA).toMatch(/alter table civicos\.parcel enable row level security/);
  });

  it('keeps the audit chain and observations append-only, bitemporal and indexed for as-of queries', () => {
    expect(RECORDS_SCHEMA).toMatch(/create trigger audit_entry_guard before insert or update or delete on civicos\.audit_entry/);
    expect(RECORDS_SCHEMA).toMatch(/valid\s+tstzrange not null/);
    expect(RECORDS_SCHEMA).toMatch(/twin_observation_asof on civicos\.twin_observation \(metric, entity_id, lower\(valid\)\)/);
    expect(RECORDS_SCHEMA).toMatch(/geography\(Point, 4326\)/);
    expect(RECORDS_SCHEMA).toMatch(/geometry\(MultiPolygon, 4326\)/);
    expect(RECORDS_SCHEMA).toMatch(/st_isvalid\(geom\)/);
    expect(RECORDS_SCHEMA).toMatch(/using gist \(geog\)/);
    expect(RECORDS_SCHEMA).toMatch(/create table if not exists civicos\.outbox/);
  });

  it('keeps every other store as versioned per-record documents, closed to everyone but the service role', () => {
    expect(DOCS_SCHEMA).toMatch(/create table if not exists civicos\.record_doc/);
    expect(DOCS_SCHEMA).toMatch(/primary key \(store, path\)/);
    expect(DOCS_SCHEMA).toMatch(/version\s+bigint not null check \(version > 0\)/);
    expect(DOCS_SCHEMA).toMatch(/alter table civicos\.record_doc enable row level security/);
    expect(DOCS_SCHEMA).toMatch(/with \(security_invoker = true\)/);
  });
});
