import { describe, it, expect, beforeEach } from 'vitest';
import { recordAccess, verifyAccessLog, listAccess, pruneAccessLog, resetAccessLog, unusualAccess } from './access-log';

const by = { id: 'local:a', name: 'A. Officer', institution: 'civil' };

describe('access log', () => {
  beforeEach(() => resetAccessLog());

  it('chains every entry and shows tampering', () => {
    recordAccess({ by, record: { register: 'cases', id: 'C-1' }, action: 'view', result: 'allowed' });
    recordAccess({ by, record: { register: 'cases', id: 'C-2' }, action: 'view', purpose: 'Audit', result: 'refused', rule: 'Say why' });
    expect(verifyAccessLog()).toEqual({ ok: true, entries: 2 });
    const e = listAccess({ recordId: 'C-1' })[0]!;
    expect(e).toMatchObject({ seq: 1, action: 'view', record: { register: 'cases', id: 'C-1' } });
    (globalThis as unknown as { __civicosAccessLog: { entries: { purpose?: string }[] } }).__civicosAccessLog.entries[0]!.purpose = 'changed';
    expect(verifyAccessLog()).toMatchObject({ ok: false, brokenAt: 1 });
  });

  it('lists newest first with filters, and holds no record content', () => {
    for (let i = 0; i < 3; i++) recordAccess({ by, record: { register: 'civil', id: `P-${i}` }, action: 'view', result: 'allowed' });
    recordAccess({ by: { name: 'B' }, record: { register: 'civil', query: 'name=Ade' }, action: 'search', result: 'allowed' });
    expect(listAccess().map(e => e.seq)).toEqual([4, 3, 2, 1]);
    expect(listAccess({ action: 'search' })[0]!.record).toEqual({ register: 'civil', query: 'name=Ade' });
    expect(listAccess({ by: 'local:a', limit: 2 })).toHaveLength(2);
  });

  it('is shortened only by retention, keeping the chain checkable', () => {
    recordAccess({ by, record: { register: 'cases', id: 'old' }, action: 'view', result: 'allowed' }, new Date('2020-01-01T10:00:00Z'));
    recordAccess({ by, record: { register: 'cases', id: 'new' }, action: 'view', result: 'allowed' }, new Date('2026-01-01T10:00:00Z'));
    expect(pruneAccessLog('2025-01-01')).toEqual({ removed: 1 });
    expect(verifyAccessLog()).toEqual({ ok: true, entries: 1 });
    expect(recordAccess({ by, record: { register: 'cases', id: 'x' }, action: 'view', result: 'allowed' }).seq).toBe(3);
  });

  it('points out unusual access for the data-protection authority', () => {
    for (let i = 0; i < 5; i++) recordAccess({ by, record: { register: 'cases', id: `R-${i}` }, action: 'refused', result: 'refused' }, new Date('2026-01-01T23:00:00Z'));
    const u = unusualAccess('2025-12-31', { manyRecords: 5 });
    expect(u.map(x => x.reason).sort()).toEqual(['many different records', 'outside working hours', 'repeatedly refused']);
  });
});
