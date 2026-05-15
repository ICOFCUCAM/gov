import { createHash } from 'node:crypto';

/**
 * Tamper-evident hash chaining for receipts and audit events.
 * hash_n = sha256(prevHash || canonical(payload) || seq)
 * A verifier replays the chain; any altered/removed row breaks the chain.
 */
export function chainHash(
  prevHash: string | null,
  payload: unknown,
  seq: number,
): string {
  const canonical = stableStringify(payload);
  return createHash('sha256')
    .update(`${prevHash ?? 'GENESIS'}|${canonical}|${seq}`)
    .digest('hex');
}

export function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Deterministic JSON (sorted keys) so hashes are reproducible. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}
