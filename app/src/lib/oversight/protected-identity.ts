// Protected identities (Institutional specification Part 4 §C.4, §C.6, §C.7;
// catalogue Part 12 §10.2 "Protect whistleblower and complainant
// identities"; acceptance P4-06 and P4-07; plan step I8).
//
// The identity of a complainant, a whistleblower, a protected witness or a
// data subject is kept apart from the case it belongs to ("Separate source
// identity from the general case record where practicable", §C.7): the case
// carries none of it, only what the procedure needs to work the matter. The
// vault below holds the name, the way to reach the person, whether they asked
// to stay anonymous, whether they agree to their identity being shared with
// the institution concerned, and their protection needs.
//
// Because it is not in the case, it is never in a case list, a case read, a
// search, the substrate's mirror of case progress or an institution's
// portable export (lib/portability/export.ts lists it under what an export
// does not carry). It is read only:
//   - by an official of the institution that owns the case,
//   - who is assigned to the case or whom an official who can sign there has
//     specifically authorised for this identity,
//   - stating a purpose,
// and every read, and every refusal, is written to the access log (register
// `protected-identities`). Auditors, officials serving the whole government,
// the public audit office and any institution under an audit or
// request-information relationship never read it: the relationship register
// grants reads of cases, never of a protected identity, and nothing here
// consults it. "Do not disclose an identity merely because an executive
// institution requests it" (§C.6): there is no function that gives it to
// another institution.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { roleOf, type CaseScope } from '@/lib/auth/roles';
import { getCase } from '@/lib/casework/engine';
import type { Case } from '@/lib/casework/types';
import { randomBytes } from 'node:crypto';

export type ProtectedRole = 'complainant' | 'whistleblower' | 'witness' | 'data-subject';
export const PROTECTED_ROLES: { key: ProtectedRole; label: string }[] = [
  { key: 'complainant', label: 'Complainant' },
  { key: 'whistleblower', label: 'Person making a protected disclosure' },
  { key: 'witness', label: 'Protected witness' },
  { key: 'data-subject', label: 'Data subject' },
];
const isRole = (v: unknown): v is ProtectedRole => PROTECTED_ROLES.some(r => r.key === v);

export interface ProtectedIdentity {
  /** PID-… : the only reference to it anywhere else. */
  id: string;
  case: { id: string; ref: string };
  /** The institution that owns the case and keeps the identity. */
  institution: string;
  role: ProtectedRole;
  /** The person asked not to be identified: no name or contact is kept. */
  anonymous: boolean;
  name?: string;
  contact?: { method: string; value: string };
  /** They agree their identity may be shared with the institution the matter concerns. */
  consentToShare: boolean;
  /** Protection needs (safety, reprisal risk, vulnerability), restricted. */
  protections?: string;
  /** Officials authorised by one who can sign at the institution to read it, besides the case's assignee. */
  authorised: { id: string; name: string; by: string; at: string }[];
  recordedBy: { id?: string; name: string };
  at: string;
  sample?: true;
}

/** What anyone who may see the case learns of a protected identity: that it exists, its role and whether the person is anonymous. */
export interface IdentityMarker { id: string; role: ProtectedRole; anonymous: boolean }

interface Vault { entries: ProtectedIdentity[] }
const g = globalThis as unknown as { __civicosProtectedIdentities?: Vault };
const db = (): Vault => touch('__civicosProtectedIdentities', g.__civicosProtectedIdentities ??= { entries: [] });
export function resetProtectedIdentities(): void { g.__civicosProtectedIdentities = undefined; }

export const PROTECTED_REGISTER = 'protected-identities';
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const newId = () => `PID-${randomBytes(6).toString('hex')}`;

export interface Who { id?: string; name: string; scope: CaseScope | null }

/** Officials of the institution that owns the case, never an auditor. */
function ownRefusal(who: Who, c: Case): string | null {
  if (!who.scope) return null;
  if (roleOf(who.scope) === 'auditor') return 'Auditors do not read or record a protected identity';
  if (who.scope.institution !== c.owner) return 'A protected identity is kept by the institution that owns the case: no other institution, and no official serving the whole government, reads or records it';
  return null;
}

/**
 * Record a protected identity for a case (at intake, by an official of the
 * institution that owns it). Returns the marker only.
 */
export function protectIdentity(caseId: string, input: { role?: unknown; anonymous?: unknown; name?: unknown; contact?: unknown; consentToShare?: unknown; protections?: unknown }, who: Who, now = new Date()): IdentityMarker | { error: string } {
  const c = getCase(caseId);
  if (!c) return { error: 'No such case' };
  const why = ownRefusal(who, c);
  if (why) return { error: why };
  if (!isRole(input.role)) return { error: `The role is one of ${PROTECTED_ROLES.map(r => r.key).join(', ')}` };
  const anonymous = input.anonymous === true;
  const name = anonymous ? '' : str(input.name, 200);
  const ct = (input.contact ?? {}) as { method?: unknown; value?: unknown };
  const contact = anonymous ? undefined : (str(ct.value) ? { method: str(ct.method, 40) || 'other', value: str(ct.value, 200) } : undefined);
  if (!anonymous && !name) return { error: 'Give the person\'s name, or record that they asked to stay anonymous' };
  const e: ProtectedIdentity = {
    id: newId(), case: { id: c.id, ref: c.ref }, institution: c.owner, role: input.role, anonymous,
    ...(name ? { name } : {}), ...(contact ? { contact } : {}), consentToShare: !anonymous && input.consentToShare === true,
    ...(str(input.protections, 2000) ? { protections: str(input.protections, 2000) } : {}),
    authorised: [], recordedBy: { ...(who.id ? { id: who.id } : {}), name: who.name }, at: now.toISOString(),
    ...(c.source === 'sample' ? { sample: true as const } : {}),
  };
  db().entries.push(e);
  // The audit chain names the case and the role, never the person.
  recordAudit(who.name, 'protected-identity.record', `Case:${c.ref}`, 'ok', `${e.id} · ${e.role}${anonymous ? ' · anonymous' : ''}`);
  return { id: e.id, role: e.role, anonymous };
}

/** The markers of a case's protected identities: never a name, a contact or protection needs. */
export const identityMarkers = (caseId: string): IdentityMarker[] =>
  db().entries.filter(e => e.case.id === caseId || e.case.ref === caseId).map(e => ({ id: e.id, role: e.role, anonymous: e.anonymous }));

/** May this official read this protected identity? null when yes. */
export function protectedReadRefusal(s: CaseScope | null, e: ProtectedIdentity, purpose?: string): string | null {
  if (!s) return 'Sign in: a protected identity is read only by a named official';
  if (roleOf(s) === 'auditor') return 'Auditors do not read a protected identity, whatever their purpose';
  if (s.institution !== e.institution) return 'A protected identity is read only by the institution that keeps it; no request, relationship or whole-government role discloses it';
  const c = getCase(e.case.id);
  const assigned = !!s.id && c?.assignee?.id === s.id;
  const authorised = !!s.id && e.authorised.some(a => a.id === s.id);
  if (!assigned && !authorised) return 'A protected identity is read only by the official assigned to the case or one specifically authorised for it';
  if (!purpose?.trim()) return 'Say why you need to read this protected identity';
  return null;
}

/** Read a protected identity: every read and every refusal in the access log. */
export function readProtectedIdentity(id: string, s: (CaseScope & { label?: string }) | null, purpose?: string, now = new Date()): ProtectedIdentity | { error: string } {
  const e = db().entries.find(x => x.id === id);
  if (!e) return { error: 'No such protected identity' };
  const why = protectedReadRefusal(s, e, purpose);
  if (s) recordAccess({ ...accessBy({ ...(s.id ? { id: s.id } : {}), label: s.label ?? s.id ?? 'Official', ...(s.institution ? { institution: s.institution } : {}) }, now), record: { register: PROTECTED_REGISTER, id: e.id }, action: why ? 'refused' : 'view', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', rule: why ?? 'Assigned or specifically authorised official of the keeping institution, with a stated purpose', correlation: e.case.ref }, now);
  if (why) return { error: why };
  return structuredClone(e);
}

/** Authorise one more official to read a protected identity: an official who can sign at the keeping institution, never for themselves. */
export function authoriseIdentityReader(id: string, official: { id?: unknown; name?: unknown }, s: (CaseScope & { label?: string }) | null, now = new Date()): IdentityMarker | { error: string } {
  const e = db().entries.find(x => x.id === id);
  if (!e) return { error: 'No such protected identity' };
  if (!s || s.institution !== e.institution || roleOf(s) !== 'signatory') return { error: 'An official who can sign at the institution that keeps the identity authorises who reads it' };
  const oid = str(official.id, 120), oname = str(official.name, 200);
  if (!oid || !oname) return { error: 'Name the official to authorise (account and name)' };
  if (oid === s.id) return { error: 'An official does not authorise themselves' };
  if (!e.authorised.some(a => a.id === oid)) e.authorised.push({ id: oid, name: oname, by: s.label ?? s.id ?? 'Official', at: now.toISOString() });
  recordAccess({ ...accessBy({ ...(s.id ? { id: s.id } : {}), label: s.label ?? s.id ?? 'Official', institution: e.institution }, now), record: { register: PROTECTED_REGISTER, id: e.id }, action: 'permission', result: 'allowed', rule: `Authorised ${oname} to read it`, correlation: e.case.ref }, now);
  return { id: e.id, role: e.role, anonymous: e.anonymous };
}

/** Counts by institution (no content): for screens and the onboarding status. */
export function protectedCounts(institution?: string): { total: number; anonymous: number } {
  const es = db().entries.filter(e => !institution || e.institution === institution);
  return { total: es.length, anonymous: es.filter(e => e.anonymous).length };
}
