import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { registerIntegration, setIntegrationStatus, rotateIntegrationKey } from '@/lib/data/store';
import { resetRateLimits } from '@/lib/exchange/rate-limit';
import { BEARER_READS, verifiesOwnCredential } from '@/lib/auth/roles';
import { GET as conformance } from '@/app/api/twin/ogc/conformance/route';
import { GET as landing } from '@/app/api/twin/ogc/route';
import { GET as staRoot } from '@/app/api/twin/sta/v1.1/route';
import { POST as tokenEndpoint } from '@/app/api/oauth/token/route';
import { SELF_AUTHENTICATED, mutationRule } from '@/lib/auth/roles';
import { TOKEN_TTL_SECONDS } from '@/lib/auth/client-credentials';
import { machineReadRefusal, OGC_READ_SCOPE } from './machine-read';

let n = 0;
function client(scopes: string[], approve = true) {
  const r = registerIntegration({ kind: 'integration', name: `gis-${++n}-${Date.now()}`, ownerOrg: 'Mapping agency', contact: 'gis@agency', scopes });
  if ('error' in r) throw new Error(r.error);
  if (approve) setIntegrationStatus(r.id, 'approved', 'Administrator');
  return { id: r.id, key: r.apiKey };
}
const key = (scopes: string[], approve = true) => client(scopes, approve).key;
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
    const r1 = await machineReadRefusal(req('/api/twin/ogc', 'Bearer civ_00000000_' + 'x'.repeat(43)));
    expect(r1?.status).toBe(401);
    expect(r1?.headers.get('www-authenticate')).toMatch(/scope="ogc:read"/);
    expect((await machineReadRefusal(req('/api/twin/ogc', 'Basic dXNlcjpwYXNz')))?.status).toBe(401);
    expect((await machineReadRefusal(req('/api/twin/ogc', `Bearer ${key([OGC_READ_SCOPE], false)}`)))?.status).toBe(403);
    const r4 = await machineReadRefusal(req('/api/twin/ogc', `Bearer ${key(['permit:read'])}`));
    expect(r4?.status).toBe(403);
    expect((await r4!.json()).error).toMatch(/ogc:read/);
    const r5 = await conformance(req('/api/twin/ogc/conformance', 'Bearer nonsense'));
    expect(r5.status).toBe(401);
  });

  it('leaves a request without a key to the session gate', async () => {
    expect(await machineReadRefusal(req('/api/twin/ogc'))).toBeNull();
  });
});

describe('OAuth2 client credentials for integration keys (RFC 6749 §4.4)', () => {
  beforeEach(() => resetRateLimits());
  const form = (fields: Record<string, string>, auth?: string) => new NextRequest('https://civic.example/api/oauth/token', {
    method: 'POST', body: new URLSearchParams(fields).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(auth ? { authorization: auth } : {}) },
  });
  const basic = (id: string, secret: string) => `Basic ${Buffer.from(`${encodeURIComponent(id)}:${encodeURIComponent(secret)}`).toString('base64')}`;

  it('is a self-authenticated route, reached without a session', () => {
    expect(SELF_AUTHENTICATED.some(re => re.test('/api/oauth/token'))).toBe(true);
    expect(mutationRule('/api/oauth/token')).toBe('self-authenticated');
  });

  it('exchanges the key for a signed short-lived token the twin read services accept', async () => {
    const c = client([OGC_READ_SCOPE, 'permit:read']);
    const r = await tokenEndpoint(form({ grant_type: 'client_credentials', scope: OGC_READ_SCOPE }, basic(c.id, c.key)));
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const t = await r.json();
    expect(t).toMatchObject({ token_type: 'Bearer', expires_in: TOKEN_TTL_SECONDS, scope: OGC_READ_SCOPE });
    const [h, p] = String(t.access_token).split('.');
    expect(JSON.parse(Buffer.from(h!, 'base64url').toString())).toMatchObject({ alg: 'EdDSA', typ: 'at+jwt', kid: expect.stringMatching(/^ed25519:/) });
    expect(JSON.parse(Buffer.from(p!, 'base64url').toString())).toMatchObject({ sub: c.id, client_id: c.id, scope: OGC_READ_SCOPE });
    expect((await conformance(req('/api/twin/ogc/conformance', `Bearer ${t.access_token}`))).status).toBe(200);
    expect((await staRoot(req('/api/twin/sta/v1.1', `Bearer ${t.access_token}`))).status).toBe(200);
    // client_secret_post works too, and without a scope the token carries all of the key's scopes.
    const r2 = await tokenEndpoint(form({ grant_type: 'client_credentials', client_id: c.id, client_secret: c.key }));
    expect((await r2.json()).scope).toBe(`${OGC_READ_SCOPE} permit:read`);
  });

  it('limits scopes to the key\'s and refuses bad clients and grants with RFC 6749 errors', async () => {
    const c = client(['permit:read']);
    const noScope = await tokenEndpoint(form({ grant_type: 'client_credentials', scope: OGC_READ_SCOPE }, basic(c.id, c.key)));
    expect(noScope.status).toBe(400);
    expect((await noScope.json()).error).toBe('invalid_scope');
    const grant = await tokenEndpoint(form({ grant_type: 'password' }, basic(c.id, c.key)));
    expect((await grant.json()).error).toBe('unsupported_grant_type');
    const bad = await tokenEndpoint(form({ grant_type: 'client_credentials' }, basic(c.id, 'civ_00000000_' + 'x'.repeat(43))));
    expect(bad.status).toBe(401);
    expect((await bad.json()).error).toBe('invalid_client');
    const other = client([OGC_READ_SCOPE]);
    expect((await tokenEndpoint(form({ grant_type: 'client_credentials' }, basic(c.id, other.key)))).status).toBe(401);
    const pending = client([OGC_READ_SCOPE], false);
    expect((await tokenEndpoint(form({ grant_type: 'client_credentials' }, basic(pending.id, pending.key)))).status).toBe(401);
    // A token without ogc:read is refused by the twin.
    const t = await (await tokenEndpoint(form({ grant_type: 'client_credentials' }, basic(c.id, c.key)))).json();
    expect((await machineReadRefusal(req('/api/twin/ogc', `Bearer ${t.access_token}`)))?.status).toBe(403);
  });

  it('ends a token when the key is rotated or the integration suspended, and refuses forged or expired ones', async () => {
    const c = client([OGC_READ_SCOPE]);
    const token = async () => (await (await tokenEndpoint(form({ grant_type: 'client_credentials' }, basic(c.id, c.key)))).json()).access_token as string;
    const t1 = await token();
    expect(await machineReadRefusal(req('/api/twin/ogc', `Bearer ${t1}`))).toBeNull();
    // Forged: claims changed, signature kept.
    const [h, p, sig] = t1.split('.');
    const claims = JSON.parse(Buffer.from(p!, 'base64url').toString());
    const forged = `${h}.${Buffer.from(JSON.stringify({ ...claims, exp: claims.exp + 86_400 })).toString('base64url')}.${sig}`;
    const f = await machineReadRefusal(req('/api/twin/ogc', `Bearer ${forged}`));
    expect(f?.status).toBe(401);
    expect(f?.headers.get('www-authenticate')).toMatch(/invalid_token/);
    // Expired: checked against the clock.
    const { verifyAccessToken } = await import('@/lib/auth/client-credentials');
    expect((await verifyAccessToken(`Bearer ${t1}`, OGC_READ_SCOPE, Date.now() + (TOKEN_TTL_SECONDS + 60) * 1000)).ok).toBe(false);
    // Suspension ends it at once; approval again restores it.
    setIntegrationStatus(c.id, 'suspended', 'Administrator');
    expect((await machineReadRefusal(req('/api/twin/ogc', `Bearer ${t1}`)))?.status).toBe(403);
    setIntegrationStatus(c.id, 'approved', 'Administrator');
    expect(await machineReadRefusal(req('/api/twin/ogc', `Bearer ${t1}`))).toBeNull();
    // Rotating the key ends every token issued for the old one.
    const rotated = rotateIntegrationKey(c.id, 'Administrator');
    if ('error' in rotated) throw new Error(rotated.error);
    expect((await machineReadRefusal(req('/api/twin/ogc', `Bearer ${t1}`)))?.status).toBe(401);
  });
});
