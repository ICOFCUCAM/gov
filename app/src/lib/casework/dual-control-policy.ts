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
//     record, renew, suspend, reinstate, revoke, correct);
//   - approving a government payment, and changing the account a payee is
//     paid into (plan step I5: payment-authorisation, payee-account-change).
//
// Refusals and other decisions follow the procedure. The country adds its own
// (statutory thresholds) as `packageKey:actionKey` entries, never removes the
// minimum. The two must be two signed-in accounts of two different people:
// when both accounts are linked to the national identity provider that is
// checked; otherwise the step records that only the accounts differ, and the
// country can require the link: for decisions and rule changes
// (requireIdentityBinding), or for every two-person control on the platform
// (requireIdentityProvider: dualControlRefusal() in lib/data/dual-control.ts
// refuses unless independenceOf() is 'identity-provider'). Both ship off.
//
// A proposal waiting for its second official lapses after pendingHours; it
// is kept on the case, and only a new, explicit proposal starts again.
//
// The country's rules themselves change by two officials, citing the law
// (lib/law/policy-change.ts): proposed by one administrator with the legal
// basis from the laws register, confirmed by a different one; values left out
// of a proposal keep their current setting; every version is kept.

import { touch } from '@/lib/data/repo/track';
import { DUAL_CONTROL_HOURS } from '@/lib/data/dual-control';
import type { Citation } from '@/lib/law/register';
import { proposePolicy, confirmPolicy, withdrawPolicy, lapsePolicy, type PolicyChanges, type PolicyVersion } from '@/lib/law/policy-change';
import { classifyDecision } from '@/lib/permits/decisions';
import { registerDualControlRules } from './engine';
import type { ActionSpec, Case, CasePackage } from './types';

export interface DualControlPolicy {
  /** Further steps the country's law requires two officials for: `packageKey:actionKey`. */
  extra: string[];
  /** Refuse a two-official decision unless both accounts are linked to the national identity provider. */
  requireIdentityBinding: boolean;
  /**
   * Every two-person control (decisions, rule changes, restores, Update Center
   * steps, integrations, laws, offices …: dualControlRefusal()) refuses unless
   * the two are different persons at the national identity provider. Off until
   * the nation adopts it; never shipped on.
   */
  requireIdentityProvider: boolean;
  /** How long a proposal waits for its second official before it lapses. */
  pendingHours: number;
  /** False while these are the platform's defaults, not the country's adopted rules. */
  adopted: boolean;
  by?: string; at?: string;
  /** Rules adopted before citations were required: the instrument as typed. */
  basis?: string;
  /** The legal basis of the adopted rules, cited from the laws register. */
  citations?: Citation[];
  confirmedBy?: string;
  changes?: PolicyChanges<DualControlValues>;
}
export type DualControlValues = Pick<DualControlPolicy, 'extra' | 'requireIdentityBinding' | 'requireIdentityProvider' | 'pendingHours'>;
export const DEFAULT_DUAL_CONTROL: DualControlPolicy = { extra: [], requireIdentityBinding: false, requireIdentityProvider: false, pendingHours: DUAL_CONTROL_HOURS, adopted: false };

const g = globalThis as unknown as { __civicosDualControl?: DualControlPolicy };
const db = (): DualControlPolicy => {
  const d = touch('__civicosDualControl', g.__civicosDualControl ??= { ...DEFAULT_DUAL_CONTROL });
  d.extra ??= []; d.requireIdentityBinding ??= false; d.requireIdentityProvider ??= false; d.pendingHours ??= DUAL_CONTROL_HOURS; d.adopted ??= false;
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
  // Plan step I5: every approval of a government payment, and every change of where a payee is paid, needs two officials.
  if (cls.permitType === 'payment-authorisation' && a.decision === 'approve-payment') return 'approving a government payment';
  if (cls.permitType === 'payee-account-change' && a.decision === 'approve-account') return 'changing the account a payee is paid into';
  if (['tax-registration', 'tax-assessment', 'customs-clearance'].includes(cls.permitType)) return null;
  if (CREDENTIAL.includes(a.decision)) return 'issuing or changing a regulated credential or register standing';
  return null;
}

/** Whether a step needs two officials: the procedure, the platform's minimum or the country's own rules. */
export function needsTwoOfficials(c: Case, a: ActionSpec, pkg: Pick<CasePackage, 'key' | 'authority'>): boolean {
  return !!a.needs.fourEyes || !!platformMinimum(c, a, pkg) || db().extra.includes(`${pkg.key}:${a.key}`);
}

const AUDIT = 'dual-control.policy';
const values = (d: DualControlPolicy): DualControlValues => ({ extra: [...d.extra], requireIdentityBinding: d.requireIdentityBinding, requireIdentityProvider: d.requireIdentityProvider, pendingHours: d.pendingHours });
const describe = (v: DualControlValues) => `${v.extra.length} further step(s) · identity binding ${v.requireIdentityBinding ? 'required' : 'not required'}${v.requireIdentityProvider ? ' · two persons at the identity provider for every two-person control' : ''} · proposals lapse after ${v.pendingHours} h`;
const check = (v: DualControlValues): string | null => {
  if (v.extra.some(x => !/^[a-z][a-z0-9.-]{1,80}:[a-z][a-z0-9-]{0,40}$/.test(x))) return 'Each further step is packageKey:actionKey (e.g. customs.declaration:release)';
  if (!Number.isInteger(v.pendingHours) || v.pendingHours < 1 || v.pendingHours > 720) return 'The waiting period is a whole number of hours from 1 to 720';
  return null;
};

/** One administrator proposes the country's rules, citing the law; values left out keep their current setting. */
export function proposeDualControlPolicy(input: { extra?: unknown; requireIdentityBinding?: unknown; requireIdentityProvider?: unknown; pendingHours?: unknown; legalBasis?: unknown }, by: string, byId?: string, now = new Date()) {
  const d = db();
  const change: Partial<DualControlValues> = {
    ...(input.extra !== undefined ? { extra: [...new Set((Array.isArray(input.extra) ? input.extra : []).map(String).map(x => x.trim()).filter(Boolean))] } : {}),
    ...(input.requireIdentityBinding !== undefined ? { requireIdentityBinding: input.requireIdentityBinding === true } : {}),
    ...(input.requireIdentityProvider !== undefined ? { requireIdentityProvider: input.requireIdentityProvider === true } : {}),
    ...(input.pendingHours !== undefined ? { pendingHours: Number(input.pendingHours) } : {}),
  };
  return proposePolicy(d.changes ??= {}, values(d), change, input.legalBasis, { by, ...(byId ? { byId } : {}), now, pendingHours: d.pendingHours, audit: AUDIT, context: 'Two-official rules for decisions', check, describe });
}

/** A different official confirms the proposal: the country's rules take effect. */
export function confirmDualControlPolicy(by: string, byId?: string, now = new Date()) {
  const d = db();
  return confirmPolicy(d.changes ??= {}, {
    by, ...(byId ? { byId } : {}), now, audit: AUDIT, requireIdentityBinding: d.requireIdentityBinding, describe,
    adopt: (v: PolicyVersion<DualControlValues>) => Object.assign(d, v.values, { adopted: true, by: v.by, at: v.confirmed!.at, confirmedBy: v.confirmed!.by, citations: v.basis, basis: undefined }),
  });
}

export const withdrawDualControlPolicy = (by: string, reason?: string) => withdrawPolicy(db().changes ??= {}, { by, ...(reason ? { reason } : {}), audit: AUDIT });
export const lapseDualControlPolicy = (now = new Date()) => lapsePolicy(db().changes ??= {}, now, AUDIT);

registerDualControlRules({ twoOfficials: needsTwoOfficials, pendingHours: () => db().pendingHours, requireIdentityBinding: () => db().requireIdentityBinding });
