// The verified official of the current request (route handlers only).
// Routes that record who acted pass their parsed body through withOfficial():
// when someone is signed in, their verified name replaces whatever name the
// request carried, so neither the audit chain nor a four-eyes check can be
// given a typed-in name. Without a signed-in official the body is unchanged
// (declared names, as before); with CIVICOS_AUTH=enforce the middleware
// refuses such changes before they get here.

import { cookies } from 'next/headers';
import { OFFICIAL_COOKIE, verifyToken, type OfficialClaims } from './session-token';
import { sessionSecret } from './officials';

export async function currentOfficial(): Promise<OfficialClaims | null> {
  let token: string | undefined;
  try { token = cookies().get(OFFICIAL_COOKIE)?.value; } catch { return null; }
  return verifyToken(token, sessionSecret());
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
