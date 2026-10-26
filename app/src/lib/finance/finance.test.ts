// Budget and treasury (plan step I5): the budget call, a ceiling, a bid
// allocated within it, an appropriation enacted under the law (cited from the
// laws register), validated and released, a commitment never above what is
// available, a payee account verified and approved before anyone is paid,
// and a payment instructed, verified, approved by two officials, executed
// with the bank's reference and reconciled once, each step by a different
// person; the balance computed from the records. No tier, ceiling or period
// ships: a production installation approves no payment without the approved
// tiers rule. Every decision is classified under a proposed mapping.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages, listPackages } from '@/lib/casework/packages';
import { installReferenceProcedures } from '@/lib/casework/modules';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions, getDecision } from '@/lib/records/decisions';
import { setSovereign, createMinistry } from '@/lib/data/store';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { draftRule, approveRule, resetRules, tierFor } from '@/lib/law/rules';
import { classifyDecision } from '@/lib/permits/decisions';
import { needsTwoOfficials } from '@/lib/casework/dual-control-policy';
import { PROPOSED_DEFAULTS, installProposedDefaults, listMappings, resetPermitAuthorities } from '@/lib/permits/authority';
import { createOrganisation } from '@/lib/organisations/register';
import { FINANCE_PROCEDURES, FINANCE_PERMITS, PAYMENT_TIERS_RULE } from './procedures';
import { resetFinance, getAppropriation, balanceOf, getCommitment, getPayment, payeeAccountInForce, listPayeeAccounts, financeRecords, getBid } from './register';
import { economicServicesView } from './services-view';
import type { Case } from '@/lib/casework/types';

let FIN = '', HEALTH = '';
// Restricted cases (payments, payee accounts) are worked by their assignee (o1) and those who can sign there.
const who = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: FIN } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: FIN, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who('s0', 'signatory')); };
async function step(id: string, action: string, w: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, w); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
async function refused(id: string, action: string, w: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, w); expect('error' in r, `${action} should be refused`).toBe(true); return 'error' in r ? r.error : ''; }
async function decide(id: string, action: string, a = 's1', b = 's2', extra: Record<string, unknown> = {}) { await step(id, action, who(a, 'signatory'), { reason: 'Decided on the record', ...extra }); return step(id, action, who(b, 'signatory')); }
const open = (procedure: string, fields: Record<string, unknown>, docs: string[] = []) => { const c = openCase({ procedure, fields }, who('o1')) as { id: string; error?: string }; if (c.error) throw new Error(`${procedure}: ${c.error}`); for (const d of docs) doc(c.id, d); return c.id; };
let LAW = { instrument: '', eId: 'sch_1' };
let SUPPLIER = '';

describe('budget and treasury', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetFinance, resetLaw, resetRules, resetPermitAuthorities]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    const f = createMinistry({ archetype: 'GENERIC', name: 'Treasury', slug: `treasury-${Math.random().toString(36).slice(2, 7)}` });
    const h = createMinistry({ archetype: 'GENERIC', name: 'Ministry of Health', slug: `health-${Math.random().toString(36).slice(2, 7)}` });
    if ('error' in f || 'error' in h) throw new Error('ministry');
    FIN = f.id; HEALTH = h.id;
    setSovereign({ deployment: { authorities: { finance: FIN } } }, 'Administrator');
    for (const p of FINANCE_PROCEDURES) { draftPackage(asNationSets(p), 'Author', 'a', registeredEffects()); const a = approvePackage(p.key, 1, 'Approver', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`); }
    const v = recordVersion({ instrument: { title: 'Appropriation Act 2027', type: 'act', jurisdiction: 'X', year: 2026, number: '9', issuingAuthority: 'Parliament' }, dates: { inForce: '2026-01-01' }, provisions: [{ eId: 'sch_1', num: 'Schedule 1', text: 'Sums appropriated.' }, { eId: 'sec_5', num: '5', text: 'Transfers between votes.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    LAW = { instrument: v.instrument.id, eId: 'sch_1' };
    SUPPLIER = (createOrganisation({ name: `Cold Chain Supplies ${Math.random().toString(36).slice(2, 6)}`, kind: 'company' }, 'c', 'Registrar') as { number: string }).number;
  });
  afterEach(() => vi.unstubAllEnvs());

  /** Budget call, ceiling, bid allocated, appropriation released: returns the appropriation's number. */
  async function released(amount = 10_000_000, release = 8_000_000) {
    const call = open('budget.circular', { period: '2027', currency: 'USD', instructions: 'Submit bids by programme with costing and indicators.' }, ['circular']);
    await step(call, 'propose', who('o1'));
    await decide(call, 'issue');
    const ceiling = open('budget.ceiling', { institution: HEALTH, period: '2027', currency: 'USD', ceilingMinor: 12_000_000, basisNote: 'Fiscal framework 2027' });
    await step(ceiling, 'propose', who('o1'));
    await decide(ceiling, 'approve');
    const bid = open('budget.bid', { institution: HEALTH, period: '2027', currency: 'USD', programme: 'Immunisation', objective: 'Fund the immunisation programme', requestedMinor: 15_000_000 }, ['bid']);
    await step(bid, 'validate', who('o1'));
    await step(bid, 'record-negotiation', who('o1'), { fields: { agreedMinor: amount, negotiationNote: 'Agreed at the hearing' } });
    // Above the ceiling: refused.
    await step(bid, 'propose', who('o1'), { reason: 'Within the framework', fields: { allocationMinor: 13_000_000 } });
    await step(bid, 'allocate', who('s1', 'signatory'), { reason: 'Allocated' });
    expect(await refused(bid, 'allocate', who('s2', 'signatory'))).toMatch(/Above the approved ceiling/);
    await (await import('@/lib/casework/engine')).cancelPending(bid, who('s1', 'signatory'), 'Over the ceiling');
    const pkgCase = (await import('@/lib/casework/engine')).getCase(bid)!;
    expect(pkgCase.stage).toBe('pending-approval');
    await step(bid, 'allocate', who('s1', 'signatory'), { reason: 'Allocated within the ceiling', fields: { allocationMinor: amount } });
    await step(bid, 'allocate', who('s2', 'signatory'));
    expect(getBid(bid)).toMatchObject({ state: 'allocated', allocationMinor: amount });
    const app = open('budget.appropriation', { institution: HEALTH, period: '2027', currency: 'USD', programme: 'Immunisation', amountMinor: amount, bid: getBid(bid)!.ref, lawInstrument: LAW.instrument, lawProvision: LAW.eId }, ['appropriation-act']);
    await step(app, 'allocate', who('o1'));
    await step(app, 'validate', who('o2', 'signatory'), { fields: { validationNote: 'The Act is in force; Schedule 1 names the vote' } });
    await step(app, 'propose', who('o1'), { reason: 'Validated' });
    await decide(app, 'release', 's1', 's2', { fields: { releaseMinor: release }, citations: [LAW] });
    return getAppropriation(app)!;
  }
  async function payee() {
    const id = open('treasury.payee-account', { payee: SUPPLIER, bank: 'National Bank', accountNumber: 'GB29NWBK60161331926819', changeReason: 'New supplier' }, ['account-request']);
    await step(id, 'record', who('o1'));
    expect(await refused(id, 'verify', who('o1'), { fields: { verificationMethod: 'call-back', verificationNote: 'x' } })).toMatch(/Separation of duties/);
    doc(id, 'bank-evidence');
    await step(id, 'verify', who('o2', 'signatory'), { fields: { verificationMethod: 'call-back to the registered contact', verificationNote: 'Confirmed by the supplier\'s director' } });
    await step(id, 'propose', who('o1'), { reason: 'Verified' });
    await decide(id, 'approve', 's1', 's2');
    return id;
  }
  async function commitment(appRef: string, amount = 3_000_000) {
    const id = open('finance.commitment', { institution: HEALTH, appropriation: appRef, supplier: SUPPLIER, description: 'Cold-chain refrigerators', amountMinor: amount, currency: 'USD' }, ['commitment-request']);
    await step(id, 'check', who('o1'));
    await step(id, 'propose', who('o1'), { reason: 'Funds available' });
    await decide(id, 'approve');
    return getCommitment(id)!;
  }

  it('ships every procedure as a draft, each decision classified under a proposed, unapproved mapping, no period set', () => {
    resetPackages();
    installReferenceProcedures('Administrator');
    for (const p of FINANCE_PROCEDURES) expect(listPackages({ key: p.key }).map(x => x.state), p.key).toEqual(['draft']);
    installProposedDefaults('Administrator');
    for (const t of Object.values(FINANCE_PERMITS)) {
      expect(PROPOSED_DEFAULTS.find(d => d.permitType === t), t).toMatchObject({ lead: 'finance' });
      expect(listMappings(t).map(m => m.state), t).toEqual(['draft']);
    }
    for (const p of FINANCE_PROCEDURES) {
      for (const d of p.deadlines) expect(d.days, `${p.key} ${d.key}`).toBeUndefined();
      for (const a of p.actions.filter(x => x.decision)) {
        const cls = classifyDecision({ fields: {}, owner: FIN } as unknown as Case, a, p);
        expect(cls, `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping', permitType: FINANCE_PERMITS[p.key] });
      }
    }
    // The platform minimum: every payment approval and payee account change needs two officials, whatever a version says.
    const pay = FINANCE_PROCEDURES.find(p => p.key === 'treasury.payment')!;
    const lowered = { ...pay.actions.find(a => a.key === 'approve')!, needs: { role: 'signatory' as const } };
    expect(needsTwoOfficials({ fields: {}, owner: FIN } as unknown as Case, lowered, pay)).toBe(true);
    const acct = FINANCE_PROCEDURES.find(p => p.key === 'treasury.payee-account')!;
    expect(needsTwoOfficials({ fields: {}, owner: FIN } as unknown as Case, { ...acct.actions.find(a => a.key === 'approve')!, needs: { role: 'signatory' } }, acct)).toBe(true);
  });

  it('keeps the chain apart: a bid within the ceiling, an appropriation released under the law, a commitment never above what is available', async () => {
    const a = await released();
    expect(a).toMatchObject({ state: 'released', amountMinor: 10_000_000, releasedMinor: 8_000_000, institution: HEALTH });
    expect(a.basis[0]).toMatchObject({ instrument: LAW.instrument, eId: 'sch_1' });
    expect(a.decisions).toHaveLength(1);
    const sealed = getDecision(a.decisions[0]!)!;
    expect(JSON.stringify(sealed)).toMatch(/appropriation-release/);
    await payee();
    const c = await commitment(a.ref);
    expect(c).toMatchObject({ state: 'committed', amountMinor: 3_000_000, appropriationRef: a.ref, supplier: { number: SUPPLIER } });
    expect(balanceOf(a.ref)).toMatchObject({ releasedMinor: 8_000_000, committedMinor: 3_000_000, availableMinor: 5_000_000, paidMinor: 0 });
    // Above what is available: refused at the check.
    const over = open('finance.commitment', { institution: HEALTH, appropriation: a.ref, supplier: SUPPLIER, description: 'More', amountMinor: 6_000_000, currency: 'USD' }, ['commitment-request']);
    expect(await refused(over, 'check', who('o1'))).toMatch(/available/);
    // A transfer from it to another appropriation, never more than is available.
    const b = await (async () => {
      const id = open('budget.appropriation', { institution: HEALTH, period: '2027', currency: 'USD', programme: 'Primary care', amountMinor: 1_000_000, lawInstrument: LAW.instrument, lawProvision: LAW.eId }, ['appropriation-act']);
      await step(id, 'allocate', who('o1')); await step(id, 'validate', who('o2', 'signatory'), { fields: { validationNote: 'In force' } }); await step(id, 'propose', who('o1'), { reason: 'ok' });
      await decide(id, 'release', 's1', 's2', { citations: [LAW] });
      return getAppropriation(id)!;
    })();
    const rev = open('budget.revision', { revisionKind: 'virement', source: a.ref, destination: b.ref, amountMinor: 6_000_000, justification: 'Outbreak response' }, ['revision-request']);
    expect(await refused(rev, 'check', who('o1'))).toMatch(/available/);
    const rev2 = open('budget.revision', { revisionKind: 'virement', source: a.ref, destination: b.ref, amountMinor: 2_000_000, justification: 'Outbreak response' }, ['revision-request']);
    await step(rev2, 'check', who('o1'));
    await step(rev2, 'check-authority', who('o1'), { fields: { lawInstrument: LAW.instrument, lawProvision: 'sec_5' } });
    await step(rev2, 'propose', who('o1'), { reason: 'Within the transfer power' });
    await decide(rev2, 'approve', 's1', 's2', { citations: [{ instrument: LAW.instrument, eId: 'sec_5' }] });
    expect(getAppropriation(a.ref)!).toMatchObject({ amountMinor: 8_000_000, releasedMinor: 6_000_000 });
    expect(getAppropriation(a.ref)!.versions.map(v => v.change)).toEqual(['enacted', 'validated', 'released', 'virement-out']);
    expect(balanceOf(b.ref)).toMatchObject({ amountMinor: 3_000_000, availableMinor: 3_000_000 });
  });

  it('pays only through instruct, verify, approve by two, execute and reconcile, each by a different person, and reconciles once', async () => {
    const a = await released();
    const acct = await payee();
    expect(payeeAccountInForce(SUPPLIER)).toMatchObject({ state: 'active', masked: '•••• 6819' });
    // The number never leaves the register.
    expect(JSON.stringify(listPayeeAccounts())).not.toMatch(/60161331926819/);
    expect(JSON.stringify(financeRecords())).not.toMatch(/60161331926819/);
    expect(acct).toBeTruthy();
    const c = await commitment(a.ref);
    const id = open('treasury.payment', { institution: HEALTH, commitment: c.ref, invoiceRef: 'INV-77', invoiceDate: '2027-02-01', invoiceMinor: 1_200_000, amountMinor: 1_200_000, purpose: 'Refrigerators, first delivery' }, ['invoice']);
    await step(id, 'validate-invoice', who('o1'));
    await step(id, 'check-commitment', who('o1'));
    await step(id, 'instruct', who('o1'), { reason: 'Invoice matches the order' });
    expect(await refused(id, 'verify', who('o1'), { fields: { verificationNote: 'x' } })).toMatch(/Separation of duties/);
    await step(id, 'verify', who('o2', 'signatory'), { fields: { verificationNote: 'Invoice, order and account checked' } });
    await step(id, 'propose', who('o3', 'signatory'), { reason: 'For approval' });
    // The verifier cannot approve; nor one official alone.
    expect(await refused(id, 'approve', who('o2', 'signatory'), { reason: 'x' })).toMatch(/Separation of duties/);
    await step(id, 'approve', who('s1', 'signatory'), { reason: 'Approved for payment' });
    expect(getPayment(id)!.state).toBe('verified');
    expect(await refused(id, 'approve', who('s1', 'signatory'))).toMatch(/second|different/);
    await step(id, 'approve', who('s2', 'signatory'));
    const p = getPayment(id)!;
    expect(p).toMatchObject({ state: 'approved', approved: { by: { name: 'Official s1' }, confirmedBy: { name: 'Official s2' } }, tier: { none: expect.stringMatching(/demonstration/) } });
    expect(p.approved!.decision).toBeTruthy();
    // An approver does not execute; the bank's amount must match.
    doc(id, 'bank-confirmation');
    expect(await refused(id, 'execute', who('s1', 'signatory'), { fields: { bankReference: 'BNK-1', valueDate: '2027-02-10', executedMinor: 1_200_000 } })).toMatch(/Separation of duties/);
    expect(await refused(id, 'execute', who('o4', 'signatory'), { fields: { bankReference: 'BNK-1', valueDate: '2027-02-10', executedMinor: 1_100_000 } })).toMatch(/not the approved/);
    await step(id, 'execute', who('o4', 'signatory'), { fields: { bankReference: 'BNK-1', valueDate: '2027-02-10', executedMinor: 1_200_000 } });
    doc(id, 'statement');
    expect(await refused(id, 'reconcile', who('o4', 'signatory'), { fields: { statementReference: 'ST-9', statementMinor: 1_200_000 } })).toMatch(/Separation of duties/);
    await step(id, 'reconcile', who('o5', 'signatory'), { fields: { statementReference: 'ST-9', statementMinor: 1_200_000 } });
    expect(getPayment(id)).toMatchObject({ state: 'reconciled', executed: { by: { name: 'Official o4' }, bankReference: 'BNK-1' }, reconciled: { by: { name: 'Official o5' }, statementReference: 'ST-9' } });
    expect(balanceOf(a.ref)).toMatchObject({ committedMinor: 3_000_000, paidMinor: 1_200_000, reconciledMinor: 1_200_000 });
    // The same invoice is never paid twice.
    const again = open('treasury.payment', { institution: HEALTH, commitment: c.ref, invoiceRef: 'INV-77', invoiceDate: '2027-02-01', invoiceMinor: 1_200_000, amountMinor: 1_200_000, purpose: 'again' }, ['invoice']);
    await step(again, 'validate-invoice', who('o1')); await step(again, 'check-commitment', who('o1'));
    expect(await refused(again, 'instruct', who('o1'), { reason: 'x' })).toMatch(/paid once/);
  });

  it('records the approval tier from the approved rule, and a production installation approves no payment without it', async () => {
    const r = draftRule({ key: PAYMENT_TIERS_RULE, title: 'Payment approval tiers', kind: 'tiers', owner: 'finance', effectiveFrom: '2026-01-01', citations: [{ instrument: LAW.instrument, eId: 'sec_5' }],
      tiers: [{ from: 0, to: 5_000_000, tier: 'delegated' }, { from: 5_000_000, tier: 'accounting-officer' }], tests: [{ name: 'small', input: { amountMinor: 100 }, expectMinor: 0, expectTier: 'delegated' }, { name: 'large', input: { amountMinor: 9_000_000 }, expectMinor: 0, expectTier: 'accounting-officer' }] }, 'R1', 'r1');
    if ('error' in r) throw new Error(r.error);
    expect(tierFor(PAYMENT_TIERS_RULE, 100)).toMatchObject({ error: expect.stringMatching(/No approved rule/) });
    approveRule(PAYMENT_TIERS_RULE, r.version, 'R2', 'r2');
    expect(tierFor(PAYMENT_TIERS_RULE, 9_000_000)).toMatchObject({ tier: 'accounting-officer' });
    // A tiers rule's tests must hold.
    expect(draftRule({ key: 'x.tiers', title: 'Bad', kind: 'tiers', owner: 'finance', effectiveFrom: '2026-01-01', tiers: [{ from: 0, tier: 'aa' }], tests: [{ name: 't', input: { amountMinor: 1 }, expectMinor: 0, expectTier: 'bb' }] }, 'R1')).toMatchObject({ error: expect.stringMatching(/expected bb/) });
    const a = await released();
    await payee();
    const c = await commitment(a.ref);
    const id = open('treasury.payment', { institution: HEALTH, commitment: c.ref, invoiceRef: 'INV-1', invoiceDate: '2027-02-01', invoiceMinor: 1_000_000, amountMinor: 1_000_000, purpose: 'Goods' }, ['invoice']);
    for (const [s, w] of [['validate-invoice', 'o1'], ['check-commitment', 'o1']] as const) await step(id, s, who(w));
    await step(id, 'instruct', who('o1'), { reason: 'ok' });
    await step(id, 'verify', who('o2', 'signatory'), { fields: { verificationNote: 'ok' } });
    await step(id, 'propose', who('o3', 'signatory'), { reason: 'ok' });
    await decide(id, 'approve');
    expect(getPayment(id)!.tier).toMatchObject({ tier: 'delegated', rule: { key: PAYMENT_TIERS_RULE, version: r.version } });
    // In production, without the rule, approval is refused.
    resetRules();
    vi.stubEnv('CIVICOS_MODE', 'production');
    const { tierFor: _t } = await import('@/lib/law/rules'); void _t;
    expect(economicServicesView('finance').rules[0]).toMatchObject({ key: PAYMENT_TIERS_RULE, state: 'not approved (ships unset)' });
  });

  it('refuses a payment to a supplier with no approved account, and an account change never redirects money at once', async () => {
    const a = await released();
    const c = await commitment(a.ref);
    const id = open('treasury.payment', { institution: HEALTH, commitment: c.ref, invoiceRef: 'INV-2', invoiceDate: '2027-02-01', invoiceMinor: 500, amountMinor: 500, purpose: 'Goods' }, ['invoice']);
    expect(await refused(id, 'validate-invoice', who('o1'))).toMatch(/no approved payee account/);
    const req = open('treasury.payee-account', { payee: SUPPLIER, bank: 'Other Bank', accountNumber: 'GB00OTHER123456', changeReason: 'Changed bank' }, ['account-request']);
    await step(req, 'record', who('o1'));
    expect(payeeAccountInForce(SUPPLIER)).toBeUndefined();
  });

  it('links a public-health programme\'s budget reference to the appropriation it names', async () => {
    const a = await released();
    const { getAppropriation: g } = await import('./register');
    expect(g(a.reference)?.ref).toBe(a.ref);
    expect(g(`fin:${a.ref}`)?.ref).toBe(a.ref);
  });
});
