// Record numbers (PREFIX-YYYY-NNNNNN) for registers whose numbers are given
// to people and printed on certificates, bills and notices: a taxpayer
// number, a qualification, a registration. Each comes from one numeric
// counter field of its store, named `…Seq` so that the postgres backend
// reserves it in blocks in civicos.record_counter (two instances never give
// the same number) and a restore never takes it back (lib/backup/state.ts).
// The number after the year keeps rising across years, so a number once given
// is never given again.

/** The highest number an earlier per-year counter map gave for a prefix (snapshots saved before numeric counters). */
export function legacyMax(seq: Record<string, number> | undefined, prefix = ''): number {
  return Object.entries(seq ?? {}).filter(([k]) => k.startsWith(prefix) || (!prefix && /^\d{4}$/.test(k))).reduce((m, [, v]) => Math.max(m, Number(v) || 0), 0);
}

/**
 * Raise a counter so no number in `numbers` (PREFIX-YYYY-NNNNNN) is given
 * again: an institution's records brought in from its own export keep their
 * numbers (lib/portability/import.ts).
 */
export function raiseCounter(store: Record<string, unknown>, field: string, numbers: string[]): void {
  if (!/Seq$/.test(field)) throw new Error(`A record counter is named …Seq (${field})`);
  const top = numbers.reduce((m, n) => Math.max(m, Number(/-(\d+)$/.exec(n)?.[1] ?? 0)), 0);
  store[field] = Math.max(Number(store[field]) || 0, top);
}

/** The next number: increments the store's counter field and formats it with the year. */
export function nextNumber(store: Record<string, unknown>, field: string, prefix: string, now: Date): string {
  if (!/Seq$/.test(field)) throw new Error(`A record counter is named …Seq (${field})`);
  const n = (Number(store[field]) || 0) + 1;
  store[field] = n;
  return `${prefix}-${now.getUTCFullYear()}-${String(n).padStart(6, '0')}`;
}
