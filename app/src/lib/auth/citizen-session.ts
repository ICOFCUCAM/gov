// The citizen's session (docs/GOVERNMENT_OPERATING_MODEL.md §10.1, directions
// 8.9-8.10): set after the nation's identity provider signed the citizen in
// (lib/auth/citizen-oidc.ts), signed with a key derived from the session
// secret for citizens only, so a citizen's token can never pass as an
// official's (and the reverse). It says who the provider says the person is;
// what they may do is decided by the platform (their own applications,
// delegations). No imports beyond the token helpers: the middleware reads it.

import { signClaims, verifyToken, type OfficialClaims } from './session-token';

export const CITIZEN_COOKIE = 'civicos_citizen';
export const CITIZEN_SESSION_HOURS = 4;

export interface CitizenClaims { sub: string; name: string; issuer: string; iat: number; exp: number; assurance?: string }

const citizenKey = (secret: string) => `${secret}\u0000citizen-session`;

export async function signCitizen(c: CitizenClaims, secret: string): Promise<string> {
  return signClaims({ sub: `citizen:${c.sub}`, name: c.name, method: 'local', role: undefined, iat: c.iat, exp: c.exp, office: c.issuer, ...(c.assurance ? { institution: `acr:${c.assurance}` } : {}) } as OfficialClaims, citizenKey(secret));
}

export async function verifyCitizen(token: string | undefined | null, secret: string | undefined, now = Date.now()): Promise<CitizenClaims | null> {
  if (!secret) return null;
  const c = await verifyToken(token, citizenKey(secret), now);
  if (!c || !c.sub.startsWith('citizen:')) return null;
  return { sub: c.sub.slice('citizen:'.length), name: c.name, issuer: c.office ?? '', iat: c.iat, exp: c.exp, ...(c.institution?.startsWith('acr:') ? { assurance: c.institution.slice(4) } : {}) };
}
