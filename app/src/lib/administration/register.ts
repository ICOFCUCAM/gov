// The internal administration register (plan I2; spec Part 1 §10; forms
// catalogue supplement part 21): each institution's own records of the
// internal administration functions that end in a decision. Kept per
// institution and read only within its reach (lib/auth/roles.ts
// canReadAdministration()); the legislature, the judiciary and independent
// institutions keep their own. Changed only by the effects of the
// institution's own administration procedures (lib/administration/
// procedures.ts, decided under the case engine; register-writes.test.ts holds
// it to that):
//
//   positions   the authorised establishment: positions approved (ADM-HR-001)
//   payroll     payroll batches: submitted (ADM-PAY-011), reviewed and approved
//               by different persons (ADM-PAY-012), corrected (ADM-PAY-013);
//               batch totals only, never a person's pay line
//   access      privileged access grants: time-limited, approved, revocable (ADM-ICT-030)
//   policies    internal policies approved (ADM-GOV-040)
//
// No salary scale, threshold or period is typed: deductions come only from an
// approved rule (lib/law/rules.ts `adm.payroll.deductions`, shipped unset),
// grades from the nation's list, the access expiry from the period the nation
// sets on its approved procedure version.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { uuid7 } from '@/lib/data/uuid7';

export interface Position { id: string; institution: string; title: string; department?: string; grade?: string; employmentType?: string; fundedBy: string; count: number; status: 'approved' | 'abolished'; case: string; decision?: string; at: string; sample?: true }
export interface PayrollBatch {
  id: string; institution: string; ref: string; period: { from: string; to: string }; employees: number; grossMinor: number;
  /** Deductions calculated by the approved rule, with the rule version; absent until approved. */
  deductions?: { amountMinor: number; rule: { key: string; version: number; digest: string } } | { notCalculated: string };
  preparedBy: { id?: string; name: string }; reviewedBy?: { id?: string; name: string }; approvedBy?: { id?: string; name: string; confirmedBy?: string };
  status: 'submitted' | 'reviewed' | 'returned' | 'approved' | 'corrected';
  cases: string[]; corrections: { case: string; grossMinor: number; reason: string; at: string }[]; at: string; sample?: true;
}
export interface AccessGrant { id: string; institution: string; account: string; system: string; role: string; from: string; until: string; status: 'granted' | 'revoked'; case: string; decision?: string; revoked?: { by: string; at: string; reason: string }; sample?: true }
export interface InternalPolicy { id: string; institution: string; title: string; version: number; status: 'approved' | 'retired'; case: string; decision?: string; at: string; sample?: true }

interface AdministrationDb { positions: Position[]; payroll: PayrollBatch[]; access: AccessGrant[]; policies: InternalPolicy[] }
const g = globalThis as unknown as { __civicosAdministration?: AdministrationDb };
const db = (): AdministrationDb => {
  const d = touch('__civicosAdministration', g.__civicosAdministration ??= { positions: [], payroll: [], access: [], policies: [] });
  d.positions ??= []; d.payroll ??= []; d.access ??= []; d.policies ??= [];
  return d;
};
export function resetAdministration(): void { g.__civicosAdministration = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);

// ── Changes (called only by lib/administration/procedures.ts effects) ─────

export function approvePosition(p: Omit<Position, 'id' | 'status'>, by: string): Position {
  const x: Position = { ...clone(p), id: uuid7(), status: 'approved' };
  db().positions.push(x);
  recordAudit(by, 'administration.position.approve', `Position:${x.id}`, 'ok', `${x.institution} · ${x.count} × ${x.title} · case ${x.case}`);
  return clone(x);
}

export function submitPayroll(b: Omit<PayrollBatch, 'id' | 'status' | 'corrections' | 'cases'> & { case: string }, by: string): PayrollBatch | { error: string } {
  if (db().payroll.some(x => x.institution === b.institution && x.ref === b.ref)) return { error: `Payroll batch ${b.ref} was already submitted: correct it through a payroll correction` };
  const { case: c, ...rest } = b;
  const x: PayrollBatch = { ...clone(rest), id: uuid7(), status: 'submitted', corrections: [], cases: [c] };
  db().payroll.push(x);
  recordAudit(by, 'administration.payroll.submit', `Payroll:${x.id}`, 'ok', `${x.institution} · batch ${x.ref} · ${x.period.from} to ${x.period.to} · ${x.employees} employees · case ${c}`);
  return clone(x);
}

export function reviewPayroll(id: string, reviewer: { id?: string; name: string }, caseRef: string): PayrollBatch | { error: string } {
  const x = db().payroll.find(b => b.id === id);
  if (!x) return { error: 'No such payroll batch' };
  if (x.status !== 'submitted' && x.status !== 'returned' && x.status !== 'corrected') return { error: `Batch ${x.ref} is ${x.status}` };
  x.status = 'reviewed'; x.reviewedBy = clone(reviewer);
  if (!x.cases.includes(caseRef)) x.cases.push(caseRef);
  recordAudit(reviewer.name, 'administration.payroll.review', `Payroll:${x.id}`, 'ok', `batch ${x.ref} reviewed · case ${caseRef}`);
  return clone(x);
}

export function returnPayroll(id: string, by: string, caseRef: string): PayrollBatch | { error: string } {
  const x = db().payroll.find(b => b.id === id);
  if (!x) return { error: 'No such payroll batch' };
  x.status = 'returned';
  recordAudit(by, 'administration.payroll.return', `Payroll:${x.id}`, 'ok', `batch ${x.ref} returned for correction · case ${caseRef}`);
  return clone(x);
}

export function approvePayroll(id: string, approver: { id?: string; name: string; confirmedBy?: string }, deductions: PayrollBatch['deductions'], caseRef: string): PayrollBatch | { error: string } {
  const x = db().payroll.find(b => b.id === id);
  if (!x) return { error: 'No such payroll batch' };
  if (x.status !== 'reviewed') return { error: `Batch ${x.ref} must be reviewed before it is approved (it is ${x.status})` };
  x.status = 'approved'; x.approvedBy = clone(approver); if (deductions) x.deductions = clone(deductions);
  recordAudit(approver.name, 'administration.payroll.approve', `Payroll:${x.id}`, 'ok', `batch ${x.ref} approved${approver.confirmedBy ? `, confirmed by ${approver.confirmedBy}` : ''} · case ${caseRef}`);
  return clone(x);
}

export function correctPayroll(id: string, grossMinor: number, reason: string, by: string, caseRef: string, now = new Date()): PayrollBatch | { error: string } {
  const x = db().payroll.find(b => b.id === id);
  if (!x) return { error: 'No such payroll batch' };
  x.corrections.push({ case: caseRef, grossMinor, reason: reason.slice(0, 300), at: now.toISOString() });
  x.grossMinor = grossMinor; x.status = 'corrected'; delete x.deductions; delete x.reviewedBy; delete x.approvedBy;
  if (!x.cases.includes(caseRef)) x.cases.push(caseRef);
  recordAudit(by, 'administration.payroll.correct', `Payroll:${x.id}`, 'ok', `batch ${x.ref} corrected: it is reviewed and approved again · case ${caseRef}`);
  return clone(x);
}

export function grantAccess(a: Omit<AccessGrant, 'id' | 'status'>, by: string): AccessGrant {
  const x: AccessGrant = { ...clone(a), id: uuid7(), status: 'granted' };
  db().access.push(x);
  recordAudit(by, 'administration.access.grant', `Access:${x.id}`, 'ok', `${x.institution} · ${x.role} on ${x.system} · ${x.from} until ${x.until} · case ${x.case}`);
  return clone(x);
}

export function revokeAccess(caseRef: string, reason: string, by: string, now = new Date()): AccessGrant | { error: string } {
  const x = db().access.find(a => a.case === caseRef && a.status === 'granted');
  if (!x) return { error: 'No privileged access granted by this case is in force' };
  x.status = 'revoked'; x.revoked = { by, at: now.toISOString(), reason: reason.slice(0, 300) };
  recordAudit(by, 'administration.access.revoke', `Access:${x.id}`, 'ok', reason.slice(0, 200));
  return clone(x);
}

export function approvePolicy(p: Omit<InternalPolicy, 'id' | 'status' | 'version'>, by: string): InternalPolicy {
  const d = db();
  const earlier = d.policies.filter(x => x.institution === p.institution && x.title === p.title);
  for (const e of earlier) if (e.status === 'approved') e.status = 'retired';
  const x: InternalPolicy = { ...clone(p), id: uuid7(), status: 'approved', version: earlier.length + 1 };
  d.policies.push(x);
  recordAudit(by, 'administration.policy.approve', `Policy:${x.id}`, 'ok', `${x.institution} · ${x.title} version ${x.version} · case ${x.case}`);
  return clone(x);
}

// ── Reads ─────────────────────────────────────────────────────────────────

export const payrollBatch = (institution: string, ref: string): PayrollBatch | undefined => { const x = db().payroll.find(b => b.institution === institution && b.ref === ref); return x ? clone(x) : undefined; };
export const accessOfCase = (caseRef: string): AccessGrant | undefined => { const x = db().access.find(a => a.case === caseRef); return x ? clone(x) : undefined; };

/** Whether a grant is in force on a date (granted, not revoked, within its period). */
export const accessInForce = (a: AccessGrant, on = new Date().toISOString().slice(0, 10)): boolean => a.status === 'granted' && a.from <= on && on <= a.until;

/** One institution's internal administration records (the caller checks canReadAdministration()). Batch totals only: no person's pay. */
export function administrationOf(institution: string, on = new Date().toISOString().slice(0, 10)) {
  const d = db();
  return {
    positions: d.positions.filter(x => x.institution === institution).map(clone),
    payroll: d.payroll.filter(x => x.institution === institution).map(clone),
    access: d.access.filter(x => x.institution === institution).map(a => ({ ...clone(a), inForce: accessInForce(a, on) })),
    policies: d.policies.filter(x => x.institution === institution).map(clone),
  };
}

/** Counts per institution, for the capability manifest and completeness. */
export function administrationCounts(institution: string) {
  const a = administrationOf(institution);
  return { positions: a.positions.filter(p => p.status === 'approved').length, payrollApproved: a.payroll.filter(b => b.status === 'approved').length, accessInForce: a.access.filter(x => x.inForce).length, policies: a.policies.filter(p => p.status === 'approved').length };
}
