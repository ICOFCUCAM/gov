import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from './route';
import { resetOrganisations, createOrganisation, setStanding, getOrganisation } from '@/lib/organisations/register';

describe('case-deadlines job', () => {
  beforeEach(() => { resetOrganisations(); vi.stubEnv('CIVICOS_CRON_SECRET', 'cron-secret-for-tests-0123456789'); });
  afterEach(() => vi.unstubAllEnvs());

  it('needs the cron secret, and ends standings whose validity has passed', async () => {
    expect((await GET(new Request('http://x/api/cron/case-deadlines'))).status).toBe(401);
    const o = createOrganisation({ name: 'Old Licence Ltd', kind: 'company' }, 'c', 'R') as { id: string; number: string };
    setStanding(o.id, { register: 'business-licences', state: 'granted', reason: 'Licensed', validUntil: '2020-01-01' }, 'R');
    const r = await (await GET(new Request('http://x/api/cron/case-deadlines', { headers: { authorization: 'Bearer cron-secret-for-tests-0123456789' } }))).json();
    expect(r.expired).toEqual([{ organisation: o.number, register: 'business-licences' }]);
    expect(getOrganisation(o.id)!.standings[0]!.state).toBe('expired');
  });
});
