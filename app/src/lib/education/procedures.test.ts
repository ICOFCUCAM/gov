import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { checkCode, resetCertificates } from '@/lib/records/certificates';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { ORGANISATION_PROCEDURES } from '@/lib/organisations/procedures';
import { resetOrganisations, getOrganisation, listOrganisations } from '@/lib/organisations/register';
import { EDUCATION_PROCEDURES } from './procedures';
import { resetEducation, inspectionsOf, getAward, verifyAward, awardOfCase } from './register';

let REG = '', EDU = '';
const at = (inst: () => string, n: string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `${n} ${id}`, scope: { id, role, institution: inst() } });
const reg = at(() => REG, 'Registry'), edu = at(() => EDU, 'Education');
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, inst: string, cls: string, who: Actor) => { const d = addDocument({ class: cls, title: cls, institution: inst, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }

describe('education procedures', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations, resetEducation]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [REG, EDU] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { businessRegister: REG, education: EDU } } }, 'Administrator');
    for (const p of [...ORGANISATION_PROCEDURES, ...EDUCATION_PROCEDURES]) {
      const d = draftPackage(p, 'Author', 'author', registeredEffects());
      if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
      if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
  });

  async function school(name: string): Promise<string> {
    const c = openCase({ procedure: 'org.registration', fields: { orgName: name, orgKind: 'school', representativeName: 'Head teacher' } }, reg('clerk')) as { id: string };
    doc(c.id, REG, 'constitution', reg('clerk')); doc(c.id, REG, 'representative-identity', reg('clerk'));
    await step(c.id, 'check', reg('clerk')); await step(c.id, 'verify', reg('clerk'));
    await step(c.id, 'register', reg('s1', 'signatory'), { reason: 'ok' }); await step(c.id, 'register', reg('s2', 'signatory'));
    return listOrganisations({ q: name })[0]!.number;
  }

  it('registers a school on the one organisation record, inspects it, records a qualification and checks it without a name on the certificate', async () => {
    const number = await school('Hillside Secondary School');
    // School registration: the education authority's family of the shared licence procedure, on the schools register.
    const s = openCase({ procedure: 'edu.school', fields: { organisation: number } }, edu('clerk')) as { id: string };
    await step(s.id, 'check', edu('clerk'));
    doc(s.id, EDU, 'premises-evidence', edu('clerk')); doc(s.id, EDU, 'fee-receipt', edu('clerk'));
    await step(s.id, 'propose', edu('clerk'), { reason: 'Complete' });
    await step(s.id, 'grant', edu('s1', 'signatory'), { reason: 'Meets the requirements' });
    await step(s.id, 'grant', edu('s2', 'signatory'));
    const org = getOrganisation(number)!;
    expect(org.standings.map(x => x.register).sort()).toEqual(['companies', 'schools']);
    expect(listOrganisations({ q: 'Hillside' })).toHaveLength(1);

    // The business register cannot run the education authority's procedure on the schools register.
    const wrong = openCase({ procedure: 'org.licence', fields: { organisation: number, register: 'schools' } }, reg('clerk')) as { id: string };
    expect(await act(wrong.id, { action: 'check' }, reg('clerk'))).toMatchObject({ error: expect.stringMatching(/kept by another authority/) });

    // Inspection.
    const i = openCase({ procedure: 'edu.inspection', fields: { organisation: number } }, edu('clerk')) as { id: string };
    await step(i.id, 'schedule', edu('clerk'));
    doc(i.id, EDU, 'inspection-report', edu('clerk'));
    await step(i.id, 'report', edu('clerk'), { fields: { inspectionDate: '2026-02-01', outcome: 'improvement-required', summary: 'Science laboratory needs ventilation' } });
    expect(inspectionsOf(number)).toEqual([expect.objectContaining({ outcome: 'improvement-required', register: 'schools' })]);

    // A qualification awarded by the registered school.
    const q = openCase({ procedure: 'edu.qualification', fields: { holderRef: 'BR-2008-000123', holderName: 'Amara Okafor', title: 'Secondary School Certificate', awardingBody: number, awardedOn: '2026-07-15' } }, edu('clerk')) as { id: string };
    doc(q.id, EDU, 'award-evidence', edu('clerk'));
    await step(q.id, 'check', edu('clerk')); await step(q.id, 'verify', edu('clerk'));
    // Recording a qualification needs two officials (the platform's minimum for credentials).
    expect(await step(q.id, 'record', edu('s1', 'signatory'), { reason: 'Results list confirmed' })).toMatchObject({ pending: true });
    await step(q.id, 'record', edu('s2', 'signatory'));
    const award = awardOfCase(q.id);
    expect(award).toMatchObject({ state: 'valid', accreditation: { register: 'schools' } });
    const issued = await step(q.id, 'issue', edu('clerk'));
    expect(issued.case.stage).toBe('certificate-issued');
    const cert = checkCode(getAward(award!.number)!.certificate!);
    expect(cert).toMatchObject({ status: 'valid', publicFacts: { 'Qualification number': award!.number } });
    expect(JSON.stringify(cert)).not.toMatch(/Amara|BR-2008/);

    // Verification needs the number and the holder's name; a wrong name answers like an unknown number.
    expect(verifyAward(award!.number, 'amara  OKAFOR')).toMatchObject({ valid: true, title: 'Secondary School Certificate', awardingBody: 'Hillside Secondary School' });
    expect(verifyAward(award!.number, 'Someone Else')).toEqual({ valid: false });
    expect(JSON.stringify(verifyAward(award!.number, 'Amara Okafor'))).not.toMatch(/BR-2008/);

    // Correction (four-eyes) keeps the earlier version; revocation after notice ends validity.
    const c = openCase({ procedure: 'edu.qualification-correction', fields: { qualification: award!.number, holderName: 'Amara N. Okafor' } }, edu('clerk')) as { id: string };
    doc(c.id, EDU, 'correction-evidence', edu('clerk'));
    await step(c.id, 'propose', edu('clerk'), { reason: 'Middle name omitted' });
    expect(await step(c.id, 'correct', edu('s1', 'signatory'), { reason: 'Evidence shows the full name' })).toMatchObject({ pending: true });
    await step(c.id, 'correct', edu('s2', 'signatory'));
    expect(getAward(award!.number)!.versions.map(v => v.holderName)).toEqual(['Amara Okafor', 'Amara N. Okafor']);
    const v = openCase({ procedure: 'edu.qualification-revocation', fields: { qualification: award!.number } }, edu('clerk')) as { id: string };
    doc(v.id, EDU, 'grounds', edu('clerk'));
    await step(v.id, 'notify', edu('clerk'), { reason: 'Awarding body reports malpractice' });
    await step(v.id, 'propose', edu('clerk'), { reason: 'Considered' });
    await step(v.id, 'revoke', edu('s1', 'signatory'), { reason: 'Malpractice established' });
    await step(v.id, 'revoke', edu('s2', 'signatory'));
    expect(verifyAward(award!.number, 'Amara N. Okafor')).toEqual({ valid: false });
  });

  it('refuses a qualification from a body that is not accredited or registered as a school', async () => {
    const c = openCase({ procedure: 'org.registration', fields: { orgName: 'Diploma Mill Ltd', orgKind: 'company', representativeName: 'X' } }, reg('clerk')) as { id: string };
    doc(c.id, REG, 'constitution', reg('clerk')); doc(c.id, REG, 'representative-identity', reg('clerk'));
    await step(c.id, 'check', reg('clerk')); await step(c.id, 'verify', reg('clerk'));
    await step(c.id, 'register', reg('s1', 'signatory'), { reason: 'ok' }); await step(c.id, 'register', reg('s2', 'signatory'));
    const number = listOrganisations({ q: 'Diploma Mill' })[0]!.number;
    const q = openCase({ procedure: 'edu.qualification', fields: { holderRef: 'P-1', holderName: 'A', title: 'Degree', awardingBody: number, awardedOn: '2026-01-01' } }, edu('clerk')) as { id: string };
    doc(q.id, EDU, 'award-evidence', edu('clerk'));
    await step(q.id, 'check', edu('clerk')); await step(q.id, 'verify', edu('clerk'));
    await step(q.id, 'record', edu('s1', 'signatory'), { reason: 'x' });
    expect(await act(q.id, { action: 'record' }, edu('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/not accredited or registered/) });
  });
});
