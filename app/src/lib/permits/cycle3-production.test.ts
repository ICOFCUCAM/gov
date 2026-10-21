// Cycle 3 production guard (owner's directive, non-negotiable 7): in a
// production installation, no school, health facility, pharmacy or
// professional decision takes effect until the country has approved the
// authority mapping for that permit type; the proposed defaults are drafts
// and govern nothing; no rate or tariff exists until one is approved.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { EDUCATION_PROCEDURES, HEALTH_PROCEDURES, PROFESSION_PROCEDURES } from '@/lib/casework/modules';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { resetOrganisations, createOrganisation } from '@/lib/organisations/register';
import { resetProfessions } from '@/lib/professions/register';
import { resetRules, calculate } from '@/lib/law/rules';
import { resetPermitAuthorities, installProposedDefaults, mappingInForce } from './authority';

let EDU = '', HR = '', PRO = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const edu = at(() => EDU), hr = at(() => HR), pro = at(() => PRO);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, inst: string, cls: string, who: Actor) => { const d = addDocument({ class: cls, title: cls, institution: inst, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };

describe('cycle 3 decisions in a production installation', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetOrganisations, resetProfessions, resetRules, resetPermitAuthorities]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [EDU, HR, PRO] = listMinistries().slice(0, 3).map(m => m.id) as [string, string, string];
    setSovereign({ deployment: { authorities: { education: EDU, healthRegulation: HR, professionalRegulation: PRO } } }, 'Administrator');
    for (const p of [...EDUCATION_PROCEDURES, ...HEALTH_PROCEDURES, ...PROFESSION_PROCEDURES]) {
      draftPackage(asNationSets(p), 'Author', 'author', registeredEffects());
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
      if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
    installProposedDefaults('Administrator');
    vi.stubEnv('CIVICOS_MODE', 'production');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('the proposed mappings are drafts that govern nothing', () => {
    for (const t of ['school-registration', 'health-facility-licence', 'pharmacy-licence', 'health-professional-licence', 'tax-registration', 'customs-authorisation']) expect(mappingInForce(t), t).toBeUndefined();
  });

  it('refuses a school registration, a facility licence and a professional registration until a mapping is approved', async () => {
    const school = createOrganisation({ name: 'Plain School', kind: 'school' }, 'c', 'R') as { number: string };
    const s = openCase({ procedure: 'edu.school', fields: { organisation: school.number } }, edu('clerk')) as { id: string };
    expect(await act(s.id, { action: 'check' }, edu('clerk'))).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs school-registration/) });

    const clinic = createOrganisation({ name: 'Plain Clinic', kind: 'clinic' }, 'c', 'R') as { number: string };
    const f = openCase({ procedure: 'health.facility', fields: { organisation: clinic.number } }, hr('clerk')) as { id: string };
    expect(await act(f.id, { action: 'check' }, hr('clerk'))).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs health-facility-licence/) });

    const p = openCase({ procedure: 'prof.registration', fields: { profession: 'nurse', personRef: 'BR-1', name: 'N' } }, pro('clerk')) as { id: string };
    doc(p.id, PRO, 'qualification-evidence', pro('clerk')); doc(p.id, PRO, 'identity-evidence', pro('clerk'));
    expect(await act(p.id, { action: 'check' }, pro('clerk'))).not.toHaveProperty('error');
    expect(await act(p.id, { action: 'verify' }, pro('clerk'))).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs health-professional-licence/) });
  });

  it('has no rate or tariff until one is approved', () => {
    expect(calculate('tax.income', { amountMinor: 100 })).toHaveProperty('error');
    expect(calculate('customs.tariff', { amountMinor: 100, code: '0901' })).toHaveProperty('error');
  });
});
