// The internal administration every institution has (plan I2; supplement
// part 21): its own procedures drafted from templates and approved by a second
// official; payroll prepared, reviewed and approved by different persons
// (dualControlRefusal(): the person, never only the account); deductions only
// from an approved rule; a delegation of authority recorded under the law and
// read in authorisation, the delegated act recording delegate and delegator;
// attribute scope by task; restricted cases logged on every read.
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

const { openCase, act, attach, assign, getCase, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages, listPackages, runPackageTests, checkPackage } = await import('@/lib/casework/packages');
const { setNationDays } = await import('@/lib/casework/testkit');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { createMinistry } = await import('@/lib/data/store');
const { resetOfficials, createAccount } = await import('@/lib/auth/officials');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { resetDelegations, authorityGrantsFor, authorityDelegationsOf } = await import('@/lib/records/delegations');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { ADMINISTRATION_PROCEDURES, installAdministrationProcedures, administrationKey } = await import('./procedures');
const { administrationOf, resetAdministration } = await import('./register');
const casesRoute = await import('@/app/api/cases/[id]/route');
type Actor = import('@/lib/casework/engine').Actor;

const SETUP_TOKEN = 'test-setup-token-administration-0123456789';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;
process.env.CIVICOS_SCRYPT_N = '16384';

let INST = '';
const ids: Record<string, string> = {};
const actor = (who: string, role: 'officer' | 'signatory', extra: object = {}): Actor => ({ id: `local:${ids[who]}`, name: who, scope: { id: `local:${ids[who]}`, role, institution: INST, ...extra } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, who: Actor) => { const d = addDocument({ class: cls, title: cls, institution: INST, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, who.name) as { id: string }; attach(caseId, d.id, who); };
const key = (t: string) => administrationKey(t, INST);
async function open(t: string, fields: Record<string, unknown>, who: Actor) { const c = openCase({ procedure: key(t), fields }, who); if ('error' in c) throw new Error(`${t}: ${c.error}`); return c; }
/** A restricted case is worked by the officials assigned to it: an official who can sign assigns it. */
const assignTo = (caseId: string, who: string) => { const r = assign(caseId, { id: `local:${ids[who]}`, name: who }, actor('Director', 'signatory')); if ('error' in r) throw new Error(r.error); };
let basis: { instrument: string; eId: string }[] = [];

beforeEach(async () => {
  for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetOfficials, resetLaw, resetDelegations, resetAccessLog, resetAdministration]) r();
  vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 9).toString('base64'));
  official = null;
  const m = createMinistry({ archetype: 'GENERIC', name: 'Ministry of Works', slug: `works-${Math.random().toString(36).slice(2, 7)}` });
  if ('error' in m) throw new Error(m.error);
  INST = m.id;
  await createAccount({ email: 'first@gov.test', name: 'First', office: 'Administrator', password: 'correct horse battery', setupToken: SETUP_TOKEN }, null);
  for (const [n, role] of [['Preparer', 'officer'], ['Reviewer', 'officer'], ['Approver One', 'signatory'], ['Approver Two', 'signatory'], ['Director', 'signatory'], ['Deputy', 'officer']] as const) {
    const a = await createAccount({ email: `${n.replace(' ', '.').toLowerCase()}@gov.test`, name: n, office: n, password: 'correct horse battery', role, institution: INST }, 'First');
    if ('error' in a) throw new Error(a.error);
    ids[n] = a.id;
  }
  const law = recordVersion({ instrument: { title: 'Public Service Act', type: 'act', jurisdiction: 'X', year: 2020, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_12', num: '12', text: 'A head of department may delegate in writing.' }] }, 'L1', 'l1');
  if ('error' in law) throw new Error(law.error);
  confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
  basis = [{ instrument: law.instrument.id, eId: 'sec_12' }];
});
afterEach(() => vi.unstubAllEnvs());

/** The institution's own procedures, drafted from the templates and approved by a second official (the nation's days set). */
function adopt(delegablePolicy = false) {
  if (delegablePolicy) {
    // The nation's version of the policy procedure marks its approval delegable (its law allows it).
    const t = ADMINISTRATION_PROCEDURES.find(x => x.key === 'adm.policy')!;
    const { forms: _f, function: _fn, ...pkg } = t;
    const d = draftPackage({ ...pkg, key: key('adm.policy'), owner: INST, actions: pkg.actions.map(a => (a.key === 'approve' ? { ...a, needs: { ...a.needs, delegable: true } } : a)) }, 'Drafter', 'drafter', registeredEffects());
    if ('error' in d) throw new Error(d.error);
  }
  const r = installAdministrationProcedures(INST, 'Drafter', 'drafter');
  if ('error' in r) throw new Error(r.error);
  setNationDays();
  for (const p of listPackages({ state: 'draft' })) {
    const a = approvePackage(p.key, p.version, 'Approver of procedures', 'proc-approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
  }
}

describe('internal administration procedures', () => {
  it('drafts each institution\'s own procedures from the templates: structure and tests pass, nothing approved until a second official does', () => {
    for (const t of ADMINISTRATION_PROCEDURES) {
      const { forms: _f, function: _fn, ...pkg } = t;
      expect(checkPackage({ ...pkg, key: key(t.key), owner: INST }, registeredEffects()), t.key).toBeNull();
      expect(runPackageTests({ ...pkg, state: 'draft', createdAt: '', author: '' } as never).failures, t.key).toEqual([]);
      for (const d of t.deadlines) expect(d.days, `${t.key} ${d.key}`).toBeUndefined();
    }
    const r = installAdministrationProcedures(INST, 'Drafter');
    expect(r).toMatchObject({ drafted: ADMINISTRATION_PROCEDURES.map(t => key(t.key)) });
    expect(listPackages({ state: 'approved' })).toEqual([]);
    // Personnel, payroll, legal-advice and disciplinary cases are restricted.
    for (const k of ['adm.payroll-input', 'adm.payroll-review', 'adm.payroll-correction', 'adm.disciplinary', 'adm.legal-advice']) expect(ADMINISTRATION_PROCEDURES.find(t => t.key === k)!.sensitivity, k).toBe('restricted');
  });

  it('payroll: prepared, reviewed and approved by different persons; the approver differs from the reviewer and the preparer', async () => {
    adopt();
    const prep = actor('Preparer', 'officer');
    const c1 = await open('adm.payroll-input', { payPeriod: { from: '2026-10-01', to: '2026-10-31' }, batchRef: 'PB-2026-10', employees: 12, grossMinor: 4_800_000 }, prep);
    doc(c1.id, 'payroll-input', prep);
    expect(await act(c1.id, { action: 'submit' }, prep)).not.toHaveProperty('error');

    // The preparer may not review their own batch.
    const c2 = await open('adm.payroll-review', { payrollBatch: 'PB-2026-10', payPeriod: { from: '2026-10-01', to: '2026-10-31' } }, prep);
    doc(c2.id, 'reconciliation-report', prep);
    expect(await act(c2.id, { action: 'review' }, prep)).toMatchObject({ error: expect.stringMatching(/Separation of duties: reviewing a payroll batch is done by a different person from Preparer/) });
    const rev = actor('Reviewer', 'officer');
    assignTo(c2.id, 'Reviewer');
    expect(await act(c2.id, { action: 'review' }, rev)).not.toHaveProperty('error');

    // Approval: two officials who can sign, neither the reviewer; one person cannot propose and confirm.
    const one = actor('Approver One', 'signatory'), two = actor('Approver Two', 'signatory');
    expect(await act(c2.id, { action: 'approve', reason: 'Reconciled' }, rev)).toMatchObject({ error: expect.stringMatching(/can sign/) });
    expect(await act(c2.id, { action: 'approve', reason: 'Reconciled' }, one)).toMatchObject({ pending: true });
    expect(await act(c2.id, { action: 'approve' }, one)).toMatchObject({ error: expect.stringMatching(/different official/) });
    const done = await act(c2.id, { action: 'approve' }, two);
    expect(done).toHaveProperty('decision');
    const batch = administrationOf(INST).payroll[0]!;
    expect(batch).toMatchObject({ status: 'approved', preparedBy: { name: 'Preparer' }, reviewedBy: { name: 'Reviewer' }, approvedBy: { name: 'Approver One', confirmedBy: 'Approver Two' } });
    // No salary scale or rate is typed: without an approved deductions rule a demonstration records none.
    expect(batch.deductions).toMatchObject({ notCalculated: expect.stringMatching(/No approved deductions rule/) });
  });

  it('separation of duties compares persons: a reviewer who also proposes the approval is refused, whatever account', async () => {
    adopt();
    const prep = actor('Preparer', 'officer');
    const c1 = await open('adm.payroll-input', { payPeriod: { from: '2026-10-01', to: '2026-10-31' }, batchRef: 'PB-B', employees: 2, grossMinor: 10 }, prep);
    doc(c1.id, 'payroll-input', prep);
    await act(c1.id, { action: 'submit' }, prep);
    // The Director reviews (any official may record a review) and then tries to approve: the same person.
    const dir = actor('Director', 'signatory');
    const c2 = await open('adm.payroll-review', { payrollBatch: 'PB-B' }, dir);
    doc(c2.id, 'reconciliation-report', dir);
    expect(await act(c2.id, { action: 'review' }, dir)).not.toHaveProperty('error');
    expect(await act(c2.id, { action: 'approve', reason: 'ok' }, dir)).toMatchObject({ error: expect.stringMatching(/Separation of duties/) });
  });

  it('in production, payroll is approved only with the institution\'s approved deductions rule', async () => {
    adopt();
    const prep = actor('Preparer', 'officer');
    const c1 = await open('adm.payroll-input', { payPeriod: { from: '2026-10-01', to: '2026-10-31' }, batchRef: 'PB-P', employees: 2, grossMinor: 10 }, prep);
    doc(c1.id, 'payroll-input', prep);
    await act(c1.id, { action: 'submit' }, prep);
    const c2 = await open('adm.payroll-review', { payrollBatch: 'PB-P' }, prep);
    doc(c2.id, 'reconciliation-report', prep);
    assignTo(c2.id, 'Reviewer');
    expect(await act(c2.id, { action: 'review' }, actor('Reviewer', 'officer'))).not.toHaveProperty('error');
    await act(c2.id, { action: 'approve', reason: 'ok' }, actor('Approver One', 'signatory'));
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(await act(c2.id, { action: 'approve' }, actor('Approver Two', 'signatory'))).toMatchObject({ error: expect.stringMatching(/No approved rule adm\.payroll\.deductions/) });
  });

  it('an account scoped by task takes only the steps listed', async () => {
    adopt();
    const scoped = actor('Preparer', 'officer', { attributes: { tasks: ['administration.payroll.prepare'] } });
    const c2 = await open('adm.payroll-review', { payrollBatch: 'PB-X' }, actor('Reviewer', 'officer'));
    doc(c2.id, 'reconciliation-report', actor('Reviewer', 'officer'));
    expect(await act(c2.id, { action: 'review' }, scoped)).toMatchObject({ error: expect.stringMatching(/scoped to named tasks: administration\.payroll\.review is not one of them/) });
  });

  it('privileged access: time-limited, approved by two officials other than the requester, revocable', async () => {
    adopt();
    const dep = actor('Deputy', 'officer');
    const c = await open('adm.privileged-access', { requester: ids.Deputy, targetSystem: 'Payroll database', privilegedRole: 'Database administrator', justification: 'Upgrade', accessPeriod: { from: '2026-10-21', to: '2026-10-22' } }, dep);
    doc(c.id, 'security-approval', dep);
    assignTo(c.id, 'Reviewer');
    expect(await act(c.id, { action: 'review' }, actor('Reviewer', 'officer'))).not.toHaveProperty('error');
    await act(c.id, { action: 'approve', fields: { sessionLogging: true }, reason: 'Change window' }, actor('Approver One', 'signatory'));
    expect(await act(c.id, { action: 'approve' }, actor('Approver Two', 'signatory'))).toHaveProperty('decision');
    expect(administrationOf(INST, '2026-10-21').access[0]).toMatchObject({ status: 'granted', until: '2026-10-22', inForce: true });
    expect(getCase(c.id)!.deadlines.some(d => d.key === 'expiry')).toBe(true);
    expect(await act(c.id, { action: 'revoke', reason: 'Work done' }, actor('Director', 'signatory'))).not.toHaveProperty('error');
    expect(administrationOf(INST).access[0]).toMatchObject({ status: 'revoked' });
  });

  it('a delegation of authority is recorded under the law, read in authorisation where the procedure allows, and the delegated act names both officials', async () => {
    adopt(true);
    const deputy = actor('Deputy', 'officer');
    // Without a delegation an officer cannot approve a policy.
    const prep = actor('Preparer', 'officer');
    const p1 = await open('adm.policy', { policyTitle: 'Records retention', summary: 'How long records are kept' }, prep);
    doc(p1.id, 'policy-text', prep); doc(p1.id, 'legal-review', prep);
    expect(await act(p1.id, { action: 'review' }, prep)).not.toHaveProperty('error');
    expect(await act(p1.id, { action: 'approve', reason: 'ok' }, deputy)).toMatchObject({ error: expect.stringMatching(/needs an official who can sign/) });

    // The Director delegates policy approval to the Deputy for a year, citing the Public Service Act; two other officials approve it.
    const d = await open('adm.delegation', { delegator: ids.Director, delegate: ids.Deputy, procedures: 'adm.policy', actions: 'approve', effectivePeriod: { from: '2026-01-01', to: '2027-01-01' } }, actor('Director', 'signatory'));
    doc(d.id, 'delegation-instrument', actor('Director', 'signatory'));
    // The delegator cannot approve their own delegation.
    expect(await act(d.id, { action: 'approve', reason: 'Leave cover', citations: basis }, actor('Director', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(d.id, { action: 'approve' }, actor('Approver One', 'signatory'))).toMatchObject({ error: expect.stringMatching(/Separation of duties: approving a delegation of authority is done by a different person from Director/) });
    const d2 = await open('adm.delegation', { delegator: ids.Director, delegate: ids.Deputy, procedures: 'adm.policy', actions: 'approve', effectivePeriod: { from: '2026-01-01', to: '2027-01-01' } }, actor('Approver One', 'signatory'));
    doc(d2.id, 'delegation-instrument', actor('Approver One', 'signatory'));
    expect(await act(d2.id, { action: 'approve', reason: 'Leave cover', citations: basis }, actor('Approver One', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(d2.id, { action: 'approve' }, actor('Approver Two', 'signatory'))).toHaveProperty('decision');
    const grants = authorityGrantsFor(`local:${ids.Deputy}`, '2026-10-21');
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({ delegator: { name: 'Director' }, institution: INST, actions: ['approve'], basis: expect.stringMatching(/Public Service Act sec_12/) });

    // The Deputy, holding the delegation in force, proposes the approval; a second official confirms; both officials are recorded.
    const withDelegation = actor('Deputy', 'officer', { delegations: grants });
    expect(await act(p1.id, { action: 'approve', reason: 'Approved under delegation' }, withDelegation)).toMatchObject({ pending: true });
    const r = await act(p1.id, { action: 'approve' }, actor('Approver Two', 'signatory'));
    if ('error' in r) throw new Error(r.error);
    const step = r.case.history.at(-1)!;
    expect(step).toMatchObject({ by: { name: 'Deputy' }, delegation: { delegator: { name: 'Director' } } });
    expect(getDecision(r.decision!.id)!.content.officials[0]).toMatchObject({ role: 'decided', name: 'Deputy', delegatedBy: { name: 'Director', delegation: grants[0]!.id } });
    // Not delegable where the procedure does not say so: the delegation does not reach the establishment procedure.
    const est = await open('adm.establishment', { positionTitle: 'Clerk', positionCount: 1, fundedPositionRef: 'B-1', justification: 'x' }, actor('Preparer', 'officer'));
    doc(est.id, 'establishment-request', actor('Preparer', 'officer'));
    await act(est.id, { action: 'submit' }, actor('Preparer', 'officer'));
    expect(await act(est.id, { action: 'approve', reason: 'x' }, withDelegation)).toMatchObject({ error: expect.stringMatching(/needs an official who can sign/) });
    // Revoked: kept, and no longer read in authorisation.
    expect(await act(d2.id, { action: 'revoke', reason: 'Director back' }, actor('Director', 'signatory'))).not.toHaveProperty('error');
    expect(authorityGrantsFor(`local:${ids.Deputy}`, '2026-10-21')).toEqual([]);
    expect(authorityDelegationsOf(INST)[0]).toMatchObject({ revoked: { reason: expect.stringMatching(/Revoked by decision/) } });
  });

  it('reads of restricted personnel cases go to the access log', async () => {
    adopt();
    const prep = actor('Preparer', 'officer');
    const c = await open('adm.disciplinary', { employee: ids.Deputy, allegation: 'RESTRICTED-ALLEGATION' }, prep);
    official = { id: `local:${ids.Preparer}`, name: 'Preparer', label: 'Preparer', institution: INST, role: 'officer' };
    const res = await casesRoute.GET(new NextRequest(`http://localhost/api/cases/${c.id}`), { params: Promise.resolve({ id: c.id }) });
    expect(res.status).toBe(200);
    expect(listAccess({}).some(e => JSON.stringify(e).includes(c.ref))).toBe(true);
    // Another official of the institution, not assigned and unable to sign, is refused, and the refusal is logged.
    official = { id: `local:${ids.Reviewer}`, name: 'Reviewer', label: 'Reviewer', institution: INST, role: 'officer' };
    expect((await casesRoute.GET(new NextRequest(`http://localhost/api/cases/${c.id}`), { params: Promise.resolve({ id: c.id }) })).status).toBe(403);
    expect(listAccess({}).filter(e => JSON.stringify(e).includes(c.ref)).length).toBeGreaterThanOrEqual(2);
  });
});
