// Organisations register types for medicines manufacturers, importers and
// wholesalers (Health I4 dependency register-types): standings kept by the
// medicines authority the nation names, changed only through the effects of
// their licence procedures; the holder of a product authorisation is an
// organisation of the same register, never a second identity.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/data/facilities', () => ({ getFacility: (id: string) => (id === 'site-plant-a' ? { id, state: 'published' } : undefined) }));

const { openCase, act, attach, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions } = await import('@/lib/records/decisions');
const { resetCertificates } = await import('@/lib/records/certificates');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { resetOrganisations, createOrganisation, getOrganisation, registerType } = await import('@/lib/organisations/register');
const { HEALTH_PROCEDURES } = await import('@/lib/health/procedures');
const { PRODUCT_PROCEDURES, ORGANISATION_LICENCES } = await import('./procedures');
type Actor = import('@/lib/casework/engine').Actor;

let MED = '', HR = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const med = at(() => MED), hr = at(() => HR);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: MED, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, med('clerk')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }

describe('register types for manufacturers, importers and wholesalers', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [MED, HR] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { medicinesRegulation: MED, healthRegulation: HR } } }, 'Administrator');
    for (const p of [...PRODUCT_PROCEDURES, ...HEALTH_PROCEDURES]) {
      draftPackage(asNationSets(p), 'Author', 'author', registeredEffects());
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
  });

  it('are kept by the medicines authority slot, each with its own permit type, open to the public check', () => {
    for (const [key, permit] of [['medicine-manufacturers', 'medicine-manufacturing-licence'], ['medicine-importers', 'medicine-import-licence'], ['medicine-wholesalers', 'medicine-wholesale-licence']]) {
      expect(registerType(key!), key).toMatchObject({ authority: 'medicinesRegulation', kind: 'licence', permitType: permit, publicCheck: true, reference: true });
    }
    expect(ORGANISATION_LICENCES.map(p => p.key)).toEqual(expect.arrayContaining(['medicines.manufacturer', 'medicines.importer', 'medicines.wholesaler', 'medicines.manufacturer-suspension']));
    for (const p of ORGANISATION_LICENCES) { expect(p.owner).toBe('medicinesRegulation'); for (const d of p.deadlines) expect(d.sampleDays, p.key).toBeUndefined(); }
  });

  it('are changed only by the medicines authority, through the licence procedures\' effects, after inspection of registered premises', async () => {
    const o = createOrganisation({ name: 'Sample Manufacturing Ltd', kind: 'company' }, 'c', 'Registrar') as { number: string };
    const c = openCase({ procedure: 'medicines.manufacturer', fields: { organisation: o.number, campuses: 'site-plant-a' } }, med('clerk')) as { id: string };
    await step(c.id, 'check', med('clerk'));
    doc(c.id, 'premises-evidence'); doc(c.id, 'fee-receipt');
    await step(c.id, 'inspect', med('clerk'));
    doc(c.id, 'inspection-report');
    await step(c.id, 'inspected', med('clerk'));
    await step(c.id, 'grant', med('s1', 'signatory'), { reason: 'Good manufacturing practice shown' });
    await step(c.id, 'grant', med('s2', 'signatory'));
    expect(getOrganisation(o.number)!.standings.find(s => s.register === 'medicine-manufacturers')).toMatchObject({ state: 'granted' });
    expect(getOrganisation(o.number)!.facilities).toEqual(['site-plant-a']);
    // The health regulator cannot open a manufacturing licence case, nor reach the register through its pharmacy procedure.
    expect(openCase({ procedure: 'medicines.manufacturer', fields: { organisation: o.number } }, hr('clerk'))).toHaveProperty('error');
    const p = openCase({ procedure: 'health.pharmacy', fields: { organisation: o.number, register: 'medicine-wholesalers' } }, hr('clerk')) as { id: string };
    expect(await act(p.id, { action: 'check' }, hr('clerk'))).toMatchObject({ error: expect.stringMatching(/kept by another authority/) });
  });
});
