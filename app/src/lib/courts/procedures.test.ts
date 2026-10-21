import { describe, it, expect, beforeEach } from 'vitest';
import { openCase, act, attach, assign, getCase, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { institutionBounds } from '@/lib/data/store/institutions';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { COURT_PROCEDURES } from './procedures';
import { resetHearings, causeList, hearingsOf } from './hearings';

let COURT = '', OTHER = '';
const court = (id: string, role: 'officer' | 'signatory' | 'administrator' = 'officer', inst = () => COURT): Actor => ({ id, name: `Court ${id}`, scope: { id, role, institution: inst() } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
function doc(caseId: string, cls: string) { const d = addDocument({ class: cls, title: cls, institution: COURT, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Registry') as { id: string }; attach(caseId, d.id, court('clerk', 'signatory')); }
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }

describe('court case', () => {
  beforeEach(() => {
    resetCases(); resetPackages(); resetDocuments(); resetDecisions(); resetHearings();
    [COURT, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { judiciary: COURT } } }, 'Administrator');
    for (const p of COURT_PROCEDURES) { draftPackage(p, 'Author', 'a', registeredEffects()); const a = approvePackage(p.key, 1, 'Chief registrar', 'cr', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(a.error); }
  });

  it('runs from filing to a final judgment, lists hearings by number only, and stays isolated from other institutions', async () => {
    const c = openCase({ procedure: 'court.case', fields: { caseType: 'civil', claimant: 'Private Claimant', respondent: 'Private Respondent', summary: 'Unpaid invoice' } }, court('clerk', 'signatory')) as { id: string; ref: string };
    // Neither another ministry nor an administrator acts on a court's case.
    expect(await act(c.id, { action: 'review' }, court('x', 'signatory', () => OTHER))).toMatchObject({ error: expect.stringMatching(/court's own officials/) });
    expect(await act(c.id, { action: 'review' }, court('adm', 'administrator', () => OTHER))).toHaveProperty('error');
    doc(c.id, 'originating-document');
    await step(c.id, 'review', court('clerk', 'signatory'));
    await step(c.id, 'accept', court('clerk', 'signatory'));
    doc(c.id, 'proof-of-service');
    await step(c.id, 'record-service', court('clerk', 'signatory'));
    await step(c.id, 'schedule', court('clerk', 'signatory'), { fields: { nextHearing: '2099-03-02T10:00', courtroom: 'Court 4', hearingKind: 'trial' } });
    expect(causeList('2099-03-01')).toEqual([{ caseRef: c.ref, court: expect.any(String), kind: 'trial', at: '2099-03-02T10:00', room: 'Court 4' }]);
    expect(JSON.stringify(causeList('2099-03-01'))).not.toContain('Private');
    await step(c.id, 'adjourn', court('judge', 'signatory'), { reason: 'Witness unwell' });
    expect(hearingsOf(c.id)[0]!.state).toBe('adjourned');
    await step(c.id, 'schedule', court('clerk', 'signatory'), { fields: { nextHearing: '2099-03-09T10:00' } });
    await step(c.id, 'hold-hearing', court('clerk', 'signatory'));
    doc(c.id, 'judgment');
    const j = await step(c.id, 'deliver', court('judge', 'signatory'), { reason: 'The invoice is owed with interest' });
    expect(j.decision).toBeTruthy();
    expect(j.case.deadlines.find(d => d.key === 'appeal')).toBeTruthy();
    await step(c.id, 'make-final', court('clerk', 'signatory'));
    expect((await step(c.id, 'archive', court('clerk', 'signatory'))).case.stage).toBe('archived');
  });

  // P3-01 (docs/INSTITUTIONAL_ACCEPTANCE.md): no executive or whole-government administrator assigns, reassigns or decides a court's case.
  it('refuses an executive or whole-government administrator assigning, reassigning or deciding a court case', async () => {
    const c = openCase({ procedure: 'court.case', fields: { caseType: 'civil', claimant: 'Private Claimant', respondent: 'Private Respondent', summary: 'Unpaid invoice' } }, court('clerk', 'signatory')) as { id: string };
    expect(getCase(c.id)!.assignee).toMatchObject({ id: 'clerk' });
    const bounds = institutionBounds();
    expect(bounds.judicial).toContain(COURT);
    const wholeGovernment: Actor = { id: 'wg-admin', name: 'Government administrator', scope: { id: 'wg-admin', role: 'administrator', bounds } };
    const executive: Actor = { id: 'ex-admin', name: 'Executive administrator', scope: { id: 'ex-admin', role: 'administrator', institution: OTHER, bounds } };
    const executiveSigner: Actor = { id: 'ex-sign', name: 'Executive signatory', scope: { id: 'ex-sign', role: 'signatory', institution: OTHER, bounds } };
    for (const who of [wholeGovernment, executive, executiveSigner]) {
      expect(assign(c.id, { id: who.id!, name: who.name }, who), who.name).toHaveProperty('error');
      expect(assign(c.id, { id: 'friendly-judge', name: 'Friendly judge' }, who), who.name).toHaveProperty('error');
      expect(await act(c.id, { action: 'review' }, who), who.name).toHaveProperty('error');
    }
    // The assignment and the case are as the court left them.
    expect(getCase(c.id)).toMatchObject({ assignee: { id: 'clerk' }, stage: 'filed' });
    // The court's own registry still assigns.
    expect(assign(c.id, { id: 'judge', name: 'Court judge' }, court('clerk', 'signatory'))).toMatchObject({ assignee: { id: 'judge' } });
  });
});
