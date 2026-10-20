import { describe, it, expect, beforeEach } from 'vitest';
import { publishHealthCapacity, capacityRows } from './twin';
import { resetHealth, recordCapacity } from './register';
import { resetOrganisations, createOrganisation, setStanding } from '@/lib/organisations/register';
import { resetTwin, syncRegister, regionEntities, signalFor } from '@/lib/twin/register';
import { setSovereign } from '@/lib/data/store';

describe('health capacity in the twin', () => {
  beforeEach(async () => { resetHealth(); resetOrganisations(); resetTwin(); setSovereign({ regions: ['North', 'South'] }, 'test'); await syncRegister(); });

  it('sums the latest reported beds per region with lineage', async () => {
    const f = (name: string, region: string) => { const o = createOrganisation({ name, kind: 'hospital', region }, 'c', 'R') as { id: string; number: string }; setStanding(o.id, { register: 'health-facilities', state: 'granted', reason: 'ok' }, 'R'); return o.number; };
    recordCapacity({ organisation: f('North General', 'North'), period: '2026-Q3', counts: { 'beds.total': 200 } }, 'Officer');
    recordCapacity({ organisation: f('South General', 'South'), period: '2026-Q3', counts: { 'beds.total': 150 } }, 'Officer');
    expect(capacityRows()!.rows).toHaveLength(2);
    const r = await publishHealthCapacity('Officer', false, new Date('2026-10-20T00:00:00Z'));
    expect(r, JSON.stringify(r)).toMatchObject({ published: true, accepted: 2 });
    const south = regionEntities().find(e => e.name === 'South')!;
    expect(signalFor(south.id, 'health.beds.total')).toMatchObject({ value: 150, kind: 'record' });
  });
});
