// Passkey ceremonies' server side (WebAuthn; verification in
// lib/auth/webauthn.ts, credentials on the official's account in
// lib/auth/officials.ts): the relying party (the platform's own origin,
// CIVICOS_PUBLIC_URL, whose host is the passkeys' rpId), challenges (32
// random bytes, five minutes, used once, bound to the account they were
// issued for) and the options the browser is given.

import { randomBytes, randomUUID } from 'node:crypto';
import { platformOrigin, prune, signOnDb, type Challenge } from './sign-on-store';
import { SUPPORTED_ALGS } from './webauthn';
import { getSovereign } from '@/lib/data/store';

export interface RelyingParty { rpId: string; origin: string; name: string }

const CHALLENGE_MS = 5 * 60_000;

/** The relying party for this installation, or why passkeys are not available yet. */
export function relyingParty(requestOrigin?: string, env: NodeJS.ProcessEnv = process.env): RelyingParty | { error: string } {
  const o = platformOrigin(requestOrigin, env);
  if ('error' in o) return o;
  let name = 'Government';
  try { name = getSovereign().stateName || name; } catch { /* profile not loaded */ }
  return { rpId: o.host, origin: o.origin, name };
}

export function newChallenge(purpose: Challenge['purpose'], accountId: string | undefined, now = Date.now()): Challenge {
  const d = signOnDb();
  prune(d, now);
  // A cap, so unauthenticated sign-in requests cannot grow the store without bound.
  const open = Object.values(d.challenges);
  if (open.length >= 5000) for (const c of open.sort((a, b) => a.expiresAt - b.expiresAt).slice(0, open.length - 4999)) delete d.challenges[c.id];
  const c: Challenge = { id: randomUUID(), challenge: randomBytes(32).toString('base64url'), purpose, ...(accountId ? { accountId } : {}), expiresAt: now + CHALLENGE_MS };
  d.challenges[c.id] = c;
  return c;
}

/** The challenge, once: removed whatever the outcome; null when unknown, expired, for another purpose or another account. */
export function takeChallenge(id: string, purpose: Challenge['purpose'], accountId: string | undefined, now = Date.now()): Challenge | null {
  const d = signOnDb();
  const c = d.challenges[id];
  if (!c) return null;
  delete d.challenges[id];
  if (c.expiresAt < now || c.purpose !== purpose || c.accountId !== accountId) return null;
  return c;
}

type Cred = { id: string; transports: string[] };

/** PublicKeyCredentialCreationOptions (as JSON; the page turns the base64url fields into bytes). */
export function creationOptions(c: Challenge, rp: RelyingParty, user: { id: string; name: string; displayName: string }, exclude: Cred[]) {
  return {
    challengeId: c.id,
    publicKey: {
      challenge: c.challenge,
      rp: { id: rp.rpId, name: rp.name },
      user,
      pubKeyCredParams: SUPPORTED_ALGS.map(alg => ({ type: 'public-key' as const, alg })),
      timeout: CHALLENGE_MS,
      attestation: 'none' as const,
      authenticatorSelection: { residentKey: 'preferred' as const, userVerification: 'preferred' as const },
      excludeCredentials: exclude.map(x => ({ type: 'public-key' as const, id: x.id, transports: x.transports })),
    },
  };
}

/** PublicKeyCredentialRequestOptions (as JSON). */
export function requestOptions(c: Challenge, rp: RelyingParty, allow: Cred[], userVerification: 'required' | 'preferred') {
  return {
    challengeId: c.id,
    publicKey: {
      challenge: c.challenge,
      rpId: rp.rpId,
      timeout: CHALLENGE_MS,
      userVerification,
      allowCredentials: allow.map(x => ({ type: 'public-key' as const, id: x.id, transports: x.transports })),
    },
  };
}
