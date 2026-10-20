import { describe, it, expect, beforeEach } from 'vitest';
import { registerSource, runSource, stateAsOf, resetTwin, syncRegister, regionEntities, twinConflicts } from './register';
import { resolveConflict, resetConflicts } from './conflicts';
import { setSovereign } from '@/lib/data/store';

const src = (name: string) => {
  const s = registerSource({ by: 'Official', name, publisher: name, kind: 'csv-upload', mapping: { entity: 'region', value: 'v', metric: { fixed: 'population' }, date: { column: 'd' } } });
  if ('error' in s) throw new Error(s.error);
  return s.id;
};

describe('conflicts between sources', () => {
  beforeEach(async () => { resetTwin(); resetConflicts(); setSovereign({ regions: ['North'] }, 'test'); await syncRegister(); });

  it('lists two sources disagreeing on a date, and the official\'s choice stands', async () => {
    const a = src('Census office'), b = src('Health survey');
    await runSource(a, { by: 'O', csv: 'region,v,d\nNorth,1000,2026-01-01\n' });
    await runSource(b, { by: 'O', csv: 'region,v,d\nNorth,1200,2026-01-01\n' });
    const north = regionEntities()[0]!;
    const c = twinConflicts({ metric: 'population' });
    expect(c).toHaveLength(1);
    expect(c[0]!.values.map(v => v.value).sort()).toEqual([1000, 1200]);
    expect(stateAsOf({ metric: 'population', entityId: north.id })[0]!.value).toBe(1200);
    expect(resolveConflict({ entityId: north.id, metric: 'population', validFrom: '2026-01-01', chosenSource: 'nope', reason: 'x' }, c, 'Statistician')).toHaveProperty('error');
    expect(resolveConflict({ entityId: north.id, metric: 'population', validFrom: '2026-01-01', chosenSource: a, reason: 'The census is the official count' }, c, 'Statistician')).not.toHaveProperty('error');
    expect(stateAsOf({ metric: 'population', entityId: north.id })[0]!.value).toBe(1000);
    expect(twinConflicts({ metric: 'population' })[0]!.resolved?.chosenSource).toBe(a);
  });

  it('does not count one publisher\'s own revision as a conflict', async () => {
    const a = src('Census office');
    await runSource(a, { by: 'O', csv: 'region,v,d\nNorth,1000,2026-01-01\n' });
    await runSource(a, { by: 'O', csv: 'region,v,d\nNorth,1010,2026-01-01\n' });
    expect(twinConflicts()).toEqual([]);
  });
});
