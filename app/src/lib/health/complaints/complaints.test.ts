// Complaint intake of the health regulators (Health I4 dependency
// health-department-functions; HLT-FAC-009, HLT-LIC-008): registered, assessed
// by the assigned officer with reasons, and referred into the regulator's own
// case on the licence or registration through the engine's referral (linked
// both ways), or closed with reasons. The complainant's identity and the
// complaint are restricted: never in a list, never passed to the referred case,
// and every read of the case, allowed or refused, is in the access log. No
// clinical field.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let official: { id: string; name: string; label: string; institution?: string; role: string } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => (official ? { ...official, sub: official.id } : null),
  caseScope: async () => official,
  refusal: async () => null,
  withOfficial: async <T,>(b: T) => b,
}));

const { openCase, act, attach, getCase, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { resetOrganisations, createOrganisation, setStanding } = await import('@/lib/organisations/register');
const { resetProfessions, registerProfessional } = await import('@/lib/professions/register');
const { resetPermitAuthorities } = await import('@/lib/permits/authority');
const { listView } = await import('@/lib/casework/view');
const { isPersonalField } = await import('@/lib/forms/contract');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { HEALTH_PROCEDURES } = await import('@/lib/health/procedures');
const { PROFESSION_PROCEDURES } = await import('@/lib/professions/procedures');
const { COMPLAINT_PROCEDURES } = await import('./procedures');
const { CATALOGUE_CONTRACTS } = await import('@/lib/forms/library/catalogue-contracts');
const casesRoute = await import('@/app/api/cases/[id]/route');
type Actor = import('@/lib/casework/engine').Actor;
type Ref = (typeof COMPLAINT_PROCEDURES)[number];

let HR = '', PR = '', OTHER = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const hr = at(() => HR), pr = at(() => PR);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, who: Actor) => { const d = addDocument({ class: cls, title: cls, institution: who.scope!.institution!, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const LISTS: Record<string, string[]> = { 'health.country.facility_concern_kinds': ['unsafe-premises'], 'health.country.conduct_complaint_kinds': ['conduct'], 'health.country.complainant_relationships': ['member-of-public'] };
const nation = (p: Ref) => {
  const used = Object.keys(LISTS).filter(k => p.fields.some(f => f.valuesSource?.kind === 'configured' && f.valuesSource.list === k));
  return { ...asNationSets(p), ...(used.length ? { form: { version: 'nation-1', lists: Object.fromEntries(used.map(k => [k, { values: LISTS[k]!.map(v => ({ value: v, label: v })) }])) } } : {}) };
};
const read = async (id: string, as: { id: string; institution: string }) => {
  official = { id: as.id, name: `Official ${as.id}`, label: `Official ${as.id}`, institution: as.institution, role: 'officer' };
  return (await casesRoute.GET(new NextRequest(`http://localhost/api/cases/${id}`), { params: Promise.resolve({ id }) })).status;
};
const SECRET = { raisedByName: 'COMPLAINANT-NAME-RESTRICTED', raisedByContact: { method: 'email', value: 'complainant@example.org' }, raisedByRelationship: 'member-of-public', identityShared: false };

let facility = '', professional = '';
describe('health complaint intake', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetOrganisations, resetProfessions, resetPermitAuthorities, resetAccessLog]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    official = null;
    [HR, PR, OTHER] = listMinistries().slice(0, 3).map(m => m.id) as [string, string, string];
    setSovereign({ deployment: { authorities: { healthRegulation: HR, professionalRegulation: PR } } }, 'Administrator');
    for (const p of [...HEALTH_PROCEDURES.filter(x => x.key.endsWith('-suspension')), ...PROFESSION_PROCEDURES.filter(x => x.key === 'prof.fitness'), ...COMPLAINT_PROCEDURES]) {
      const d = draftPackage(nation(p as Ref), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
    const o = createOrganisation({ name: 'Sample Clinic', kind: 'hospital' }, 'c', 'Registrar') as { id: string; number: string };
    setStanding(o.id, { register: 'health-facilities', state: 'granted', reason: 'Licensed' }, 'Registrar');
    facility = o.number;
    professional = (registerProfessional({ profession: 'nurse', personRef: 'P-1', name: 'Sample Nurse' }, 'case-r', 'Registrar') as { number: string }).number;
  });
  afterEach(() => vi.unstubAllEnvs());

  it('keeps both procedures free of clinical fields, the complainant and the complaint restricted, and links the contracts by identity', () => {
    for (const p of COMPLAINT_PROCEDURES) {
      expect(p.sensitivity, p.key).toBe('restricted');
      for (const f of p.fields) expect(`${f.key} ${f.label}`, `${p.key} ${f.key}`).not.toMatch(/patient|clinical|diagnos|prescri|treatment|medication|symptom|medical record|health condition|score|rating/i);
      for (const k of ['raisedByName', 'raisedByContact', 'raisedByAnonymous', 'raisedByRelationship', 'identityShared', 'description', 'when', 'category', 'referralReason']) expect(isPersonalField(p.fields.find(f => f.key === k)!), `${p.key} ${k}`).toBe(true);
      expect(p.actions.filter(a => a.decision), `${p.key}: a complaint decides nothing`).toEqual([]);
      expect(JSON.stringify(p.actions)).not.toMatch(/\bai\b|advisory|model/i);
    }
    expect(CATALOGUE_CONTRACTS.find(f => f.specId === 'HLT-FAC-009')!.procedure).toMatchObject({ key: 'health.complaint', stage: 'received', action: 'register', document: 'complaint' });
    expect(CATALOGUE_CONTRACTS.find(f => f.specId === 'HLT-LIC-008')!.procedure).toMatchObject({ key: 'prof.complaint', stage: 'received', action: 'register', document: 'complaint' });
  });

  it('takes a facility complaint, assessed by the assigned officer with reasons, and refers it to the facility\'s licence; every read logged', async () => {
    const c = openCase({ procedure: 'health.complaint', fields: { facilityNamed: 'Sample Clinic, main street', facility, category: 'unsafe-premises', description: 'COMPLAINT-TEXT: fire exits blocked', riskNow: true, ...SECRET } }, hr('clerk')) as { id: string };
    expect(JSON.stringify(listView(getCase(c.id)!))).not.toMatch(/COMPLAINANT-NAME|complainant@example\.org|COMPLAINT-TEXT/);
    doc(c.id, 'complaint', hr('clerk')); await step(c.id, 'register', hr('clerk'));
    doc(c.id, 'assessment-report', hr('clerk'));
    expect(await act(c.id, { action: 'assess', reason: 'x' }, hr('other-officer'))).toHaveProperty('error');
    expect(await act(c.id, { action: 'assess' }, hr('clerk'))).toMatchObject({ error: 'State the reasons' });
    await step(c.id, 'assess', hr('clerk'), { reason: 'Blocked fire exits seen on the photographs' });
    // A pharmacy suspension does not fit a facility licensed only as a health facility.
    expect(await act(c.id, { action: 'refer', reason: 'x', fields: { followUp: 'health.pharmacy-suspension' } }, hr('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/not licensed in the register/) });
    const r = await step(c.id, 'refer', hr('s1', 'signatory'), { reason: 'Risk to people in the building', fields: { followUp: 'health.facility-suspension' } });
    expect(r.decision).toBeUndefined();
    const link = getCase(c.id)!.links.find(l => l.kind === 'referral')!;
    const opened = getCase(link.case)!;
    expect(opened).toMatchObject({ package: { key: 'health.facility-suspension' }, stage: 'opened', fields: { organisation: facility }, links: [{ kind: 'referred-from', case: c.id }] });
    expect(JSON.stringify(opened)).not.toMatch(/COMPLAINANT-NAME|complainant@example\.org|COMPLAINT-TEXT/);
    // The regulator's officials read it (logged); another institution is refused (logged).
    expect(await read(c.id, { id: 'clerk', institution: HR })).toBe(200);
    expect(await read(c.id, { id: 'nosy', institution: OTHER })).toBe(403);
    expect(listAccess({}).filter(e => e.record.id === getCase(c.id)!.ref).map(e => e.result).sort()).toEqual(['allowed', 'refused']);
  });

  it('takes a conduct complaint about a registered professional and refers it to a fitness-to-practise case, or closes it with reasons', async () => {
    // Another institution cannot take it.
    expect(openCase({ procedure: 'prof.complaint', fields: { professionalNamed: 'Sample Nurse', description: 'x' } }, hr('clerk'))).toHaveProperty('error');
    const c = openCase({ procedure: 'prof.complaint', fields: { professionalNamed: 'Sample Nurse at the clinic', professional, facility, category: 'conduct', description: 'COMPLAINT-TEXT: rude and unsafe', ...SECRET } }, pr('clerk')) as { id: string };
    doc(c.id, 'complaint', pr('clerk')); await step(c.id, 'register', pr('clerk'));
    doc(c.id, 'assessment-report', pr('clerk')); await step(c.id, 'assess', pr('clerk'), { reason: 'Two consistent accounts' });
    await step(c.id, 'refer', pr('s1', 'signatory'), { reason: 'Possible unsafe practice', fields: { followUp: 'prof.fitness' } });
    const fitness = getCase(getCase(c.id)!.links.find(l => l.kind === 'referral')!.case)!;
    expect(fitness).toMatchObject({ package: { key: 'prof.fitness' }, stage: 'opened', fields: { professional } });
    expect(JSON.stringify(fitness)).not.toMatch(/COMPLAINANT-NAME|complainant@example\.org|COMPLAINT-TEXT/);
    // An unknown professional is refused; a complaint with nothing to act on is closed with reasons.
    const bad = openCase({ procedure: 'prof.complaint', fields: { professionalNamed: 'Someone', professional: 'PRN-1999-000001', description: 'x' } }, pr('clerk')) as { id: string };
    doc(bad.id, 'complaint', pr('clerk'));
    expect(await act(bad.id, { action: 'register' }, pr('clerk'))).toMatchObject({ error: expect.stringMatching(/No registered professional/) });
    const none = openCase({ procedure: 'prof.complaint', fields: { professionalNamed: 'Someone', description: 'Not about a registered professional' } }, pr('clerk')) as { id: string };
    doc(none.id, 'complaint', pr('clerk')); await step(none.id, 'register', pr('clerk'));
    const closed = await step(none.id, 'close', pr('s1', 'signatory'), { reason: 'Not a regulated professional' });
    expect(closed.case).toMatchObject({ stage: 'closed', closedAt: expect.any(String) });
  });
});
