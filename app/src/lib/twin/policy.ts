// The nation's rules for its twin (register 16.1): whether withdrawing an
// import takes two officials (four-eyes: one proposes with a reason, a
// different one confirms), on by default; and whether a stream source's MQTT
// broker may be on the nation's own private network (lib/twin/mqtt.ts), off by
// default so the subscriber reaches only public addresses. Changed only by an administrator
// (/api/twin/policy, ADMIN_ONLY in lib/auth/roles.ts), named and audited.
// Its own store on globalThis (__civicosTwinPolicy), saved and restored by
// lib/data/persist.ts like every store; fields added later get their
// defaults through withDefaults().

import { recordAudit } from '@/lib/data/store';
import { withDefaults } from '@/lib/data/defaults';

// A type alias (not an interface) so withDefaults() takes it as a plain record.
export type TwinPolicy = {
  /** Withdrawing an import needs a second official to confirm the proposal (default on). */
  fourEyesWithdrawal: boolean;
  /** A stream's MQTT broker may resolve to a private or internal address (the nation's own network); default off. */
  privateBrokers: boolean;
  changedBy?: string;
  changedAt?: string;
};

const seed = (): TwinPolicy => ({ fourEyesWithdrawal: true, privateBrokers: false });
const g = globalThis as unknown as { __civicosTwinPolicy?: TwinPolicy };
const store = (): TwinPolicy => (g.__civicosTwinPolicy = withDefaults(g.__civicosTwinPolicy ??= seed(), seed()));

export function twinPolicy(): TwinPolicy { return { ...store() }; }

export function setTwinPolicy(change: { fourEyesWithdrawal?: unknown; privateBrokers?: unknown }, by: string, now = new Date()): TwinPolicy | { error: string } {
  const who = by.trim();
  if (!who) return { error: 'Name the official changing the twin\'s rules' };
  const given = (['fourEyesWithdrawal', 'privateBrokers'] as const).filter(k => change[k] !== undefined);
  if (!given.length) return { error: 'Say whether withdrawing an import needs a second official (true or false)' };
  for (const k of given) if (typeof change[k] !== 'boolean') return { error: k === 'fourEyesWithdrawal' ? 'Say whether withdrawing an import needs a second official (true or false)' : 'Say whether stream brokers may be on the nation\'s own private network (true or false)' };
  const p = store();
  const words: string[] = [];
  if (change.fourEyesWithdrawal !== undefined && p.fourEyesWithdrawal !== change.fourEyesWithdrawal) {
    p.fourEyesWithdrawal = change.fourEyesWithdrawal as boolean;
    words.push(`Withdrawing an import ${p.fourEyesWithdrawal ? 'needs a second official to confirm' : 'is done by one official'}`);
  }
  if (change.privateBrokers !== undefined && p.privateBrokers !== change.privateBrokers) {
    p.privateBrokers = change.privateBrokers as boolean;
    words.push(`Stream brokers ${p.privateBrokers ? 'may be on the nation\'s own private network' : 'must be at public addresses'}`);
  }
  if (!words.length) return { ...p };
  p.changedBy = who;
  p.changedAt = now.toISOString();
  recordAudit(who, 'twin.policy.change', 'Twin:policy', 'ok', words.join('; '));
  return { ...p };
}

export function resetTwinPolicy(): void { g.__civicosTwinPolicy = undefined; }
