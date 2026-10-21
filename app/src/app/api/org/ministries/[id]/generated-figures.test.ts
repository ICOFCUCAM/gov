import { describe, it, expect, afterEach, vi } from 'vitest';
import { GET as operationsGET } from './operations/route';
import { GET as regionsGET } from './regions/route';
import { GET as analyticsGET } from './analytics/route';
import { listMinistries } from '@/lib/data/store';

// Step I0.1: the ministry operations, regions and analytics responses are
// generated figures and say so (kind: 'sample'), in production as elsewhere.
const props = (id: string) => ({ params: Promise.resolve({ id }) });
const req = new Request('http://x');

afterEach(() => vi.unstubAllEnvs());

describe('generated ministry figures carry the sample marker', () => {
  for (const mode of ['demo', 'production']) {
    it(`in a ${mode} installation`, async () => {
      vi.stubEnv('CIVICOS_MODE', mode);
      const id = listMinistries()[0]!.id;
      for (const get of [operationsGET, regionsGET, analyticsGET]) {
        const res = await get(req, props(id));
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ kind: 'sample' });
      }
    });
  }

  it('an unknown ministry is still not found', async () => {
    expect((await operationsGET(req, props('no-such-ministry'))).status).toBe(404);
  });
});
