// Intake of a complaint, a protected disclosure or a data-protection request
// with a protected identity (plan step I8; Institutional specification Part 4
// §C.7 workflow step 2: "Separate source identity from the general case
// record where practicable").
//
// One act: the case is opened through the engine (openCase(), the body's own
// officials only) with what the procedure needs to work the matter, and the
// identity of the person who raised it goes to the protected-identity vault
// (lib/oversight/protected-identity.ts), never into the case. The answer
// carries the case and the identity's marker (its id, role and whether the
// person is anonymous), never the identity.
//
// Data-protection investigations read the access log only for the records
// the case names (investigationAccess()): scoped to the investigation, every
// read written to the access log with the case as its correlation (acceptance
// P4-05). The authority never reads the records themselves: it asks the
// controller (the ask-controller step, under an approved relationship).

import { openCase, getCase, type Actor } from '@/lib/casework/engine';
import { authorityFor } from '@/lib/data/store';
import { roleOf, type CaseScope } from '@/lib/auth/roles';
import { listAccess, recordAccess, type AccessEntry } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { protectIdentity, type IdentityMarker } from './protected-identity';
import { INDEPENDENT_OVERSIGHT_PROCEDURES } from './procedures';
import type { Case } from '@/lib/casework/types';

const PROTECTED_ROLE: Record<string, 'complainant' | 'whistleblower' | 'data-subject'> = {
  'ombudsman.complaint': 'complainant', 'human-rights.complaint': 'complainant', 'integrity.disclosure': 'whistleblower',
  'data-protection.rights-request': 'data-subject', 'data-protection.investigation': 'complainant',
};
/** The procedures whose intake keeps the person who raised the matter apart. */
export const PROTECTED_INTAKE = Object.keys(PROTECTED_ROLE);

export interface ProtectedIntake {
  procedure: string;
  fields?: Record<string, unknown>;
  /** The person who raised it: kept in the vault, never in the case. */
  identity?: { anonymous?: unknown; name?: unknown; contact?: unknown; consentToShare?: unknown; protections?: unknown };
  source?: Case['source'];
  idempotencyKey?: string;
}

/** Open the case and keep the identity apart. Refused as a whole when either part is refused (no case without its identity record). */
export function receiveProtected(input: ProtectedIntake, actor: Actor, now = new Date()): { case: Case; identity: IdentityMarker } | { error: string } {
  const role = PROTECTED_ROLE[input.procedure];
  if (!role) return { error: `Protected intake is for ${PROTECTED_INTAKE.join(', ')}` };
  if (!INDEPENDENT_OVERSIGHT_PROCEDURES.some(p => p.key === input.procedure)) return { error: 'Unknown oversight procedure' };
  const id = input.identity ?? {};
  // Checked before the case opens, so a refusal leaves nothing behind.
  if (id.anonymous !== true && !(typeof id.name === 'string' && id.name.trim())) return { error: 'Give the person\'s name, or record that they asked to stay anonymous' };
  const c = openCase({ procedure: input.procedure, fields: input.fields ?? {}, ...(input.source ? { source: input.source } : {}), ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}) }, actor, now);
  if ('error' in c) return c;
  const marker = protectIdentity(c.id, { role, ...id }, { ...(actor.id ? { id: actor.id } : {}), name: actor.name, scope: actor.scope }, now);
  if ('error' in marker) return marker;
  return { case: c, identity: marker };
}

/**
 * The access-log entries about the records a data-protection investigation
 * or request names, for the authority's assigned official or one who can sign
 * there: never the whole log through this route, never record content. The
 * read is itself logged, naming the case.
 */
export function investigationAccess(caseId: string, s: (CaseScope & { label?: string }) | null, now = new Date()): { entries: AccessEntry[]; records: { register: string; id: string }[] } | { error: string } {
  const c = getCase(caseId);
  if (!c) return { error: 'No such case' };
  if (!c.package.key.startsWith('data-protection.')) return { error: 'Only a data-protection case reads the access log for its records' };
  const dpa = authorityFor('dataProtection');
  const own = !!s && !!dpa && s.institution === dpa && c.owner === dpa;
  const may = own && roleOf(s!) !== 'auditor' && (c.assignee?.id === s!.id || roleOf(s!) === 'signatory');
  const records = String(c.fields.records ?? '').split(/\n|;|,/).map(l => l.trim()).filter(Boolean).map(l => { const [register, ...rest] = l.split(':'); return { register: register!.trim(), id: rest.join(':').trim() }; }).filter(r => r.register && r.id);
  const why = !s ? 'Sign in' : !may ? 'The access log is read for an investigation only by the data-protection authority\'s official assigned to it, or one who can sign there' : !['assessment', 'with-controller', 'review', 'decided'].includes(c.stage) ? 'The investigation is not open' : !records.length ? 'The case names no record' : null;
  if (s) recordAccess({ ...accessBy({ ...(s.id ? { id: s.id } : {}), label: s.label ?? s.id ?? 'Official', ...(s.institution ? { institution: s.institution } : {}) }, now), record: { register: 'access-log', query: records.map(r => `${r.register}:${r.id}`).join(' ') || '(none)' }, action: why ? 'refused' : 'search', purpose: `Data-protection case ${c.ref}`, result: why ? 'refused' : 'allowed', rule: why ?? 'Scoped to the records the investigation names', correlation: c.ref }, now);
  if (why) return { error: why };
  const entries = records.flatMap(r => listAccess({ register: r.register, recordId: r.id, limit: 500 }));
  return { entries, records };
}
