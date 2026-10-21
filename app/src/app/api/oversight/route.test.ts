// /api/oversight (plan I8): intake keeps the person who raised a matter apart
// and answers with a marker only; a case's oversight records carry the marker,
// never the identity; reading the identity is refused (403) to anyone but the
// assigned or authorised official, and logged either way.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let official: { id: string; name: string; label: string; institution?: string; role: string } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => (official ? { ...official, sub: official.id } : null),
  caseScope: async () => (official ? { ...official, bounds: (await import('@/lib/data/store')).institutionBounds() } : null),
  refusal: async () => null,
  withOfficial: async <T,>(b: T) => b,
}));

const { resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { resetProtectedIdentities } = await import('@/lib/oversight/protected-identity');
const { resetOversight } = await import('@/lib/oversight/register');
const { REFERENCE_OMBUDSMAN_COMPLAINT } = await import('@/lib/oversight/procedures');
const route = await import('./route');

let OMB = '', MIN = '';
const who = (id: string, institution: string, role = 'officer') => { official = { id, name: `Official ${id}`, label: `Official ${id}`, institution, role }; };
const post = async (body: Record<string, unknown>) => route.POST(new NextRequest('http://localhost/api/oversight', { method: 'POST', body: JSON.stringify(body) }));

describe('/api/oversight', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetAccessLog, resetProtectedIdentities, resetOversight]) r();
    [OMB, MIN] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { ombudsman: OMB } } }, 'Administrator');
    const p = { ...asNationSets(REFERENCE_OMBUDSMAN_COMPLAINT), form: { version: 'nation-1', lists: { 'oversight.country.ombudsman_issue_kinds': { values: [{ value: 'delay', label: 'Delay' }] } } } };
    const d = draftPackage(p, 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(d.error);
    const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(a.error);
  });

  it('opens a complaint with the identity kept apart, shows only its marker, and refuses and logs a read by anyone else', async () => {
    who('intake', OMB);
    const r = await post({ op: 'receive', procedure: 'ombudsman.complaint', fields: { concerns: MIN, allegedAction: 'No answer to a request', description: 'Waited a year' }, identity: { name: 'HIDDEN-PERSON', contact: { method: 'phone', value: '+000 HIDDEN' } } });
    expect(r.status).toBe(201);
    const j = await r.json();
    expect(JSON.stringify(j)).not.toMatch(/HIDDEN/);
    expect(j.identity).toMatchObject({ role: 'complainant', anonymous: false });
    const detail = await (await route.GET(new NextRequest(`http://localhost/api/oversight?case=${j.case.id}`))).json();
    expect(detail.identities).toEqual([j.identity]);
    expect(JSON.stringify(detail)).not.toMatch(/HIDDEN/);
    // The institution complained about: no read of the case, no read of the identity.
    who('m1', MIN, 'signatory');
    expect((await route.GET(new NextRequest(`http://localhost/api/oversight?case=${j.case.id}`))).status).toBe(403);
    const refused = await post({ op: 'read-identity', id: j.identity.id, purpose: 'We want to know who complained' });
    expect(refused.status).toBe(403);
    expect(JSON.stringify(await refused.json())).not.toMatch(/HIDDEN/);
    // The assigned official, with a purpose.
    who('intake', OMB);
    const allowed = await post({ op: 'read-identity', id: j.identity.id, purpose: 'Arrange an interview' });
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).result).toMatchObject({ name: 'HIDDEN-PERSON' });
    expect(listAccess({ register: 'protected-identities' }).map(e => e.result).sort()).toEqual(['allowed', 'refused']);
  });
});
