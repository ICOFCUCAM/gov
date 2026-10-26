// Citizenship determinations (plan step I6; field series Part 4 §6): only once
// the nation names its competent authority, the assessment of each criterion
// recorded (an identity number, passport or birthplace is never conclusive by
// itself), determined by two officials with reasons and the review route, then
// a certificate that carries no name.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { checkCode, certificatesFor, resetCertificates } from '@/lib/records/certificates';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { classifyDecision } from '@/lib/permits/decisions';
import { CITIZENSHIP_PROCEDURES } from './procedures';

let NAT = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: NAT } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }

describe('citizenship determination', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    NAT = listMinistries()[0]!.id;
    for (const p of CITIZENSHIP_PROCEDURES) {
      const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(d.error);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(a.error);
    }
  });
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  it('opens no case until the nation names its competent authority; decisions are a proposed, unapproved mapping', () => {
    setSovereign({ deployment: { authorities: {} } }, 'test');
    expect(openCase({ procedure: 'citizenship.application', fields: { applicationKind: 'descent', applicantName: 'A', groundsClaimed: 'x' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/No institution is named/) });
    for (const a of CITIZENSHIP_PROCEDURES[0]!.actions.filter(x => x.decision)) expect(classifyDecision({ fields: {} } as never, a, CITIZENSHIP_PROCEDURES[0] as never)).toMatchObject({ kind: 'mapping', permitType: 'citizenship-determination' });
  });

  it('records the assessment of each criterion, determines by two officials, and certifies without a name', async () => {
    setSovereign({ deployment: { authorities: { citizenship: NAT } } }, 'Administrator');
    const c = openCase({ procedure: 'citizenship.application', fields: { applicationKind: 'descent', applicantName: 'Kofi Mensah', identityNumber: 'ID-2026-000001', groundsClaimed: 'Citizenship Act s.5: a parent was a citizen at the time of birth' } }, off('o1')) as { id: string };
    for (const cls of ['application', 'evidence']) { const d = addDocument({ class: cls, title: cls, institution: NAT, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string }; attach(c.id, d.id, off('o1')); }
    await step(c.id, 'review-evidence', off('o1'));
    expect(await act(c.id, { action: 'propose', reason: 'x', fields: { outcome: 'citizen' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/needed first|assessment/) });
    await step(c.id, 'propose', off('o1'), { reason: 'Criteria met', fields: { outcome: 'citizen', criteriaAssessment: 's.5(a) parent\'s citizenship: shown by the parent\'s certificate; s.5(b) parentage: shown by the birth record' } });
    await step(c.id, 'determine', off('s1', 'signatory'), { reason: 'Citizen by descent under s.5', fields: { reviewRoute: 'High Court' } });
    await step(c.id, 'determine', off('s2', 'signatory'));
    const done = await step(c.id, 'certify', off('o1'));
    expect(done.case.stage).toBe('certified');
    const [cert] = certificatesFor(done.case.decisions);
    expect(cert).toMatchObject({ kind: 'citizenship', title: 'Certificate of citizenship' });
    const check = checkCode(cert!.code)!;
    expect(check.status).toBe('valid');
    expect(JSON.stringify(check)).not.toMatch(/Kofi|Mensah|ID-2026/);
  });
});
