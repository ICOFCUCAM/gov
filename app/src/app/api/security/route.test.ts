// /api/security (plan I12): the classification scheme and accreditation change
// only by two officials citing the law, and say so while unset; a security
// record is read only with need to know and a purpose (403 otherwise, logged
// either way); lists carry no terms; the public view shows nothing unpublished.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let official: { id: string; name: string; label: string; institution?: string; role: string; twoStep?: boolean } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => (official ? { ...official, sub: official.id } : null),
  caseScope: async () => (official ? { ...official, bounds: (await import('@/lib/data/store')).institutionBounds() } : null),
  refusal: async () => null,
  withOfficial: async <T,>(b: T) => b,
}));

const { resetCases, registeredEffects, openCase, act, attach } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { resetSecurityRecords, securityRecordOfCase } = await import('@/lib/security/register');
const { resetSecurityClassification } = await import('@/lib/security/classification');
const { REFERENCE_CYBER_INCIDENT } = await import('@/lib/security/procedures');
const route = await import('./route');

let CYB = '', MIN = '';
const who = (id: string, institution: string, role = 'officer') => { official = { id, name: `Official ${id}`, label: `Official ${id}`, institution, role, twoStep: true }; };
const post = async (body: Record<string, unknown>) => route.POST(new NextRequest('http://localhost/api/security', { method: 'POST', body: JSON.stringify(body) }));
const get = async (q = '') => route.GET(new NextRequest(`http://localhost/api/security${q}`));

describe('/api/security', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetAccessLog, resetLaw, resetSecurityRecords, resetSecurityClassification]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [CYB, MIN] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { cyberAuthority: CYB } } }, 'Administrator');
    const p = { ...asNationSets(REFERENCE_CYBER_INCIDENT), form: { version: 'nation-1', lists: { 'security.country.cyber_incident_categories': { values: [{ value: 'outage', label: 'Outage' }] }, 'security.country.cyber_severity_scale': { values: [{ value: 'level-1', label: 'Level 1' }] } } } };
    const d = draftPackage(p, 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(d.error);
    const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(a.error);
  });

  it('says nothing is held above the platform default until two officials adopt a scheme and an accreditation, citing the law', async () => {
    who('a1', MIN, 'administrator');
    expect((await (await get()).json()).classification.statement).toMatch(/holds nothing above the platform default/);
    const law = recordVersion({ instrument: { title: 'Security Act', type: 'act', jurisdiction: 'X', year: 2024, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2024-01-01' }, provisions: [{ eId: 'sec_2', num: '2', text: 'Classification levels.' }] }, 'L1', 'l1');
    if ('error' in law) throw new Error(law.error);
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    const scheme = { name: 'Scheme 1', levels: [{ key: 'restricted', label: 'RESTRICTED', handling: 'Need to know' }], caveats: [] };
    expect((await post({ op: 'propose-classification', scheme, accreditation: { level: 'restricted', statement: 'AC-1' }, legalBasis: [{ instrument: law.instrument.id, eId: 'sec_2' }] })).status).toBe(200);
    expect((await post({ op: 'confirm-classification' })).status).toBe(422);
    who('a2', MIN, 'administrator');
    const ok = await post({ op: 'confirm-classification' });
    expect(ok.status).toBe(200);
    expect((await ok.json()).classification.statement).toMatch(/accredited up to RESTRICTED/);
  });

  it('reads a record only with need to know and a purpose (403 otherwise, every attempt logged); lists carry no terms; nothing unpublished is public', async () => {
    who('inc', CYB);
    const actor = { id: 'inc', name: 'Official inc', scope: { id: 'inc', role: 'officer' as const, institution: CYB } };
    const c = openCase({ procedure: 'cyber.incident', fields: { summary: 'Mail outage', affectedServices: 'Mail relay SECRET-DETAIL', discoveredAt: '2026-10-20T08:00:00Z' } }, actor);
    if ('error' in c) throw new Error(c.error);
    const doc = addDocument({ class: 'incident-report', title: 'r', institution: CYB, belongsTo: { kind: 'case', id: c.id }, bytes: new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF')) }, 'Clerk') as { id: string };
    attach(c.id, doc.id, actor);
    const r = await act(c.id, { action: 'register' }, actor);
    if ('error' in r) throw new Error(r.error);
    const n = securityRecordOfCase(c.id)!.number;
    const list = await (await get()).json();
    expect(list.records.map((x: { number: string }) => x.number)).toEqual([n]);
    expect(JSON.stringify(list.records)).not.toMatch(/SECRET-DETAIL/);
    expect((await get(`?record=${n}`)).status).toBe(403);
    expect((await get(`?record=${n}&purpose=Follow-up`)).status).toBe(200);
    who('other', CYB);
    expect((await get(`?record=${n}&purpose=Curious`)).status).toBe(403);
    expect(listAccess({ register: 'security', recordId: n }).map(e => e.result).sort()).toEqual(['allowed', 'refused', 'refused']);
    expect((await (await get('?view=public')).json()).advisories).toEqual([]);
  });
});
