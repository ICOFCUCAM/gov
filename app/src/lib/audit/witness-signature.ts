// Checking audit-chain witness attestations on the server (go-live review H-1).
//
// A witness signs `scope|seq|hash|label` (canonicalWitnessMaterial,
// lib/db/signatures.ts) with its own key: ECDSA P-256 / SHA-256 from a
// browser device key (lib/db/webcrypto.ts, raw r||s), or Ed25519 for the
// platform's own self-witness (the audit signing key, lib/keys/custody.ts).
// Both signatures are 64 bytes, carried as 128 lowercase hex characters.
//
// The substrate stores an attestation only for a key registered for that
// witness label (civicos.audit_witness_keys, registered by an administrator)
// and only through the platform (service role). The platform verifies the
// signature here before it records, and the divergence watchdog verifies it
// again before it trusts a row.

import { createPublicKey, verify as nodeVerify } from 'node:crypto';
import { canonicalWitnessMaterial } from '@/lib/db/signatures';

export interface WitnessJwk { kty?: string; crv?: string; x?: string; y?: string; d?: string; [k: string]: unknown }

/** The identity of a public key (same rule as civicos.witness_key_fingerprint). Null when unsupported. */
export function witnessKeyFingerprint(jwk: unknown): string | null {
  if (!jwk || typeof jwk !== 'object' || Array.isArray(jwk)) return null;
  const k = jwk as WitnessJwk;
  if (k.kty === 'EC' && k.crv === 'P-256' && typeof k.x === 'string' && k.x && typeof k.y === 'string' && k.y) return `EC|P-256|${k.x}|${k.y}`;
  if (k.kty === 'OKP' && k.crv === 'Ed25519' && typeof k.x === 'string' && k.x) return `OKP|Ed25519|${k.x}`;
  return null;
}

/** Only the public members of a supported key (never a private `d`). */
export function publicWitnessJwk(jwk: WitnessJwk): WitnessJwk {
  return jwk.kty === 'EC' ? { kty: 'EC', crv: jwk.crv, x: jwk.x, y: jwk.y } : { kty: 'OKP', crv: jwk.crv, x: jwk.x };
}

export const SIGNATURE_HEX = /^[0-9a-f]{128}$/;

export interface WitnessStatement { scope: string; observedSeq: number; observedHash: string; witnessLabel: string }

/** True when `signatureHex` is a valid signature of the statement by `jwk`. Never throws. */
export function verifyWitnessStatement(jwk: unknown, statement: WitnessStatement, signatureHex: string): boolean {
  const fp = witnessKeyFingerprint(jwk);
  if (!fp || typeof signatureHex !== 'string' || !SIGNATURE_HEX.test(signatureHex)) return false;
  try {
    const key = createPublicKey({ key: publicWitnessJwk(jwk as WitnessJwk) as import('node:crypto').JsonWebKey, format: 'jwk' });
    const data = Buffer.from(canonicalWitnessMaterial(statement.scope, statement.observedSeq, statement.observedHash, statement.witnessLabel), 'utf8');
    const sig = Buffer.from(signatureHex, 'hex');
    if (fp.startsWith('EC|')) return nodeVerify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, sig);
    return nodeVerify(null, data, key, sig);
  } catch {
    return false;
  }
}

/** Ed25519 SPKI PEM → public JWK (the platform's self-witness key). */
export function jwkFromPublicPem(pem: string): WitnessJwk {
  const jwk = createPublicKey(pem).export({ format: 'jwk' }) as WitnessJwk;
  return publicWitnessJwk(jwk);
}

/** Base64 signature (lib/keys/custody.ts) → the 128-hex form attestations carry. */
export const base64ToHex = (b64: string): string => Buffer.from(b64, 'base64').toString('hex');
