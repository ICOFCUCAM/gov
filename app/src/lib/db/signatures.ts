// lib/db/signatures — transition signatures.
//
// Two-tier signing:
//   1. Preferred: ECDSA P-256 over the canonical 5-tuple, computed by
//      WebCrypto with a per-device private key held in IndexedDB. The
//      signature_hash recorded in the substrate is the hex-encoded raw
//      signature; offline auditors verify against the officer's
//      registered public JWK.
//   2. Fallback: an FNV-1a tamper digest of the same canonical
//      material. Used when WebCrypto isn't available (SSR, no key
//      generated yet) or for non-officer actors. The digest is
//      tamper-evident but not identity-proof.
//
// Both signers produce a stable hex string so the column shape is
// identical. The audit reader can detect which one was used by length
// (ECDSA signatures are 128 hex chars; FNV-1a is 8).

import { signMessage } from '@/lib/db/webcrypto';

function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Canonical material — the exact string that gets signed/digested.
 *  Anyone with the same canonical view can re-derive it. */
export function canonicalSignatureMaterial(
  actorId: string, scope: string, ref: string, action: string, atMs: number,
): string {
  return `${actorId}|${scope}|${ref}|${action}|${atMs}`;
}

export interface SignatureResult {
  hash: string;
  at: number;
  algorithm: 'ecdsa-p256' | 'fnv1a';
}

/** Compute the transition signature for a step. Tries WebCrypto first;
 *  falls back to the FNV-1a digest. Returns null if no actor_id. */
export async function transitionSignature(opts: {
  actorId: string | null;
  scope: string;
  ref: string;
  action: string;
  at?: number;
}): Promise<SignatureResult | null> {
  if (!opts.actorId) return null;
  const at = opts.at ?? Date.now();
  const material = canonicalSignatureMaterial(opts.actorId, opts.scope, opts.ref, opts.action, at);

  const ecdsa = await signMessage(material);
  if (ecdsa) return { hash: ecdsa, at, algorithm: 'ecdsa-p256' };

  return { hash: fnv1aHex(material), at, algorithm: 'fnv1a' };
}

/** Synchronous FNV-1a digest (legacy callers and verification paths). */
export function transitionDigest(opts: {
  actorId: string;
  scope: string;
  ref: string;
  action: string;
  at?: number;
}): { hash: string; at: number } {
  const at = opts.at ?? Date.now();
  return {
    hash: fnv1aHex(canonicalSignatureMaterial(opts.actorId, opts.scope, opts.ref, opts.action, at)),
    at,
  };
}
