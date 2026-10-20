import { describe, it, expect, beforeEach } from 'vitest';
import { openCase, resetCases, registeredEffects } from './engine';
import { draftPackage, approvePackage, resetPackages } from './packages';
import { samplePackage } from './testkit';
import { publishCaseCounts, caseCountRows } from './twin';
import { resetTwin, syncRegister, signalFor } from '@/lib/twin/register';
import { setSovereign, listMinistries } from '@/lib/data/store';

describe('case work in the twin', () => {
  beforeEach(async () => { resetCases(); resetPackages(); resetTwin(); await syncRegister(); });

  it('publishes cases opened per institution and month, with lineage, and leaves samples out', async () => {
    const m = listMinistries()[0]!;
    setSovereign({ deployment: { authorities: { businessRegister: m.id } } }, 'test');
    const d = draftPackage(samplePackage({ owner: 'businessRegister' }), 'A', 'a', registeredEffects());
    if ('error' in d) throw new Error(d.error);
    approvePackage(d.key, d.version, 'B', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    const actor = { name: 'Clerk', scope: null };
    openCase({ procedure: 'test.licence', fields: { name: 'One' } }, actor, new Date('2026-09-03'));
    openCase({ procedure: 'test.licence', fields: { name: 'Two' } }, actor, new Date('2026-09-20'));
    openCase({ procedure: 'test.licence', fields: { name: 'Sample' }, source: 'sample' }, actor, new Date('2026-09-21'));
    expect(caseCountRows()).toEqual([expect.objectContaining({ metric: 'cases.opened', institution: m.name, month: '2026-09', count: 2 })]);
    expect(await publishCaseCounts('Scheduler')).toMatchObject({ published: true, accepted: 1 });
    expect(await publishCaseCounts('Scheduler')).toEqual({ published: false });
    expect(signalFor(`institution:${m.id}`, 'cases.opened')).toMatchObject({ value: 2, kind: 'record' });
  });
});
