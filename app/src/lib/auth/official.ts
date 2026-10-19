// The verified official of the current request (route handlers only).
// Routes that record who acted pass their parsed body through withOfficial():
// when someone is signed in, their verified name replaces whatever name the
// request carried, so neither the audit chain nor a four-eyes check can be
// given a typed-in name. Without a signed-in official the body is unchanged
// (declared names, as before); with CIVICOS_AUTH=enforce the middleware
// refuses such changes before they get here.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { OFFICIAL_COOKIE, SESSION_HOURS, signClaims, verifyToken, type OfficialClaims } from './session-token';
import { createHash } from 'node:crypto';
import { sessionSecret, sessionSecretProblem, accountById, sessionRevoked } from './officials';
import { secondStepMissing, type Scope } from './roles';
import { officerNow, substrateScope } from './substrate-officials';
import { logger } from '@/lib/ops/log';
import { providerMfaAccepted } from './sign-on-store';

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
export async function currentOfficial(): Promise<OfficialClaims | null> {
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
    return { ...c, name: row.name, office: row.title ?? row.role, role: s.role, institution: s.institution,
      twoStep: !!c.twoStep, twoStepRequired: s.twoStepRequired };
  }
  if (c.method !== 'local') return c;
  const a = accountById(c.sub.slice('local:'.length));
  if (!a || a.disabled) return null;
  // A session issued before the password last changed no longer counts.
  if (a.passwordChangedAt && c.iat < Math.floor(Date.parse(a.passwordChangedAt) / 1000)) return null;
  // The second step still counts while what proved it is still in place: the account's authenticator app or a
  // passkey, or, for an identity-provider sign-in, the provider's multi-factor sign-in while the policy accepts it.
  const secondStep = c.via === 'oidc' ? providerMfaAccepted() : a.secondStepOn;
  return { ...c, name: a.name, office: a.office, role: a.role, institution: a.institution,
    twoStep: !!c.twoStep && secondStep, twoStepRequired: a.twoStepRequired };
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
 * Check a rule from lib/auth/roles.ts against the signed-in official: a 403
 * response with the reason when it refuses, null to go ahead. Without a
 * signed-in official there is nothing to check here (declared names; the
 * middleware refuses changes when sign-in is enforced).
 */
export async function refusal(rule: (s: Scope) => string | null): Promise<NextResponse | null> {
  const o = await currentOfficial();
  const why = o ? secondStepMissing(o) ?? rule(o) : null;
  return why ? NextResponse.json({ error: why }, { status: 403 }) : null;
}

/** Set the signed session cookie (and the console's page cookie) on a response. */
export async function issueSession(res: NextResponse, claims: OfficialClaims, secure: boolean): Promise<NextResponse> {
  const problem = sessionSecretProblem();
  if (problem) return NextResponse.json({ error: problem }, { status: 503 });
  res.cookies.set(OFFICIAL_COOKIE, await signClaims(claims, sessionSecret()), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600, secure,
  });
  // The console's page gate (middleware) also accepts the official's session.
  res.cookies.set('civicos_session', 'official', { sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600 });
  return res;
}
