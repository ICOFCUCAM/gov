// The verified official of the current request (route handlers only).
// Routes that record who acted pass their parsed body through withOfficial():
// when someone is signed in, their verified name replaces whatever name the
// request carried, so neither the audit chain nor a four-eyes check can be
// given a typed-in name. Without a signed-in official the body is unchanged
// (declared names, as before); with CIVICOS_AUTH=enforce the middleware
// refuses such changes before they get here.

import { cookies, headers } from 'next/headers';
import { logRefusal, type RefusalRef } from '@/lib/records/refusal-log';
import { ROUTE_HEADER } from '@/lib/records/route-ref';
import { NextResponse } from 'next/server';
import { OFFICIAL_COOKIE, SESSION_HOURS, signClaims, verifyToken, type OfficialClaims } from './session-token';
import { createHash } from 'node:crypto';
import { sessionSecret, sessionSecretProblem, accountById, sessionRevoked, demoAccountRefused } from './officials';
import { apiPermission, secondStepMissing, type CaseScope, type Scope } from './roles';
import { officerNow, substrateScope } from './substrate-officials';
import { logger } from '@/lib/ops/log';
import { providerMfaAccepted } from './sign-on-store';
import { institutionBounds } from '@/lib/data/store/institutions';
import { authorityGrantsFor } from '@/lib/records/delegations';

/** The signed-in official with where whole-government reach stops (lib/auth/roles.ts Boundaries), read at use. */
export type CurrentOfficial = OfficialClaims & Pick<Scope, 'bounds' | 'attributes' | 'delegations'>;
/** Delegations of authority in force today for this official (lib/records/delegations.ts), read at use; none when the register cannot be read. */
function delegationsOf(sub: string): Scope['delegations'] {
  try { const g = authorityGrantsFor(sub); return g.length ? g : undefined; } catch (e) { logger.error('auth.delegations_unreadable', { error: (e as Error).message }); return undefined; }
}
/** The institution register's boundaries now; none when it cannot be read (nothing is then treated as independent). */
function bounds(): Scope['bounds'] {
  try { return institutionBounds(); } catch (e) { logger.error('auth.bounds_unreadable', { error: (e as Error).message }); return undefined; }
}

/** The key an ended session is kept under (lib/auth/officials.ts revokeSession): the token's SHA-256. */
export const sessionKey = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

/** The session token the request carries, if any. */
export async function sessionToken(): Promise<string | undefined> {
  try { return (await cookies()).get(OFFICIAL_COOKIE)?.value; } catch { return undefined; }
}

/**
 * The signed-in official, as their account stands now: a session that was
 * signed out is refused (review M-1); a platform account that has since been
 * disabled signs nobody in, and a changed role or institution applies at
 * once (the session carries what it was at sign-in); a substrate officer
 * whose register entry is gone or inactive signs nobody in, and their role
 * and institution come from the platform's records (review H-3,
 * lib/auth/substrate-officials.ts).
 */
export async function currentOfficial(): Promise<CurrentOfficial | null> {
  let token: string | undefined;
  try { token = (await cookies()).get(OFFICIAL_COOKIE)?.value; } catch { return null; }
  // With sign-in enforced and no CIVICOS_SESSION_SECRET, no session is accepted (sessionSecretProblem()).
  const problem = sessionSecretProblem();
  if (problem) {
    if (token) logger.error('auth.session_refused', { reason: problem });
    return null;
  }
  const c = await verifyToken(token, sessionSecret());
  if (!c || sessionRevoked(sessionKey(token!))) return null;
  if (c.method === 'substrate') {
    const row = await officerNow(c.sub.slice('officer:'.length));
    // Gone, inactive, or the register cannot be read just now: the session does not count.
    if (!row || !row.active) return null;
    const s = substrateScope(row);
    const del = delegationsOf(c.sub);
    return { ...c, name: row.name, office: row.title ?? row.role, role: s.role, institution: s.institution,
      twoStep: !!c.twoStep, twoStepRequired: s.twoStepRequired, bounds: bounds(), ...(del ? { delegations: del } : {}) };
  }
  if (c.method !== 'local') return { ...c, bounds: bounds() };
  const a = accountById(c.sub.slice('local:'.length));
  if (!a || a.disabled) return null;
  // A demo cast account counts only while the installation may hold samples (lib/auth/demo-cast.ts).
  if (demoAccountRefused(a)) return null;
  // A session issued before the password last changed no longer counts.
  if (a.passwordChangedAt && c.iat < Math.floor(Date.parse(a.passwordChangedAt) / 1000)) return null;
  // The second step still counts while what proved it is still in place: the account's authenticator app or a
  // passkey, or, for an identity-provider sign-in, the provider's multi-factor sign-in while the policy accepts it.
  const secondStep = c.via === 'oidc' ? providerMfaAccepted() : a.secondStepOn;
  // Attribute scope and delegations of authority are read from their records at each request (plan I2), never signed into the session.
  const del = delegationsOf(c.sub);
  const attrs = a.attributes && (a.attributes.facilities?.length || a.attributes.jurisdictions?.length || a.attributes.tasks?.length)
    ? { ...(a.attributes.facilities?.length ? { facilities: [...a.attributes.facilities] } : {}), ...(a.attributes.jurisdictions?.length ? { jurisdictions: [...a.attributes.jurisdictions] } : {}), ...(a.attributes.tasks?.length ? { tasks: [...a.attributes.tasks] } : {}) }
    : undefined;
  return { ...c, name: a.name, office: a.office, role: a.role, institution: a.institution,
    twoStep: !!c.twoStep && secondStep, twoStepRequired: a.twoStepRequired, bounds: bounds(), ...(attrs ? { attributes: attrs } : {}), ...(del ? { delegations: del } : {}) };
}

/**
 * The signed-in official as the case and register rules see them
 * (caseActRefusal() / caseReadRefusal() in lib/auth/roles.ts): role,
 * institution, id, and when the second sign-in step was last passed (the
 * sign-in itself when it included the step). Null without a verified official.
 */
export async function caseScope(): Promise<(CaseScope & { name: string; label: string }) | null> {
  const o = await currentOfficial();
  if (!o) return null;
  const twoStepAt = o.twoStep ? (o.twoStepAt ?? o.iat * 1000) : undefined;
  return { id: o.sub, name: o.name, label: actorLabel(o), role: o.role, institution: o.institution, twoStep: o.twoStep, twoStepRequired: o.twoStepRequired, ...(o.bounds ? { bounds: o.bounds } : {}), ...(twoStepAt ? { twoStepAt } : {}),
    ...(o.attributes ? { attributes: o.attributes } : {}), ...(o.delegations ? { delegations: o.delegations } : {}) };
}

/** The name an action is recorded under: the verified official's, with their office. */
export const actorLabel = (c: OfficialClaims) => (c.office ? `${c.name}, ${c.office}` : c.name);

/** Replace the actor fields of a request body with the verified official, when there is one. */
export async function withOfficial<T>(body: T): Promise<T> {
  const o = await currentOfficial();
  if (!o || !body || typeof body !== 'object' || Array.isArray(body)) return body;
  const b = { ...(body as Record<string, unknown>) };
  const label = actorLabel(o);
  b.by = label;
  if ('officerName' in b) b.officerName = label;
  if ('actor' in b) b.actor = label;
  return b as T;
}

/**
 * What a refused request asked for, for the access log: the record the route
 * names, else the method and path the middleware forwarded (ROUTE_HEADER),
 * else only that it was an API request.
 */
async function requestRef(ref?: RefusalRef): Promise<RefusalRef> {
  if (ref) return ref;
  try {
    const r = (await headers()).get(ROUTE_HEADER);
    if (r) return { register: 'api', id: r.slice(0, 200) };
  } catch { /* outside a request */ }
  return { register: 'api' };
}

/** A 403 with the reason, the refusal written to the access log first (reference and rule only; lib/records/refusal-log.ts). */
async function refused(o: CurrentOfficial, why: string, ref?: RefusalRef): Promise<NextResponse> {
  logRefusal({ id: o.sub, label: actorLabel(o), ...(o.institution ? { institution: o.institution } : {}) }, await requestRef(ref), why);
  return NextResponse.json({ error: why }, { status: 403 });
}

/**
 * Check a rule from lib/auth/roles.ts against the signed-in official: a 403
 * response with the reason when it refuses, null to go ahead. Without a
 * signed-in official there is nothing to check here (declared names; the
 * middleware refuses changes when sign-in is enforced). A refusal is written
 * to the access log as `refused`, naming `ref` (the record asked for) or the
 * request's method and path, and the rule; never the protected content.
 */
export async function refusal(rule: (s: Scope) => string | null, ref?: RefusalRef): Promise<NextResponse | null> {
  const o = await currentOfficial();
  const why = o ? secondStepMissing(o) ?? rule(o) : null;
  return why ? refused(o!, why, ref) : null;
}

/**
 * The path rule of lib/auth/roles.ts (apiPermission()) for this change,
 * checked again in the route against the account as it stands now: the
 * middleware applies it only when it can verify the session itself, so the
 * Update Center's installation-level routes check here too.
 */
export function pathRefusal(req: Request): Promise<NextResponse | null> {
  const { pathname } = new URL(req.url);
  return refusal(s => apiPermission(s, req.method, pathname));
}

/**
 * Check a read rule from lib/auth/roles.ts (canReadInstitution(),
 * canReadPermits()) against the signed-in official: a 403 with the reason, or
 * null to go ahead. Reads do not need the second sign-in step. Without a
 * signed-in official there is nothing to check (CIVICOS_AUTH=enforce refuses
 * reads without one in the middleware). A refusal is written to the access
 * log as refusal() writes it.
 */
export async function readRefusal(rule: (s: Scope) => string | null, ref?: RefusalRef): Promise<NextResponse | null> {
  const o = await currentOfficial();
  const why = o ? rule(o) : null;
  return why ? refused(o!, why, ref) : null;
}

/**
 * The verified identity of the signed-in official (their session subject),
 * for dual control: a step proposed by one official is confirmed only by a
 * different one, compared by this rather than by a name. Undefined when no
 * one is signed in.
 */
export async function officialId(): Promise<string | undefined> {
  return (await currentOfficial())?.sub;
}

/** Set the signed session cookie (and the console's page cookie) on a response. */
export async function issueSession(res: NextResponse, claims: OfficialClaims, secure: boolean): Promise<NextResponse> {
  const problem = sessionSecretProblem();
  if (problem) return NextResponse.json({ error: problem }, { status: 503 });
  // Boundaries, attributes and delegations are read at each request, never carried in the signed session.
  const { bounds: _bounds, attributes: _attributes, delegations: _delegations, ...signed } = claims as CurrentOfficial;
  res.cookies.set(OFFICIAL_COOKIE, await signClaims(signed, sessionSecret()), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600, secure,
  });
  // The console's page gate (middleware) also accepts the official's session.
  res.cookies.set('civicos_session', 'official', { sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600 });
  return res;
}
