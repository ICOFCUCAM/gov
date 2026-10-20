import { describe, it, expect, beforeEach } from 'vitest';
import { publishEducationReturns, returnRows } from './twin';
import { resetEducation, recordReturn } from './register';
import { resetOrganisations, createOrganisation, setStanding } from '@/lib/organisations/register';
import { resetTwin, syncRegister, regionEntities, signalFor } from '@/lib/twin/register';
import { setSovereign } from '@/lib/data/store';

describe('education returns in the twin', () => {
  beforeEach(async () => { resetEducation(); resetOrganisations(); resetTwin(); setSovereign({ regions: ['North', 'South'] }, 'test'); await syncRegister(); });

  it('sums the latest version of each school\'s return for the latest period, per region, with lineage', async () => {
    const school = (name: string, region: string) => { const o = createOrganisation({ name, kind: 'school', region }, 'c', 'R') as { id: string; number: string }; setStanding(o.id, { register: 'schools', state: 'granted', reason: 'ok' }, 'R'); return o.number; };
    const a = school('Hill Primary', 'North'), b = school('River Primary', 'North');
    recordReturn({ organisation: a, period: '2025', counts: { 'enrolment.total': 999 } }, 'Officer');
    recordReturn({ organisation: a, period: '2026', counts: { 'enrolment.total': 300 } }, 'Officer');
    recordReturn({ organisation: a, period: '2026', counts: { 'enrolment.total': 310 }, note: 'Corrected by the school' }, 'Officer');
    recordReturn({ organisation: b, period: '2026', counts: { 'enrolment.total': 200 } }, 'Officer');
    expect(returnRows()).toMatchObject({ period: '2026', rows: [{ metric: 'education.enrolment.total', region: 'North', value: 510, returns: 2 }] });
    const pub = await publishEducationReturns('Officer', false, new Date('2026-10-20T00:00:00Z'));
    expect(pub, JSON.stringify(pub)).toMatchObject({ published: true, accepted: 1 });
    const north = regionEntities().find(e => e.name === 'North')!;
    expect(signalFor(north.id, 'education.enrolment.total')).toMatchObject({ value: 510, kind: 'record' });
    // Unchanged returns are not published twice.
    expect(await publishEducationReturns('Officer')).toEqual({ published: false });
  });
});
