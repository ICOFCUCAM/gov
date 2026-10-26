// Representation granted by the represented person (plan step I13; forms
// catalogue Part 13 §5.3, GOV-SVC-014 and the supplement's DGV-REP-003).
//
// A person signed in through the nation's identity provider (or the demo
// citizen in a demonstration) grants another person the right to act for them:
// for named catalogue services (or all), for named acts (apply, track, add
// information, challenge, receive the decision), from a date and until a date
// or until revoked, with the basis and any restriction in their words. It is
// kept in the delegations register (lib/records/delegations.ts) as a
// delegation the principal granted (`byPrincipal`), revoked only by them, every
// change audited without the parties' names. An agent acts only within it:
// the front door checks the representation for the service's procedure and
// the act every time (representationCovering()), and the case and the routing
// record both persons (applicant: the agent; onBehalfOf: the principal) and
// the representation relied on. A representation for one service never opens
// another person's other records. Identity is not authorisation (Part 13
// §5.2): signing in proves who someone is; this record decides whether they
// may act for another.

import { grantDelegation, revokeDelegation, delegationFor, delegationsGrantedBy, delegationsOf, getDelegation, type Delegation } from '@/lib/records/delegations';
import { getService, publishedVersion } from './catalogue';

export const REPRESENTATION_ACTIONS = ['apply', 'track', 'add-information', 'challenge', 'receive-decision'] as const;
export type RepresentationAction = typeof REPRESENTATION_ACTIONS[number];
export const ACTION_LABEL: Record<RepresentationAction, string> = { apply: 'Apply', track: 'Follow the application', 'add-information': 'Add information', challenge: 'Ask for reconsideration', 'receive-decision': 'Receive the decision' };

/** A citizen as the front door knows them: the identity provider's subject (or `demo`) and the name it gave. */
export interface Citizen { sub: string; name: string; demo?: boolean }

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const label = (c: Citizen) => (c.demo ? 'Demo citizen' : 'Citizen (the represented person)');

/** Grant a representation (the principal, signed in). */
export function grantRepresentation(principal: Citizen, input: { agent?: { sub?: unknown; name?: unknown }; services?: unknown; actions?: unknown; validFrom?: unknown; validUntil?: unknown; basis?: unknown; restrictions?: unknown }, now = new Date()): Delegation | { error: string } {
  const agentSub = str(input.agent?.sub, 120), agentName = str(input.agent?.name, 120);
  if (!agentSub || !agentName) return { error: 'Name the person who may act for you and give their identifier at the identity provider' };
  if (agentSub === principal.sub) return { error: 'You do not need a representation to act for yourself' };
  const services = (Array.isArray(input.services) ? input.services : str(input.services, 2000).split(/[\n,]+/)).map(x => str(x, 80)).filter(Boolean).slice(0, 30);
  if (!services.length) return { error: 'Choose the services it covers (or * for every service)' };
  const procedures: string[] = [];
  for (const s of services) {
    if (s === '*') { procedures.push('*'); continue; }
    const e = getService(s);
    const v = e ? publishedVersion(e) : undefined;
    if (!e || !v) return { error: `${s}: no published service of the catalogue has that id` };
    if (!v.terms.representatives) return { error: `${v.terms.name}: the service does not allow someone to act for the applicant` };
    if (v.terms.procedure) procedures.push(v.terms.procedure);
  }
  if (!procedures.length) return { error: 'The services chosen take no application (information only): there is nothing to act on' };
  const actions = (Array.isArray(input.actions) ? input.actions : str(input.actions, 400).split(/[\n,]+/)).map(x => str(x, 40)).filter(Boolean);
  if (!actions.length || actions.some(a => !(REPRESENTATION_ACTIONS as readonly string[]).includes(a))) return { error: `Choose what they may do: ${REPRESENTATION_ACTIONS.join(', ')}` };
  const validFrom = str(input.validFrom, 10) || now.toISOString().slice(0, 10);
  const validUntil = str(input.validUntil, 10);
  if (!ISO.test(validFrom) || (validUntil && !ISO.test(validUntil))) return { error: 'Valid from a date, and until a later date if it ends' };
  const basis = str(input.basis, 300) || 'Granted by the represented person through the front door';
  return grantDelegation({
    principal: { kind: 'person', id: principal.sub, name: principal.name }, agent: { kind: 'citizen', id: agentSub, name: agentName },
    procedures: [...new Set(procedures)], basis, validFrom, ...(validUntil ? { validUntil } : {}), byPrincipal: true, services: [...new Set(services)], actions: [...new Set(actions)],
    ...(str(input.restrictions, 1000) ? { restrictions: str(input.restrictions, 1000) } : {}),
  }, label(principal), now);
}

/** Revoke a representation: only the person who granted it. Kept, never deleted. */
export function revokeRepresentation(principal: Citizen, id: unknown, reason: unknown, now = new Date()): Delegation | { error: string } {
  const d = getDelegation(str(id, 80));
  if (!d || d.principal.kind !== 'person' || d.principal.id !== principal.sub) return { error: 'You can revoke only a representation you granted' };
  if (!d.byPrincipal) return { error: 'This representation was recorded by an official: ask the institution that recorded it' };
  return revokeDelegation(d.id, str(reason, 300) || 'Revoked by the represented person', label(principal), now);
}

/**
 * The representation that lets `agent` take `action` for `principal` in
 * `procedure` today, or why not. A delegation recorded before acts were named
 * covers every act in its procedures.
 */
export function representationCovering(agent: string, principal: string, procedure: string, action: RepresentationAction, on = new Date().toISOString().slice(0, 10)): Delegation | { error: string } {
  const d = delegationFor({ kind: 'citizen', id: agent }, { kind: 'person', id: principal }, procedure, on);
  if (!d) return { error: 'You have no representation in force from that person for this service' };
  if (d.actions && !d.actions.includes(action)) return { error: `Your representation does not cover "${ACTION_LABEL[action]}"` };
  return d;
}

/** What a person granted, and what they were granted (their own view; the other party is named only to the two of them). */
export function representationsOf(c: Citizen): { granted: Delegation[]; received: Delegation[] } {
  return { granted: delegationsGrantedBy({ kind: 'person', id: c.sub }), received: delegationsOf({ kind: 'citizen', id: c.sub }) };
}
