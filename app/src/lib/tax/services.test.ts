// The tax services (plan step I5, forms batch 6): registration amendment,
// return or assessment amendment, refund, payment arrangement and its review,
// voluntary disclosure, formal ruling and compliance review, run through the
// case engine under procedures two officials approved. Liabilities are bills
// carrying the assessment's reference and refunds are reconciled once; no
// interest or penalty is set without an approved rule (refused in
// production); every decision is classified under a proposed, unapproved
// mapping; nothing ships approved.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, getCase, cancelPending, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages, listPackages } from '@/lib/casework/packages';
import { installReferenceProcedures } from '@/lib/casework/modules';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions, getDecision } from '@/lib/records/decisions';
import { setSovereign, listMinistries, listReceipts } from '@/lib/data/store';
import { payBill, listBills } from '@/lib/data/store/payments';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { draftRule, approveRule, resetRules } from '@/lib/law/rules';
import { classifyDecision } from '@/lib/permits/decisions';
import { PROPOSED_DEFAULTS, installProposedDefaults, listMappings, resetPermitAuthorities } from '@/lib/permits/authority';
import { TAX_PROCEDURES, TAX_SERVICE_PROCEDURES, TAX_PERMITS } from './procedures';
import { resetTax, findTaxpayers, getTaxpayer, account, reconcileTaxPayments, assessmentOfCase, refundOfCase, planOfCase, getPaymentPlan, disclosureOfCase, rulingOfCase, getReturn, returnsOf, taxCounts } from './register';
import type { Case } from '@/lib/casework/types';

let TAX = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Tax ${id}`, scope: { id, role, institution: TAX } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: TAX, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, off('s0', 'signatory')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
/** A decision by two officials: proposed by one, confirmed by another. */
async function decide(id: string, action: string, extra: Record<string, unknown> = {}) { await step(id, action, off('s1', 'signatory'), { reason: 'Decided on the findings', ...extra }); return step(id, action, off('s2', 'signatory')); }
const open = (procedure: string, fields: Record<string, unknown>, docs: string[] = []) => { const c = openCase({ procedure, fields }, off('o1')) as { id: string; error?: string }; if (c.error) throw new Error(`${procedure}: ${c.error}`); for (const d of docs) doc(c.id, d); return c.id; };
let LAW = { instrument: '', eId: 'sec_60' };

describe('tax services', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetTax, resetLaw, resetRules, resetPermitAuthorities]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    TAX = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { tax: TAX } } }, 'Administrator');
    for (const p of TAX_PROCEDURES) { draftPackage(asNationSets(p), 'Author', 'a', registeredEffects()); const a = approvePackage(p.key, 1, 'Approver', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`); }
    const v = recordVersion({ instrument: { title: 'Tax Administration Act', type: 'act', jurisdiction: 'X', year: 2001, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2001-01-01' }, provisions: [{ eId: 'sec_60', num: '60', text: 'The tax authority may give a ruling.' }, { eId: 'sch_1', num: 'Schedule 1', text: 'Rates.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    LAW = { instrument: v.instrument.id, eId: 'sec_60' };
  });
  afterEach(() => vi.unstubAllEnvs());

  async function taxpayer(types = ['income', 'vat']) {
    const id = open('tax.registration', { partyKind: 'organisation', partyRef: 'ORG-2026-000009', partyName: 'Hill Traders', taxTypes: types }, ['identity-evidence']);
    await step(id, 'verify', off('o1')); await step(id, 'propose', off('o1'));
    await step(id, 'register', off('s1', 'signatory'), { reason: 'Verified' });
    return findTaxpayers({ party: 'ORG-2026-000009' })[0]!;
  }
  /** A return assessed with an entered amount (no rule approved), its notice and bill issued. */
  async function assessed(tin: string, amount = 300_000) {
    const id = open('tax.return', { tin, taxType: 'income', period: '2025', baseMinor: 2_000_000 }, ['return-form']);
    await step(id, 'check', off('o1'));
    await step(id, 'propose', off('o1'), { reason: 'Checked', fields: { assessedMinor: amount, assessmentReasons: 'Assessed under the Act by hand while the rate table awaits approval' } });
    await decide(id, 'assess');
    return assessmentOfCase(id)!;
  }

  it('ships every tax service as a draft, each decision classified under a proposed mapping nobody has approved, every period unset', () => {
    expect(TAX_SERVICE_PROCEDURES.map(p => p.key)).toEqual(['tax.registration-amendment', 'tax.amendment', 'tax.refund', 'tax.payment-plan', 'tax.payment-plan-review', 'tax.disclosure', 'tax.ruling', 'tax.compliance']);
    resetPackages();
    installReferenceProcedures('Administrator');
    for (const p of TAX_SERVICE_PROCEDURES) expect(listPackages({ key: p.key }).map(x => x.state), p.key).toEqual(['draft']);
    installProposedDefaults('Administrator');
    for (const t of ['tax-refund', 'tax-payment-arrangement', 'tax-ruling', 'tax-compliance-review']) {
      expect(PROPOSED_DEFAULTS.find(d => d.permitType === t), t).toMatchObject({ lead: 'tax' });
      expect(listMappings(t).map(m => m.state), t).toEqual(['draft']);
    }
    for (const p of TAX_SERVICE_PROCEDURES) {
      for (const d of p.deadlines) expect(d.days, `${p.key} ${d.key}`).toBeUndefined();
      expect(p.appeal?.days, p.key).toBeUndefined();
      expect(p.sensitivity, p.key).toBe('restricted');
      for (const a of p.actions.filter(x => x.decision)) {
        expect(a.needs, `${p.key} ${a.key}`).toMatchObject({ role: 'signatory', fourEyes: true });
        const cls = classifyDecision({ fields: {}, owner: TAX } as unknown as Case, a, p);
        expect(cls, `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping' });
        if (a.decision === 'assess' || ['tax.amendment', 'tax.disclosure'].includes(p.key)) expect(cls).toMatchObject({ permitType: 'tax-assessment' });
      }
      // No field records a score, a rating or a probability.
      expect(p.fields.map(f => f.key).filter(k => /score|rating|probab|risk/i.test(k)), p.key).toEqual([]);
      for (const f of p.fields) expect(f.personalDataClass, `${p.key} ${f.key}`).toBe('restricted');
    }
    expect(Object.keys(TAX_PERMITS).every(k => TAX_SERVICE_PROCEDURES.some(p => p.key === k || p.key.startsWith(`${k}-`)))).toBe(true);
  });

  it('amends a registration by a decision of two officials, keeps the earlier state, and decides a suspension only by the suspend step', async () => {
    const t = await taxpayer();
    const id = open('tax.registration-amendment', { tin: t.tin, change: 'obligation-add', taxTypes: 'excise', changeReason: 'Started manufacturing' }, ['change-request']);
    await step(id, 'verify', off('o1'));
    await step(id, 'propose', off('o1'), { reason: 'Verified', fields: { verification: 'Licence seen' } });
    await decide(id, 'amend');
    expect(getTaxpayer(t.tin)).toMatchObject({ taxTypes: ['income', 'vat', 'excise'], version: 2 });
    expect(getTaxpayer(t.tin)!.history.at(-1)!.before).toMatchObject({ taxTypes: ['income', 'vat'] });
    const s = open('tax.registration-amendment', { tin: t.tin, change: 'suspend', changeReason: 'Business dormant' }, ['change-request']);
    await step(s, 'verify', off('o1'));
    await step(s, 'propose', off('o1'), { reason: 'Verified', fields: { verification: 'Dormancy evidenced' } });
    await step(s, 'amend', off('s1', 'signatory'), { reason: 'Suspend' });
    expect(await act(s, { action: 'amend' }, off('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/decided by the step "suspend"/) });
    cancelPending(s, off('s1', 'signatory'), 'Proposed under the wrong step');
    await decide(s, 'suspend');
    expect(getTaxpayer(t.tin)).toMatchObject({ state: 'suspended', version: 3 });
    const d = getCase(s)!.history.at(-1)!.decision!;
    expect(getDecision(d)!.content.authority).toMatchObject({ basis: 'unmapped', permitType: 'tax-registration' });
    expect(getDecision(d)!.content.decision).toBe('suspend');
  });

  it('amends an assessment: a new return version beside the original and the assessment varied, never overwritten', async () => {
    const t = await taxpayer();
    const a = await assessed(t.tin);
    const id = open('tax.amendment', { assessment: a.reference, origin: 'taxpayer', grounds: 'Costs omitted from the return', amendedBaseMinor: 1_500_000 }, ['amendment-request']);
    await step(id, 'review', off('o1'));
    expect(await act(id, { action: 'propose', reason: 'Reviewed', fields: { review: 'Costs evidenced' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/Enter the amended amount/) });
    await step(id, 'propose', off('o1'), { reason: 'Reviewed', fields: { review: 'Costs evidenced', variedMinor: 220_000, assessmentReasons: 'Recomputed by hand on the amended base' } });
    await decide(id, 'vary');
    const r = returnsOf(t.id)[0]!;
    expect(getReturn(r.id)!.versions.map(v => [v.baseMinor, v.kind ?? 'periodic'])).toEqual([[2_000_000, 'periodic'], [1_500_000, 'amended']]);
    expect(account(t.id, 'income').entries.map(e => [e.kind, e.amountMinor])).toEqual([['assessment', 300_000], ['adjustment', -80_000]]);
  });

  it('decides a refund by two officials, instructs it, and reconciles the payout once against its own reference', async () => {
    const t = await taxpayer();
    const id = open('tax.refund', { tin: t.tin, taxType: 'vat', claimedMinor: 50_000, basis: 'excess input tax' }, ['refund-claim']);
    await step(id, 'assess', off('o1'));
    // Paid from a credit the account does not show: refused until it is decided as a new entitlement.
    await step(id, 'propose', off('o1'), { reason: 'Checked', fields: { findings: 'Input invoices verified for 45,000', approvedMinor: 45_000, credit: 'existing-credit', interestApplies: false, interestReasons: 'The Act gives no interest on refunds paid within the period' } });
    await step(id, 'approve', off('s1', 'signatory'), { reason: 'Adjusted to the verified invoices' });
    expect(await act(id, { action: 'approve' }, off('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/new entitlement/) });
    expect(getCase(id)!.stage).toBe('pending-approval');
    // Withdraw the proposal and decide it as a new entitlement.
    cancelPending(id, off('s1', 'signatory'), 'Re-propose as a new entitlement');
    await step(id, 'approve', off('s1', 'signatory'), { reason: 'Adjusted to the verified invoices', fields: { credit: 'new-entitlement' } });
    const done = await step(id, 'approve', off('s2', 'signatory'));
    expect(getDecision(done.decision!.id)!.content.authority).toMatchObject({ basis: 'unmapped', permitType: 'tax-refund' });
    expect(refundOfCase(id)).toMatchObject({ state: 'approved', approvedMinor: 45_000, claimedMinor: 50_000, interest: { kind: 'none' } });
    expect(account(t.id, 'vat').balanceMinor).toBe(-45_000);
    await step(id, 'instruct', off('s3', 'signatory'));
    doc(id, 'payout-confirmation');
    expect(await act(id, { action: 'reconcile', fields: { payoutReference: 'TRS-77', payoutMinor: 40_000, payoutDate: '2026-11-02' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/differs from the instructed refund/) });
    await step(id, 'reconcile', off('o1'), { fields: { payoutReference: 'TRS-77', payoutMinor: 45_000, payoutDate: '2026-11-02' } });
    expect(refundOfCase(id)).toMatchObject({ state: 'paid', payout: { railReference: 'TRS-77' } });
    expect(account(t.id, 'vat').balanceMinor).toBe(0);
    expect(account(t.id, 'vat').entries.filter(e => e.kind === 'refund')).toHaveLength(1);
    expect(taxCounts().refunds).toEqual({ paid: 1 });
  });

  it('sets interest only by the approved rule: refused in production without one, calculated and cited with one', async () => {
    const t = await taxpayer();
    const id = open('tax.refund', { tin: t.tin, taxType: 'income', claimedMinor: 10_000, basis: 'overpayment' }, ['refund-claim']);
    await step(id, 'assess', off('o1'));
    const fields = { findings: 'Overpaid', approvedMinor: 10_000, credit: 'new-entitlement', interestApplies: true, interestMinor: 500, interestReasons: 'Entered by hand' };
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(await act(id, { action: 'propose', reason: 'Checked', fields }, off('o1'))).toMatchObject({ error: expect.stringMatching(/production installation refuses .*tax\.refund-interest\.income/) });
    vi.stubEnv('CIVICOS_MODE', 'demo');
    draftRule({ key: 'tax.refund-interest.income', title: 'Interest on refunds (test)', kind: 'flat-rate', owner: 'tax', effectiveFrom: '2025-01-01', rate: 2, citations: [{ instrument: LAW.instrument, eId: 'sch_1' }], tests: [{ name: 't', input: { amountMinor: 1000 }, expectMinor: 20 }] }, 'Rates officer', 'r1');
    approveRule('tax.refund-interest.income', 1, 'Commissioner', 'r2');
    await step(id, 'propose', off('o1'), { reason: 'Checked', fields });
    const done = await decide(id, 'approve');
    expect(refundOfCase(id)!.interest).toMatchObject({ kind: 'rule', rule: 'tax.refund-interest.income', amountMinor: 200 });
    expect(getDecision(done.decision!.id)!.content.rules).toEqual([expect.objectContaining({ key: 'tax.refund-interest.income', version: 1 })]);
  });

  it('approves a payment arrangement over an assessed liability, bills each instalment with the assessment\'s reference, reconciles each receipt once and reviews a default', async () => {
    const t = await taxpayer();
    const a = await assessed(t.tin, 90_000);
    const id = open('tax.payment-plan', { tin: t.tin, liabilities: a.reference, schedule: '2026-11-30 30000\n2026-12-31 30000\n2027-01-31 20000', reason: 'Seasonal trade' }, ['arrangement-request']);
    await step(id, 'assess', off('o1'));
    await step(id, 'propose', off('o1'), { reason: 'Eligible', fields: { findings: 'Statements show seasonal income', interestApplies: false, interestReasons: 'The Act charges no interest under an arrangement' } });
    expect(await decide(id, 'approve').catch(e => String(e))).toMatch(/must add up to what is owed \(900\)/);
    cancelPending(id, off('s1', 'signatory'), 'Schedule corrected');
    await step(id, 'approve', off('s1', 'signatory'), { reason: 'Eligible', fields: { schedule: '2026-11-30 30000\n2026-12-31 30000\n2027-01-31 30000' } });
    await step(id, 'approve', off('s2', 'signatory'));
    await step(id, 'bill', off('o1'));
    const plan = planOfCase(id)!;
    expect(plan.instalments.map(i => i.reference)).toEqual([1, 2, 3].map(n => `${a.reference}#${plan.id}/${n}`));
    const bills = listBills().filter(b => b.reference?.startsWith(`${a.reference}#`));
    expect(bills.map(b => b.amountMinor)).toEqual([30_000, 30_000, 30_000]);
    payBill(bills.find(b => b.reference?.endsWith('/1'))!.id, 'Test rail');
    expect(reconcileTaxPayments(listReceipts()).posted).toBe(1);
    expect(reconcileTaxPayments(listReceipts()).posted).toBe(0);
    expect(account(t.id, 'income').balanceMinor).toBe(60_000);
    const r = open('tax.payment-plan-review', { tin: t.tin, plan: plan.id, request: 'default-review', reason: 'Instalment 2 unpaid' }, ['review-request']);
    await step(r, 'review', off('o1'));
    await step(r, 'ask-response', off('o1'), { reason: 'Notice of the alleged default sent' });
    await step(r, 'response-received', off('o1'), { reason: 'No response within the period' });
    await step(r, 'propose', off('o1'), { reason: 'Unpaid', fields: { findings: 'Instalment 2 unpaid; no response' } });
    await decide(r, 'find-default');
    expect(getPaymentPlan(plan.id)).toMatchObject({ state: 'defaulted', history: [expect.anything(), expect.objectContaining({ what: 'defaulted', case: r })] });
  });

  it('accepts a voluntary disclosure as an assessment, with a penalty only by the approved rule, and bills it', async () => {
    const t = await taxpayer();
    const id = open('tax.disclosure', { tin: t.tin, taxType: 'income', periods: '2024', description: 'Rental income omitted', baseMinor: 400_000 }, ['disclosure']);
    await step(id, 'assess', off('o1'));
    const fields = { findings: 'Leases and bank statements agree', assessedMinor: 40_000, assessmentReasons: 'Assessed by hand while the rate table awaits approval', penaltyApplies: true, penaltyMinor: 4_000, penaltyReasons: 'Entered by hand' };
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(await act(id, { action: 'propose', reason: 'Checked', fields }, off('o1'))).toMatchObject({ error: expect.stringMatching(/tax\.disclosure-penalty\.income/) });
    vi.stubEnv('CIVICOS_MODE', 'demo');
    await step(id, 'propose', off('o1'), { reason: 'Checked', fields });
    await decide(id, 'accept');
    const a = assessmentOfCase(id)!;
    expect(a).toMatchObject({ origin: 'disclosure', amountMinor: 44_000, method: { kind: 'entered' } });
    expect(disclosureOfCase(id)).toMatchObject({ state: 'accepted', assessment: a.reference, penalty: { kind: 'entered', amountMinor: 4_000 } });
    await step(id, 'issue', off('o1'), { fields: { dueDate: '2026-12-31' } });
    expect(listBills().find(b => b.reference === a.reference)).toMatchObject({ amountMinor: 44_000 });
  });

  it('issues a ruling citing the law, keeps the applicant\'s facts apart, and refuses a reconsideration by the officials who ruled', async () => {
    const t = await taxpayer();
    const id = open('tax.ruling', { tin: t.tin, taxType: 'income', question: 'Is a government start-up grant taxable income?', facts: 'The company received a grant in 2025.' }, ['ruling-request']);
    await step(id, 'review', off('o1'));
    await step(id, 'propose', off('o1'), { reason: 'Considered', fields: { review: 'Section 60 and the grant terms considered' } });
    expect(await act(id, { action: 'issue', reason: 'Ruled', fields: { conclusion: 'Taxable when received' } }, off('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/Cite the provisions/) });
    await step(id, 'issue', off('s1', 'signatory'), { reason: 'Ruled', fields: { conclusion: 'Taxable when received' }, citations: [LAW] });
    await step(id, 'issue', off('s2', 'signatory'));
    expect(rulingOfCase(id)).toMatchObject({ state: 'issued', facts: 'The company received a grant in 2025.', conclusion: 'Taxable when received', citations: [expect.objectContaining({ eId: 'sec_60' })] });
    const ref = getCase(id)!.ref;
    const again = open('tax.ruling', { tin: t.tin, taxType: 'income', question: 'Reconsider the grant ruling', facts: 'The grant is repayable.', earlierRuling: ref }, ['ruling-request']);
    await step(again, 'review', off('o1'));
    await step(again, 'propose', off('o1'), { reason: 'Considered', fields: { review: 'Repayment terms considered' } });
    await step(again, 'issue', off('s1', 'signatory'), { reason: 'Ruled', fields: { conclusion: 'Not taxable while repayable' }, citations: [LAW] });
    expect(await act(again, { action: 'issue' }, off('s3', 'signatory'))).toMatchObject({ error: expect.stringMatching(/did not decide the ruling reconsidered/) });
  });

  it('runs a compliance review from an authorised scope through findings and the taxpayer\'s response to an assessment by two officials', async () => {
    const t = await taxpayer();
    const id = open('tax.compliance', { tin: t.tin, taxType: 'income', period: '2024', power: 'Tax Administration Act s.35', scope: 'Income tax 2024: sales ledger and bank statements', selection: 'Declared sales below third-party statements' }, ['case-opening']);
    await step(id, 'propose-scope', off('o1'), { reason: 'Grounds stated' });
    await decide(id, 'authorise');
    doc(id, 'information-request');
    await step(id, 'request-information', off('o1'), { reason: 'Sales ledger requested under s.35' });
    await step(id, 'information-received', off('o1'), { reason: 'Ledger received' });
    await step(id, 'draft-findings', off('o1'), { reason: 'Drafted', fields: { observations: 'The ledger shows sales of 3,000,000', findings: 'Sales understated by 1,000,000' } });
    doc(id, 'findings');
    await step(id, 'send-findings', off('o1'));
    await step(id, 'response-received', off('o1'), { reason: 'The taxpayer accepts the findings', fields: { taxpayerResponse: 'Accepted' } });
    await step(id, 'propose-assessment', off('o1'), { reason: 'Reviewed', fields: { reviewNote: 'Response accepts the findings', baseMinor: 1_000_000, assessedMinor: 100_000, assessmentReasons: 'Assessed by hand on the understated sales' } });
    const done = await decide(id, 'assess');
    expect(getDecision(done.decision!.id)!.content.authority).toMatchObject({ permitType: 'tax-assessment' });
    expect(assessmentOfCase(id)).toMatchObject({ origin: 'compliance', amountMinor: 100_000 });
    const scope = getCase(id)!.history.find(h => h.action === 'authorise')!;
    expect(getDecision(scope.decision!)!.content.authority).toMatchObject({ permitType: 'tax-compliance-review' });
  });

  it('extends the objection only for what it covers: not admitted or withdrawn, with reasons', async () => {
    const t = await taxpayer();
    const a = await assessed(t.tin);
    const id = open('tax.objection', { assessment: a.reference, grounds: 'The assessment ignores costs' }, ['objection']);
    await step(id, 'review', off('o1'));
    expect(await act(id, { action: 'propose', reason: 'x' }, off('o1'))).toHaveProperty('error');
    await step(id, 'propose', off('o1'), { reason: 'Out of time', fields: { admissibility: 'Lodged after the period the approved rule allows; no extension asked' } });
    await decide(id, 'reject');
    expect(getCase(id)!.stage).toBe('inadmissible');
    expect(account(t.id, 'income').balanceMinor).toBe(300_000);
    const w = open('tax.objection', { assessment: a.reference, grounds: 'Second thoughts' }, ['objection']);
    await step(w, 'review', off('o1'));
    await step(w, 'withdraw', off('o1'), { reason: 'Withdrawn by the taxpayer in writing' });
    expect(getCase(w)!.stage).toBe('withdrawn');
  });

  it('records nil and late returns: a nil return declares nothing, a late one says why', async () => {
    const t = await taxpayer();
    const nil = open('tax.return', { tin: t.tin, taxType: 'vat', period: '2025-Q1', baseMinor: 5, returnKind: 'nil' }, ['return-form']);
    expect(await act(nil, { action: 'check' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/nil return declares nothing/) });
    const late = open('tax.return', { tin: t.tin, taxType: 'vat', period: '2025-Q2', baseMinor: 5, returnKind: 'late' }, ['return-form']);
    expect(await act(late, { action: 'check' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/why the return is late/) });
    await step(late, 'check', off('o1'), { fields: { lateReason: 'Records held by the former accountant' } });
    expect(returnsOf(t.id).find(r => r.period === '2025-Q2')!.versions[0]).toMatchObject({ kind: 'late' });
  });
});
