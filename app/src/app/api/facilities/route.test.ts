import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetFacilities, listFacilities, pageFacilities, viewFacility, getFacility, type Facility } from '@/lib/data/facilities';
import { applyNation } from '@/lib/nation/registry';

// The signed-in official (or none) the route sees.
let official: { name: string; institution?: string } | null = null;
vi.mock('@/lib/auth/official', () => ({ currentOfficial: async () => official }));

const { GET } = await import('./route');

const g = globalThis as unknown as { __civicosFacilities?: { facilities: Facility[] } };
const N = 1_250;

/** Synthetic sites written into the store as a restored snapshot would be. */
function seed(): Facility[] {
  const out: Facility[] = [];
  for (let i = 0; i < N; i++) {
    const police = i % 5 === 0;
    out.push({
      id: `FAC-${String(i + 1).padStart(5, '0')}`, name: police ? `Police post ${i}` : `School ${i}`, category: police ? 'police' : 'school',
      ownerId: police ? 'interior' : 'education', ids: police ? { national: `n-${i}`, ob: `SECRET-${i}` } : { national: `n-${i}` },
      status: i % 7 === 0 ? 'closed' : 'operational', sensitivity: police ? 'restricted' : 'public',
      location: { lng: 36 + (i % 50) * 0.01234, lat: -1 - Math.floor(i / 50) * 0.01234, method: 'survey-import' },
      place: { inside: true, region: i % 2 ? 'Nairobi' : 'Mombasa', regionCode: i % 2 ? 'KE-30' : 'KE-28', district: `D${i}` },
      state: i % 10 === 3 ? 'proposed' : i % 25 === 4 ? 'withdrawn' : 'published', proposedBy: 'A', proposedAt: '2026-01-01T00:00:00Z',
      certification: { required: ['institution'], stamps: [], state: i % 3 === 0 ? 'certified' : 'awaiting' }, source: { kind: 'import' }, versions: [],
      ...(i === 10 ? { pendingVersion: { at: '2026-01-02T00:00:00Z', by: 'B', what: 'moved', location: { lng: 36.5, lat: -1.5, method: 'device-gps' }, place: { inside: true } } as unknown as Facility['pendingVersion'] } : {}),
    });
  }
  return out;
}

const get = async (qs: string) => {
  const r = await GET(new NextRequest(`http://localhost/api/facilities?${qs}`));
  return { status: r.status, body: await r.json() as { sites: (Facility & { generalised?: boolean })[]; page?: { total: number; offset: number; limit: number; next: number | null }; regions: string[]; error?: string } };
};

beforeEach(() => {
  resetFacilities();
  applyNation({ iso3: 'KEN', regions: [] });
  listFacilities({}, { signedIn: true }); // create the store
  g.__civicosFacilities!.facilities = seed();
  official = null;
});

describe('GET /api/facilities paging', () => {
  it('keeps the unpaged answer for callers that give no limit', async () => {
    const { body } = await get('state=all');
    expect(body.page).toBeUndefined();
    expect(body.sites).toHaveLength(N);
    expect(body.regions).toEqual(['Mombasa', 'Nairobi']);
    const none = await get('sites=none&limit=5');
    expect(none.body.sites).toEqual([]);
  });

  it('walks the register page by page with the total, in the register order, without gaps or repeats', async () => {
    official = { name: 'Gov', institution: undefined };
    const seen: string[] = [];
    let offset: number | null = 0, total = 0, pages = 0;
    while (offset !== null) {
      const { body } = await get(`state=current&limit=200&offset=${offset}`);
      total = body.page!.total;
      seen.push(...body.sites.map(s => s.id));
      offset = body.page!.next; pages++;
    }
    const expected = listFacilities({ state: 'all' }, { signedIn: true }).filter(s => s.state !== 'withdrawn').map(s => s.id);
    expect(seen).toEqual(expected);
    expect(total).toBe(expected.length);
    expect(pages).toBe(Math.ceil(expected.length / 200));
  });

  it('applies the table filters: institution, category, status, region, stage and search', async () => {
    official = { name: 'Gov' };
    const { body } = await get('state=published&ministry=education&category=school&status=closed&region=Nairobi&limit=1000');
    const all = g.__civicosFacilities!.facilities;
    const want = all.filter(f => f.state === 'published' && f.ownerId === 'education' && f.status === 'closed' && f.place.region === 'Nairobi');
    expect(body.page!.total).toBe(want.length);
    expect(body.sites.map(s => s.id)).toEqual(want.map(f => f.id));
    const byCode = await get('state=all&region=KE-28&limit=3');
    expect(byCode.body.page!.total).toBe(all.filter(f => f.place.regionCode === 'KE-28').length);
    const q = await get('state=all&q=school 12&limit=50');
    expect(q.body.sites.every(s => s.name.toLowerCase().includes('school 12'))).toBe(true);
    expect(q.body.page!.total).toBe(all.filter(f => f.name.toLowerCase().includes('school 12')).length);
    expect((await get('q=FAC-00002&state=all&limit=5')).body.sites.map(s => s.id)).toEqual(['FAC-00002']);
  });

  it('lists what waits on an official', async () => {
    official = { name: 'Gov' };
    const { body } = await get('state=all&waiting=1&limit=1000');
    expect(body.sites.length).toBe(body.page!.total);
    expect(body.sites.every(s => s.state === 'proposed' || (s.state === 'published' && s.certification.state === 'awaiting') || s.pendingVersion)).toBe(true);
    expect(body.sites.some(s => s.id === 'FAC-00011' && s.pendingVersion)).toBe(true);
  });

  it('refuses a limit or status it cannot read and caps the page size', async () => {
    expect((await get('limit=0')).status).toBe(400);
    expect((await get('limit=abc')).status).toBe(400);
    expect((await get('limit=5&offset=-1')).status).toBe(400);
    expect((await get('limit=5&status=nonsense')).status).toBe(400);
    expect((await get('state=all&limit=50000')).body.sites).toHaveLength(1000);
  });

  it('generalises restricted sites on every page exactly as viewFacility does', async () => {
    for (const who of [null, { name: 'Health', institution: 'health' }] as const) {
      official = who;
      const viewer = who ? { institution: who.institution, signedIn: true } : { signedIn: false };
      const { body } = await get('state=all&category=police&limit=40&offset=40');
      expect(body.sites.length).toBe(40);
      for (const s of body.sites) {
        expect(s.generalised).toBe(true);
        expect(s).toEqual(JSON.parse(JSON.stringify(viewFacility(getFacility(s.id)!, viewer))));
        expect(s.ids).toEqual({ national: expect.any(String) });
        expect(s.place.district).toBeUndefined();
      }
    }
    // The owning institution and the whole government see them exactly.
    official = { name: 'Interior', institution: 'interior' };
    const own = (await get('state=all&category=police&limit=5')).body.sites;
    expect(own.every(s => !s.generalised && s.ids.ob)).toBe(true);
  });

  it('cannot find a restricted site by what its generalised view hides', async () => {
    official = { name: 'Health', institution: 'health' };
    expect((await get('state=all&q=SECRET-5&limit=10')).body.page!.total).toBe(0);
    expect((await get('state=all&q=D5&limit=2000')).body.sites.some(s => s.category === 'police')).toBe(false);
    official = { name: 'Interior', institution: 'interior' };
    expect((await get('state=all&q=SECRET-5&limit=10')).body.sites.map(s => s.id)).toContain('FAC-00006');
    // Moves waiting are listed only for those who see the site exactly.
    official = null;
    const pub = (await get('state=all&waiting=1&limit=1000')).body.sites;
    expect(pub.some(s => s.pendingVersion)).toBe(false);
  });

  it('matches a box where the viewer sees each site', () => {
    const box: [number, number, number, number] = [36, -1.2, 36.3, -1];
    const viewer = { signedIn: false };
    const r = pageFacilities({ state: 'all', bbox: box }, viewer, { limit: 1000 });
    const want = listFacilities({ state: 'all', bbox: box }, viewer);
    expect(r.total).toBe(want.length);
    expect(r.sites.map(s => s.id).sort()).toEqual(want.map(s => s.id).sort());
    expect(() => pageFacilities({}, undefined as never, { limit: 5 })).toThrow(/viewer/);
  });
});
