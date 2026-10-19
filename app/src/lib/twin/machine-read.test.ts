import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { registerIntegration, setIntegrationStatus } from '@/lib/data/store';
import { resetRateLimits } from '@/lib/exchange/rate-limit';
import { BEARER_READS, verifiesOwnCredential } from '@/lib/auth/roles';
import { GET as conformance } from '@/app/api/twin/ogc/conformance/route';
import { GET as landing } from '@/app/api/twin/ogc/route';
import { GET as staRoot } from '@/app/api/twin/sta/v1.1/route';
import { machineReadRefusal, OGC_READ_SCOPE } from './machine-read';

let n = 0;
function key(scopes: string[], approve = true) {
  const r = registerIntegration({ kind: 'integration', name: `gis-${++n}-${Date.now()}`, ownerOrg: 'Mapping agency', contact: 'gis@agency', scopes });
  if ('error' in r) throw new Error(r.error);
  if (approve) setIntegrationStatus(r.id, 'approved', 'Administrator');
  return r.apiKey;
}
const req = (path: string, auth?: string) => new NextRequest(`https://civic.example${path}`, { headers: auth ? { authorization: auth } : {} });

describe('machine read keys for GIS clients (scope ogc:read)', () => {
  beforeEach(() => resetRateLimits());

  it('the twin read services are bearer reads, so a request with a key reaches the route', () => {
    for (const p of ['/api/twin/ogc', '/api/twin/ogc/collections/facilities/items', '/api/twin/sta/v1.1/Things', '/api/twin/tiles/facilities/3/4/2.mvt']) {
      expect(BEARER_READS.some(re => re.test(p)), p).toBe(true);
      expect(verifiesOwnCredential(p), p).toBe(true);
    }
    // Writes to the twin are not opened by a key.
    expect(BEARER_READS.some(re => re.test('/api/twin/sources'))).toBe(false);
  });

  it('answers an approved key with the ogc:read scope', async () => {
    const k = key([OGC_READ_SCOPE]);
    const r = await conformance(req('/api/twin/ogc/conformance', `Bearer ${k}`));
    expect(r.status).toBe(200);
    expect((await r.json()).conformsTo.length).toBeGreaterThan(2);
    expect((await landing(req('/api/twin/ogc', `Bearer ${k}`))).status).toBe(200);
    expect((await staRoot(req('/api/twin/sta/v1.1', `Bearer ${k}`))).status).toBe(200);
  });

  it('refuses unknown keys, other schemes, pending clients and keys without the scope', async () => {
    const r1 = machineReadRefusal(req('/api/twin/ogc', 'Bearer civ_00000000_' + 'x'.repeat(43)));
    expect(r1?.status).toBe(401);
    expect(r1?.headers.get('www-authenticate')).toMatch(/scope="ogc:read"/);
    expect(machineReadRefusal(req('/api/twin/ogc', 'Basic dXNlcjpwYXNz'))?.status).toBe(401);
    expect(machineReadRefusal(req('/api/twin/ogc', `Bearer ${key([OGC_READ_SCOPE], false)}`))?.status).toBe(403);
    const r4 = machineReadRefusal(req('/api/twin/ogc', `Bearer ${key(['permit:read'])}`));
    expect(r4?.status).toBe(403);
    expect((await r4!.json()).error).toMatch(/ogc:read/);
    const r5 = await conformance(req('/api/twin/ogc/conformance', 'Bearer nonsense'));
    expect(r5.status).toBe(401);
  });

  it('leaves a request without a key to the session gate', () => {
    expect(machineReadRefusal(req('/api/twin/ogc'))).toBeNull();
  });
});
