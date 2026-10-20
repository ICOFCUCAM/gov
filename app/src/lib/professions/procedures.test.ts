import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { checkCode, resetCertificates } from '@/lib/records/certificates';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { resetOrganisations, createOrganisation, setStanding } from '@/lib/organisations/register';
import { resetEducation, recordAward } from '@/lib/education/register';
import { PROFESSION_PROCEDURES } from './procedures';
import { resetProfessions, professionalOfCase, checkProfessional, getProfessional, lapseRegistrations } from './register';

let PRO = '', OTHER = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const pro = at(() => PRO), other = at(() => OTHER);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: PRO, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, pro('clerk')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }

describe('professional register procedures', () => {
  let qua = '';
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations, resetEducation, resetProfessions]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [PRO, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { professionalRegulation: PRO } } }, 'Administrator');
    for (const p of PROFESSION_PROCEDURES) {
      const d = draftPackage(p, 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
    const school = createOrganisation({ name: 'College of Nursing', kind: 'college' }, 'c', 'R') as { id: string; number: string };
    setStanding(school.id, { register: 'schools', state: 'granted', reason: 'ok' }, 'R');
    qua = (recordAward({ holderRef: 'BR-1999-000044', holderName: 'Grace Achieng', title: 'Diploma in Nursing', awardingBody: school.number, awardedOn: '2024-07-01' }, 'c', 'Officer') as { number: string }).number;
  });

  async function register(name: string, quals: string) {
    const c = openCase({ procedure: 'prof.registration', fields: { profession: 'nurse', personRef: 'BR-1999-000044', name, qualifications: quals, validUntil: '2027-12-31' } }, pro('clerk')) as { id: string };
    doc(c.id, 'qualification-evidence'); doc(c.id, 'identity-evidence');
    await step(c.id, 'check', pro('clerk'));
    return c.id;
  }

  it('registers a nurse with a qualification from the education register, shows the public check, suspends, reinstates and revokes with four eyes', async () => {
    const id = await register('Grace Achieng', qua);
    await step(id, 'verify', pro('clerk'));
    await step(id, 'register', pro('s1', 'signatory'), { reason: 'Qualified' });
    await step(id, 'register', pro('s2', 'signatory'));
    await step(id, 'issue', pro('clerk'));
    const e = professionalOfCase(id)!;
    expect(e).toMatchObject({ state: 'registered', qualifications: [qua], validUntil: '2027-12-31' });
    expect(checkCode(e.certificate!)).toMatchObject({ status: 'valid', publicFacts: { 'Registration number': e.number } });
    // Public check: by number or full name; never the person reference or qualifications.
    const pub = checkProfessional('grace achieng');
    expect(pub).toEqual([expect.objectContaining({ number: e.number, professionTitle: 'Nurses', state: 'registered' })]);
    expect(JSON.stringify(pub)).not.toMatch(/BR-1999|QUA-/);
    expect(checkProfessional('Gra')).toEqual([]);

    // Another institution cannot act on the nurses' register.
    const x = openCase({ procedure: 'prof.fitness', fields: { professional: e.number } }, other('clerk'));
    expect(x, JSON.stringify(x)).toHaveProperty('error');

    const f = openCase({ procedure: 'prof.fitness', fields: { professional: e.number } }, pro('clerk')) as { id: string };
    doc(f.id, 'grounds');
    await step(f.id, 'notify', pro('clerk'), { reason: 'Complaint received' });
    await step(f.id, 'propose', pro('clerk'), { reason: 'Representations considered' });
    expect(await step(f.id, 'suspend', pro('s1', 'signatory'), { reason: 'Pending retraining' })).toMatchObject({ pending: true });
    await step(f.id, 'suspend', pro('s2', 'signatory'));
    expect(getProfessional(e.number)!.state).toBe('suspended');
    await step(f.id, 'reinstate', pro('s1', 'signatory'), { reason: 'Retraining completed', fields: { conditions: 'Supervised practice for six months' } });
    await step(f.id, 'reinstate', pro('s2', 'signatory'));
    expect(getProfessional(e.number)).toMatchObject({ state: 'registered', conditions: ['Supervised practice for six months'] });
    // Lapses after its validity.
    expect(lapseRegistrations(new Date('2028-01-02'))).toEqual([e.number]);
    expect(getProfessional(e.number)!.state).toBe('lapsed');
  });

  it('refuses a qualification recorded for someone else', async () => {
    const id = await register('Someone Else', qua);
    expect(await act(id, { action: 'verify' }, pro('clerk'))).toMatchObject({ error: expect.stringMatching(/recorded for someone else/) });
  });
});
