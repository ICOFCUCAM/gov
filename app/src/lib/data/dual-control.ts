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
  if (proposer.byId && confirmer.byId) return proposer.byId === confirmer.byId ? same : null;
  return proposer.by.trim().toLowerCase() === confirmer.by.trim().toLowerCase() ? same : null;
}

/** True when a dual-control proposal made at `at` has lapsed unconfirmed. */
export const proposalLapsed = (at: string, now = Date.now()): boolean => now - Date.parse(at) > DUAL_CONTROL_HOURS * 3600_000;
