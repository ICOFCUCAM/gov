// Checking a signed JSON Web Token (RFC 7515 compact JWS, RFC 7519) against
// a provider's published keys (RFC 7517 JWKS): what an OpenID Connect ID
// token needs and nothing more. Asymmetric algorithms only — "none" and the
// HMAC family are refused whatever the token's header says, so a token can
// never pick a weaker check. Pure; the provider's keys are fetched by
// lib/auth/oidc.ts through the platform's safe fetch.

import { createPublicKey, verify, type JsonWebKey, type KeyObject } from 'node:crypto';

export const ACCEPTED_ALGS = ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512', 'EdDSA'] as const;
export type JwsAlg = (typeof ACCEPTED_ALGS)[number];
export const isAcceptedAlg = (a: unknown): a is JwsAlg => (ACCEPTED_ALGS as readonly string[]).includes(a as string);

export interface Jwk extends JsonWebKey { kid?: string; use?: string; alg?: string; key_ops?: string[] }
export interface Jwks { keys: Jwk[] }

export class JwsError extends Error {}

const json = (part: string): Record<string, unknown> => {
  try {
    const v = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v as Record<string, unknown>;
  } catch { throw new JwsError('The token is not well formed'); }
};

export function decodeJws(token: string): { header: Record<string, unknown>; payload: Record<string, unknown>; signingInput: Buffer; signature: Buffer } {
  if (typeof token !== 'string' || token.length > 16_384) throw new JwsError('The token is missing or too long');
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]*$/.test(p))) throw new JwsError('The token is not a compact JWS');
  return { header: json(parts[0]!), payload: json(parts[1]!), signingInput: Buffer.from(`${parts[0]}.${parts[1]}`, 'ascii'), signature: Buffer.from(parts[2]!, 'base64url') };
}

const KTY: Record<string, string> = { RS: 'RSA', PS: 'RSA', ES: 'EC', Ed: 'OKP' };
const CRV: Record<string, string> = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' };

/** The provider key a token names (by kid, else the only key of the right type). Null when none fits. */
export function pickKey(jwks: Jwks, alg: JwsAlg, kid: unknown): Jwk | null {
  const fits = (k: Jwk) => k.kty === KTY[alg.slice(0, 2)] && (k.use === undefined || k.use === 'sig')
    && (k.alg === undefined || k.alg === alg) && (!CRV[alg] || k.crv === CRV[alg]) && (alg !== 'EdDSA' || k.crv === 'Ed25519' || k.crv === 'Ed448')
    && (!k.key_ops || k.key_ops.includes('verify'));
  const keys = (Array.isArray(jwks?.keys) ? jwks.keys : []).filter(fits);
  if (typeof kid === 'string') return keys.find(k => k.kid === kid) ?? null;
  return keys.length === 1 ? keys[0]! : null;
}

function keyObject(jwk: Jwk): KeyObject {
  // Only the public members: a JWKS that carried private parts is not trusted with them.
  const { kty, n, e, crv, x, y } = jwk;
  const k = createPublicKey({ key: { kty, n, e, crv, x, y } as JsonWebKey, format: 'jwk' });
  if (k.asymmetricKeyType === 'rsa' && (k.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new JwsError('The provider\'s RSA key is shorter than 2048 bits');
  return k;
}

/** Verify the signature of a token with the provider's key; throws when it does not hold. */
export function verifyJws(token: string, jwks: Jwks, allowed: readonly JwsAlg[]): { header: Record<string, unknown>; payload: Record<string, unknown> } {
  const d = decodeJws(token);
  const alg = d.header.alg;
  if (!isAcceptedAlg(alg) || !allowed.includes(alg)) throw new JwsError(`The token's algorithm ${String(alg)} is not accepted`);
  if (d.header.crit !== undefined) throw new JwsError('The token has critical header extensions this platform does not understand');
  const jwk = pickKey(jwks, alg, d.header.kid);
  if (!jwk) throw new JwsError('No key of the provider matches this token');
  const key = keyObject(jwk);
  const hash = alg === 'EdDSA' ? null : `sha${alg.slice(2)}`;
  let ok = false;
  try {
    if (alg.startsWith('PS')) ok = verify(hash, d.signingInput, { key, padding: 6 /* RSA_PKCS1_PSS_PADDING */, saltLength: Number(alg.slice(2)) / 8 }, d.signature);
    else if (alg.startsWith('ES')) ok = verify(hash, d.signingInput, { key, dsaEncoding: 'ieee-p1363' }, d.signature);
    else ok = verify(hash, d.signingInput, key, d.signature);
  } catch { ok = false; }
  if (!ok) throw new JwsError('The token\'s signature does not verify');
  return { header: d.header, payload: d.payload };
}
