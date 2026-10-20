import { describe, it, expect, beforeEach } from 'vitest';
import { registerSource, runSource, signalFor, resetTwin, syncRegister, regionEntities, kindOf } from './register';
import { setSovereign } from '@/lib/data/store';

describe('observation provenance (design §9)', () => {
  beforeEach(async () => { resetTwin(); setSovereign({ regions: ['North', 'South'] }, 'test'); await syncRegister(); });

  it('keeps an administrative count\'s lineage and shows it as a record', async () => {
    const s = registerSource({ by: 'Registrar', name: 'Civil register counts', publisher: 'Civil Registry', kind: 'csv-upload', mapping: { entity: 'region', value: 'count', metric: { fixed: 'births.registered' }, date: { column: 'month' } } });
    if ('error' in s) throw new Error(s.error);
    const sha = 'a'.repeat(64);
    const csv = `region,count,month,records_count,records_sha256\nNorth,3,2026-09,3,${sha}\nSouth,2,2026-09,2,\n`;
    const run = await runSource(s.id, { by: 'Registrar', csv, lineage: { method: 'administrative-count', query: 'civil:birth:month,region' } });
    if ('error' in run) throw new Error(run.error);
    expect(run).toMatchObject({ accepted: 1, status: 'partial' });
    expect(run.rejected[0]!.reason).toMatch(/SHA-256/);
    const north = regionEntities().find(e => e.name === 'North')!;
    expect(signalFor(north.id, 'births.registered')).toMatchObject({ value: 3, kind: 'record' });
    expect(kindOf({ method: 'estimate' })).toBe('modelled');
    expect(kindOf({})).toBe('observed');
  });
});
