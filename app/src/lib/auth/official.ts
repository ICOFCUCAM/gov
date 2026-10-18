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
import { sessionSecret, accountById } from './officials';
import { secondStepMissing, type Scope } from './roles';

/**
 * The signed-in official, as their account stands now: a platform account
 * that has since been disabled signs nobody in, and a changed role or
 * institution applies at once (the session carries what it was at sign-in).
 */
export async function currentOfficial(): Promise<OfficialClaims | null> {
  let token: string | undefined;
  try { token = cookies().get(OFFICIAL_COOKIE)?.value; } catch { return null; }
  const c = await verifyToken(token, sessionSecret());
  if (!c || c.method !== 'local') return c;
  const a = accountById(c.sub.slice('local:'.length));
  if (!a || a.disabled) return null;
  // A session issued before the password last changed no longer counts.
  if (a.passwordChangedAt && c.iat < Math.floor(Date.parse(a.passwordChangedAt) / 1000)) return null;
  return { ...c, name: a.name, office: a.office, role: a.role, institution: a.institution,
    twoStep: !!c.twoStep && !!a.twoStepSince, twoStepRequired: a.twoStepRequired };
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
  res.cookies.set(OFFICIAL_COOKIE, await signClaims(claims, sessionSecret()), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600, secure,
  });
  // The console's page gate (middleware) also accepts the official's session.
  res.cookies.set('civicos_session', 'official', { sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600 });
  return res;
}
