import { describe, it, expect, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { encode, decode, fileAdapter, restore, flush, SNAPSHOT_FORMAT, StateConflictError, startFromEnv, stateWritable } from './persist';

const g = globalThis as unknown as Record<string, unknown> & { __persistLast?: Map<string, string>; __persistStatus?: unknown; __persistVersions?: unknown };

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

describe('one writer', () => {
  afterEach(() => { delete g.__civicosTestA; g.__persistLast = undefined; g.__persistVersions = undefined; });
  const tmp = () => fs.mkdtemp(path.join(os.tmpdir(), 'civicos-lease-'));

  it('gives the lease to one server at a time, renews it for its holder and lets it go on release', async () => {
    const a = fileAdapter(await tmp());
    expect((await a.lease!('writer-1', 30_000)).acquired).toBe(true);
    expect(await a.lease!('writer-2', 30_000)).toMatchObject({ acquired: false, holder: 'writer-1' });
    expect((await a.lease!('writer-1', 30_000)).acquired).toBe(true); // heartbeat
    await a.release!('writer-2'); // not the holder: nothing happens
    expect((await a.lease!('writer-2', 30_000)).acquired).toBe(false);
    await a.release!('writer-1');
    expect((await a.lease!('writer-2', 30_000)).acquired).toBe(true);
    a.releaseSync!('writer-1'); // not the holder
    expect((await a.lease!('writer-3', 30_000)).acquired).toBe(false);
    a.releaseSync!('writer-2'); // as the process exits
    expect((await a.lease!('writer-3', 30_000)).acquired).toBe(true);
  });

  it('takes over a lease whose holder stopped renewing it', async () => {
    const a = fileAdapter(await tmp());
    expect((await a.lease!('writer-1', 1)).acquired).toBe(true);
    await new Promise(r => setTimeout(r, 10));
    expect(await a.lease!('writer-2', 30_000)).toMatchObject({ acquired: true, holder: 'writer-2' });
  });

  it('refuses a save over a newer version, and a save from a server without the lease', async () => {
    const a = fileAdapter(await tmp());
    await a.lease!('writer-1', 30_000);
    expect(await a.save('__civicosTestA', '{"v":1,"data":1}', { writer: 'writer-1', expected: 0 })).toBe(1);
    expect(await a.save('__civicosTestA', '{"v":1,"data":2}', { writer: 'writer-1', expected: 1 })).toBe(2);
    await expect(a.save('__civicosTestA', '{"v":1,"data":3}', { writer: 'writer-1', expected: 1 })).rejects.toBeInstanceOf(StateConflictError);
    await expect(a.save('__civicosTestA', '{"v":1,"data":3}', { writer: 'writer-2', expected: 2 })).rejects.toBeInstanceOf(StateConflictError);
    expect(await a.versions!()).toEqual({ __civicosTestA: 2 });
    expect(JSON.parse(String((await a.loadAll()).__civicosTestA)).data).toBe(2);
  });

  it('stops a flush at a conflict instead of overwriting', async () => {
    const a = fileAdapter(await tmp());
    await a.lease!('writer-1', 30_000);
    await a.save('__civicosTestA', '{"v":1,"data":"theirs"}', { writer: 'writer-1', expected: 0 }); // saved by an earlier life
    g.__civicosTestA = 'mine';
    await expect(flush(a, new Date(), 'writer-1')).rejects.toBeInstanceOf(StateConflictError);
    expect(JSON.parse(String((await a.loadAll()).__civicosTestA)).data).toBe('theirs');
  });

  it('makes a second server on the same state a standby that saves nothing and refuses changes', async () => {
    const dir = await tmp();
    await fileAdapter(dir).lease!('other-server', 60_000);
    const before = g.__persistStatus;
    try {
      const s = await startFromEnv({ CIVICOS_STATE: 'file', CIVICOS_STATE_DIR: dir, CIVICOS_STATE_LEASE_WAIT_MS: '0' } as unknown as NodeJS.ProcessEnv);
      expect(s).toMatchObject({ adapter: 'file', role: 'standby', fencing: 'lease+version', lease: { holder: 'other-server' } });
      expect(stateWritable()).toBe(false);
    } finally {
      g.__persistStatus = before;
    }
  });
});

describe('quiet save ticks (review D2)', () => {
  it('skips encoding while nothing is audited, until the full sweep is due', async () => {
    const { flush, quietSince, markChanged } = await import('./persist');
    const { recordAudit } = await import('./store');
    const adapter = { name: 'memory', save: async () => 1, load: async () => ({}) } as never;
    await flush(adapter, new Date(1_000_000));
    expect(quietSince(1_005_000, 60_000)).toBe(true);
    // An audited change ends the quiet.
    recordAudit('Officer A', 'test.change', 'Test:1', 'ok');
    expect(quietSince(1_005_000, 60_000)).toBe(false);
    await flush(adapter, new Date(1_006_000));
    expect(quietSince(1_010_000, 60_000)).toBe(true);
    // An unaudited change is caught by the sweep at the latest.
    expect(quietSince(1_006_000 + 61_000, 60_000)).toBe(false);
    markChanged();
    expect(quietSince(1_010_000, 60_000)).toBe(false);
  });
});
