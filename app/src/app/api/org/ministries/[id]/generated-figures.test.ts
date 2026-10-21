import { describe, it, expect, afterEach, vi } from 'vitest';
import { GET as operationsGET } from './operations/route';
import { GET as regionsGET } from './regions/route';
import { GET as analyticsGET } from './analytics/route';
import { GET as seriesGET } from './series/route';
import { GET as fieldGET } from './field/route';
import { listMinistries, createMinistry, queueFor, incidentsFor } from '@/lib/data/store';

// Step I0.1: the ministry operations, regions, analytics, series and field
// responses are generated figures computed on read (nothing stored) and say so
// (kind: 'sample'), in production as elsewhere. The two parts that are stored,
// the example queue and the incident list, are seeded only where samples are
// allowed: in production the queue starts empty and no incident is active.
const props = (id: string) => ({ params: Promise.resolve({ id }) });
const req = new Request('http://x');

afterEach(() => vi.unstubAllEnvs());

describe('generated ministry figures carry the sample marker', () => {
  for (const mode of ['demo', 'production']) {
    it(`in a ${mode} installation`, async () => {
      vi.stubEnv('CIVICOS_MODE', mode);
      const id = listMinistries()[0]!.id;
      for (const get of [operationsGET, regionsGET, analyticsGET, seriesGET, fieldGET]) {
        const res = await get(req, props(id));
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ kind: 'sample' });
      }
    });
  }

  it('the stored parts hold no sample in production: an empty queue, no active incident', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    // A ministry not yet asked for, so its queue and incidents are seeded under the production mode.
    const m = createMinistry({ archetype: 'HEALTH', name: 'Production check', slug: `prod-check-${Date.now()}` });
    if ('error' in m) throw new Error(m.error);
    const q = queueFor(m.id);
    if ('error' in q) throw new Error(q.error);
    expect(q.items).toEqual([]);
    const inc = incidentsFor(m.id);
    if ('error' in inc) throw new Error(inc.error);
    expect(inc.incidents.length).toBeGreaterThan(0);
    expect(inc.incidents.some(i => i.active)).toBe(false);
  });

  it('an unknown ministry is still not found', async () => {
    expect((await operationsGET(req, props('no-such-ministry'))).status).toBe(404);
  });
});
