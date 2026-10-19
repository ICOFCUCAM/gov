// Defaults for stores restored from a snapshot saved before the store
// gained fields (architecture review C5; CLAUDE.md "Durable state").
//
// A shallow `{ ...seed(), ...saved }` gives new top-level fields their
// defaults but not new fields inside nested objects. `withDefaults` fills
// every missing field, at any depth, from the seed — and never overwrites
// a saved value. Lists are records and stay as saved. Dictionaries keyed by
// data (a queue per ministry, a count per tenant) are named `opaque`: a
// missing dictionary gets the seed's, but the seed's sample entries are
// never merged into a saved one.

const plain = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Map) && !(v instanceof Set) && !(v instanceof Date);

export function withDefaults<T extends Record<string, unknown>>(saved: Partial<T> | undefined | null, seed: T, opts: { opaque?: (keyof T & string)[] } = {}): T {
  if (!plain(saved)) return seed;
  const opaque = new Set<string>(opts.opaque ?? []);
  const fill = (s: Record<string, unknown>, d: Record<string, unknown>, top: boolean): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...s };
    for (const [k, dv] of Object.entries(d)) {
      if (out[k] === undefined) { out[k] = dv; continue; }
      if (top && opaque.has(k)) continue;
      if (plain(out[k]) && plain(dv)) out[k] = fill(out[k] as Record<string, unknown>, dv, false);
    }
    return out;
  };
  return fill(saved as Record<string, unknown>, seed, true) as T;
}
