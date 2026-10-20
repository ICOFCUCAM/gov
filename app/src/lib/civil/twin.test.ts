import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { publishCivilCounts, civilCountRows } from './twin';
import { registerEvent, resetCivil } from './register';
import { resetTwin, syncRegister, regionEntities, signalFor, nationalTotal, stateAsOf } from '@/lib/twin/register';
import { setSovereign } from '@/lib/data/store';

describe('civil register counts in the twin', () => {
  beforeEach(async () => { resetCivil(); resetTwin(); setSovereign({ regions: ['North', 'South'] }, 'test'); await syncRegister(); });

  it('publishes registered births per region and month as records that reconcile with the register', async () => {
    const ids: string[] = [];
    for (const region of ['North', 'North', 'South']) {
      const e = registerEvent({ kind: 'birth', date: '2026-09-03', place: { region }, case: `c-${ids.length}`, child: { given: 'A', family: 'B', sex: 'female' } }, 'R');
      if ('error' in e) throw new Error(e.error);
      ids.push(e.id);
    }
    const r = await publishCivilCounts('Registrar');
    expect(r).toMatchObject({ published: true, accepted: 2, rejected: 0 });
    expect(await publishCivilCounts('Registrar')).toEqual({ published: false });
    const north = regionEntities().find(e => e.name === 'North')!;
    expect(signalFor(north.id, 'births.registered')).toMatchObject({ value: 2, kind: 'record' });
    expect(nationalTotal('births.registered')).toMatchObject({ value: 3, kind: 'record' });
    const obs = stateAsOf({ metric: 'births.registered', entityId: north.id })[0]!;
    const expected = createHash('sha256').update(civilCountRows().find(x => x.region === 'North')!.sha256 ? [ids[0]!, ids[1]!].sort().join('\n') : '', 'utf8').digest('hex');
    expect(obs.records).toEqual({ query: expect.stringMatching(/civil register/), count: 2, sha256: expected });
  });
});
