// The pilot's exit gate (spec Part 6 I roadmap 05, S6-I-11; Health I4
// standalone-and-pilot): computed from the records only. In a demonstration,
// where every completed case is a sample, it is not met and lists exactly what
// is missing; in a production installation it is met only once authorised,
// signed-in officials completed a case with real records under an approved
// procedure and mapping, its decision sealed with an approved key, the audit
// chain verifying and the reads in the access log.
import { asNationSets } from '@/lib/casework/testkit';
import { approvedSealKeyFixture } from '@/lib/keys/seal-register.fixture';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

vi.mock('@/lib/data/facilities', () => ({ getFacility: (id: string) => (id === 'site-ward-a' ? { id, state: 'published' } : undefined) }));

const { openCase, act, attach, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions } = await import('@/lib/records/decisions');
const { resetCertificates } = await import('@/lib/records/certificates');
const { resetAccessLog, recordAccess } = await import('@/lib/records/access-log');
const { setSovereign } = await import('@/lib/data/store');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { resetOrganisations, createOrganisation } = await import('@/lib/organisations/register');
const { resetPermitAuthorities, draftMapping, approveMapping } = await import('@/lib/permits/authority');
const { resetSealKeys } = await import('@/lib/keys/seal-register');
// The platform's decision guard (classifies each decision and records its authority), as the app loads it.
await import('@/lib/permits/decisions');
const { HEALTH_PROCEDURES } = await import('@/lib/health/procedures');
const { pilotExitGate } = await import('./exit-gate');
type Actor = import('@/lib/casework/engine').Actor;

const HEALTH = 'min-health';
const KEY = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const hr = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: HEALTH } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }

/** A clinic licensed end to end; returns the case reference. */
async function license(source?: 'sample') {
  const o = createOrganisation({ name: `Clinic ${Math.random().toString(36).slice(2, 6)}`, kind: 'clinic' }, 'c', 'Registrar') as { number: string };
  const c = openCase({ procedure: 'health.facility', fields: { organisation: o.number, campuses: 'site-ward-a' }, ...(source ? { source } : {}) }, hr('clerk')) as { id: string; ref: string };
  if ('error' in c) throw new Error(String((c as { error: string }).error));
  for (const cls of ['premises-evidence', 'fee-receipt']) { const d = addDocument({ class: cls, title: cls, institution: HEALTH, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string }; attach(c.id, d.id, hr('clerk')); }
  await step(c.id, 'check', hr('clerk'));
  await step(c.id, 'inspect', hr('clerk'));
  const r = addDocument({ class: 'inspection-report', title: 'Inspection', institution: HEALTH, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string };
  attach(c.id, r.id, hr('clerk'));
  await step(c.id, 'inspected', hr('clerk'));
  await step(c.id, 'grant', hr('s1', 'signatory'), { reason: 'Meets the standards' });
  await step(c.id, 'grant', hr('s2', 'signatory'));
  await step(c.id, 'issue', hr('clerk'));
  return c;
}

describe('the pilot exit gate', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations, resetAccessLog, resetLaw, resetPermitAuthorities, resetSealKeys]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    setSovereign({ deployment: { authorities: { healthRegulation: HEALTH } } }, 'Administrator');
    for (const p of HEALTH_PROCEDURES) {
      const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
  });
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  it('is not met in a demonstration where every completed case is a sample, and lists exactly what is missing', async () => {
    const before = pilotExitGate();
    expect(before).toMatchObject({ met: false, installation: 'demo', scope: { from: 'health-slots', institutions: [{ id: HEALTH, name: 'Ministry of Health' }] } });
    await license('sample');
    const g = pilotExitGate();
    expect(g.met).toBe(false);
    expect(Object.fromEntries(g.items.map(i => [i.key, i.met]))).toEqual({ scope: true, procedures: true, cases: false, decisions: false, mappings: false, audit: true, reads: false, officials: false });
    expect(g.missing).toEqual([
      'No case of the health institutions has been completed with real records (1 completed sample case(s) are not counted)',
      'No sealed decision on a completed case that is not a sample',
      'No decision to check',
      'No completed case to check',
      'No completed case: no official has acted on real records',
    ]);
    expect(g.procedures.find(p => p.key === 'health.facility')).toMatchObject({ approved: 1, completed: 0, samples: 1 });
    // A real case in a demonstration still has its decision sealed with a sample key and no approved mapping: not met.
    const c = await license();
    recordAccess({ by: { id: 'clerk', name: 'Official clerk', institution: HEALTH }, record: { register: 'cases', id: c.ref }, action: 'view', result: 'allowed' });
    const d = pilotExitGate();
    expect(d.met).toBe(false);
    expect(d.items.find(i => i.key === 'decisions')!.missing).toEqual([expect.stringMatching(new RegExp(`^${c.ref}: decision .* is sealed with a sample key`))]);
    expect(d.items.find(i => i.key === 'mappings')!.missing).toEqual([expect.stringMatching(new RegExp(`^${c.ref}: decided without an approved authority mapping`))]);
    expect(d.items.find(i => i.key === 'cases')).toMatchObject({ met: true, detail: expect.stringContaining(': 1') });
  });

  it('is met in production only from records: an approved procedure, mapping and seal key, signed-in officials, a verifying chain and logged reads', async () => {
    vi.stubEnv('CIVICOS_DECISION_KEY', KEY);
    approvedSealKeyFixture(KEY);
    const v = recordVersion({ instrument: { title: 'Health Facilities Act', type: 'act', jurisdiction: 'X', year: 2001, number: '4', issuingAuthority: 'Parliament' }, dates: { inForce: '2001-01-01' }, provisions: [{ eId: 'sec_3', num: '3', text: 'The health regulator licenses facilities.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    const m = draftMapping({ permitType: 'health-facility-licence', title: 'Health facility licence', lead: 'healthRegulation', effectiveFrom: '2020-01-01', legalBasis: [{ instrument: v.instrument.id, eId: 'sec_3' }] }, 'Admin A', 'aa');
    if ('error' in m) throw new Error(m.error);
    approveMapping('health-facility-licence', 1, 'Admin B', 'ab');
    vi.stubEnv('CIVICOS_MODE', 'production');
    const c = await license();
    const unread = pilotExitGate();
    expect(unread.met).toBe(false);
    expect(unread.missing).toEqual([`${c.ref}: no read of the case is in the access log`]);
    recordAccess({ by: { id: 'clerk', name: 'Official clerk', institution: HEALTH }, record: { register: 'cases', id: c.ref }, action: 'view', result: 'allowed' });
    const g = pilotExitGate();
    expect(g.missing).toEqual([]);
    expect(g).toMatchObject({ met: true, installation: 'production' });
    expect(g.procedures.find(p => p.key === 'health.facility')).toMatchObject({ approved: 1, completed: 1, decisions: { total: 1, verified: 1 } });
    expect(g.officials.map(o => o.name)).toEqual(expect.arrayContaining(['Official clerk', 'Official s1', 'Official s2']));
    // Breaking the evidence breaks the gate: an audit entry changed after the fact.
    const chain = (globalThis as unknown as { __civicos: { audit: { detail?: string }[] } }).__civicos.audit;
    const e = chain[chain.length - 1]!, was = e.detail;
    e.detail = `${was ?? ''} (altered)`;
    (await import('@/lib/data/store/audit')).resetAuditVerification();
    try { expect(pilotExitGate().items.find(i => i.key === 'audit')).toMatchObject({ met: false, missing: [expect.stringMatching(/The audit chain is broken at entry/)] }); }
    finally { e.detail = was; (await import('@/lib/data/store/audit')).resetAuditVerification(); }
  });
});
