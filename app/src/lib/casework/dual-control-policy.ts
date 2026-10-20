// Dual control for decisions (acceptance hardening H and I).
//
// The platform's minimum: a decision that creates or materially changes a
// liability or a regulated credential needs two officials, whatever the
// approved procedure version says, and a procedure can never lower it:
//
//   - a tax assessment or its variation (tax-assessment: assess, vary);
//   - a customs duty assessment (customs-clearance: assess);
//   - issuing, renewing, suspending, reinstating, revoking or correcting a
//     regulated credential or register standing (qualification-record and
//     every register-type and profession permit type: grant, register,
//     record, renew, suspend, reinstate, revoke, correct).
//
// Refusals and other decisions follow the procedure. The country adds its own
// (statutory thresholds) as `packageKey:actionKey` entries, never removes the
// minimum. The two must be two signed-in accounts of two different people:
// when both accounts are linked to the national identity provider that is
// checked; otherwise the step records that only the accounts differ, and the
// country can require the link (requireIdentityBinding).
//
// A proposal waiting for its second official lapses after pendingHours; it
// is kept on the case, and only a new, explicit proposal starts again.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { DUAL_CONTROL_HOURS } from '@/lib/data/dual-control';
import { classifyDecision } from '@/lib/permits/decisions';
import { registerDualControlRules } from './engine';
import type { ActionSpec, Case, CasePackage } from './types';

export interface DualControlPolicy {
  /** Further steps the country's law requires two officials for: `packageKey:actionKey`. */
  extra: string[];
  /** Refuse a two-official decision unless both accounts are linked to the national identity provider. */
  requireIdentityBinding: boolean;
  /** How long a proposal waits for its second official before it lapses. */
  pendingHours: number;
  /** False while these are the platform's defaults, not the country's adopted rules. */
  adopted: boolean;
  by?: string; at?: string; basis?: string;
}
export const DEFAULT_DUAL_CONTROL: DualControlPolicy = { extra: [], requireIdentityBinding: false, pendingHours: DUAL_CONTROL_HOURS, adopted: false };

const g = globalThis as unknown as { __civicosDualControl?: DualControlPolicy };
const db = (): DualControlPolicy => {
  const d = touch('__civicosDualControl', g.__civicosDualControl ??= { ...DEFAULT_DUAL_CONTROL });
  d.extra ??= []; d.requireIdentityBinding ??= false; d.pendingHours ??= DUAL_CONTROL_HOURS; d.adopted ??= false;
  return d;
};
export function resetDualControl(): void { g.__civicosDualControl = undefined; }
export const dualControlPolicy = (): DualControlPolicy => structuredClone(db());

const CREDENTIAL = ['grant', 'register', 'record', 'renew', 'suspend', 'reinstate', 'revoke', 'correct'];

/** Why the platform's minimum requires two officials for this step, or null. */
export function platformMinimum(c: Case, a: ActionSpec, pkg: Pick<CasePackage, 'key' | 'authority'>): string | null {
  if (!a.decision) return null;
  const cls = classifyDecision(c, a, pkg);
  if (!cls || cls.kind !== 'mapping') return null;
  if (cls.permitType === 'tax-assessment' && ['assess', 'vary'].includes(a.decision)) return 'a tax assessment or its variation';
  if (cls.permitType === 'customs-clearance' && a.decision === 'assess') return 'a customs duty assessment';
  if (['tax-registration', 'tax-assessment', 'customs-clearance'].includes(cls.permitType)) return null;
  if (CREDENTIAL.includes(a.decision)) return 'issuing or changing a regulated credential or register standing';
  return null;
}

/** Whether a step needs two officials: the procedure, the platform's minimum or the country's own rules. */
export function needsTwoOfficials(c: Case, a: ActionSpec, pkg: Pick<CasePackage, 'key' | 'authority'>): boolean {
  return !!a.needs.fourEyes || !!platformMinimum(c, a, pkg) || db().extra.includes(`${pkg.key}:${a.key}`);
}

/** The country records its own rules (administrators, audited; the basis names the instrument). */
export function setDualControlPolicy(input: { extra?: unknown; requireIdentityBinding?: unknown; pendingHours?: unknown; basis?: unknown }, by: string, now = new Date()): DualControlPolicy | { error: string } {
  const extra = Array.isArray(input.extra) ? input.extra.map(String).map(x => x.trim()).filter(Boolean) : [];
  if (extra.some(x => !/^[a-z][a-z0-9.-]{1,80}:[a-z][a-z0-9-]{0,40}$/.test(x))) return { error: 'Each further step is packageKey:actionKey (e.g. customs.declaration:release)' };
  const hours = Number(input.pendingHours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) return { error: 'The waiting period is a whole number of hours from 1 to 720' };
  const basis = typeof input.basis === 'string' ? input.basis.trim().slice(0, 300) : '';
  if (!basis) return { error: 'Name the instrument or decision these rules come from' };
  const d = db();
  Object.assign(d, { extra: [...new Set(extra)], requireIdentityBinding: input.requireIdentityBinding === true, pendingHours: hours, adopted: true, by, at: now.toISOString(), basis });
  recordAudit(by, 'dual-control.policy', 'DualControlPolicy', 'ok', `${extra.length} further step(s) · identity binding ${d.requireIdentityBinding ? 'required' : 'not required'} · proposals lapse after ${hours} h · ${basis.slice(0, 120)}`);
  return dualControlPolicy();
}

registerDualControlRules({ twoOfficials: needsTwoOfficials, pendingHours: () => db().pendingHours, requireIdentityBinding: () => db().requireIdentityBinding });
