// The Supabase types generated from the migrations (scripts/db-types-lib.mjs)
// are current, read the SQL the migrations use, and agree with the
// hand-written row shapes in ./types.ts (their column names; a drift in either
// fails the type check of this file).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
// @ts-expect-error plain ES module script
import { generate, replay, statements } from '../../../scripts/db-types-lib.mjs';
import type { Database, Tables, TablesInsert, Enums, Views } from './types.generated';
import type * as Hand from './types';

const APP = path.resolve(__dirname, '../../..');

// Column names of the hand-written rows equal the generated ones (checked by tsc).
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Cols<T extends keyof Database['civicos']['Tables']> = keyof Tables<T>;
const agree: Record<string, true> = {
  institutions: true as Same<keyof Hand.InstitutionRow, Cols<'institutions'>>,
  citizens: true as Same<keyof Hand.CitizenRow, Cols<'citizens'>>,
  workItems: true as Same<keyof Hand.WorkItemRow, Cols<'work_items'>>,
  directives: true as Same<keyof Hand.DirectiveRow, Cols<'directives'>>,
  dispatches: true as Same<keyof Hand.DispatchRow, Cols<'dispatches'>>,
  escalations: true as Same<keyof Hand.EscalationRow, Cols<'escalations'>>,
  appeals: true as Same<keyof Hand.AppealRow, Cols<'appeals'>>,
};
// The tables the platform's own server writes (lib/data/repo/postgres.ts).
const doc: Tables<'record_doc'> = { store: '__civicos', path: '[]', kind: 'object', doc: {}, version: 1, pos: 1, instance: null, updated_at: '2026-10-19T00:00:00Z' };
const insert: TablesInsert<'record_doc'> = { store: '__civicos', path: '[]', kind: 'object', doc: {}, version: 1 };
const posture: Enums<'posture'> = 'steady';
const officer: Views<'civicos_officers'>['signing_public_key'] = null;

describe('generated Supabase types', () => {
  it('match the migrations (run `npm run build:db-types` after adding one)', async () => {
    const file = readFileSync(path.join(APP, 'src/lib/db/types.generated.ts'), 'utf8');
    expect(file).toBe(await generate(APP));
    expect(Object.values(agree).every(Boolean)).toBe(true);
    expect([doc.kind, insert.kind, posture, officer]).toEqual(['object', 'object', 'steady', null]);
  });

  it('split SQL into statements past comments, quotes and function bodies', () => {
    const sql = `-- a comment; with a semicolon
      create table if not exists civicos.t (id text primary key, n int default 0, note text);
      create or replace function civicos.f(p_a text, p_b int default 1) returns civicos.t language plpgsql as $f$
      begin create table civicos.inside (x int); return null; end $f$;
      insert into civicos.t values ('a;b', 1);`;
    const st = statements(sql) as string[];
    expect(st).toHaveLength(3);
    expect(st[1]).toMatch(/\$body\$/);
    expect(st[1]).not.toMatch(/inside/);
  });

  it('replays tables, columns, enums, views and functions in migration order', () => {
    const db = replay([
      { file: '1.sql', sql: `create type civicos.mood as enum ('calm', 'busy');
        create table civicos.a (id uuid primary key default gen_random_uuid(), mood civicos.mood not null, tags text[], at timestamptz not null default now(), n bigserial);
        create view public.v with (security_invoker = true) as select x.id, x.mood as feeling, x.tags is not null as tagged, count(*) as c from civicos.a x;
        create function civicos.g(p_id uuid) returns table(id uuid, n bigint) language sql as $$ select 1 $$;` },
      { file: '2.sql', sql: `alter table civicos.a add column if not exists extra jsonb, drop column tags;
        alter table civicos.a rename column extra to meta;
        drop function if exists civicos.g(uuid);
        create or replace function civicos.h() returns void language sql as $$ select 1 $$;` },
    ]) as Record<string, { tables: Map<string, Map<string, { type: string; notNull: boolean; hasDefault: boolean }>>; views: Map<string, Map<string, { type: string }>>; functions: Map<string, unknown>; enums: Map<string, string[]> }>;
    const a = db.civicos!.tables.get('a')!;
    expect([...a.keys()]).toEqual(['id', 'mood', 'at', 'n', 'meta']);
    expect(a.get('id')).toMatchObject({ notNull: true, hasDefault: true });
    expect(a.get('n')).toMatchObject({ notNull: true, hasDefault: true });
    expect(db.civicos!.enums.get('mood')).toEqual(['calm', 'busy']);
    expect([...db.public!.views.get('v')!].map(([k, c]) => [k, c.type])).toEqual([['id', 'uuid'], ['feeling', 'civicos.mood'], ['tagged', 'boolean'], ['c', 'bigint']]);
    expect([...db.civicos!.functions.keys()]).toEqual(['h']);
  });
});
