// An institution's own signed-in site archive: its officials get restricted
// sites at their exact position, others are refused, every download is audited.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { resetOfficials, createAccount, sessionSecret } from '@/lib/auth/officials';
import { signClaims } from '@/lib/auth/session-token';
import { resetFacilities, proposeFacility, actOnFacility, viewFacility, getFacility } from '@/lib/data/facilities';
import { listMinistries, listAudit } from '@/lib/data/store';
import { applyNation } from '@/lib/nation/registry';
import { PMTilesReader, bufferSource } from '@/lib/geo/pmtiles';
import { decodeTile, fromTile } from '@/lib/geo/mvt';
import { institutionArchive, resetArchive, stateSource } from '@/lib/twin/tiles-archive';
import { canDownloadSiteArchive } from '@/lib/auth/roles';

process.env.CIVICOS_SCRYPT_N = '16384';
let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));
const { GET, HEAD } = await import('./route');

const PW = 'correct horse battery';
const tileOf = (lng: number, lat: number, z: number) => ({
  x: Math.floor(((lng + 180) / 360) * 2 ** z),
  y: Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z),
});
async function signInAs(id: string) {
  const now = Math.floor(Date.now() / 1000);
  cookie = await signClaims({ sub: `local:${id}`, name: 'x', method: 'local', iat: now, exp: now + 600 }, sessionSecret());
}
const make = async (email: string, role: string, institution?: string) => {
  const a = await createAccount({ email, name: email.split('@')[0], office: 'Office', password: PW, role, institution }, 'Admin');
  if ('error' in a) throw new Error(a.error);
  return a.id;
};

let owner: string, other: string, police: string, tmp: string;
const saved = { dir: process.env.CIVICOS_TILES_DIR, zooms: process.env.CIVICOS_TILES_ZOOMS };
const ctx = () => ({ params: Promise.resolve({ id: owner }) });
const req = (h: Record<string, string> = {}) => new NextRequest(`http://localhost/api/org/ministries/${owner}/facilities/tiles.pmtiles`, { headers: h });
const downloads = () => listAudit().filter(e => e.action === 'tiles.archive.download');

beforeEach(async () => {
  resetOfficials(); resetFacilities(); resetArchive(); cookie = undefined;
  tmp = mkdtempSync(path.join(os.tmpdir(), 'civicos-inst-tiles-'));
  process.env.CIVICOS_TILES_DIR = tmp; process.env.CIVICOS_TILES_ZOOMS = '0-10';
  applyNation({ iso3: 'KEN', regions: [] });
  await createAccount({ email: 'admin@gov.test', name: 'Admin', office: 'Head of Service', password: PW }, null);
  const [m, n] = listMinistries();
  owner = m!.id; other = n!.id;
  const add = async (name: string, category: string, lng: number, lat: number) => {
    const r = await proposeFacility(owner, { name, category, lng, lat, method: 'device-gps' }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    await actOnFacility(r.facility.id, { action: 'publish' }, 'Signer B');
    return r.facility.id;
  };
  await add('Nairobi Primary', 'school', 36.81724, -1.28638);
  police = await add('Central Police Station', 'police', 36.82194, -1.28333);
});
afterEach(() => {
  resetArchive();
  for (const [k, v] of [['CIVICOS_TILES_DIR', saved.dir], ['CIVICOS_TILES_ZOOMS', saved.zooms]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  rmSync(tmp, { recursive: true, force: true });
});

async function policeIn(bytes: Uint8Array) {
  const r = new PMTilesReader(bufferSource(bytes));
  const exact = getFacility(police)!.location, z = 10, t = tileOf(exact.lng, exact.lat, z);
  const f = decodeTile((await r.tile(z, t.x, t.y))!)[0]!.features.find(x => x.properties.id === police);
  return f ? { props: f.properties, at: fromTile(f.geometry[0]![0], f.geometry[0]![1], z, t.x, t.y), exact } : null;
}

describe('an institution\'s own site archive', () => {
  it('needs a signed-in official of the institution (or the whole government)', async () => {
    expect((await GET(req(), ctx())).status).toBe(401);
    await signInAs(await make('other@gov.test', 'signatory', other));
    const r = await GET(req(), ctx());
    expect(r.status).toBe(403);
    expect(downloads()).toHaveLength(0);
    expect((await GET(req(), { params: Promise.resolve({ id: 'no-such' }) })).status).toBe(404);
    expect(canDownloadSiteArchive({ role: 'auditor', institution: owner }, owner)).toBeNull();
    expect(canDownloadSiteArchive({ role: 'administrator' }, owner)).toBeNull();
    expect(canDownloadSiteArchive({ role: 'administrator', institution: other }, owner)).toMatch(/Only officials of this institution/);
  });

  it('gives its own officials restricted sites at their exact position, and audits the download', async () => {
    await signInAs(await make('officer@gov.test', 'officer', owner));
    const r = await GET(req(), ctx());
    expect(r.status).toBe(200);
    expect(r.headers.get('content-disposition')).toMatch(/attachment; filename="sites-.+\.pmtiles"/);
    expect(r.headers.get('x-positions')).toBe('exact');
    expect(r.headers.get('cache-control')).toBe('private, no-cache');
    const p = await policeIn(new Uint8Array(await r.arrayBuffer()));
    expect(p!.props.generalised).toBeUndefined();
    expect(Math.abs(p!.at[0] - p!.exact.lng)).toBeLessThan(0.001);
    expect(Math.abs(p!.at[1] - p!.exact.lat)).toBeLessThan(0.001);
    expect(downloads()).toHaveLength(1);
    expect(downloads()[0]).toMatchObject({ actor: 'officer, Office', resource: `Ministry:${owner}`, outcome: 'ok' });
    expect(downloads()[0]!.detail).toMatch(/^2 sites, exact positions, build ".+", whole file$/);

    // A reader by ranges is audited once, at its first range (from byte 0).
    const first = await GET(req({ range: 'bytes=0-16383' }), ctx());
    expect(first.status).toBe(206);
    expect((await GET(req({ range: 'bytes=200-299' }), ctx())).status).toBe(206);
    await HEAD(req(), ctx());
    expect(downloads()).toHaveLength(2);
    expect(downloads().filter(e => /read by ranges$/.test(e.detail ?? ''))).toHaveLength(1);
  });

  it('lets an auditor of the institution read it, and is rebuilt when its sites change', async () => {
    await signInAs(await make('audit@gov.test', 'auditor', owner));
    const one = await GET(req(), ctx());
    expect(one.status).toBe(200);
    const etag = one.headers.get('etag');
    expect((await GET(req({ 'if-none-match': etag! }), ctx())).status).toBe(304);
    await actOnFacility(police, { action: 'withdraw', reason: 'moved' }, 'Signer B');
    const two = await GET(req(), ctx());
    expect(two.headers.get('etag')).not.toBe(etag);
    expect(two.headers.get('x-facility-sites')).toBe('1');
    expect(await policeIn(new Uint8Array(await two.arrayBuffer()))).toBeNull();
  });

  it('generalises restricted sites for a viewer without need, as viewFacility() does', async () => {
    const st = await institutionArchive(owner, { signedIn: false });
    expect(st.info).toMatchObject({ viewer: 'institution', institution: owner, positions: 'generalised', stored: 'file' });
    const r = new PMTilesReader(stateSource(st));
    const anon = viewFacility(getFacility(police)!, { signedIn: false });
    const z = 10, t = tileOf(anon.location.lng, anon.location.lat, z);
    const f = decodeTile((await r.tile(z, t.x, t.y))!)[0]!.features.find(x => x.properties.id === police)!;
    expect(f.properties.generalised).toBe(true);
    const exact = await institutionArchive(owner, { institution: owner, signedIn: true });
    expect(exact.info.positions).toBe('exact');
    expect(exact.info.etag).not.toBe(st.info.etag);
    // another institution's official is a viewer without need
    expect((await institutionArchive(owner, { institution: other, signedIn: true })).info.positions).toBe('generalised');
  });
});
