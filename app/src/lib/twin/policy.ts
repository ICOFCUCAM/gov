// The nation's rules for its twin (register 16.1): whether withdrawing an
// import takes two officials (four-eyes: one proposes with a reason, a
// different one confirms), on by default. Changed only by an administrator
// (/api/twin/policy, ADMIN_ONLY in lib/auth/roles.ts), named and audited.
// Its own store on globalThis (__civicosTwinPolicy), saved and restored by
// lib/data/persist.ts like every store; fields added later get their
// defaults through withDefaults().

import { recordAudit } from '@/lib/data/store';
import { withDefaults } from '@/lib/data/defaults';
import { touch } from '@/lib/data/repo/track';

// A type alias (not an interface) so withDefaults() takes it as a plain record.
export type TwinPolicy = {
  /** Withdrawing an import needs a second official to confirm the proposal (default on). */
  fourEyesWithdrawal: boolean;
  changedBy?: string;
  changedAt?: string;
};

const seed = (): TwinPolicy => ({ fourEyesWithdrawal: true });
const g = globalThis as unknown as { __civicosTwinPolicy?: TwinPolicy };
const store = (): TwinPolicy => touch('__civicosTwinPolicy', g.__civicosTwinPolicy = withDefaults(g.__civicosTwinPolicy ??= seed(), seed()));

export function twinPolicy(): TwinPolicy { return { ...store() }; }

export function setTwinPolicy(change: { fourEyesWithdrawal?: unknown }, by: string, now = new Date()): TwinPolicy | { error: string } {
  const who = by.trim();
  if (!who) return { error: 'Name the official changing the twin\'s rules' };
  if (typeof change.fourEyesWithdrawal !== 'boolean') return { error: 'Say whether withdrawing an import needs a second official (true or false)' };
  const p = store();
  if (p.fourEyesWithdrawal === change.fourEyesWithdrawal) return { ...p };
  p.fourEyesWithdrawal = change.fourEyesWithdrawal;
  p.changedBy = who;
  p.changedAt = now.toISOString();
  recordAudit(who, 'twin.policy.change', 'Twin:policy', 'ok', `Withdrawing an import ${p.fourEyesWithdrawal ? 'needs a second official to confirm' : 'is done by one official'}`);
  return { ...p };
}

export function resetTwinPolicy(): void { g.__civicosTwinPolicy = undefined; }
