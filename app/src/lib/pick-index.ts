// Deterministic index picker — the same string always maps to the same
// slot of a list of `len`. Used to choose which facility an instance is
// bound to so a surface and its counterpart resolve the SAME institution.
// One implementation prevents the hash from drifting between call sites.

export function pickIndex(key: string, len: number, seed = 9): number {
  if (len <= 0) return 0;
  const h = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, seed);
  return Math.abs(h) % len;
}
