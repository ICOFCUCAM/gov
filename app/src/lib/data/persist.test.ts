import { describe, it, expect, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { encode, decode, fileAdapter, restore, flush, SNAPSHOT_FORMAT } from './persist';

const g = globalThis as unknown as Record<string, unknown> & { __persistLast?: Map<string, string> };

describe('durable platform state', () => {
  afterEach(() => { delete g.__civicosTestA; delete g.__civicosTestB; g.__persistLast = undefined; });

  it('keeps Maps, Sets and Dates through a snapshot', () => {
    const v = { m: new Map([['police', { mode: 'link' }]]), s: new Set(['a']), d: new Date('2026-10-17T00:00:00Z'), n: [1, { x: 'y' }] };
    const back = decode(encode(v)) as typeof v;
    expect(back.m.get('police')).toEqual({ mode: 'link' });
    expect(back.s.has('a')).toBe(true);
    expect(back.d.toISOString()).toBe('2026-10-17T00:00:00.000Z');
    expect(back.n).toEqual([1, { x: 'y' }]);
  });

  it('saves changed stores to files atomically and restores them, never over a live store', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'civicos-state-'));
    const a = fileAdapter(dir);
    g.__civicosTestA = { nation: 'Meridia', sites: new Map([['health', 1]]) };
    expect(await flush(a)).toContain('__civicosTestA');
    expect(await flush(a)).not.toContain('__civicosTestA'); // unchanged: not written again
    (g.__civicosTestA as { nation: string }).nation = 'Republic of Meridia';
    expect(await flush(a)).toContain('__civicosTestA');
    expect((await fs.readdir(dir)).filter(n => n.endsWith('.tmp'))).toEqual([]);

    const saved = await a.loadAll();
    delete g.__civicosTestA;
    g.__civicosTestB = 'live';
    const restored = restore({ ...saved, __civicosTestB: JSON.stringify({ v: SNAPSHOT_FORMAT, data: 'stale' }), notOurs: 'x' });
    expect(restored).toEqual(['__civicosTestA']);
    expect(g.__civicosTestA).toEqual({ nation: 'Republic of Meridia', sites: new Map([['health', 1]]) });
    expect(g.__civicosTestB).toBe('live');
  });

  it('skips snapshots it cannot read or from another format', () => {
    expect(restore({ __civicosTestA: '{broken', __civicosTestB: JSON.stringify({ v: 999, data: 1 }) })).toEqual([]);
    expect(g.__civicosTestA).toBeUndefined();
  });
});
