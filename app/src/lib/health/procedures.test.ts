import { describe, it, expect, beforeEach, vi } from 'vitest';

// A registered site: the facility register's own tests cover how one is published.
vi.mock('@/lib/data/facilities', () => ({ getFacility: (id: string) => (id === 'site-ward-a' ? { id, state: 'published' } : undefined) }));

const { openCase, act, attach, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions } = await import('@/lib/records/decisions');
const { resetCertificates } = await import('@/lib/records/certificates');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { resetOrganisations, createOrganisation, getOrganisation, setStanding } = await import('@/lib/organisations/register');
const { HEALTH_PROCEDURES } = await import('./procedures');
const { resetHealth, recordCapacity, capacityOf } = await import('./register');
type Actor = import('@/lib/casework/engine').Actor;

let HR = '', EDU = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const hr = at(() => HR), edu = at(() => EDU);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: HR, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, hr('clerk')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }

describe('health facility licensing', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations, resetHealth]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [HR, EDU] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { healthRegulation: HR, education: EDU } } }, 'Administrator');
    for (const p of HEALTH_PROCEDURES) {
      const d = draftPackage(p, 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
  });

  it('licenses a clinic after inspection of its registered premises, then takes its aggregate capacity return; no patient field exists', async () => {
    const o = createOrganisation({ name: 'Riverside Clinic', kind: 'clinic' }, 'c', 'Registrar') as { id: string; number: string };
    // A capacity return needs a licence first.
    expect(recordCapacity({ organisation: o.number, period: '2026-Q3', counts: { 'beds.total': 20 } }, 'Officer')).toMatchObject({ error: expect.stringMatching(/not a licensed/) });
    const c = openCase({ procedure: 'health.facility', fields: { organisation: o.number, campuses: 'site-ward-a' } }, hr('clerk')) as { id: string };
    await step(c.id, 'check', hr('clerk'));
    doc(c.id, 'premises-evidence'); doc(c.id, 'fee-receipt');
    await step(c.id, 'inspect', hr('clerk'));
    expect(getOrganisation(o.number)!.facilities).toEqual(['site-ward-a']);
    doc(c.id, 'inspection-report');
    await step(c.id, 'inspected', hr('clerk'));
    await step(c.id, 'grant', hr('s1', 'signatory'), { reason: 'Meets the standards' });
    await step(c.id, 'grant', hr('s2', 'signatory'));
    expect(getOrganisation(o.number)!.standings.find(s => s.register === 'health-facilities')?.state).toBe('granted');

    expect(recordCapacity({ organisation: o.number, period: '2026-Q3', counts: { 'beds.total': 20, 'beds.intensive-care': 2, 'staff.clinical': 14, 'staff.total': 30 } }, 'Officer')).not.toHaveProperty('error');
    expect(recordCapacity({ organisation: o.number, period: '2026-Q3', counts: { patients: 3 } }, 'Officer')).toMatchObject({ error: expect.stringMatching(/never patients/) });
    expect(recordCapacity({ organisation: o.number, period: '2026-Q3', counts: { 'beds.total': 2, 'beds.intensive-care': 3 } }, 'Officer')).toMatchObject({ error: expect.stringMatching(/more than all beds/) });
    expect(capacityOf(o.number)[0]!.versions).toHaveLength(1);
    // Nothing in the procedures asks for a patient.
    expect(JSON.stringify(HEALTH_PROCEDURES.flatMap(p => p.fields.map(f => f.key)))).not.toMatch(/patient|diagnos|clinical/i);
  });

  it('refuses premises that are not published registered sites, and the education authority cannot license a clinic', async () => {
    const o = createOrganisation({ name: 'Hilltop Clinic', kind: 'clinic' }, 'c', 'Registrar') as { id: string; number: string };
    const c = openCase({ procedure: 'health.facility', fields: { organisation: o.number, campuses: 'not-a-site' } }, hr('clerk')) as { id: string };
    await step(c.id, 'check', hr('clerk'));
    doc(c.id, 'premises-evidence'); doc(c.id, 'fee-receipt');
    expect(await act(c.id, { action: 'inspect' }, hr('clerk'))).toMatchObject({ error: expect.stringMatching(/not a published registered site/) });
    setStanding(o.id, { register: 'schools', state: 'granted', reason: 'test' }, 'R');
    expect(openCase({ procedure: 'health.facility', fields: { organisation: o.number } }, edu('clerk'))).toHaveProperty('error');
  });
});
