// The JSON encoding of platform state that keeps Maps, Sets and Dates (tagged
// as {$map}, {$set}, {$date}). Shared by the snapshots (lib/data/persist.ts)
// and the per-record documents of the postgres backend
// (lib/data/repo/documents.ts), so a record reads back the same either way.

type Tagged = { $map: [unknown, unknown][] } | { $set: unknown[] } | { $date: string };
function replacer(this: unknown, k: string, v: unknown): unknown {
  const raw = (this as Record<string, unknown>)[k];
  if (raw instanceof Map) return { $map: [...raw.entries()] };
  if (raw instanceof Set) return { $set: [...raw.values()] };
  if (raw instanceof Date) return { $date: raw.toISOString() };
  return v;
}
function reviver(_k: string, v: unknown): unknown {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const t = v as Tagged;
    if ('$map' in t && Array.isArray(t.$map)) return new Map(t.$map);
    if ('$set' in t && Array.isArray(t.$set)) return new Set(t.$set);
    if ('$date' in t && typeof t.$date === 'string' && Object.keys(t).length === 1) return new Date(t.$date);
  }
  return v;
}
export const encode = (value: unknown): string => JSON.stringify(value, replacer);
export const decode = (json: string): unknown => JSON.parse(json, reviver);
