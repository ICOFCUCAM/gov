// Social protection (plan step I6; supplement Part 15; specification Part 2
// §C.6): eligibility and amounts only from an approved, cited, tested rule
// whose version is sealed with the decision and from which the calculation is
// reproduced (acceptance P2-07); an identity check that cannot be made holds
// the claim and is never a ground for refusal (P2-08); a payment instruction
// prepared by one official and approved by another; an overpayment calculated
// by the period's rule; no score cutting support; appeals decided by officials
// independent of the decision; reads by the authority only, with a purpose,
// every read logged.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let official: { id: string; name: string; label: string; institution?: string; role: string } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => (official ? { ...official, sub: official.id } : null),
  caseScope: async () => official,
  refusal: async () => null,
  withOfficial: async <T,>(b: T) => b,
}));

const { openCase, act, attach, resetCases, registeredEffects, getCase, cancelPending } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { classifyDecision } = await import('@/lib/permits/decisions');
const { resetPermitAuthorities, installProposedDefaults, listMappings } = await import('@/lib/permits/authority');
const { draftRule, approveRule, resetRules } = await import('@/lib/law/rules');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { resetIdentity, enrolIdentity, requestCredential, recordProduction, recordDelivery } = await import('@/lib/identity/register');
const { SOCIAL_PROCEDURES, SOCIAL_PERMITS } = await import('./procedures');
const { resetSocial, getClaimant, getClaim, claimOfCase, reproduceAssessment, paymentOfCase, overpaymentOfCase, socialCounts } = await import('./register');
const route = await import('@/app/api/social-protection/route');
type Actor = import('@/lib/casework/engine').Actor;

let SPA = '', IDA = '', OTHER = '', lawId = '', CREDENTIAL = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer', inst = () => SPA): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: SPA, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, off('o1')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const open = (procedure: string, fields: Record<string, unknown>) => { const c = openCase({ procedure, fields }, off('o1')); if ('error' in c) throw new Error(c.error); return c.id; };
/** The nation's child support rule: 3 000.00 for the first member, 1 000.00 for each further one, less 50% of means; nothing at or above 8 000.00. */
function childSupportRule(from = '2026-01-01', base = 300000) {
  const d = draftRule({ key: 'social.child-support', title: 'Child support', kind: 'means-tested', owner: 'socialProtection', effectiveFrom: from, means: { limitMinor: 800000, baseMinor: base, perMemberMinor: 100000, taperRate: 50 }, citations: [{ instrument: lawId, eId: 'sec_10' }], tests: [{ name: 'no means, three members', input: { amountMinor: 0, members: 3 }, expectMinor: base + 200000 }] }, 'Drafter', 'drafter') as { version: number };
  const a = approveRule('social.child-support', d.version, 'Approver', 'approver');
  if ('error' in a) throw new Error(a.error);
}
async function registerPerson(): Promise<string> {
  const id = open('social.registration', { identityNumber: CREDENTIAL, givenNames: 'Amina', familyName: 'Osei', birthDate: '1990-04-02', contact: '+254 700 111222', householdMembers: 'BR-2020-000001 | child\nBR-2022-000002 | child' });
  doc(id, 'application');
  await step(id, 'verify-identity', off('o1'));
  await step(id, 'register', off('o1'));
  return getClaimant(CREDENTIAL)!.number;
}
const INCOME = { incomeItems: 'Casual work | 200000 | yes\nRent from a room | 100000 | no', deductionItems: 'Childcare | 50000 | yes', assetItems: 'Savings | 40000 | yes | no', periodFrom: '2026-10-01', periodTo: '2026-10-31' };
async function awarded(claimant: string) {
  const id = open('social.benefit', { claimant, programme: 'child-support', applicationReason: 'Two young children; casual work only' });
  doc(id, 'application');
  await step(id, 'verify-identity', off('o1'));
  await step(id, 'assess', off('o1'), { reason: 'Means from payslips and declaration', fields: INCOME });
  await step(id, 'propose', off('o1'), { reason: 'Eligible', fields: { explanation: 'Your means of 2 500.00 a month are below the limit; the rule gives 3 750.00.' } });
  doc(id, 'decision-notice');
  await step(id, 'award', off('s1', 'signatory'), { reason: 'Awarded', fields: { startOn: '2026-11-01' } });
  const d = await step(id, 'award', off('s2', 'signatory'));
  return { case: id, decision: d.decision!, claim: claimOfCase(id)!.number };
}

describe('social protection', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetSocial, resetIdentity, resetPermitAuthorities, resetRules, resetLaw, resetAccessLog]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    official = null;
    [SPA, IDA, OTHER] = listMinistries().slice(0, 3).map(m => m.id) as [string, string, string];
    setSovereign({ deployment: { authorities: { socialProtection: SPA, identity: IDA } } }, 'Administrator');
    for (const p of SOCIAL_PROCEDURES) {
      const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
    const law = recordVersion({ instrument: { title: 'Social Assistance Act', type: 'act', jurisdiction: 'X', year: 2020, number: '9', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_10', num: '10', text: 'Child support is paid as the regulations calculate.' }] }, 'L1', 'l1') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    lawId = law.instrument.id;
    const r = enrolIdentity({ givenNames: 'Amina', familyName: 'Osei', birthDate: '1990-04-02', eligibility: { rule: 'x', outcome: 'eligible' } }, 'case-id', { name: 'Identity official' }) as { number: string };
    const c = requestCredential({ identity: r.number, type: 'identity-card', validFrom: '2026-01-01', validUntil: '2036-01-01' }, 'case-cr', { name: 'x' }) as { number: string };
    recordProduction(c.number, { serial: 'S1', qualityChecked: true }, 'case-cr', { name: 'x' });
    recordDelivery(c.number, { method: 'collected', recipient: 'holder', evidence: 'doc' }, 'case-cr', { name: 'x' });
    CREDENTIAL = c.number;
  });
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  it('ships drafts only: no score field, no amount typed, no day count; decisions under proposed, unapproved mappings', () => {
    for (const p of SOCIAL_PROCEDURES) {
      expect(p).toMatchObject({ reference: true, owner: 'socialProtection', sensitivity: 'restricted', deadlines: [] });
      for (const f of p.fields) {
        expect(`${f.key} ${f.label}`, `${p.key} ${f.key}`).not.toMatch(/\bscore\b|risk (level|rating)|propensity/i);
        expect(f.type, `${p.key} ${f.key}`).not.toBe('money');
        expect(f.key, `${p.key}`).not.toMatch(/^amount|awardMinor|benefitMinor/);
      }
      for (const a of p.actions.filter(x => x.decision)) expect(classifyDecision({ fields: {} } as never, a, p as never), `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping' });
    }
    installProposedDefaults('Installer');
    for (const t of new Set(Object.values(SOCIAL_PERMITS))) expect(listMappings(t), t).toEqual([expect.objectContaining({ state: 'draft', lead: 'socialProtection' })]);
  });

  it('takes no claim under a programme without an approved rule; awards by the rule, seals its version, and reproduces the calculation (P2-07)', async () => {
    const claimant = await registerPerson();
    expect(getClaimant(claimant)).toMatchObject({ identityBasis: { kind: 'exchange' }, household: expect.stringMatching(/^HH-/) });
    expect(openCase({ procedure: 'social.benefit', fields: { claimant, programme: 'child-support', applicationReason: 'x' } }, off('o1'))).toHaveProperty('error');
    childSupportRule();
    const { claim, decision } = await awarded(claimant);
    const c = getClaim(claim)!;
    // Means: 2 000.00 + 1 000.00 income − 500.00 deductions (savings recorded, not counted) = 2 500.00; 3 household members.
    expect(c.assessments[0]).toMatchObject({ meansMinor: 250000, inputs: { members: 3 }, amountMinor: 375000, rule: { key: 'social.child-support', version: 1 } });
    expect(c.assessments[0]!.inputs.income).toEqual([{ source: 'Casual work', amountMinor: 200000, verified: true }, { source: 'Rent from a room', amountMinor: 100000, verified: false }]);
    expect(c).toMatchObject({ state: 'awarded', current: 1, startOn: '2026-11-01' });
    expect(getDecision(decision.id)!.content.rules).toEqual([expect.objectContaining({ key: 'social.child-support', version: 1, digest: c.assessments[0]!.rule.digest })]);
    expect(reproduceAssessment(claim, 1)).toEqual({ matches: true, recordedMinor: 375000, reproducedMinor: 375000 });
    // A newer rule version does not change what the decision rested on: the reproduction uses the version recorded.
    childSupportRule('2026-12-01', 350000);
    expect(reproduceAssessment(claim, 1)).toMatchObject({ matches: true, reproducedMinor: 375000 });
  });

  it('holds a claim whose identity check cannot be made, and never refuses on that alone (P2-08)', async () => {
    childSupportRule();
    const claimant = await registerPerson();
    // The identity authority stops answering (not named): the check cannot be made.
    setSovereign({ deployment: { authorities: { socialProtection: SPA } } }, 'Administrator');
    const id = open('social.benefit', { claimant, programme: 'child-support', applicationReason: 'x' });
    doc(id, 'application');
    expect(await act(id, { action: 'verify-identity' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/unable_to_verify.*never a ground for refusal/) });
    expect(await act(id, { action: 'refuse', reason: 'Unverified', fields: { reviewRoute: 'x', explanation: 'x' } }, off('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/not possible while the case is Submitted/) });
    await step(id, 'hold', off('o1'), { reason: 'Identity service unavailable' });
    expect(await act(id, { action: 'refuse', reason: 'x' }, off('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/not possible while the case is Held/) });
    setSovereign({ deployment: { authorities: { socialProtection: SPA, identity: IDA } } }, 'Administrator');
    await step(id, 'verify-identity', off('o1'));
    expect(getCase(id)!.stage).toBe('verified');
  });

  it('pays by an instruction one official prepares from the assessment and a different one approves', async () => {
    childSupportRule();
    const { claim } = await awarded(await registerPerson());
    const id = open('social.payment', { claim, periodFrom: '2026-11-01', periodTo: '2026-11-30' });
    await step(id, 'prepare', off('o1'));
    expect(paymentOfCase(id)).toMatchObject({ amountMinor: 375000, state: 'prepared', rule: { key: 'social.child-support', version: 1 } });
    expect(await act(id, { action: 'approve', reason: 'x' }, { ...off('o1', 'signatory') })).toMatchObject({ error: expect.stringMatching(/Separation of duties/) });
    const ok = await step(id, 'approve', off('s1', 'signatory'), { reason: 'Matches the award' });
    expect(ok.decision).toBeTruthy();
    await step(id, 'record-paid', off('o1'), { fields: { externalReference: 'PAYSVC-0001' } });
    expect(paymentOfCase(id)).toMatchObject({ state: 'paid', approver: { name: 'Official s1' }, result: { externalReference: 'PAYSVC-0001' } });
    // A second instruction for the same period is refused.
    const again = open('social.payment', { claim, periodFrom: '2026-11-15', periodTo: '2026-11-30' });
    expect(await act(again, { action: 'prepare' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/already covers/) });
  });

  it('calculates an overpayment by the period\'s rule on corrected inputs, and decides it by two officials after a hardship review', async () => {
    childSupportRule();
    const { claim } = await awarded(await registerPerson());
    const p = open('social.payment', { claim, periodFrom: '2026-11-01', periodTo: '2026-11-30' });
    await step(p, 'prepare', off('o1')); await step(p, 'approve', off('s1', 'signatory'), { reason: 'x' }); await step(p, 'record-paid', off('o1'), { fields: { externalReference: 'P1' } });
    const id = open('social.overpayment', { claim, correctionBasis: 'Employer\'s statement: income was higher in November' });
    doc(id, 'evidence');
    await step(id, 'calculate', off('o1'), { reason: 'Corrected income', fields: { incomeItems: 'Wages | 600000 | yes', periodFrom: '2026-11-01', periodTo: '2026-11-30' } });
    expect(overpaymentOfCase(id)).toMatchObject({ paidMinor: 375000, dueMinor: 200000, overMinor: 175000, rule: { key: 'social.child-support', version: 1 } });
    doc(id, 'notice');
    await step(id, 'notify', off('o1'));
    await step(id, 'review', off('o1'), { reason: 'Response considered', fields: { hardshipReview: 'Recovery would leave the household below the minimum; recommend waiver', recipientResponse: 'Could not repay' } });
    await step(id, 'waive', off('s1', 'signatory'), { reason: 'Hardship' });
    await step(id, 'waive', off('s2', 'signatory'));
    expect(overpaymentOfCase(id)!.outcome).toBe('waive');
  });

  it('never lets a score cut support: a suspension states facts and evidence, after notice and representations', async () => {
    childSupportRule();
    const { claim } = await awarded(await registerPerson());
    const id = open('social.suspension', { claim, groundsFacts: 'The fraud risk score for this household is high' });
    doc(id, 'grounds-evidence'); doc(id, 'notice');
    await step(id, 'notify', off('o1'), { reason: 'Notice served' });
    await step(id, 'propose', off('o1'), { reason: 'x', fields: { representationsSummary: 'None received by the date the notice gave' } });
    await step(id, 'suspend', off('s1', 'signatory'), { reason: 'x', fields: { reviewRoute: 'x', explanation: 'x' } });
    expect(await act(id, { action: 'suspend' }, off('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/A score cannot cut support/) });
    expect(cancelPending(id, off('s1', 'signatory'), 'Grounds restated')).not.toHaveProperty('error');
    expect(getClaim(claim)!.state).toBe('awarded');
  });

  it('decides an appeal by officials who took no part in the decision, keeping the decision appealed', async () => {
    childSupportRule();
    const award = await awarded(await registerPerson());
    const id = open('social.appeal', { originalCase: getCase(award.case)!.ref, appealGrounds: 'Rent wrongly counted as income', statementOfGrounds: 'The room was let for one month only' });
    doc(id, 'appeal');
    await step(id, 'accept', off('o1'));
    await step(id, 'propose', off('o1'), { reason: 'x', fields: { appealOutcome: 'varied', explanation: 'The rent was counted for the whole period' } });
    doc(id, 'decision-notice');
    await step(id, 'decide', off('s3', 'signatory'), { reason: 'Varied', fields: { reviewRoute: 'Social Security Appeals Tribunal' } });
    expect(await act(id, { action: 'decide' }, off('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/took part in the decision under appeal/) });
    await step(id, 'decide', off('s4', 'signatory'));
    const c = getClaim(award.claim)!;
    expect(c.reviews).toEqual([expect.objectContaining({ outcome: 'varied', decision: expect.any(String) })]);
    expect(c.decisions[0]).toMatchObject({ kind: 'award', decision: award.decision.id });
    expect(socialCounts().reviews).toEqual({ varied: 1 });
  });

  it('is read only by the authority, with a stated purpose for a person; the calculation is reproducible on request; every read logged', async () => {
    childSupportRule();
    const { claim } = await awarded(await registerPerson());
    const as = (who: Actor) => { official = { id: who.id!, name: who.name, label: who.name, institution: who.scope!.institution, role: who.scope!.role! }; };
    const get = async (qs: string) => route.GET(new NextRequest(`http://localhost/api/social-protection${qs}`));
    as(off('o1'));
    const overview = await (await get('')).json();
    expect(overview.programmes).toEqual([expect.objectContaining({ programme: 'child-support', version: 1, kind: 'means-tested' })]);
    expect(JSON.stringify(overview)).not.toMatch(/Amina|Osei/);
    expect((await get(`?claim=${claim}`)).status).toBe(403);
    const found = await (await get(`?claim=${claim}&purpose=appeal%20preparation&reproduce=1`)).json();
    expect(found.reproduced).toMatchObject({ matches: true });
    expect(found.found.claims[0].number).toBe(claim);
    as(off('x', 'signatory', () => OTHER));
    expect((await get(`?claim=${claim}&purpose=x`)).status).toBe(403);
    expect(listAccess({}).filter(e => e.record.register === 'social-protection').map(e => e.result)).toEqual(expect.arrayContaining(['allowed', 'refused']));
  });
});
