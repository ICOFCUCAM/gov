// Exchange bound to the relationship register (plan step I9; specification
// Part 5 E "Federation rules" and L test 5; acceptance P5-05).
//
// An exchange service answers a caller from another institution only while
// an approved `exchange` relationship in force (lib/data/store/relationships.ts)
// lets the caller's institution receive that service from the provider's,
// for the purpose the call states. callService() (lib/exchange/services.ts)
// stays the one entry point and asks here before the provider's rule runs.
//
// Who the two institutions are:
//   provider  the institution named for the service's slot (authorityFor());
//   caller    a module of the installation: the institution it acts for
//             (Caller.institution, else the institution named for its slot);
//             an integration: the registered institution two officials named
//             when they approved it (IntegrationClient.institution), i.e. the
//             other institution's own installation in a federation.
// Within one institution, or when either end is not a registered institution
// (an outside system that is not part of the register), the relationship
// register does not apply; the integration's own two-official approval and
// purposes still do.
//
// A relationship that was adopted and is now suspended, ended, past its end
// date, or whose law is no longer in force stops the next exchange at once,
// in every installation mode; the earlier exchanges and their signed receipts
// are kept. Where no relationship was ever recorded, a production
// installation refuses; a demonstration or training installation answers and
// the receipt says that no relationship is recorded (the demo pack runs the
// real procedures without inventing relationships). None ships.

import { relationshipGrants, relationshipsCovering, purposeKey } from '@/lib/data/store/relationships';
import { integrationInstitution } from '@/lib/data/store/federation';
import { authorityFor } from '@/lib/data/store/sovereign';
import { getMinistry } from '@/lib/data/store/ministries';
import { isAuthorityKey, type AuthorityKey } from '@/lib/nation/deployment';
import { samplesAllowed } from '@/lib/ops/mode';

export interface BindingCaller { kind: 'module' | 'integration'; id: string; institution?: string }

/** The registered institution a caller acts for, if any. */
export function callerInstitution(caller: BindingCaller): string | undefined {
  if (caller.kind === 'integration') return integrationInstitution(caller.id);
  if (caller.institution) return caller.institution;
  return isAuthorityKey(caller.id) ? authorityFor(caller.id) : undefined;
}

export type Binding =
  | { kind: 'none'; why: string }
  | { kind: 'relationship'; from: string; to: string; relationship: string; version: number }
  | { kind: 'unrecorded'; from: string; to: string }
  | { kind: 'refused'; from: string; to: string; status: 403; error: string };

const nameOf = (id: string) => getMinistry(id)?.name ?? id;

/**
 * Whether an exchange of `subject` (a service id, or `event:<type>`) from the
 * provider's institution to the caller's may happen now, for this purpose.
 */
export function exchangeBinding(subject: string, provider: { slot?: AuthorityKey; institution?: string }, caller: BindingCaller, purpose: string, now = new Date()): Binding {
  const to = provider.institution ?? (provider.slot ? authorityFor(provider.slot) : undefined);
  const from = callerInstitution(caller);
  if (!to) return { kind: 'none', why: 'the provider\'s institution is not named' };
  if (!from) return { kind: 'none', why: 'the caller is not a registered institution' };
  if (from === to) return { kind: 'none', why: 'within one institution' };
  const p = purposeKey(purpose);
  const grants = relationshipGrants(now).filter(g => g.type === 'exchange' && g.from === from && g.to === to && g.recordTypes.includes(subject));
  const covering = grants.find(g => g.purposes.includes(p));
  if (covering) return { kind: 'relationship', from, to, relationship: covering.id, version: covering.version };
  if (grants.length) {
    const listed = [...new Set(grants.flatMap(g => g.purposes))].join(', ');
    return { kind: 'refused', from, to, status: 403, error: `The relationship between ${nameOf(from)} and ${nameOf(to)} lists other purposes for ${subject} (${listed}); state one of them` };
  }
  const ever = relationshipsCovering(from, to, 'exchange', subject, now);
  if (ever.length) {
    const r = ever[0]!;
    const why = r.status === 'suspended' ? 'is suspended' : r.status === 'withdrawn' ? 'has ended' : r.effectiveTo && r.effectiveTo < now.toISOString().slice(0, 10) ? `ended on ${r.effectiveTo}` : 'is not in force (an end, or the law it cites, is no longer in force)';
    return { kind: 'refused', from, to, status: 403, error: `Relationship ${r.id} between ${nameOf(from)} and ${nameOf(to)} ${why}: exchanges under it stopped; earlier exchanges and their receipts are kept` };
  }
  if (samplesAllowed()) return { kind: 'unrecorded', from, to };
  return { kind: 'refused', from, to, status: 403, error: `No approved relationship lets ${nameOf(from)} receive ${subject} from ${nameOf(to)}: record an exchange relationship under National settings · Relationships, citing the law, and have it confirmed by a different official` };
}

/** How a binding is named on the exchange receipt. */
export const bindingNote = (b: Binding): string =>
  b.kind === 'relationship' ? ` · relationship ${b.relationship} v${b.version}` : b.kind === 'unrecorded' ? ' · no relationship recorded (demonstration or training installation)' : '';
