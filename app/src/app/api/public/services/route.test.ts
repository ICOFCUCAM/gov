// The front door's routes (plan step I13): the public catalogue shows only
// published entries and never who proposed them; a citizen grants and revokes
// a representation themselves; records management is read only within
// reach, every read in the access log, and a transfer is acknowledged only by
// the archive it was sent to.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let official: { id: string; name: string; label: string; institution?: string; role: string } | null = null;
let citizen: { sub: string; name: string; demo?: boolean } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => (official ? { ...official, sub: official.id } : null),
  caseScope: async () => official,
}));
vi.mock('@/lib/auth/citizen', () => ({ currentCitizen: async () => citizen }));

const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { proposeService, publishService, resetServiceCatalogue } = await import('@/lib/frontdoor/catalogue');
const { resetDelegations } = await import('@/lib/records/delegations');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { resetRecordkeeping } = await import('@/lib/recordkeeping/register');
const publicRoute = await import('./route');
const servicesRoute = await import('@/app/api/services/route');
const repRoute = await import('@/app/api/citizen/representation/route');
const recRoute = await import('@/app/api/records-management/route');

let X = '', Y = '', lawId = '';
const get = (url: string) => new NextRequest(new URL(url, 'http://localhost'));
const post = (url: string, body: unknown) => new NextRequest(new URL(url, 'http://localhost'), { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const as = (id: string, role: string, institution = X) => { official = { id, name: `Official ${id}`, label: `Official ${id}`, institution, role }; return official; };

describe('front door routes', () => {
  beforeEach(() => {
    for (const r of [resetLaw, resetServiceCatalogue, resetDelegations, resetAccessLog, resetRecordkeeping]) r();
    official = null; citizen = null;
    [X, Y] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: {} } }, 'Administrator');
    const law = recordVersion({ instrument: { title: 'Markets Act', type: 'act', jurisdiction: 'X', year: 2020, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_3', num: '3', text: 'Trading needs a permit.' }] }, 'L1', 'l1') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    lawId = law.instrument.id;
  });

  it('lists only published services, with the computed status and no proposer, through the officials\' route and the public one', async () => {
    as('o1', 'officer');
    const terms = { name: 'Market stall permit', description: 'A permit to trade from a stall.', owner: { institution: X }, legalBasis: [{ instrument: lawId, eId: 'sec_3' }], procedure: 'mk.none', forms: [], channels: ['online'], declared: 'active', representatives: true };
    const r = await servicesRoute.POST(post('/api/services', { op: 'propose', terms, reason: 'New' }));
    expect(r.status).toBe(200);
    const id = (await r.json()).id as string;
    expect((await (await publicRoute.GET(get('/api/public/services'))).json()).services).toEqual([]);
    const { searchSites } = await import('@/lib/public-sites/search');
    expect(searchSites('stall permit').filter(h => h.siteId === 'services')).toEqual([]);
    expect((await servicesRoute.POST(post('/api/services', { op: 'publish', id }))).status).toBe(403);
    as('s1', 'signatory');
    expect((await servicesRoute.POST(post('/api/services', { op: 'publish', id }))).status).toBe(200);
    official = null;
    const list = (await (await publicRoute.GET(get('/api/public/services'))).json()).services;
    expect(list).toEqual([expect.objectContaining({ id, status: 'unavailable', reasons: ['The procedure mk.none has no approved version in force'] })]);
    expect(JSON.stringify(list)).not.toMatch(/Official o1|Official s1|proposedBy|publishedBy/);
    // Discoverable through the public search, leading to its own page.
    expect(searchSites('stall permit').filter(h => h.siteId === 'services')).toEqual([expect.objectContaining({ kind: 'service', title: 'Market stall permit', href: `/services/${id}` })]);
    const one = await (await publicRoute.GET(get(`/api/public/services?id=${id}`))).json();
    expect(one.journey.map((s: { key: string; state: string }) => [s.key, s.state])).toContainEqual(['apply', 'not-connected']);
    // A citizen grants a representation for it and revokes it; another person cannot revoke it.
    citizen = { sub: 'amina', name: 'Amina', demo: true };
    const g = await repRoute.POST(post('/api/citizen/representation', { op: 'grant', agent: { sub: 'kofi', name: 'Kofi' }, services: [id], actions: ['apply', 'track'] }));
    expect(g.status).toBe(201);
    const rid = (await g.json()).representation.id;
    expect((await (await repRoute.GET()).json()).granted).toEqual([expect.objectContaining({ id: rid, byPrincipal: true })]);
    citizen = { sub: 'kofi', name: 'Kofi', demo: true };
    expect((await (await repRoute.GET()).json()).received).toEqual([expect.objectContaining({ id: rid })]);
    expect((await repRoute.POST(post('/api/citizen/representation', { op: 'revoke', id: rid, reason: 'x' }))).status).toBe(403);
    citizen = { sub: 'amina', name: 'Amina', demo: true };
    expect((await repRoute.POST(post('/api/citizen/representation', { op: 'revoke', id: rid, reason: 'Not needed' }))).status).toBe(200);
    citizen = null;
    expect((await repRoute.GET()).status).toBe(401);
  });

  it('reads records management only within reach, every read logged; only the archive acknowledges a transfer', async () => {
    as('o1', 'officer');
    expect((await recRoute.GET(get(`/api/records-management?institution=${X}`))).status).toBe(200);
    expect((await recRoute.GET(get(`/api/records-management?institution=${Y}`))).status).toBe(403);
    expect(listAccess({ register: 'records-management' }).map(e => [e.record.id, e.result])).toEqual([[Y, 'refused'], [X, 'allowed']]);
    // Adopting the procedures: an administrator or one who can sign there.
    expect((await recRoute.POST(post('/api/records-management', { op: 'adopt', institution: X }))).status).toBe(403);
    as('s1', 'signatory');
    const a = await recRoute.POST(post('/api/records-management', { op: 'adopt', institution: X }));
    expect((await a.json()).drafted.length).toBe(6);
    expect((await recRoute.POST(post('/api/records-management', { op: 'acknowledge-transfer', transfer: 'TRF-none' }))).status).toBe(404);
  });
});
