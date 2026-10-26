// Public procurement (plan step I5): each institution adopts the templates as
// its own; a plan item funded from its appropriation; a tender published once
// (an addendum only before the deadline); bids sealed until two committee
// members open them together, a late bid recorded and left sealed; an
// evaluation only by members who declared their interests, with reasons; an
// award by officials who did not evaluate; a challenge before the independent
// review body blocks the contract; payment certification by a person other
// than the one who accepted, and the treasury pays only a certified invoice.
import { asNationSets, setNationDays } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, getCase, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages, listPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { setSovereign, createMinistry } from '@/lib/data/store';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { resetRules } from '@/lib/law/rules';
import { resetOfficials, createAccount } from '@/lib/auth/officials';
import { classifyDecision, checkDecision } from '@/lib/permits/decisions';
import { installProposedDefaults, draftMapping, approveMapping, resetPermitAuthorities } from '@/lib/permits/authority';
import { createOrganisation } from '@/lib/organisations/register';
import { FINANCE_PROCEDURES } from '@/lib/finance/procedures';
import { resetFinance, getAppropriation, getCommitment, getPayment } from '@/lib/finance/register';
import { PROCUREMENT_PROCEDURES, REFERENCE_PROCUREMENT_COMPLAINT, PROCUREMENT_PERMITS, installProcurementProcedures, procurementKey } from './procedures';
import { resetProcurement, receiveBid, declareInterest, manageInterest, getTender, getContract, procurementRecords, ocdsRelease, bidsOf } from './register';
import type { Case } from '@/lib/casework/types';

const SETUP = 'test-setup-token-procurement-0123456789';
process.env.CIVICOS_SETUP_TOKEN = SETUP;
process.env.CIVICOS_SCRYPT_N = '16384';

let INST = '', FIN = '', REVIEW = '';
const ids: Record<string, string> = {};
const at = (inst: string) => (n: string, role: 'officer' | 'signatory' = 'signatory'): Actor => ({ id: `local:${ids[n]}`, name: n, scope: { id: `local:${ids[n]}`, role, institution: inst } });
const pe = (n: string, role: 'officer' | 'signatory' = 'signatory'): Actor => at(INST)(n, role);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, inst: string, w: Actor) => { const d = addDocument({ class: cls, title: cls, institution: inst, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, w); };
async function step(id: string, action: string, w: Actor, extra: Record<string, unknown> = {}, now?: Date) { const r = await act(id, { action, ...extra }, w, now); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
async function refused(id: string, action: string, w: Actor, extra: Record<string, unknown> = {}, now?: Date) { const r = await act(id, { action, ...extra }, w, now); expect('error' in r, `${action} should be refused`).toBe(true); return 'error' in r ? r.error : ''; }
let LAW = { instrument: '', eId: 'sch_1' };
const ok = (c: Case | { error: string }): Case => { if ('error' in c) throw new Error(c.error); return c; };
let SUP_A = '', SUP_B = '', SUP_C = '';

describe('public procurement', () => {
  beforeEach(async () => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetFinance, resetProcurement, resetLaw, resetRules, resetPermitAuthorities, resetOfficials]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 5).toString('base64'));
    const mk = (name: string) => { const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 6)}` }); if ('error' in m) throw new Error(m.error); return m.id; };
    INST = mk('Ministry of Health'); FIN = mk('Treasury'); REVIEW = mk('Procurement Review Board');
    setSovereign({ deployment: { authorities: { finance: FIN, procurementReview: REVIEW } } }, 'Administrator');
    await createAccount({ email: 'first@gov.test', name: 'First', office: 'Administrator', password: 'correct horse battery', setupToken: SETUP }, null);
    for (const [n, inst] of [['Planner', INST], ['Lawyer', INST], ['Chair', INST], ['Member Two', INST], ['Member Three', INST], ['Accounting Officer', INST], ['Deputy', INST], ['Contract Manager', INST], ['Certifier', INST], ['Ethics Officer', INST]] as const) {
      const a = await createAccount({ email: `${n.replace(' ', '.').toLowerCase()}@gov.test`, name: n, office: n, password: 'correct horse battery', role: 'signatory', institution: inst }, 'First');
      if ('error' in a) throw new Error(a.error);
      ids[n] = a.id;
    }
    const v = recordVersion({ instrument: { title: 'Appropriation Act', type: 'act', jurisdiction: 'X', year: 2026, number: '9', issuingAuthority: 'Parliament' }, dates: { inForce: '2026-01-01' }, provisions: [{ eId: 'sch_1', num: 'Schedule 1', text: 'Sums.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    LAW = { instrument: v.instrument.id, eId: 'sch_1' };
    const org = (n: string) => (createOrganisation({ name: `${n} ${Math.random().toString(36).slice(2, 6)}`, kind: 'company' }, 'c', 'Registrar') as { number: string }).number;
    SUP_A = org('Alpha Cooling'); SUP_B = org('Beta Refrigeration'); SUP_C = org('Gamma Late');
    // The institution adopts the templates; the review body and finance their references; a second official approves each.
    const r = installProcurementProcedures(INST, 'Planner', 'local:planner');
    if ('error' in r) throw new Error(r.error);
    for (const p of [...FINANCE_PROCEDURES, REFERENCE_PROCUREMENT_COMPLAINT]) draftPackage(asNationSets(p), 'Author', 'a', registeredEffects());
    setNationDays();
    for (const p of listPackages({ state: 'draft' })) { const a = approvePackage(p.key, p.version, 'Approver', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`); }
  });
  afterEach(() => vi.unstubAllEnvs());

  /** A released appropriation of the procuring institution (lib/finance). */
  async function appropriation() {
    const fin = (n: string): Actor => ({ id: n, name: `Finance ${n}`, scope: { id: n, role: 'signatory', institution: FIN } });
    const c = ok(openCase({ procedure: 'budget.appropriation', fields: { institution: INST, period: '2027', currency: 'USD', programme: 'Immunisation', amountMinor: 50_000_000, lawInstrument: LAW.instrument, lawProvision: LAW.eId } }, fin('f0')));
    doc(c.id, 'appropriation-act', FIN, fin('f0'));
    await step(c.id, 'allocate', fin('f0')); await step(c.id, 'validate', fin('f1'), { fields: { validationNote: 'In force' } }); await step(c.id, 'propose', fin('f0'), { reason: 'ok' });
    await step(c.id, 'release', fin('f1'), { reason: 'Released', citations: [LAW] }); await step(c.id, 'release', fin('f2'));
    return getAppropriation(c.id)!;
  }
  /** A plan item recorded, funded, method checked and approved. */
  async function plan() {
    const app = await appropriation();
    const c = ok(openCase({ procedure: procurementKey('proc.plan', INST), fields: { period: '2027', description: 'Cold-chain refrigerators for district stores', category: 'goods', estimatedMinor: 9_000_000, currency: 'USD', method: 'open', appropriation: app.ref } }, pe('Planner')));
    doc(c.id, 'requisition', INST, pe('Planner'));
    await step(c.id, 'record', pe('Planner')); await step(c.id, 'confirm-budget', pe('Planner')); await step(c.id, 'check-method', pe('Planner'));
    await step(c.id, 'propose', pe('Planner'), { reason: 'Needed for the immunisation programme' });
    await step(c.id, 'approve', pe('Accounting Officer'), { reason: 'Approved' }); await step(c.id, 'approve', pe('Deputy'));
    return { app, item: (await import('./register')).getPlanItem(c.id)! };
  }
  const T0 = new Date('2027-03-01T09:00:00Z'), DEADLINE = '2027-03-20T12:00:00Z', AFTER = new Date('2027-03-21T09:00:00Z');
  /** A tender prepared, reviewed and published, with bids: two in time and one late. */
  async function tender() {
    const { app, item } = await plan();
    const c = ok(openCase({ procedure: procurementKey('proc.tender', INST), fields: { planItem: item.ref, title: 'Cold-chain refrigerators', scope: 'Supply and install 40 solar refrigerators', criteria: 'C1; Meets the technical specification; pass-fail\nC2; Delivery schedule; scored; 30', deadline: DEADLINE } }, pe('Planner'), T0));
    doc(c.id, 'tender-documents', INST, pe('Planner'));
    await step(c.id, 'prepare', pe('Planner'), {}, T0);
    expect(await refused(c.id, 'review', pe('Planner'), { fields: { legalReview: 'x' } }, T0)).toMatch(/Separation of duties/);
    await step(c.id, 'review', pe('Lawyer'), { fields: { legalReview: 'Method and criteria lawful' } }, T0);
    await step(c.id, 'publish', pe('Accounting Officer'), { reason: 'Publish' }, T0); await step(c.id, 'publish', pe('Deputy'), {}, T0);
    const t = getTender(c.id)!;
    const r1 = receiveBid({ tender: t.ref, supplier: { number: SUP_A, name: 'Alpha' }, priceMinor: 8_500_000, summary: 'Alpha: 40 units, delivery in 6 weeks', by: { name: 'Planner' }, at: '2027-03-10T10:00:00Z' });
    const r2 = receiveBid({ tender: t.ref, supplier: { number: SUP_B, name: 'Beta' }, priceMinor: 7_900_000, summary: 'Beta: 40 units, delivery in 10 weeks', by: { name: 'Planner' }, at: '2027-03-12T10:00:00Z' });
    const r3 = receiveBid({ tender: t.ref, supplier: { number: SUP_C, name: 'Gamma' }, priceMinor: 6_000_000, summary: 'Gamma: late', by: { name: 'Planner' }, at: '2027-03-20T12:30:00Z' });
    if ('error' in r1 || 'error' in r2 || 'error' in r3) throw new Error('bid');
    return { app, item, c, t, bids: [r1, r2, r3] };
  }

  it('ships templates each institution adopts, every decision classified under a proposed mapping whose lead is the procuring entity', () => {
    expect(PROCUREMENT_PROCEDURES.map(p => p.key)).toEqual(['proc.plan', 'proc.tender', 'proc.contract-variation', 'proc.contract-delivery']);
    for (const p of PROCUREMENT_PROCEDURES) {
      expect(p.owner).toBe('institution');
      for (const d of p.deadlines) expect(d.days, `${p.key} ${d.key}`).toBeUndefined();
      for (const a of p.actions.filter(x => x.decision)) expect(classifyDecision({ fields: {}, owner: INST } as unknown as Case, a, { ...p, key: procurementKey(p.key, INST) }), `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping', permitType: PROCUREMENT_PERMITS[p.key] });
    }
    expect(listPackages({ key: procurementKey('proc.tender', INST) })[0]).toMatchObject({ owner: INST, state: 'approved' });
    expect(classifyDecision({ fields: {}, owner: REVIEW } as unknown as Case, REFERENCE_PROCUREMENT_COMPLAINT.actions.find(a => a.key === 'uphold')!, REFERENCE_PROCUREMENT_COMPLAINT)).toMatchObject({ permitType: 'procurement-review-decision' });
  });

  it('resolves a mapping led by the procuring entity to each institution for its own procurement, refused elsewhere', async () => {
    installProposedDefaults('Admin');
    const m = draftMapping({ permitType: 'procurement-award-x', title: 'Award', lead: 'procuring-entity', effectiveFrom: '2026-01-01', legalBasis: [LAW] }, 'A1', 'a1');
    if ('error' in m) throw new Error(m.error);
    expect(m.lead).toBe('procuring-entity');
    approveMapping('procurement-award-x', m.version, 'A2', 'a2');
    const pkg = { ...PROCUREMENT_PROCEDURES[1]!, key: procurementKey('proc.tender', INST), authority: undefined } as never;
    vi.stubEnv('CIVICOS_MODE', 'production');
    // The proposed procurement-award mapping is not approved: production refuses the award.
    const r = checkDecision({ fields: {}, owner: INST } as unknown as Case, PROCUREMENT_PROCEDURES[1]!.actions.find(a => a.key === 'award')!, pkg, new Date());
    expect(r).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs procurement-award/) });
  });

  it('keeps bids sealed until two committee members open them together; a late bid keeps its time and stays sealed', async () => {
    const { c, t } = await tender();
    // Before the opening nothing of a bid's content is readable anywhere.
    const before = JSON.stringify(procurementRecords([INST]));
    expect(before).not.toMatch(/8500000|delivery in 6 weeks/);
    expect(bidsOf(t.ref).find(b => b.late)).toMatchObject({ receivedAt: '2027-03-20T12:30:00Z', late: true, state: 'received' });
    // Criteria are fixed after the deadline: no addendum.
    doc(c.id, 'addendum', INST, pe('Planner'));
    await step(c.id, 'addendum', pe('Accounting Officer'), { reason: 'Change C2', fields: { addendumReason: 'Change C2' } }, AFTER);
    expect(await refused(c.id, 'addendum', pe('Deputy'), {}, AFTER)).toMatch(/Submissions are closed/);
    await (await import('@/lib/casework/engine')).cancelPending(c.id, pe('Accounting Officer'), 'Too late');
    expect(await refused(c.id, 'close', pe('Planner'), {}, T0)).toMatch(/not before/);
    await step(c.id, 'close', pe('Planner'), {}, AFTER);
    await step(c.id, 'appoint-committee', pe('Accounting Officer'), { fields: { committeeMembers: `${ids.Chair}, ${ids['Member Two']}, ${ids['Member Three']}` } }, AFTER);
    // One member cannot open alone; a non-member cannot confirm.
    await step(c.id, 'open-bids', pe('Chair'), { fields: { openingRecord: 'Opened in public at 10:00; prices read aloud' } }, AFTER);
    expect(await refused(c.id, 'open-bids', pe('Deputy'), {}, AFTER)).toMatch(/not a member/);
    await (await import('@/lib/casework/engine')).cancelPending(c.id, pe('Chair'), 'Wrong second');
    await step(c.id, 'open-bids', pe('Chair'), { fields: { openingRecord: 'Opened in public at 10:00; prices read aloud' } }, AFTER);
    await step(c.id, 'open-bids', pe('Member Two'), {}, AFTER);
    const opened = getTender(c.id)!;
    expect(opened.opening).toMatchObject({ officials: [{ name: 'Chair' }, { name: 'Member Two' }], late: [expect.stringMatching(/^BID-/)] });
    expect(opened.opening!.opened).toHaveLength(2);
    expect(bidsOf(t.ref).find(b => b.late)).toMatchObject({ state: 'not-opened' });
    expect(bidsOf(t.ref).find(b => b.supplier.number === SUP_A)!.opened).toMatchObject({ priceMinor: 8_500_000 });
    expect(ocdsRelease(t.ref)).toMatchObject({ ocid: null, tender: { id: t.ref, numberOfTenderers: 2 } });
    expect(JSON.stringify(ocdsRelease(t.ref))).not.toMatch(/7900000|delivery in 10 weeks/);
  });

  it('evaluates only after every member declared, never by a member with an unmanaged interest, and awards by officials who did not evaluate', async () => {
    const { c, t } = await tender();
    await step(c.id, 'close', pe('Planner'), {}, AFTER);
    await step(c.id, 'appoint-committee', pe('Accounting Officer'), { fields: { committeeMembers: `${ids.Chair}, ${ids['Member Two']}, ${ids['Member Three']}` } }, AFTER);
    await step(c.id, 'open-bids', pe('Chair'), { fields: { openingRecord: 'Opened' } }, AFTER); await step(c.id, 'open-bids', pe('Member Two'), {}, AFTER);
    const [a, b] = bidsOf(t.ref).filter(x => x.state === 'opened').sort((x, y) => x.supplier.number.localeCompare(y.supplier.number));
    const results = `${a!.ref}; C1; meets; spec sheet; Meets every line\n${a!.ref}; C2; 80; schedule; Six weeks\n${b!.ref}; C1; meets; spec sheet; Meets\n${b!.ref}; C2; 50; schedule; Ten weeks`;
    doc(c.id, 'evaluation-report', INST, pe('Chair'));
    // The evaluation is recorded by two members together: checked when the second confirms.
    const { cancelPending } = await import('@/lib/casework/engine');
    const attempt = async (why: RegExp) => { await step(c.id, 'evaluate', pe('Chair'), { fields: { results, recommendedBid: a!.ref, recommendationReasons: 'Best delivery' } }, AFTER); expect(await refused(c.id, 'evaluate', pe('Member Three'), {}, AFTER)).toMatch(why); cancelPending(c.id, pe('Chair'), 'Not yet'); };
    await attempt(/has not declared/);
    expect(declareInterest(t.ref, { id: `local:${ids.Deputy}`, name: 'Deputy' }, 'none', '', AFTER.toISOString())).toMatchObject({ error: expect.stringMatching(/Only a member/) });
    declareInterest(t.ref, { id: `local:${ids.Chair}`, name: 'Chair' }, 'none', '', AFTER.toISOString());
    declareInterest(t.ref, { id: `local:${ids['Member Two']}`, name: 'Member Two' }, 'declared', 'My cousin works at Beta Refrigeration', AFTER.toISOString());
    declareInterest(t.ref, { id: `local:${ids['Member Three']}`, name: 'Member Three' }, 'none', '', AFTER.toISOString());
    await attempt(/managed before the evaluation/);
    // Managed by an official independent of the committee: Member Two is recused.
    expect(manageInterest(t.ref, { id: `local:${ids['Member Two']}`, name: 'Member Two' }, 'recused', 'Family link to a bidder', { id: `local:${ids.Chair}`, name: 'Chair' }, AFTER.toISOString())).toMatchObject({ error: expect.stringMatching(/independent of the committee/) });
    manageInterest(t.ref, { id: `local:${ids['Member Two']}`, name: 'Member Two' }, 'recused', 'Family link to a bidder', { id: `local:${ids['Ethics Officer']}`, name: 'Ethics Officer' }, AFTER.toISOString());
    // The details stay on the restricted record only.
    expect(JSON.stringify(procurementRecords([INST]).tenders[0]!.declarations)).not.toMatch(/cousin/);
    await step(c.id, 'evaluate', pe('Chair'), { fields: { results, recommendedBid: a!.ref, recommendationReasons: 'Meets every criterion with the earliest delivery' } }, AFTER);
    expect(await refused(c.id, 'evaluate', pe('Member Two'), {}, AFTER)).toMatch(/recused/);
    await step(c.id, 'evaluate', pe('Member Three'), {}, AFTER);
    expect(getTender(c.id)!.evaluation).toMatchObject({ recommendation: { bid: a!.ref }, by: [{ name: 'Chair' }, { name: 'Member Three' }] });
    await step(c.id, 'propose-award', pe('Planner'), { reason: 'Recommended' }, AFTER);
    expect(await refused(c.id, 'award', pe('Chair'), { reason: 'x' }, AFTER)).toMatch(/Separation of duties/);
    await step(c.id, 'award', pe('Accounting Officer'), { reason: 'Award to the recommended bid' }, AFTER);
    await step(c.id, 'award', pe('Deputy'), {}, AFTER);
    expect(getTender(c.id)).toMatchObject({ state: 'awarded', award: { bid: a!.ref, valueMinor: 8_500_000, by: { name: 'Accounting Officer' }, confirmedBy: { name: 'Deputy' } } });
    expect(getCase(c.id)!.stage).toBe('standstill');
    return { c, t, a: a! };
  });

  it('blocks the contract while a challenge is open before the review body, then pays only a certified invoice', async () => {
    const { c, t } = await tender();
    await step(c.id, 'close', pe('Planner'), {}, AFTER);
    await step(c.id, 'appoint-committee', pe('Accounting Officer'), { fields: { committeeMembers: `${ids.Chair}, ${ids['Member Two']}` } }, AFTER);
    await step(c.id, 'open-bids', pe('Chair'), { fields: { openingRecord: 'Opened' } }, AFTER); await step(c.id, 'open-bids', pe('Member Two'), {}, AFTER);
    for (const n of ['Chair', 'Member Two']) declareInterest(t.ref, { id: `local:${ids[n]}`, name: n }, 'none', '', AFTER.toISOString());
    const opened = bidsOf(t.ref).filter(x => x.state === 'opened');
    const winner = opened.find(b => b.supplier.number === SUP_A)!;
    const results = opened.map(b => `${b.ref}; C1; meets; s; ok\n${b.ref}; C2; 50; s; ok`).join('\n');
    doc(c.id, 'evaluation-report', INST, pe('Chair'));
    await step(c.id, 'evaluate', pe('Chair'), { fields: { results, recommendedBid: winner.ref, recommendationReasons: 'Best value' } }, AFTER); await step(c.id, 'evaluate', pe('Member Two'), {}, AFTER);
    await step(c.id, 'propose-award', pe('Planner'), { reason: 'ok' }, AFTER);
    await step(c.id, 'award', pe('Accounting Officer'), { reason: 'Award' }, AFTER); await step(c.id, 'award', pe('Deputy'), {}, AFTER);
    // A losing bidder complains to the review body (independent of the procuring institution).
    const rv = (n: string): Actor => ({ id: n, name: `Review ${n}`, scope: { id: n, role: 'signatory', institution: REVIEW } });
    const k = ok(openCase({ procedure: REFERENCE_PROCUREMENT_COMPLAINT.key, fields: { tender: t.ref, decisionChallenged: 'award', complainant: SUP_B, grounds: 'Delivery was scored inconsistently', requestedRemedy: 'annul the award' } }, rv('r1')));
    doc(k.id, 'complaint', REVIEW, rv('r1'));
    await step(k.id, 'register', rv('r1'));
    // The procuring institution cannot work the review body's case.
    const own = await act(k.id, { action: 'request-response', fields: { completeness: 'x' } }, pe('Accounting Officer'));
    expect('error' in own).toBe(true);
    const LATER = new Date('2027-05-01T09:00:00Z');
    doc(c.id, 'contract', INST, pe('Accounting Officer'));
    expect(await refused(c.id, 'sign-contract', pe('Accounting Officer'), { fields: { contractTerms: 'Supply of 40 refrigerators as tendered' } }, LATER)).toMatch(/challenge/);
    await step(k.id, 'request-response', rv('r1'), { fields: { completeness: 'In time, with standing' } });
    await step(k.id, 'response-received', rv('r1'), { reason: 'Response received' });
    await step(k.id, 'propose', rv('r1'), { reason: 'Considered', fields: { reviewNote: 'Scores consistent with the published criteria' } });
    await step(k.id, 'dismiss', rv('r2'), { reason: 'The scoring followed the criteria' }); await step(k.id, 'dismiss', rv('r3'));
    expect(getTender(c.id)!.challenges[0]).toMatchObject({ state: 'decided', outcome: { result: 'dismissed' } });
    await step(c.id, 'sign-contract', pe('Accounting Officer'), { fields: { contractTerms: 'Supply of 40 refrigerators as tendered' } }, LATER);
    const ctr = getContract(getTender(c.id)!.contract!)!;
    expect(ctr).toMatchObject({ state: 'active', supplier: { number: SUP_A }, versions: [{ valueMinor: 8_500_000, change: 'signed' }] });
    // Commitment against the contract; the treasury refuses an uncertified invoice.
    const fin = (n: string): Actor => ({ id: n, name: `Finance ${n}`, scope: { id: n, role: 'signatory', institution: FIN } });
    const app = (await import('./register')).getPlanItem(t.planItem)!.budget!.appropriation;
    const cm = ok(openCase({ procedure: 'finance.commitment', fields: { institution: INST, appropriation: app, supplier: SUP_A, contract: ctr.ref, description: 'Refrigerators', amountMinor: 8_500_000, currency: 'USD' } }, fin('f0')));
    doc(cm.id, 'commitment-request', FIN, fin('f0'));
    await step(cm.id, 'check', fin('f0')); await step(cm.id, 'propose', fin('f0'), { reason: 'ok' }); await step(cm.id, 'approve', fin('f1'), { reason: 'ok' }); await step(cm.id, 'approve', fin('f2'));
    const acct = ok(openCase({ procedure: 'treasury.payee-account', fields: { payee: SUP_A, bank: 'Bank', accountNumber: 'GB29NWBK60161331926811', changeReason: 'Contract' } }, fin('f0')));
    doc(acct.id, 'account-request', FIN, fin('f0')); doc(acct.id, 'bank-evidence', FIN, fin('f0'));
    await step(acct.id, 'record', fin('f0')); await step(acct.id, 'verify', fin('f3'), { fields: { verificationMethod: 'call-back', verificationNote: 'ok' } }); await step(acct.id, 'propose', fin('f0'), { reason: 'ok' });
    await step(acct.id, 'approve', fin('f1'), { reason: 'ok' }); await step(acct.id, 'approve', fin('f2'));
    const pay = ok(openCase({ procedure: 'treasury.payment', fields: { institution: INST, commitment: getCommitment(cm.id)!.ref, invoiceRef: 'INV-A1', invoiceDate: '2027-06-01', invoiceMinor: 4_000_000, amountMinor: 4_000_000, purpose: 'First delivery' } }, fin('f0')));
    doc(pay.id, 'invoice', FIN, fin('f0'));
    expect(await refused(pay.id, 'validate-invoice', fin('f0'))).toMatch(/certified against an accepted deliverable/);
    // Delivery accepted by one official, certified by another.
    const dl = ok(openCase({ procedure: procurementKey('proc.contract-delivery', INST), fields: { contract: ctr.ref, deliverable: 'First 20 refrigerators delivered and installed' } }, pe('Contract Manager')));
    doc(dl.id, 'deliverable', INST, pe('Contract Manager'));
    await step(dl.id, 'receive', pe('Contract Manager'));
    await step(dl.id, 'accept', pe('Contract Manager'), { reason: 'Inspected', fields: { inspectionFindings: '20 units working' } });
    doc(dl.id, 'invoice', INST, pe('Contract Manager'));
    expect(await refused(dl.id, 'certify', pe('Contract Manager'), { fields: { invoiceRef: 'INV-A1', certifiedMinor: 4_000_000 } })).toMatch(/Separation of duties/);
    await step(dl.id, 'certify', pe('Certifier'), { fields: { invoiceRef: 'INV-A1', certifiedMinor: 4_000_000 } });
    await step(pay.id, 'validate-invoice', fin('f0'));
    expect(getCase(pay.id)!.stage).toBe('validated');
    expect(getPayment(pay.id)).toBeUndefined();
  });
});
