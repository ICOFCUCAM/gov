// The postgres backend's parts that need no database: snapshots leave the
// record fields out, a standby accepts only record changes, and with every
// store in the record tables any server takes any change and saves no snapshot.
import { describe, it, expect, afterEach } from 'vitest';
import { RECORD_FIELDS } from './postgres';
import { flush, keepOutOfSnapshot, stateWritable, RECORD_ROUTES, type StateAdapter } from '@/lib/data/persist';

const g = globalThis as unknown as Record<string, unknown> & { __persistStatus?: unknown; __persistRecords?: unknown; __persistExcluded?: unknown; __persistLast?: unknown };

describe('snapshots beside the record tables', () => {
  afterEach(() => { delete g.__civicosTestRecords; g.__persistExcluded = undefined; g.__persistLast = undefined; g.__persistStatus = undefined; g.__persistRecords = undefined; });

  it('leaves the fields kept in tables out of every snapshot', async () => {
    const saved: Record<string, string> = {};
    const adapter: StateAdapter = { name: 'postgres', loadAll: async () => ({}), save: async (k, j) => { saved[k] = j; } };
    g.__civicosTestRecords = { audit: [{ seq: 1 }], sovereign: { stateName: 'Meridia' } };
    keepOutOfSnapshot({ __civicosTestRecords: ['audit'] });
    await flush(adapter);
    const data = (JSON.parse(saved.__civicosTestRecords!) as { data: Record<string, unknown> }).data;
    expect(data).toEqual({ sovereign: { stateName: 'Meridia' } });
    expect((g.__civicosTestRecords as { audit: unknown[] }).audit).toHaveLength(1);
  });

  it('names every ported field', () => {
    expect(RECORD_FIELDS).toEqual({
      __civicos: ['audit'],
      __civicosTwin: ['entities', 'keys', 'sources', 'runs', 'observations'],
      __civicosTwinArchive: ['observations', 'runs'],
      __civicosFacilities: ['facilities'],
      __civicosBoundaries: ['versions'],
    });
  });

  it('lets a standby take record changes only, and only in postgres mode', () => {
    g.__persistStatus = { adapter: 'postgres', role: 'standby', restored: [], saves: 0, startedAt: '' };
    expect(stateWritable('/api/facilities/FAC-00001')).toBe(false);
    g.__persistRecords = { status: () => ({}) };
    expect(stateWritable('/api/facilities/FAC-00001')).toBe(true);
    expect(stateWritable('/api/boundaries/bnd-0001')).toBe(true);
    expect(stateWritable('/api/twin/runs/RUN-3/withdraw')).toBe(true);
    expect(stateWritable('/api/twin/keys')).toBe(true);
    expect(stateWritable('/api/sovereign')).toBe(false);
    expect(stateWritable('/api/twin/sources')).toBe(false);
    expect(stateWritable()).toBe(false);
    expect(RECORD_ROUTES.some(re => re.test('/api/facilities/FAC-1/extra'))).toBe(false);
    g.__persistStatus = { adapter: 'postgres', role: 'writer', restored: [], saves: 0, startedAt: '' };
    expect(stateWritable('/api/sovereign')).toBe(true);
  });

  it('with every store in the record tables, a server without the lease takes every change and saves no snapshot', async () => {
    g.__persistStatus = { adapter: 'postgres', role: 'standby', restored: [], saves: 0, startedAt: '' };
    g.__persistRecords = { status: () => ({}), ownsAll: true, owns: (k: string) => k.startsWith('__civicos') };
    expect(stateWritable('/api/sovereign')).toBe(true);
    expect(stateWritable()).toBe(true);
    g.__persistStatus = { adapter: 'postgres', role: 'writer', restored: [], saves: 0, startedAt: '' };
    const saved: string[] = [];
    g.__civicosTestRecords = { sovereign: { stateName: 'Meridia' } };
    await flush({ name: 'postgres', loadAll: async () => ({}), save: async k => { saved.push(k); } });
    expect(saved).toEqual([]);
  });
});
