// What a signed-in official may do (register 15.4). Every platform account has
// a role and, unless it serves the whole government, one institution (a
// ministry id from the registry, /api/org). The same rules run in the
// middleware (every change through the API, when the session can be verified
// there) and in the routes that need the record itself to decide (directives,
// accounts). No imports: this file runs at the edge as well as in Node.

export type OfficialRole = 'administrator' | 'signatory' | 'officer' | 'auditor';

export const ROLES: { id: OfficialRole; label: string; means: string }[] = [
  { id: 'administrator', label: 'Administrator', means: 'Manages official accounts, setup and the structure of government, and can do everything an official can.' },
  { id: 'signatory', label: 'Can sign', means: 'Does the work of an officer, and signs or withdraws directives.' },
  { id: 'officer', label: 'Officer', means: 'Works cases and incidents and drafts directives.' },
  { id: 'auditor', label: 'Auditor (read only)', means: 'Reads every record and changes nothing.' },
];
export const isRole = (v: unknown): v is OfficialRole => ROLES.some(r => r.id === v);
export const roleLabel = (r: OfficialRole) => ROLES.find(x => x.id === r)!.label;

/** The part of an official's session the rules read. */
export interface Scope { role?: OfficialRole; institution?: string }

/** Accounts and sessions from before roles existed keep what they could do: everything. */
export const roleOf = (s: Scope): OfficialRole => s.role ?? 'administrator';
/** True when the official serves every institution, not one. */
export const wholeGovernment = (s: Scope): boolean => !s.institution;

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Changes the structure of government or the installation: administrators only. */
const ADMIN_ONLY: RegExp[] = [
  /^\/api\/auth\/officials(\/|$)/,
  /^\/api\/org\/ministries\/?$/,
  /^\/api\/org\/ministries\/[^/]+\/(merge|deactivate|activate|rename)\/?$/,
  /^\/api\/setup(\/|$)/,
  /^\/api\/sovereign(\/|$)/,
];
/** Signing in and out stays open to every role. */
const ANY_ROLE: RegExp[] = [/^\/api\/auth\/official\/?$/];

/**
 * Whether a change through the API is allowed: null when it is, otherwise the
 * reason shown to the official. Reads only the method and path, so it can run
 * before the route; routes that need the record (directives) check again.
 */
export function apiPermission(s: Scope, method: string, pathname: string): string | null {
  if (!MUTATING.has(method.toUpperCase())) return null;
  if (ANY_ROLE.some(re => re.test(pathname))) return null;
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (ADMIN_ONLY.some(re => re.test(pathname))) return adminOnly(s);
  const m = /^\/api\/org\/ministries\/([^/]+)\//.exec(pathname);
  if (m) return ministryPermission(s, decodeURIComponent(m[1]!));
  return null;
}

export function adminOnly(s: Scope): string | null {
  return roleOf(s) === 'administrator' ? null : 'Only an administrator can make this change';
}

/** Whether the official may act inside one ministry's workspace. */
export function ministryPermission(s: Scope, ministryId: string): string | null {
  if (roleOf(s) === 'auditor') return 'Auditors can read records but not change them';
  if (wholeGovernment(s) || s.institution === ministryId) return null;
  return 'You can act only for your own institution';
}

/** The issuer a new directive is recorded under: an official's own institution, whatever the request names. */
export function directiveIssuer(s: Scope | null, requested: string): string {
  return s && !wholeGovernment(s) ? s.institution! : requested;
}

export function canDraftDirective(s: Scope): string | null {
  return roleOf(s) === 'auditor' ? 'Auditors can read records but not change them' : null;
}

/** Sign or withdraw: signatories and administrators, for their own institution's directives. */
export function canSignDirective(s: Scope, issuer: string): string | null {
  const role = roleOf(s);
  if (role !== 'signatory' && role !== 'administrator') return 'Only an official who can sign may sign or withdraw a directive';
  if (wholeGovernment(s) || s.institution === issuer) return null;
  return 'You can sign only your own institution\'s directives';
}

/** Drafts are seen only by the issuing institution (and officials serving the whole government). */
export function canSeeDraft(s: Scope, issuer: string): boolean {
  return wholeGovernment(s) || s.institution === issuer;
}

/** The role a substrate officer has on the platform, from the officer register's role. */
export function roleFromSubstrate(role: string): OfficialRole {
  if (role === 'platform-admin') return 'administrator';
  if (role === 'auditor') return 'auditor';
  if (['president', 'minister', 'cabinet-secretary', 'cabinet-officer', 'permanent-secretary'].includes(role)) return 'signatory';
  return 'officer';
}
