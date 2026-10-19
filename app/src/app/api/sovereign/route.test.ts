import { describe, it, expect } from 'vitest';
import { PUT, GET } from './route';
import { nationIso3, nationRegions } from '@/lib/nation/registry';

const put = (b: unknown) => PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(b) }) as never);

describe('PUT /api/sovereign — nation facts', () => {
  it('stores the country and regions and applies them to the nation registry', async () => {
    const res = await put({ iso3: 'UGA', regions: ['Central', 'Eastern', 'Northern', 'Western'] });
    expect(res.status).toBe(200);
    expect((await GET().json()).sovereign.iso3).toBe('UGA');
    expect(nationIso3()).toBe('UGA');
    expect(nationRegions()).toEqual(['Central', 'Eastern', 'Northern', 'Western']);
  });

  it('rejects a malformed country code or region list', async () => {
    expect((await put({ iso3: 'Uganda' })).status).toBe(422);
    expect((await put({ regions: 'Central' })).status).toBe(422);
  });
});
