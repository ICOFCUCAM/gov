// The internal administration procedures every institution has (plan I2; spec
// Part 1 §10; forms catalogue supplement part 21). Reference procedures, drafts
// each institution adopts as its own (`adm.<function>.<institution>`, drafted
// from these templates on request, like referral procedures) and a second
// official approves. Each institution keeps and decides its own: the
// legislature, the judiciary and independent institutions keep their own
// internal administration (supplement part 21, "critical internal controls").
//
//   adm.establishment        staff establishment and position request (ADM-HR-001)
//   adm.payroll-input        payroll input submission (ADM-PAY-011)
//   adm.payroll-review       payroll review and approval (ADM-PAY-012): reviewed and approved by
//                            persons other than the preparer, the approver other than the reviewer
//   adm.payroll-correction   payroll correction request (ADM-PAY-013)
//   adm.privileged-access    privileged access approval (ADM-ICT-030): time-limited, approved by two
//                            officials, logged, revocable
//   adm.policy               internal policy approval (ADM-GOV-040)
//   adm.delegation           delegation of authority record (ADM-GOV-039): recorded in the
//                            delegations register, read in authorisation (transparent delegation)
//   adm.disciplinary         disciplinary process record (ADM-HR-010): restricted
//   adm.legal-advice         internal legal advice request (ADM-LEG-027): restricted
//
// Separation of duties goes through dualControlRefusal() (the person differs,
// never only the account): the engine's `needs.distinctFrom` for steps of the
// same case, and the effects here for the payroll batch's preparer and
// reviewer, who act in other cases. Personnel, payroll, legal-advice and
// disciplinary cases are restricted: read by the assigned officials and those
// who can sign, every read in the access log (the case route). No salary
// scale, threshold or period is typed: deductions come only from the approved
// rule `adm.payroll.deductions` (lib/law/rules.ts, shipped unset; production
// refuses an approval without it), grades and kinds from the nation's lists
// (none ship), the expiry of privileged access from the period the nation
// sets on its approved version (a deadline, shipped unset).

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { dualControlRefusal } from '@/lib/data/dual-control';
import { getMinistry } from '@/lib/data/store/ministries';
import { accountById } from '@/lib/auth/officials';
import { calculate } from '@/lib/law/rules';
import { samplesAllowed } from '@/lib/ops/mode';
import { recordAuthorityDelegation, revokeAuthorityDelegation, authorityDelegationOfCase } from '@/lib/records/delegations';
import { approvePosition, submitPayroll, reviewPayroll, returnPayroll, approvePayroll, correctPayroll, payrollBatch, grantAccess, revokeAccess, approvePolicy } from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const int = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);
const period = (v: unknown): { from: string; to: string } | null => {
  const x = v as { from?: unknown; to?: unknown } | null;
  const from = str(x?.from), to = str(x?.to) || from;
  return /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to ? { from, to } : null;
};
const sample = (c: Pick<Case, 'source'>) => (c.source === 'sample' ? { sample: true as const } : {});
const who = (ctx: EffectContext) => ({ ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name });
/** The officials of this decision: the proposer (four-eyes) and the official confirming it now. */
const officialsOf = (ctx: EffectContext) => [...(ctx.case.pending ? [ctx.case.pending.by] : []), who(ctx)];
/** Separation of duties against someone who acted in another case (lib/data/dual-control.ts: persons, never only accounts). */
function different(ctx: EffectContext, earlier: { id?: string; name: string } | undefined, what: string): string | null {
  if (!earlier) return null;
  for (const o of officialsOf(ctx)) {
    const same = dualControlRefusal({ by: earlier.name, ...(earlier.id ? { byId: earlier.id } : {}) }, { by: o.name, ...(o.id ? { byId: o.id } : {}) });
    if (same) return `Separation of duties: ${what} is done by a different person from ${earlier.name}`;
  }
  return null;
}
/** An account of this institution (the reference a form gives: the account id). */
function ownAccount(c: Case, id: string, what: string): { id: string; name: string; role?: string } | { error: string } {
  const a = accountById(id);
  if (!a || a.disabled) return { error: `${what}: no active official account ${id}` };
  if (a.institution !== c.owner) return { error: `${what}: ${a.name} is not an official of this institution` };
  return { id: a.id, name: a.name, ...(a.role ? { role: a.role } : {}) };
}

// ── Effects ────────────────────────────────────────────────────────────────

registerEffect('adm.establishment.record', ({ case: c, actor }: EffectContext) => {
  const count = int(c.fields.positionCount);
  if (!Number.isInteger(count) || count < 1) return { error: 'The number of positions is a whole number from 1' };
  const dept = str(c.fields.department);
  const m = getMinistry(c.owner);
  if (dept && !m?.departments.some(d => d.id === dept && d.status !== 'ended')) return { error: 'The department is one of this institution\'s departments in operation (its id)' };
  const p = approvePosition({ institution: c.owner, title: str(c.fields.positionTitle), ...(dept ? { department: dept } : {}), ...(str(c.fields.grade) ? { grade: str(c.fields.grade) } : {}),
    ...(str(c.fields.employmentType) ? { employmentType: str(c.fields.employmentType) } : {}), fundedBy: str(c.fields.fundedPositionRef), count, case: c.ref, at: new Date().toISOString(), ...sample(c) }, actor.name);
  return { facts: { position: p.id, positions: count } };
});

registerEffect('adm.payroll.submit', (ctx: EffectContext) => {
  const { case: c } = ctx;
  const p = period(c.fields.payPeriod);
  if (!p) return { error: 'The pay period is a period (from and to)' };
  const employees = int(c.fields.employees), gross = int(c.fields.grossMinor);
  if (!Number.isInteger(employees) || employees < 0 || !Number.isInteger(gross) || gross < 0) return { error: 'The batch totals are whole numbers (employees, gross pay in minor units) from the payroll system\'s report' };
  const b = submitPayroll({ institution: c.owner, ref: str(c.fields.batchRef), period: p, employees, grossMinor: gross, preparedBy: who(ctx), case: c.ref, at: ctx.now.toISOString(), ...sample(c) }, ctx.actor.name);
  return 'error' in b ? b : { facts: { batch: b.ref } };
});

/** The batch a review, approval or correction names: one of this institution's. */
const batchOf = (c: Case) => payrollBatch(c.owner, str(c.fields.payrollBatch));

registerEffect('adm.payroll.review', (ctx: EffectContext) => {
  const b = batchOf(ctx.case);
  if (!b) return { error: 'Name a payroll batch this institution submitted (its reference)' };
  const sod = different(ctx, b.preparedBy, 'reviewing a payroll batch');
  if (sod) return { error: sod };
  const r = reviewPayroll(b.id, who(ctx), ctx.case.ref);
  return 'error' in r ? r : { facts: { batch: b.ref, reviewed: true } };
});

registerEffect('adm.payroll.return', (ctx: EffectContext) => {
  const b = batchOf(ctx.case);
  if (!b) return { error: 'Name a payroll batch this institution submitted (its reference)' };
  const r = returnPayroll(b.id, ctx.actor.name, ctx.case.ref);
  return 'error' in r ? r : { facts: { batch: b.ref, returned: true } };
});

registerEffect('adm.payroll.approve', (ctx: EffectContext) => {
  const b = batchOf(ctx.case);
  if (!b) return { error: 'Name a payroll batch this institution submitted (its reference)' };
  const sod = different(ctx, b.preparedBy, 'approving a payroll batch') ?? different(ctx, b.reviewedBy, 'approving a payroll batch');
  if (sod) return { error: sod };
  // Deductions only from the approved rule (no salary scale, threshold or rate is typed here).
  const calc = calculate('adm.payroll.deductions', { amountMinor: b.grossMinor }, ctx.now.toISOString().slice(0, 10));
  if ('error' in calc && !samplesAllowed()) return { error: `${calc.error}: a production installation approves payroll only with the institution's approved deductions rule` };
  const deductions = 'error' in calc ? { notCalculated: 'No approved deductions rule: a demonstration records the batch without them (Sample)' } : { amountMinor: calc.amountMinor, rule: { key: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest } };
  const proposer = ctx.case.pending?.by ?? who(ctx);
  const r = approvePayroll(b.id, { ...(proposer.id ? { id: proposer.id } : {}), name: proposer.name, ...(ctx.case.pending ? { confirmedBy: ctx.actor.name } : {}) }, deductions, ctx.case.ref);
  if ('error' in r) return r;
  return { facts: { batch: b.ref, approved: true }, ...('error' in calc ? {} : { rules: [{ key: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest }] }) };
});

registerEffect('adm.payroll.correct', (ctx: EffectContext) => {
  const b = batchOf(ctx.case);
  if (!b) return { error: 'Name a payroll batch this institution submitted (its reference)' };
  const gross = int(ctx.case.fields.correctedGrossMinor);
  if (!Number.isInteger(gross) || gross < 0) return { error: 'The corrected gross pay is a whole number of minor units from the payroll system\'s report' };
  const r = correctPayroll(b.id, gross, str(ctx.case.fields.correctionReason), ctx.actor.name, ctx.case.ref, ctx.now);
  return 'error' in r ? r : { facts: { batch: b.ref, corrected: true } };
});

registerEffect('adm.access.grant', (ctx: EffectContext) => {
  const { case: c } = ctx;
  const requester = ownAccount(c, str(c.fields.requester), 'Privileged access');
  if ('error' in requester) return requester;
  const p = period(c.fields.accessPeriod);
  if (!p) return { error: 'The access period is a period with an end date (privileged access is always time-limited)' };
  if (c.fields.sessionLogging !== true) return { error: 'Privileged sessions are logged: confirm session logging' };
  const sod = different(ctx, requester, 'approving privileged access');
  if (sod) return { error: sod };
  const g = grantAccess({ institution: c.owner, account: requester.id, system: str(c.fields.targetSystem), role: str(c.fields.privilegedRole), from: p.from, until: p.to, case: c.ref, ...sample(c) }, ctx.actor.name);
  return { facts: { access: g.id, until: g.until } };
});

registerEffect('adm.access.revoke', (ctx: EffectContext) => {
  const r = revokeAccess(ctx.case.ref, `Revoked by decision of ${ctx.case.ref}`, ctx.actor.name, ctx.now);
  return 'error' in r ? r : { facts: { revoked: true } };
});

registerEffect('adm.policy.approve', (ctx: EffectContext) => {
  const p = approvePolicy({ institution: ctx.case.owner, title: str(ctx.case.fields.policyTitle), case: ctx.case.ref, at: ctx.now.toISOString(), ...sample(ctx.case) }, ctx.actor.name);
  return { facts: { policy: p.id, version: p.version } };
});

registerEffect('adm.delegation.record', (ctx: EffectContext) => {
  const { case: c } = ctx;
  const delegator = ownAccount(c, str(c.fields.delegator), 'The official who delegates');
  if ('error' in delegator) return delegator;
  if (delegator.role !== 'signatory') return { error: `${delegator.name} cannot sign at this institution, so has no decision to delegate` };
  const delegate = ownAccount(c, str(c.fields.delegate), 'The official who receives the delegation');
  if ('error' in delegate) return delegate;
  const sod = different(ctx, { id: `local:${delegator.id}`, name: delegator.name }, 'approving a delegation of authority');
  if (sod) return { error: sod };
  const p = period(c.fields.effectivePeriod);
  if (!p) return { error: 'The effective period is a period (from and to): a delegation is never open-ended' };
  const citations = c.pending?.citations ?? [];
  if (!citations.length) return { error: 'Cite the law that allows the delegation (laws register)' };
  const list = (v: unknown) => (Array.isArray(v) ? v.map(str) : str(v).split(/[\n,]+/).map(x => x.trim())).filter(Boolean).slice(0, 50);
  const proposer = c.pending?.by ?? who(ctx);
  const r = recordAuthorityDelegation({
    institution: c.owner, delegator: { id: `local:${delegator.id}`, name: delegator.name }, delegate: { id: `local:${delegate.id}`, name: delegate.name },
    procedures: list(c.fields.procedures), actions: list(c.fields.actions), restrictions: list(c.fields.restrictions),
    basis: citations.map(x => ({ instrument: x.instrument, eId: x.eId, ...(x.version ? { version: String(x.version) } : {}), ...(x.title ? { title: x.title } : {}) })),
    validFrom: p.from, ...(p.to !== p.from ? { validUntil: p.to } : {}), approval: { case: c.ref, by: proposer.name, ...(c.pending ? { confirmedBy: ctx.actor.name } : {}), at: ctx.now.toISOString() },
  }, ctx.actor.name);
  return 'error' in r ? r : { facts: { delegation: r.id } };
});

registerEffect('adm.delegation.revoke', (ctx: EffectContext) => {
  const d = authorityDelegationOfCase(ctx.case.ref);
  if (!d) return { error: 'No delegation was recorded by this case' };
  const r = revokeAuthorityDelegation(d.id, `Revoked by decision of ${ctx.case.ref}`, ctx.actor.name, ctx.case.ref, ctx.now);
  return 'error' in r ? r : { facts: { revoked: d.id } };
});

// ── Reference procedures (templates) ──────────────────────────────────────

const base = { reference: true as const, citations: [], notifications: [], deadlines: [], retention: 'personnel-file', sensitivity: 'restricted' as const };
const f = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const r = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => f(key, label, type, { personalDataClass: 'restricted', ...extra });
const configured = (key: string, label: string, list: string, what: string, cls: FieldSpec['personalDataClass'] = 'administrative'): FieldSpec => ({ key, label, type: 'enum', valuesSource: { kind: 'configured', list }, personalDataClass: cls, countryDecision: `The nation's ${what}; none ship` });
const period2 = (key: string, label: string): FieldSpec => f(key, label, 'dateRange');

/** The template's form, procedure and key; each institution drafts `adm.<name>.<institution>` from it. */
export const ADMINISTRATION_PROCEDURES: (Ref & { forms: string[]; function: string })[] = [
  {
    ...base, sensitivity: 'normal', retention: 'establishment-record', key: 'adm.establishment', version: 1, owner: 'institution', refPrefix: 'AEST', function: 'hr', forms: ['ADM-HR-001'],
    title: 'Staff establishment and position request',
    fields: [
      f('positionTitle', 'Position title', 'text', { required: true }),
      f('department', 'Department (its id in the institution\'s departments)'),
      configured('grade', 'Grade', 'administration.country.grades', 'grades of the public service'),
      configured('employmentType', 'Kind of employment', 'administration.country.employment_types', 'kinds of employment'),
      f('positionCount', 'Number of positions', 'number', { required: true }),
      f('fundedPositionRef', 'Budget reference that funds it', 'text', { required: true }),
      f('justification', 'Why the positions are needed', 'longtext', { required: true }),
    ],
    documents: [{ class: 'establishment-request', label: 'The request with its organisation chart', required: true }],
    stages: [{ key: 'requested', label: 'Requested' }, { key: 'review', label: 'Under review' }, { key: 'approved', label: 'Approved', terminal: true }, { key: 'turned-down', label: 'Refused', terminal: true }],
    actions: [
      { key: 'submit', label: 'Submit for review', from: ['requested'], to: 'review', needs: { role: 'officer', task: 'administration.establishment.request' }, requires: { fields: ['positionTitle', 'positionCount', 'fundedPositionRef', 'justification'], documents: ['establishment-request'] } },
      { key: 'approve', label: 'Approve the positions', from: ['review'], to: 'approved', decision: 'approve-positions', needs: { role: 'signatory', fourEyes: true, task: 'administration.establishment.approve', distinctFrom: ['submit'] }, requires: { reasons: true }, effects: ['adm.establishment.record'] },
      { key: 'refuse', label: 'Refuse, with reasons', from: ['review'], to: 'turned-down', decision: 'refuse-positions', needs: { role: 'signatory', distinctFrom: ['submit'] }, requires: { reasons: true } },
    ],
    tests: [
      { name: 'approved', steps: [{ action: 'submit', expect: 'refused' }, { action: 'submit', fields: { positionTitle: 'Payroll officer', positionCount: 2, fundedPositionRef: 'B-1', justification: 'Workload' }, documents: ['establishment-request'], expect: 'review' }, { action: 'approve', expect: 'approved' }] },
      { name: 'refused', steps: [{ action: 'submit', fields: { positionTitle: 'X', positionCount: 1, fundedPositionRef: 'B-1', justification: 'Y' }, documents: ['establishment-request'], expect: 'review' }, { action: 'refuse', expect: 'turned-down' }] },
    ],
  },
  {
    ...base, retention: 'payroll-record', key: 'adm.payroll-input', version: 1, owner: 'institution', refPrefix: 'APIN', function: 'hr', forms: ['ADM-PAY-011'],
    title: 'Payroll input submission',
    fields: [
      period2('payPeriod', 'Pay period'),
      f('batchRef', 'Payroll batch reference (from the payroll system)', 'text', { required: true }),
      r('employees', 'Number of employees in the batch', 'number', { required: true }),
      r('grossMinor', 'Gross pay of the batch, in minor units (the payroll system\'s report)', 'number', { required: true }),
    ],
    documents: [{ class: 'payroll-input', label: 'The payroll system\'s input report (restricted)', required: true }],
    stages: [{ key: 'prepared', label: 'Prepared' }, { key: 'submitted', label: 'Submitted for review', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true }],
    actions: [
      { key: 'submit', label: 'Submit the payroll input', from: ['prepared'], to: 'submitted', needs: { role: 'officer', task: 'administration.payroll.prepare' }, requires: { fields: ['payPeriod', 'batchRef', 'employees', 'grossMinor'], documents: ['payroll-input'] }, effects: ['adm.payroll.submit'] },
      { key: 'withdraw', label: 'Withdraw, with reasons', from: ['prepared'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'submitted', steps: [{ action: 'submit', expect: 'refused' }, { action: 'submit', fields: { payPeriod: { from: '2026-10-01', to: '2026-10-31' }, batchRef: 'PB-1', employees: 3, grossMinor: 100 }, documents: ['payroll-input'], expect: 'submitted' }] }],
  },
  {
    ...base, retention: 'payroll-record', key: 'adm.payroll-review', version: 1, owner: 'institution', refPrefix: 'APRV', function: 'hr', forms: ['ADM-PAY-012'],
    title: 'Payroll review and approval',
    fields: [
      f('payrollBatch', 'Payroll batch reference', 'text', { required: true }),
      period2('payPeriod', 'Pay period'),
      r('exceptionItems', 'Exceptions found in review (restricted)', 'longtext'),
    ],
    documents: [{ class: 'reconciliation-report', label: 'Reconciliation report (restricted)', required: true }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'reviewed', label: 'Reviewed' }, { key: 'approved', label: 'Approved', terminal: true }, { key: 'returned', label: 'Returned for correction', terminal: true }],
    actions: [
      { key: 'review', label: 'Record the review', from: ['received'], to: 'reviewed', needs: { role: 'officer', task: 'administration.payroll.review' }, requires: { fields: ['payrollBatch'], documents: ['reconciliation-report'] }, effects: ['adm.payroll.review'] },
      { key: 'approve', label: 'Approve the payroll', from: ['reviewed'], to: 'approved', decision: 'approve-payroll', needs: { role: 'signatory', fourEyes: true, task: 'administration.payroll.approve', distinctFrom: ['review'] }, requires: { reasons: true }, effects: ['adm.payroll.approve'] },
      { key: 'return', label: 'Return for correction, with reasons', from: ['received', 'reviewed'], to: 'returned', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['adm.payroll.return'] },
    ],
    tests: [
      { name: 'approved', steps: [{ action: 'review', expect: 'refused' }, { action: 'review', fields: { payrollBatch: 'PB-1' }, documents: ['reconciliation-report'], expect: 'reviewed' }, { action: 'approve', expect: 'approved' }] },
      { name: 'returned', steps: [{ action: 'return', expect: 'returned' }] },
    ],
  },
  {
    ...base, retention: 'payroll-record', key: 'adm.payroll-correction', version: 1, owner: 'institution', refPrefix: 'APCR', function: 'hr', forms: ['ADM-PAY-013'],
    title: 'Payroll correction request',
    fields: [
      f('payrollBatch', 'Payroll batch reference', 'text', { required: true }),
      r('correctionReason', 'What is wrong and why (restricted)', 'longtext', { required: true }),
      r('correctedGrossMinor', 'Corrected gross pay of the batch, in minor units (the payroll system\'s corrected report)', 'number', { required: true }),
    ],
    documents: [{ class: 'correction-evidence', label: 'Evidence of the correction (restricted)', required: true }],
    stages: [{ key: 'requested', label: 'Requested' }, { key: 'corrected', label: 'Corrected', terminal: true }, { key: 'turned-down', label: 'Refused', terminal: true }],
    actions: [
      { key: 'correct', label: 'Approve the correction', from: ['requested'], to: 'corrected', decision: 'correct-payroll', needs: { role: 'signatory', fourEyes: true, task: 'administration.payroll.correct', distinctFrom: ['open'] }, requires: { fields: ['payrollBatch', 'correctionReason', 'correctedGrossMinor'], documents: ['correction-evidence'], reasons: true }, effects: ['adm.payroll.correct'] },
      { key: 'refuse', label: 'Refuse, with reasons', from: ['requested'], to: 'turned-down', decision: 'refuse-correction', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'corrected', steps: [{ action: 'correct', expect: 'refused' }, { action: 'correct', fields: { payrollBatch: 'PB-1', correctionReason: 'Wrong hours', correctedGrossMinor: 90 }, documents: ['correction-evidence'], expect: 'corrected' }] }, { name: 'refused', steps: [{ action: 'refuse', expect: 'turned-down' }] }],
  },
  {
    ...base, sensitivity: 'restricted', retention: 'access-record', key: 'adm.privileged-access', version: 1, owner: 'institution', refPrefix: 'APAC', function: 'ict', forms: ['ADM-ICT-030'],
    title: 'Privileged access approval',
    fields: [
      f('requester', 'Official who needs the access (account id)', 'text', { required: true }),
      f('targetSystem', 'System', 'text', { required: true }),
      f('privilegedRole', 'Privileged role', 'text', { required: true }),
      f('justification', 'Why it is needed', 'longtext', { required: true }),
      period2('accessPeriod', 'Access period (always with an end date)'),
      f('sessionLogging', 'Privileged sessions are logged', 'boolean', { required: true }),
    ],
    documents: [{ class: 'security-approval', label: 'Security review', required: true }],
    stages: [{ key: 'requested', label: 'Requested' }, { key: 'security-review', label: 'Security review' }, { key: 'granted', label: 'Granted (time-limited)' }, { key: 'revoked', label: 'Revoked or ended', terminal: true }, { key: 'turned-down', label: 'Refused', terminal: true }],
    actions: [
      { key: 'review', label: 'Record the security review', from: ['requested'], to: 'security-review', needs: { role: 'officer' }, requires: { fields: ['requester', 'targetSystem', 'privilegedRole', 'justification', 'accessPeriod'], documents: ['security-approval'] } },
      { key: 'approve', label: 'Approve the access for its period', from: ['security-review'], to: 'granted', decision: 'grant-privileged-access', needs: { role: 'signatory', fourEyes: true, task: 'administration.access.privileged.approve', distinctFrom: ['open', 'review'] }, requires: { fields: ['sessionLogging'], reasons: true }, effects: ['adm.access.grant'] },
      { key: 'revoke', label: 'Revoke or end the access', from: ['granted'], to: 'revoked', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['adm.access.revoke'] },
      { key: 'refuse', label: 'Refuse, with reasons', from: ['requested', 'security-review'], to: 'turned-down', decision: 'refuse-privileged-access', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    // The longest the access may run is the nation's: set on its approved version (shipped unset; a demonstration's sample value is marked Sample).
    deadlines: [{ key: 'expiry', label: 'Access ends: review or revoke', from: 'granted', sampleDays: 7, calendar: 'calendar', onLapse: 'escalate' }],
    tests: [
      { name: 'granted then revoked', steps: [{ action: 'review', expect: 'refused' }, { action: 'review', fields: { requester: 'a', targetSystem: 'Payroll', privilegedRole: 'DBA', justification: 'Upgrade', accessPeriod: { from: '2026-10-01', to: '2026-10-02' } }, documents: ['security-approval'], expect: 'security-review' }, { action: 'approve', fields: { sessionLogging: true }, expect: 'granted' }, { action: 'revoke', expect: 'revoked' }] },
      { name: 'refused', steps: [{ action: 'refuse', expect: 'turned-down' }] },
    ],
  },
  {
    ...base, sensitivity: 'normal', retention: 'policy-record', key: 'adm.policy', version: 1, owner: 'institution', refPrefix: 'APOL', function: 'planning', forms: ['ADM-GOV-040'],
    title: 'Internal policy approval',
    fields: [
      f('policyTitle', 'Policy title', 'text', { required: true }),
      f('summary', 'What the policy does', 'longtext', { required: true }),
      f('consultation', 'Who was consulted', 'longtext'),
    ],
    documents: [{ class: 'policy-text', label: 'The policy text', required: true }, { class: 'legal-review', label: 'Legal review', required: true }],
    stages: [{ key: 'drafted', label: 'Drafted' }, { key: 'legal-review', label: 'Legal review' }, { key: 'approved', label: 'Approved', terminal: true }, { key: 'rejected', label: 'Rejected', terminal: true }],
    actions: [
      { key: 'review', label: 'Record the legal review', from: ['drafted'], to: 'legal-review', needs: { role: 'officer' }, requires: { fields: ['policyTitle', 'summary'], documents: ['policy-text', 'legal-review'] } },
      { key: 'approve', label: 'Approve the policy', from: ['legal-review'], to: 'approved', decision: 'approve-policy', needs: { role: 'signatory', fourEyes: true, task: 'administration.policy.approve', distinctFrom: ['open'] }, requires: { reasons: true }, effects: ['adm.policy.approve'] },
      { key: 'reject', label: 'Reject, with reasons', from: ['drafted', 'legal-review'], to: 'rejected', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'approved', steps: [{ action: 'review', expect: 'refused' }, { action: 'review', fields: { policyTitle: 'Records', summary: 'S' }, documents: ['policy-text', 'legal-review'], expect: 'legal-review' }, { action: 'approve', expect: 'approved' }] }, { name: 'rejected', steps: [{ action: 'reject', expect: 'rejected' }] }],
  },
  {
    ...base, sensitivity: 'normal', retention: 'delegation-record', key: 'adm.delegation', version: 1, owner: 'institution', refPrefix: 'ADEL', function: 'legal', forms: ['ADM-GOV-039'],
    title: 'Delegation of authority',
    fields: [
      f('delegator', 'Official who delegates (account id; one who can sign here)', 'text', { required: true }),
      f('delegate', 'Official who receives it (account id; of this institution)', 'text', { required: true }),
      f('procedures', 'Procedures it covers (keys, one per line; * for every procedure of the institution)', 'longtext', { required: true }),
      f('actions', 'Steps it covers (action keys or task ids, one per line)', 'longtext', { required: true }),
      period2('effectivePeriod', 'Effective period'),
      f('restrictions', 'Restrictions (one per line)', 'longtext'),
    ],
    documents: [{ class: 'delegation-instrument', label: 'The delegation instrument', required: true }],
    stages: [{ key: 'requested', label: 'Requested' }, { key: 'in-force', label: 'In force' }, { key: 'revoked', label: 'Revoked or ended', terminal: true }, { key: 'turned-down', label: 'Refused', terminal: true }],
    actions: [
      { key: 'approve', label: 'Approve and record the delegation', from: ['requested'], to: 'in-force', decision: 'record-delegation', needs: { role: 'signatory', fourEyes: true, task: 'administration.delegation.approve' }, requires: { fields: ['delegator', 'delegate', 'procedures', 'actions', 'effectivePeriod'], documents: ['delegation-instrument'], reasons: true, citations: true }, effects: ['adm.delegation.record'] },
      { key: 'revoke', label: 'Revoke the delegation', from: ['in-force'], to: 'revoked', decision: 'revoke-delegation', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['adm.delegation.revoke'] },
      { key: 'refuse', label: 'Refuse, with reasons', from: ['requested'], to: 'turned-down', decision: 'refuse-delegation', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'recorded then revoked', steps: [{ action: 'approve', expect: 'refused' }, { action: 'approve', fields: { delegator: 'a', delegate: 'b', procedures: '*', actions: 'approve', effectivePeriod: { from: '2026-10-01', to: '2027-10-01' } }, documents: ['delegation-instrument'], expect: 'in-force' }, { action: 'revoke', expect: 'revoked' }] }, { name: 'refused', steps: [{ action: 'refuse', expect: 'turned-down' }] }],
  },
  {
    ...base, key: 'adm.disciplinary', version: 1, owner: 'institution', refPrefix: 'ADIS', function: 'hr', forms: ['ADM-HR-010'],
    title: 'Disciplinary process',
    fields: [
      r('employee', 'Official concerned (account id; restricted)', 'text', { required: true }),
      r('allegation', 'The allegation (restricted)', 'longtext', { required: true }),
      configured('outcome', 'Outcome', 'administration.country.disciplinary_outcomes', 'disciplinary outcomes under the public service law', 'restricted'),
    ],
    documents: [{ class: 'investigation-report', label: 'Investigation report (restricted)', required: true }, { class: 'response', label: 'The official\'s response (restricted)', required: false }],
    stages: [{ key: 'opened', label: 'Opened' }, { key: 'investigation', label: 'Investigation' }, { key: 'decided', label: 'Decided', terminal: true }, { key: 'closed', label: 'Closed without action', terminal: true }],
    actions: [
      { key: 'investigate', label: 'Start the investigation', from: ['opened'], to: 'investigation', needs: { role: 'officer', assigned: true }, requires: { fields: ['employee', 'allegation'] } },
      { key: 'decide', label: 'Decide, with reasons', from: ['investigation'], to: 'decided', decision: 'disciplinary-decision', needs: { role: 'signatory', fourEyes: true, task: 'administration.discipline.decide', distinctFrom: ['open', 'investigate'] }, requires: { fields: ['outcome'], documents: ['investigation-report'], reasons: true } },
      { key: 'close', label: 'Close without action, with reasons', from: ['opened', 'investigation'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'decided', steps: [{ action: 'investigate', expect: 'refused' }, { action: 'investigate', fields: { employee: 'a', allegation: 'b' }, expect: 'investigation' }, { action: 'decide', fields: { outcome: 'x' }, documents: ['investigation-report'], expect: 'decided' }] }, { name: 'closed', steps: [{ action: 'close', expect: 'closed' }] }],
  },
  {
    ...base, retention: 'legal-file', key: 'adm.legal-advice', version: 1, owner: 'institution', refPrefix: 'ALEG', function: 'legal', forms: ['ADM-LEG-027'],
    title: 'Internal legal advice request',
    fields: [
      f('requestingUnit', 'Department asking (its id)', 'text', { required: true }),
      r('question', 'The question (restricted: legal advice is privileged)', 'longtext', { required: true }),
      configured('urgency', 'Urgency', 'administration.country.advice_urgency', 'urgency classes for legal advice'),
    ],
    documents: [{ class: 'advice', label: 'The legal advice (restricted)', required: true }],
    stages: [{ key: 'requested', label: 'Requested' }, { key: 'assigned', label: 'With a lawyer' }, { key: 'advised', label: 'Advice given', terminal: true }, { key: 'declined', label: 'Declined', terminal: true }],
    actions: [
      { key: 'assign', label: 'Assign to a lawyer', from: ['requested'], to: 'assigned', needs: { role: 'officer' }, requires: { fields: ['requestingUnit', 'question'] } },
      { key: 'advise', label: 'Give the advice', from: ['assigned'], to: 'advised', needs: { role: 'officer', assigned: true, task: 'administration.legal.advise' }, requires: { documents: ['advice'] } },
      { key: 'decline', label: 'Decline, with reasons', from: ['requested', 'assigned'], to: 'declined', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    tests: [{ name: 'advised', steps: [{ action: 'assign', expect: 'refused' }, { action: 'assign', fields: { requestingUnit: 'DEP-1', question: 'Q' }, expect: 'assigned' }, { action: 'advise', documents: ['advice'], expect: 'advised' }] }, { name: 'declined', steps: [{ action: 'decline', expect: 'declined' }] }],
  },
];

/** The key an institution's own version of a template takes: adm.<name>.<institution>. */
export const administrationKey = (template: string, institution: string) => `${template}.${institution.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 60);

/** Draft the institution's own internal administration procedures from the templates (once each); a second official approves each. */
export function installAdministrationProcedures(institution: string, by: string, byId?: string): { drafted: string[]; present: string[] } | { error: string } {
  const m = getMinistry(institution);
  if (!m) return { error: 'No such institution' };
  const drafted: string[] = [], present: string[] = [];
  for (const t of ADMINISTRATION_PROCEDURES) {
    const key = administrationKey(t.key, institution);
    if (listPackages({ key }).length) { present.push(key); continue; }
    const { forms: _forms, function: _fn, ...pkg } = t;
    const d = draftPackage({ ...pkg, key, owner: institution, title: `${t.title} (${m.name})` }, by, byId, registeredEffects());
    if ('error' in d) return { error: `${key}: ${d.error}` };
    drafted.push(key);
  }
  return { drafted, present };
}
