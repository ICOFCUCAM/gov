import { describe, it, expect, beforeEach } from 'vitest';
import { publishStandingCounts } from './twin';
import { resetOrganisations, createOrganisation, setStanding } from './register';
import { resetTwin, syncRegister, regionEntities, signalFor, getEntity } from '@/lib/twin/register';
import { publicEntity } from '@/lib/twin/public-entity';
import { setSovereign } from '@/lib/data/store';

describe('organisations in the twin', () => {
  beforeEach(async () => { resetOrganisations(); resetTwin(); setSovereign({ regions: ['North', 'South'] }, 'test'); await syncRegister(); });

  it('makes each organisation an entity in its region and counts those in good standing', async () => {
    const a = createOrganisation({ name: 'Northern University', kind: 'university', region: 'North' }, 'c1', 'R') as { id: string; number: string };
    const b = createOrganisation({ name: 'Lakeside College', kind: 'college', region: 'North' }, 'c2', 'R') as { id: string; number: string };
    setStanding(a.id, { register: 'higher-education', state: 'granted', reason: 'Accredited' }, 'R');
    setStanding(b.id, { register: 'higher-education', state: 'applied', reason: 'Applied' }, 'R');
    const r = await publishStandingCounts('Registrar', false, new Date('2026-10-20T00:00:00Z'));
    expect(r).toMatchObject({ published: true, entities: 2, accepted: 1 });
    const north = regionEntities().find(e => e.name === 'North')!;
    expect(getEntity(`organisation:${a.number}`)).toMatchObject({ kind: 'organisation', name: 'Northern University', parent: north.id });
    expect(signalFor(north.id, 'accreditations.granted')).toMatchObject({ value: 1, kind: 'record' });
    // The public resolves an organisation only while a public register shows it.
    expect(await publicEntity('organisation', a.number)).toMatchObject({ ok: true });
    expect(await publicEntity('organisation', b.number)).toMatchObject({ ok: false, status: 404 });
  });
});
