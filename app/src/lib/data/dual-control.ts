// Dual control by two sign-ins (review H-5), shared by the Update Center's
// break-glass (./updates.ts) and preflight waivers (./readiness.ts): one
// official proposes, a different official confirms in their own request. The
// four-eyes decisions (decide() in ./updates.ts) follow the same pattern.

/** A dual-control proposal lapses after this long unconfirmed (break-glass, preflight waivers). */
export const DUAL_CONTROL_HOURS = 24;

/**
 * Whether `confirmer` may confirm what `proposer` proposed (dual control,
 * review H-5): a different official. With sessions, compared by the verified
 * identity (session subject), never by a typed name; a step proposed by a
 * signed-in official is confirmed only by a signed-in one. Without sessions
 * (sign-in not enforced), declared names must differ, as for four-eyes.
 * Returns the reason it may not, or null.
 */
export function dualControlRefusal(proposer: { by: string; byId?: string }, confirmer: { by: string; byId?: string }): string | null {
  const same = `${proposer.by} proposed this; a second, different official must confirm it (dual control)`;
  if (proposer.byId && !confirmer.byId) return `${proposer.by} proposed this signed in; the second official must sign in to confirm it`;
  if (proposer.byId && confirmer.byId) {
    if (proposer.byId === confirmer.byId) return same;
    // Two accounts of one natural person are one official (acceptance hardening H).
    const a = personOf(proposer.byId), b = personOf(confirmer.byId);
    if (a.bound && b.bound && a.key === b.key) return `${proposer.by} and ${confirmer.by} are the same person at the identity provider: a different person must confirm it (dual control)`;
    return null;
  }
  return proposer.by.trim().toLowerCase() === confirmer.by.trim().toLowerCase() ? same : null;
}

/**
 * The natural person behind a signed-in official's account: the identity
 * provider's subject when the account is linked to it (bound), otherwise only
 * the account itself (not bound: two accounts of one person cannot be told
 * apart, and the step says so). lib/auth/officials.ts registers the resolver.
 */
export type Person = { key: string; bound: boolean };
const gp = globalThis as unknown as { __personResolver?: (sub: string) => Person | undefined };
export function registerPersonResolver(fn: (sub: string) => Person | undefined): void { gp.__personResolver = fn; }
export function personOf(sub: string): Person { return gp.__personResolver?.(sub) ?? { key: sub, bound: false }; }

/** How independent two approvals are known to be: different persons at the identity provider, or only different accounts. */
export function independenceOf(a?: string, b?: string): 'identity-provider' | 'accounts-only' | 'unverified' {
  if (!a || !b) return 'unverified';
  const x = personOf(a), y = personOf(b);
  return x.bound && y.bound ? 'identity-provider' : 'accounts-only';
}

/**
 * The country's dual-control waiting period in hours (dualControlPolicy()
 * .pendingHours, kept by lib/casework/dual-control-policy.ts on
 * `__civicosDualControl`), read here for stores that cannot import the case
 * engine that module brings with it (integration approvals in
 * ./store/federation.ts); the platform default until the country sets one.
 */
export function dualControlPendingHours(): number {
  const h = (globalThis as unknown as { __civicosDualControl?: { pendingHours?: number } }).__civicosDualControl?.pendingHours;
  return typeof h === 'number' && h > 0 ? h : DUAL_CONTROL_HOURS;
}

/** True when a dual-control proposal made at `at` has lapsed unconfirmed. */
export const proposalLapsed = (at: string, now = Date.now()): boolean => now - Date.parse(at) > DUAL_CONTROL_HOURS * 3600_000;
