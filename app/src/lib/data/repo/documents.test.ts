// Per-record documents (./documents.ts): how a store is cut into records, read
// back, changed in place and merged when two instances changed it at once.
// No database here; postgres.integration.test.ts writes them through.
import { describe, it, expect } from 'vitest';
import { applyRow, build, canon, counterFields, decompose, diff, isCounterPath, merge3, mergeAt, normalise, pathOf, removeAt, replaceInPlace, rowAt, segsOf, type Known, type Seg } from './documents';
import { encode } from '@/lib/data/encode';

const store = () => ({
  sovereign: { stateName: 'Meridia', languages: ['en', 'fr'] },
  permits: [{ id: 'PM-1', status: 'in-review', timeline: [{ at: 't1' }] }, { id: 'PM-2', status: 'granted' }],
  ministryQueues: { 'min-health': [{ id: 'Q-1', title: 'A' }], 'min-works': [] as { id: string }[] },
  sites: new Map([['health', { siteId: 'health', mode: 'link' }]]),
  seenAt: new Date('2026-10-01T00:00:00Z'),
  audit: [{ seq: 1 }],
  seq: 7,
  requestSeq: 3,
});
const asKnown = (rows: Map<string, { kind: Known['kind']; json: string }>) => new Map([...rows].map(([p, r]) => [p, { ...r, version: 1 }]));
const P = (...segs: Seg[]) => pathOf(segs);

describe('per-record documents', () => {
  it('cuts a store into its records: containers, list orders and one record per item', () => {
    const rows = decompose(store(), new Set(['audit']));
    expect(rows.get(P())).toEqual({ kind: 'object', json: '{}' });
    expect(rows.get(P(['k', 'permits']))).toEqual({ kind: 'list', json: '["PM-1","PM-2"]' });
    expect(JSON.parse(rows.get(P(['k', 'permits'], ['i', 'PM-1']))!.json)).toEqual({ id: 'PM-1', status: 'in-review', timeline: [{ at: 't1' }] });
    expect(rows.get(P(['k', 'sovereign'], ['k', 'stateName']))).toEqual({ kind: 'value', json: '"Meridia"' });
    expect(rows.get(P(['k', 'ministryQueues'], ['k', 'min-health']))!.kind).toBe('list');
    expect(rows.get(P(['k', 'ministryQueues'], ['k', 'min-works']))).toEqual({ kind: 'value', json: '[]' });
    expect(rows.get(P(['k', 'sites']))!.kind).toBe('map');
    expect(rows.get(P(['k', 'sites'], ['m', 'health']))!.kind).toBe('object');
    expect(rows.get(P(['k', 'seenAt']))).toEqual({ kind: 'value', json: encode(new Date('2026-10-01T00:00:00Z')) });
    expect(rows.has(P(['k', 'audit']))).toBe(false); // kept in its own table
    expect(rows.get(P(['k', 'seq']))).toEqual({ kind: 'value', json: '7' });
  });

  it('reads a store back from its records, in any order, with Maps and Dates', () => {
    const s = store();
    const rows = [...decompose(s, new Set(['audit']))].map(([path, r]) => ({ path, ...r })).reverse();
    const { audit: _a, ...rest } = s;
    expect(build(rows)).toEqual(rest);
  });

  it('finds what changed, removed records included, parents first', () => {
    const s = store();
    const known = asKnown(decompose(s));
    s.permits[0]!.status = 'granted';
    s.permits.push({ id: 'PM-3', status: 'submitted' });
    delete (s.sovereign as Partial<typeof s.sovereign>).languages;
    const changes = diff(decompose(s), known);
    expect(changes.map(c => [c.path, c.json === null ? 'removed' : 'written', c.expected])).toEqual([
      [P(['k', 'permits']), 'written', 1],
      [P(['k', 'permits'], ['i', 'PM-1']), 'written', 1],
      [P(['k', 'permits'], ['i', 'PM-3']), 'written', 0],
      [P(['k', 'sovereign'], ['k', 'languages']), 'removed', 1],
    ]);
    expect(changes[1]!.base).toBe(known.get(P(['k', 'permits'], ['i', 'PM-1']))!.json);
    expect(diff(decompose(s), asKnown(decompose(s)))).toEqual([]);
  });

  it('applies another instance\'s records in place, keeping the objects modules hold', () => {
    const s = store();
    const permits = s.permits, sites = s.sites;
    const out = applyRow(s, segsOf(P(['k', 'permits'], ['i', 'PM-2'])), { kind: 'value', json: '{"id":"PM-2","status":"revoked"}' });
    expect(out).toBe(s);
    expect(s.permits).toBe(permits);
    expect(s.permits[1]).toEqual({ id: 'PM-2', status: 'revoked' });
    applyRow(s, segsOf(P(['k', 'permits'], ['i', 'PM-9'])), { kind: 'value', json: '{"id":"PM-9","status":"submitted"}' });
    applyRow(s, segsOf(P(['k', 'permits'])), { kind: 'list', json: '["PM-9","PM-1","PM-2"]' });
    expect(s.permits.map(p => p.id)).toEqual(['PM-9', 'PM-1', 'PM-2']);
    applyRow(s, segsOf(P(['k', 'sites'], ['m', 'treasury'], ['k', 'mode'])), { kind: 'value', json: '"embed"' });
    expect(s.sites).toBe(sites);
    expect(s.sites.get('treasury')).toEqual({ mode: 'embed' });
    removeAt(s, segsOf(P(['k', 'permits'], ['i', 'PM-1'])));
    expect(s.permits.map(p => p.id)).toEqual(['PM-9', 'PM-2']);
    expect(rowAt(s, segsOf(P(['k', 'permits'], ['i', 'PM-1'])))).toBeUndefined();
    expect(rowAt(s, segsOf(P(['k', 'permits'], ['i', 'PM-9'])))).toEqual({ kind: 'value', json: '{"id":"PM-9","status":"submitted"}' });
  });

  it('replaces a store\'s contents in place, leaving the fields kept elsewhere', () => {
    const live: Record<string, unknown> = { a: 1, stale: true, audit: [1, 2] };
    const out = replaceInPlace(live, { a: 2, b: 3 }, new Set(['audit']));
    expect(out).toBe(live);
    expect(live).toEqual({ a: 2, b: 3, audit: [1, 2] });
    const m = new Map([['x', 1]]);
    expect(replaceInPlace(m, new Map([['y', 2]]))).toBe(m);
    expect([...m]).toEqual([['y', 2]]);
  });

  it('replaces only what jsonb refuses (NUL, half a surrogate pair), never an escaped backslash', () => {
    const rows = decompose({ a: 'x\u0000y', b: 'half \ud800 pair', c: 'whole 😀', d: '\\ud800 and \\u0000 typed out' });
    const v = (k: string) => JSON.parse(rows.get(P(['k', k]))!.json) as string;
    expect(v('a')).toBe('x�y');
    expect(v('b')).toBe('half � pair');
    expect(v('c')).toBe('whole 😀');
    expect(v('d')).toBe('\\ud800 and \\u0000 typed out');
  });

  it('reads jsonb\'s own key order and spacing back as this instance encodes it', () => {
    expect(normalise({ kind: 'value', json: '{"b": 1, "a": {"$date": "2026-10-01T00:00:00.000Z"}}' })).toEqual({ kind: 'value', json: '{"b":1,"a":{"$date":"2026-10-01T00:00:00.000Z"}}' });
    expect(normalise({ kind: 'list', json: '["a", "b"]' })).toEqual({ kind: 'list', json: '["a","b"]' });
    expect(canon({ b: 1, a: [1, { d: 2, c: 1 }] })).toBe(canon({ a: [1, { c: 1, d: 2 }], b: 1 }));
  });

  it('merges two changes of one record, keeping both where they do not touch', () => {
    const base = { id: 'R-1', state: 'proposed', notes: ['a'], approvals: [{ id: 'A1', by: 'x' }] };
    const ours = { ...base, state: 'approved', approvals: [...base.approvals, { id: 'A2', by: 'y' }] };
    const theirs = { ...base, notes: ['a', 'b'], approvals: [...base.approvals, { id: 'A3', by: 'z' }] };
    expect(merge3(base, ours, theirs)).toEqual({ value: { id: 'R-1', state: 'approved', notes: ['a', 'b'], approvals: [{ id: 'A1', by: 'x' }, { id: 'A3', by: 'z' }, { id: 'A2', by: 'y' }] }, conflicts: 0 });
    // Both changed one value differently: the later writer's, counted.
    expect(merge3({ v: 1 }, { v: 2 }, { v: 3 })).toEqual({ value: { v: 2 }, conflicts: 1 });
    // A removal on one side and no change on the other removes it.
    expect(merge3({ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2, c: 3 })).toEqual({ value: { a: 1, c: 3 }, conflicts: 0 });
    // Items put first by this side stay first (newest-first lists).
    expect(merge3(['b'], ['n', 'b'], ['b', 't']).value).toEqual(['n', 'b', 't']);
  });

  it('keeps a store\'s record counters at the highest number, never as a conflict', () => {
    expect(counterFields({ seq: 4, requestSeq: 9, sequence: 1, mediaSeq: 'x' })).toEqual(['seq', 'requestSeq']);
    expect(isCounterPath(segsOf(P(['k', 'seq'])))).toBe(true);
    expect(isCounterPath(segsOf(P(['k', 'policy'], ['k', 'seq'])))).toBe(false);
    expect(mergeAt(segsOf(P(['k', 'seq'])), 10, 14, 12)).toEqual({ value: 14, conflicts: 0 });
    expect(mergeAt(segsOf(P(['k', 'other'])), 10, 14, 12)).toEqual({ value: 14, conflicts: 1 });
  });
});
