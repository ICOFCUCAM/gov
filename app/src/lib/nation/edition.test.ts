// CivicOS Institutional Edition (spec Part 5 D; Health I4 standalone-and-pilot;
// acceptance P1-10, P3-15, P5-01): an installation recorded as the health
// institutions standing alone runs facility licensing, professional
// registration and the medicines register end to end with no other
// institution present, and everything that would need another institution
// degrades explicitly: an exchange call answers "not connected", a step that
// needs another register pauses, a procedure of an institution outside the
// edition opens no case. The edition is recorded in setup, afterwards only
// through the change process (citing the law, a different official confirms);
// none ships.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/data/facilities', () => ({ getFacility: (id: string) => (id === 'site-ward-a' ? { id, state: 'published' } : undefined) }));

const { openCase, act, attach, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions } = await import('@/lib/records/decisions');
const { resetCertificates } = await import('@/lib/records/certificates');
const { setSovereign, getSovereign, proposeEdition, confirmEdition, editionChanges, listAudit } = await import('@/lib/data/store');
const { db } = await import('@/lib/data/store/state');
const { recordVersion: recordLaw, confirmVersion: confirmLaw, resetLaw } = await import('@/lib/law/register');
const { resetOrganisations, createOrganisation, getOrganisation, setStanding } = await import('@/lib/organisations/register');
const { resetProfessions, professionalOfCase } = await import('@/lib/professions/register');
const { resetEducation, recordAward } = await import('@/lib/education/register');
const { resetProducts, getProduct } = await import('@/lib/health/products/register');
const { resetPermitAuthorities } = await import('@/lib/permits/authority');
const { callService } = await import('@/lib/exchange/services');
const { HEALTH_PROCEDURES } = await import('@/lib/health/procedures');
const { PROFESSION_PROCEDURES } = await import('@/lib/professions/procedures');
const { PRODUCT_PROCEDURES } = await import('@/lib/health/products/procedures');
const { EDUCATION_PROCEDURES } = await import('@/lib/education/procedures');
const { moduleRuns } = await import('./deployment');
const { editionScope, editionRefusal, currentEdition } = await import('./edition');
type Actor = import('@/lib/casework/engine').Actor;

const HEALTH = 'min-health', EDU = 'min-education', TRADE = 'min-trade';
const EDITION = { label: 'Health regulation', institutions: [HEALTH], modules: ['health', 'professions'] };
const hr = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: HEALTH } });
const edu = (id: string): Actor => ({ id, name: `Official ${id}`, scope: { id, role: 'officer', institution: EDU } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: HEALTH, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, hr('clerk')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
async function decide(id: string, action: string, reason: string, fields: Record<string, unknown> = {}) {
  expect(await step(id, action, hr('s1', 'signatory'), { reason, fields })).toMatchObject({ pending: true });
  return step(id, action, hr('s2', 'signatory'));
}
/** A deployment profile as /api/sovereign receives it (edition: null takes it away). */
const dep = (x: Record<string, unknown>) => x as never;
const caller = { kind: 'module' as const, id: 'health.facility', name: 'health.facility', institution: HEALTH };

describe('the Institutional Edition: the health institutions standing alone', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations, resetProfessions, resetEducation, resetProducts, resetPermitAuthorities, resetLaw]) r();
    db.setup = null;
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    // The health regulator holds the health slots; education, the business register and customs are other institutions.
    setSovereign({ deployment: dep({ authorities: { healthRegulation: HEALTH, professionalRegulation: HEALTH, medicinesRegulation: HEALTH, education: EDU, businessRegister: TRADE, customs: TRADE }, edition: EDITION }) }, 'Administrator');
    for (const p of [...HEALTH_PROCEDURES, ...PROFESSION_PROCEDURES, ...PRODUCT_PROCEDURES, ...EDUCATION_PROCEDURES]) {
      const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
  });
  afterEach(() => { db.setup = null; setSovereign({ deployment: dep({ authorities: {}, edition: null }) }, 'test'); vi.unstubAllEnvs(); });

  it('is recorded in setup and names its institutions, modules, registers and procedures; nothing outside it runs', () => {
    expect(currentEdition()).toMatchObject({ kind: 'institutional', label: 'Health regulation', institutions: [HEALTH] });
    const scope = editionScope();
    expect(scope.institutions).toEqual([{ id: HEALTH, name: 'Ministry of Health', slots: ['healthRegulation', 'professionalRegulation', 'medicinesRegulation'] }]);
    expect(scope.registers.map(r => r.id)).toEqual(expect.arrayContaining(['health', 'professions', 'products', 'medicine-imports']));
    expect(scope.registers.map(r => r.id)).not.toContain('education');
    expect(scope.procedures.map(p => p.key)).toEqual(expect.arrayContaining(['health.facility', 'prof.registration', 'medicines.authorisation']));
    expect(scope.procedures.map(p => p.key)).not.toContain('edu.inspection');
    expect(scope.notConnected.map(n => n.slot)).toEqual(expect.arrayContaining(['education', 'businessRegister', 'customs']));
    expect(moduleRuns(getSovereign().deployment, 'health')).toBe(true);
    expect(moduleRuns(getSovereign().deployment, 'education')).toBe(false);
    expect(moduleRuns(getSovereign().deployment, 'customs')).toBe(false);
    // A procedure of an institution outside the edition opens no case, whoever asks.
    expect(openCase({ procedure: 'edu.inspection', fields: { organisation: 'ORG-2026-000001' } }, edu('clerk'))).toMatchObject({ error: expect.stringMatching(/^Not connected: this installation runs as the Institutional Edition "Health regulation"; Ministry of Education is not part of it/) });
    expect(editionRefusal(HEALTH)).toBeNull();
    // No edition ships: without one every institution is connected.
    setSovereign({ deployment: dep({ edition: null }) }, 'Administrator');
    expect(currentEdition()).toBeUndefined();
    expect(editionRefusal(EDU)).toBeNull();
  });

  it('runs facility licensing, professional registration and the medicines register end to end with no other institution present', async () => {
    // Facility licensing: application, inspection of registered premises, two officials decide.
    const clinic = createOrganisation({ name: 'Riverside Clinic', kind: 'clinic' }, 'c', 'Registrar') as { number: string };
    const c = openCase({ procedure: 'health.facility', fields: { organisation: clinic.number, campuses: 'site-ward-a' } }, hr('clerk')) as { id: string };
    await step(c.id, 'check', hr('clerk'));
    doc(c.id, 'premises-evidence'); doc(c.id, 'fee-receipt');
    await step(c.id, 'inspect', hr('clerk'));
    doc(c.id, 'inspection-report');
    await step(c.id, 'inspected', hr('clerk'));
    const licence = await decide(c.id, 'grant', 'Meets the standards');
    expect(licence.decision).toBeDefined();
    expect(getOrganisation(clinic.number)!.standings.find(s => s.register === 'health-facilities')?.state).toBe('granted');

    // Professional registration with a qualification as stated (no other register is needed).
    const r = openCase({ procedure: 'prof.registration', fields: { profession: 'nurse', personRef: 'BR-1999-000044', name: 'Grace Achieng', qualifications: 'Diploma in Nursing (as stated)', validUntil: '2030-12-31' } }, hr('clerk')) as { id: string };
    doc(r.id, 'qualification-evidence'); doc(r.id, 'identity-evidence');
    await step(r.id, 'check', hr('clerk'));
    await step(r.id, 'verify', hr('clerk'));
    await decide(r.id, 'register', 'Qualified');
    expect(professionalOfCase(r.id)).toMatchObject({ state: 'registered' });

    // The medicines register: a marketing authorisation from application to a sealed decision.
    const holder = (createOrganisation({ name: 'Sample Pharma Ltd', kind: 'company' }, 'c', 'Registrar') as { number: string }).number;
    const m = openCase({ procedure: 'medicines.authorisation', fields: { holder, productName: 'Sampleprofen', strength: '200 mg', activeIngredients: 'ibuprofen' } }, hr('clerk')) as { id: string };
    doc(m.id, 'application-form'); await step(m.id, 'register', hr('clerk'));
    doc(m.id, 'dossier'); await step(m.id, 'record-dossier', hr('clerk'));
    doc(m.id, 'assessment-report'); await step(m.id, 'assess', hr('clerk'), { reason: 'Benefits outweigh risks' });
    const ma = await decide(m.id, 'authorise', 'Quality, safety and efficacy shown', { validUntil: '2031-05-01' });
    const number = (ma.decision!.content.facts as { product: string }).product;
    expect(getProduct(number)).toMatchObject({ state: 'authorised' });
    // Its own exchange service answers inside the edition.
    expect(await callService(caller, 'product.status', { number }, 'Checking a product')).toMatchObject({ status: 200 });
  });

  it('degrades explicitly: a service another institution owns answers "not connected", and a step that needs another register pauses', async () => {
    for (const [service, input] of [['qualification.verify', { number: 'QUA-2026-000001', holderName: 'Grace Achieng' }], ['organisation.standing', { number: 'ORG-2026-000001', register: 'companies' }], ['customs.release', { number: 'CD-1' }]] as const) {
      const r = await callService(caller, service, input, 'Checking an application');
      // Never a guess: no answer field the service defines, only that it is not connected, with a receipt.
      expect(r).toMatchObject({ status: 503, error: expect.stringMatching(/^Not connected: .* is not part of this installation's Institutional Edition "Health regulation". The check was not performed\./), data: { connected: 'no' }, receipt: expect.objectContaining({ id: expect.any(String) }) });
      expect(Object.keys(r.data!)).toEqual(['connected']);
    }
    // A qualification held in the education register cannot be checked here: the verification step pauses with the reason.
    const school = createOrganisation({ name: 'College of Nursing', kind: 'college' }, 'c', 'R') as { id: string; number: string };
    setStanding(school.id, { register: 'schools', state: 'granted', reason: 'ok' }, 'R');
    setSovereign({ deployment: dep({ edition: null }) }, 'Administrator');
    const qua = (recordAward({ holderRef: 'BR-1999-000044', holderName: 'Grace Achieng', title: 'Diploma in Nursing', awardingBody: school.number, awardedOn: '2024-07-01' }, 'c', 'Officer') as { number: string }).number;
    setSovereign({ deployment: dep({ edition: EDITION }) }, 'Administrator');
    const r = openCase({ procedure: 'prof.registration', fields: { profession: 'nurse', personRef: 'BR-1999-000044', name: 'Grace Achieng', qualifications: qua, validUntil: '2030-12-31' } }, hr('clerk')) as { id: string };
    doc(r.id, 'qualification-evidence'); doc(r.id, 'identity-evidence');
    await step(r.id, 'check', hr('clerk'));
    expect(await act(r.id, { action: 'verify' }, hr('clerk'))).toMatchObject({ error: expect.stringMatching(/^Not connected: Education .* The check was not performed\. Record the qualification as stated/) });
  });

  it('changes after setup only through the change process: cited, confirmed by a different official, every version kept', () => {
    const law = recordLaw({ instrument: { title: 'Health Services Act', type: 'act', jurisdiction: 'X', year: 2020, number: '3', issuingAuthority: 'Assembly' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_2', num: '2', text: 'The regulator.' }] }, 'L1', 'l1');
    if ('error' in law) throw new Error(law.error);
    confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
    db.setup = { completedAt: new Date().toISOString(), by: 'First Admin', stateName: 'Testland' };
    expect(setSovereign({ deployment: dep({ edition: { ...EDITION, modules: ['health'] } }) }, 'Administrator')).toMatchObject({ error: expect.stringMatching(/only through the change process/) });
    // Resending the same edition is not a change.
    expect(setSovereign({ deployment: dep({ edition: EDITION }) }, 'Administrator')).not.toHaveProperty('error');
    expect(proposeEdition({ edition: { ...EDITION, modules: ['health'] } } as never, { by: 'Admin A', byId: 'a' })).toMatchObject({ error: expect.stringMatching(/Cite the legal basis/) });
    const p = proposeEdition({ edition: { ...EDITION, modules: ['health'] }, legalBasis: [{ instrument: law.instrument.id, eId: 'sec_2' }] }, { by: 'Admin A', byId: 'a' });
    expect(p).not.toHaveProperty('error');
    expect(confirmEdition({ by: 'Admin A', byId: 'a' })).toMatchObject({ error: expect.stringMatching(/second, different official/) });
    expect(currentEdition()!.modules).toEqual(['health', 'professions']);
    expect(confirmEdition({ by: 'Admin B', byId: 'b' })).not.toHaveProperty('error');
    expect(currentEdition()!.modules).toEqual(['health']);
    expect(editionChanges().history).toEqual([expect.objectContaining({ outcome: 'adopted', by: 'Admin A', confirmed: expect.objectContaining({ by: 'Admin B' }) })]);
    expect(listAudit().filter(e => e.action.startsWith('sovereign.edition')).map(e => e.action)).toEqual(expect.arrayContaining(['sovereign.edition.propose', 'sovereign.edition']));
  });
});
