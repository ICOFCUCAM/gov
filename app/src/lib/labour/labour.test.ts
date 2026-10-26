// Labour and employment (plan step I6; supplement Part 14; specification Part 2
// §C.5): employers and their workplaces, employment registered with the work
// authorisation checked through the immigration.status exchange (an unanswered
// check holds or refers, never refuses), workplace inspections whose findings
// rest on evidence and are corrected only by new versions, corrective orders
// answered and verified, complaints whose allegation is never a finding,
// injury notifications with medical content only as a sealed document,
// mediation, notices, and the employer.standing exchange.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, getCase, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions, getDecision } from '@/lib/records/decisions';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { classifyDecision } from '@/lib/permits/decisions';
import { resetPermitAuthorities, installProposedDefaults, listMappings } from '@/lib/permits/authority';
import { callService } from '@/lib/exchange/services';
import { resetImmigration, recordGrant } from '@/lib/immigration/register';
import { LABOUR_PROCEDURES, LABOUR_PERMITS } from './procedures';
import { resetLabour, getEmployer, inspectionOfCase, injuryOfCase, employmentOfCase, mediationOfCase, labourCounts, findLabour } from './register';

let LAB = '', IMM = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: LAB } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: LAB, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, off('o1')); return d.id; };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const open = (procedure: string, fields: Record<string, unknown>) => { const c = openCase({ procedure, fields }, off('o1')); if ('error' in c) throw new Error(c.error); return c.id; };
async function employer(): Promise<string> {
  const id = open('labour.employer-registration', { employerName: 'Acme Textiles Ltd', industry: '1392', workplaces: 'Plot 4, Industrial Area | Nairobi', representative: 'Jane Wanjiru' });
  doc(id, 'application');
  await step(id, 'check', off('o1'));
  const d = await step(id, 'register', off('s1', 'signatory'), { reason: 'Registered' });
  return String(getDecision(d.decision!.id)!.content.facts!.employer);
}

describe('labour and employment', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetLabour, resetImmigration, resetPermitAuthorities]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [LAB, IMM] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ iso3: 'KEN', deployment: { authorities: { labour: LAB, immigration: IMM } } } as never, 'Administrator');
    for (const p of LABOUR_PROCEDURES) {
      const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
  });
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  it('ships drafts only: no score, no clinical field, no day count; decisions under proposed, unapproved mappings', () => {
    for (const p of LABOUR_PROCEDURES) {
      expect(p).toMatchObject({ reference: true, owner: 'labour', deadlines: [] });
      for (const f of p.fields) expect(`${f.key} ${f.label}`, `${p.key} ${f.key}`).not.toMatch(/score|risk level|diagnos|treatment|clinical|patient|medical record/i);
      for (const a of p.actions.filter(x => x.decision)) expect(classifyDecision({ fields: {} } as never, a, p as never), `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping' });
    }
    installProposedDefaults('Installer');
    for (const t of new Set(Object.values(LABOUR_PERMITS))) expect(listMappings(t), t).toEqual([expect.objectContaining({ state: 'draft', lead: 'labour' })]);
  });

  it('registers an employer and employment; a worker who is not a national is checked through immigration.status, never refused on an unanswered check', async () => {
    const emp = await employer();
    expect(getEmployer(emp)).toMatchObject({ state: 'registered', workplaces: [expect.objectContaining({ address: 'Plot 4, Industrial Area', region: 'Nairobi' })] });
    const national = open('labour.employment-registration', { employer: emp, workerReference: 'ID-2026-000001', workerName: 'Peter Otieno', workerNationality: 'KEN', startDate: '2026-11-01', employmentType: 'permanent', occupation: '7533' });
    doc(national, 'application');
    await step(national, 'check-authorisation', off('o1'));
    await step(national, 'register', off('s1', 'signatory'), { reason: 'Registered' });
    expect(employmentOfCase(national)).toMatchObject({ state: 'active', workAuthorisation: { result: 'not-required' } });
    // No permit on record: held or referred, never refused by itself.
    const foreign = open('labour.employment-registration', { employer: emp, workerReference: 'TD-UGA-1', workerName: 'Grace Nakato', workerNationality: 'UGA', workerDocument: 'B1234567', startDate: '2026-11-01', employmentType: 'fixed-term', occupation: '2511' });
    doc(foreign, 'application');
    expect(await act(foreign, { action: 'check-authorisation' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/not confirmed.*never a refusal by itself/) });
    expect(await act(foreign, { action: 'refuse', reason: 'x', fields: { reviewRoute: 'x' } }, off('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/not possible/) });
    await step(foreign, 'hold', off('o1'), { reason: 'Awaiting the permit' });
    // Once the immigration authority grants a permit, the check passes and its receipt is kept.
    recordGrant({ kind: 'residence-permit', category: 'work', holder: { name: 'Grace Nakato', nationality: 'UGA', documentNumber: 'B1234567' }, validFrom: '2026-10-01', validUntil: '2028-09-30' }, 'issued', 'imm-case', 'Granted', 'Immigration official');
    await step(foreign, 'check-authorisation', off('o1'));
    await step(foreign, 'register', off('s1', 'signatory'), { reason: 'Registered' });
    expect(employmentOfCase(foreign)!.workAuthorisation).toMatchObject({ result: 'valid' });
    // Others learn only the employer's standing.
    const s = await callService({ kind: 'module', id: 'test', name: 'Procurement' }, 'employer.standing', { employer: emp }, 'tender eligibility');
    expect(s.data).toEqual({ registered: 'yes', state: 'registered', employer: emp });
  });

  it('inspects a workplace: findings rest on evidence and are corrected by a new version; orders are answered, verified, then closed', async () => {
    const emp = await employer();
    const id = open('labour.inspection', { employer: emp });
    doc(id, 'inspection-plan');
    await step(id, 'record-visit', off('o1'), { fields: { visitDate: '2026-10-15', legalBasis: 'Occupational Safety and Health Act s.30' } });
    expect(await act(id, { action: 'record-finding', reason: 'x', fields: { findingRequirement: 'Guarding of machinery (s.55)', findingObservation: 'Unguarded loom', findingSeverity: 'serious' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/needed first/) });
    await step(id, 'record-finding', off('o1'), { reason: 'Seen on the visit', fields: { findingRequirement: 'Guarding of machinery (s.55)', findingObservation: 'Two looms run without guards', findingEvidence: 'Photographs 1-3\nForeman\'s statement', findingSeverity: 'serious' } });
    await step(id, 'correct-finding', off('o1'), { reason: 'Only one loom was unguarded (photograph 3 shows the guard in place)', fields: { correctFinding: 1, findingObservation: 'One loom runs without a guard', findingEvidence: 'Photographs 1-2', findingRequirement: 'Guarding of machinery (s.55)', findingSeverity: 'serious' } });
    const f = inspectionOfCase(id)!.findings[0]!;
    expect(f.versions.map(v => v.observation)).toEqual(['Two looms run without guards', 'One loom runs without a guard']);
    doc(id, 'inspection-report');
    const ordered = await step(id, 'issue-orders', off('s1', 'signatory'), { reason: 'Serious risk to workers', fields: { orders: '1 | Fit a guard to the loom | 2026-11-15' } });
    expect(ordered.decision).toBeTruthy();
    expect(inspectionOfCase(id)!.orders).toEqual([expect.objectContaining({ n: 1, finding: 1, due: '2026-11-15' })]);
    expect(await act(id, { action: 'close', reason: 'x' }, off('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/verified before/) });
    await step(id, 'record-response', off('o1'), { fields: { responseOrder: 1, responseText: 'Guard fitted on 2026-11-10', responseEvidence: 'Invoice\nPhotograph' } });
    await step(id, 'verify-order', off('o1'), { fields: { verifyOrder: 1, verifyOutcome: 'complied', verifyNote: 'Guard seen in place on the follow-up visit' } });
    await step(id, 'close', off('s1', 'signatory'), { reason: 'Complied' });
    expect(inspectionOfCase(id)).toMatchObject({ state: 'closed', orders: [expect.objectContaining({ responses: [expect.any(Object)], verified: expect.objectContaining({ outcome: 'complied' }) })] });
    expect(labourCounts()).toMatchObject({ inspectionsClosed: 1, outstandingOrders: 0 });
  });

  it('keeps a complaint an allegation until findings support it; a confidentiality request holds the case restricted', async () => {
    const emp = await employer();
    const id = open('labour.complaint', { claimKind: 'wage-claim', complainantReference: 'ID-2026-000009', complainantContact: '+254 700 000000', respondentEmployer: emp, complaintCategory: 'unpaid wages', description: 'Overtime unpaid since August', confidentialityRequest: true, claimedMinor: 4500000, calculationBreakdown: 'August | 1500000\nSeptember | 3000000' });
    expect(getCase(id)!.sensitivity).toBe('restricted');
    doc(id, 'complaint');
    await step(id, 'register', off('o1'));
    await step(id, 'admit', off('o1'), { reason: 'Within the Employment Act' });
    expect(await act(id, { action: 'propose', reason: 'x', fields: { complaintOutcome: 'upheld' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/an allegation is not a finding/) });
    await step(id, 'propose', off('o1'), { reason: 'Payroll records confirm', fields: { complaintOutcome: 'upheld', basisFindings: 'Inspection LIN finding 1: payroll shows overtime unpaid' } });
    doc(id, 'outcome-letter');
    await step(id, 'decide', off('s1', 'signatory'), { reason: 'Upheld', fields: { reviewRoute: 'Employment and Labour Relations Court' } });
    expect(getCase(id)!.stage).toBe('decided');
  });

  it('records an injury notification with medical content only as a sealed document, never a field', async () => {
    const emp = await employer();
    const id = open('labour.injury', { employer: emp, workerReference: 'ID-2026-000001', occurredOn: '2026-10-10', occurredTime: '14:30', injuryCategory: 'serious', incidentDescription: 'Caught a hand in the loom while clearing a jam', controls: 'Loom stopped\nArea cordoned', notifier: 'HR manager' });
    doc(id, 'notification');
    const medical = doc(id, 'medical-evidence');
    await step(id, 'record', off('o1'));
    const x = injuryOfCase(id)!;
    expect(x).toMatchObject({ category: 'serious', medicalEvidence: medical, controls: ['Loom stopped', 'Area cordoned'] });
    expect(Object.keys(x)).not.toEqual(expect.arrayContaining(['diagnosis', 'treatment', 'injuryType']));
    await step(id, 'refer-inspection', off('o1'), { reason: 'Inspect the loom', fields: { inspectionCase: 'LIN-2026-000001' } });
    expect(injuryOfCase(id)!.state).toBe('investigated');
  });

  it('mediates without deciding; acknowledges notices; publishes vacancies and refers jobseekers', async () => {
    const emp = await employer();
    const m = open('labour.mediation', { mediationKind: 'collective', parties: 'Textile Workers Union\nAcme Textiles Ltd', issue: 'Shift allowance' });
    doc(m, 'request');
    await step(m, 'accept', off('o1'));
    await step(m, 'record-session', off('o1'), { fields: { sessionNote: 'Positions exchanged' } });
    expect(await act(m, { action: 'record-outcome', fields: { mediationResult: 'settled' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/agreement the parties signed/) });
    doc(m, 'agreement');
    await step(m, 'record-outcome', off('o1'), { fields: { mediationResult: 'settled' } });
    expect(mediationOfCase(m)).toMatchObject({ outcome: { result: 'settled' }, sessions: [expect.any(Object)] });
    expect(getCase(m)!.decisions).toEqual([]);
    const n = open('labour.notice', { noticeKind: 'redundancy', employer: emp, effectiveDate: '2026-12-31', workersAffected: 40 });
    doc(n, 'notice');
    await step(n, 'acknowledge', off('o1'));
    const v = open('labour.vacancy', { employer: emp, vacancyTitle: 'Loom technician', occupation: '7233', jobDescription: 'Maintains looms', workLocation: 'Nairobi', publicationConsent: true });
    doc(v, 'notification');
    await step(v, 'publish', off('o1'));
    const vacancy = findLabour({ employer: emp }).vacancies[0]!.number;
    const j = open('labour.jobseeker', { reference: 'ID-2026-000020', contact: 'x', occupationsSought: '7233' });
    doc(j, 'registration');
    await step(j, 'register', off('o1'));
    await step(j, 'refer', off('o1'), { fields: { referVacancy: vacancy } });
    await step(j, 'place', off('o1'), { fields: { placedVacancy: vacancy } });
    await step(v, 'filled', off('o1'), { reason: 'Filled by a referred jobseeker', fields: { vacancyNumber: vacancy } });
    expect(labourCounts()).toMatchObject({ notices: 1, mediations: 1, vacancies: 0, jobseekers: 0 });
  });
});
