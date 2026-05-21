// lib/db/signatures — transition signatures.
//
// Produces a per-transition digest that the substrate stores alongside
// a step record when requires_signature=true. The digest is derived
// from the canonical 5-tuple (actor_id, scope, ref, action, at_ms),
// hashed with the same FNV-1a 32-bit function the audit chain uses,
// so the in-memory and DB digests stay byte-identical.
//
// This is NOT a cryptographic signature. It is a tamper-evident
// derivation: any change to the underlying tuple invalidates the
// digest, but the digest doesn't prove identity beyond what the
// substrate already knows (auth.uid() and the SECURITY DEFINER override).
//
// Production-grade signing should layer WebCrypto ECDSA P-256 on top:
// the client signs the canonical message with a per-officer private key
// held in IndexedDB, and the substrate stores the signature alongside
// the public key for offline auditor verification. The current shape
// already has the right column (work_item_steps.signature_hash) for
// that upgrade.

function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Canonical material the substrate would re-derive to verify a signature.
 *  Format is `<actor>|<scope>|<ref>|<action>|<at_ms>` — same separator and
 *  layout as the audit chain digest, so any reader who knows the function
 *  can verify the link. */
export function canonicalSignatureMaterial(
  actorId: string, scope: string, ref: string, action: string, atMs: number,
): string {
  return `${actorId}|${scope}|${ref}|${action}|${atMs}`;
}

/** Compute the transition signature for a step. Returns null when no
 *  identifying material is available — callers should not record an
 *  unsigned signature_hash. */
export function transitionSignature(opts: {
  actorId: string | null;
  scope: string;
  ref: string;
  action: string;
  at?: number;
}): { hash: string; at: number } | null {
  if (!opts.actorId) return null;
  const at = opts.at ?? Date.now();
  const hash = fnv1aHex(
    canonicalSignatureMaterial(opts.actorId, opts.scope, opts.ref, opts.action, at),
  );
  return { hash, at };
}
