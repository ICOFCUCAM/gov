// Deterministic citizen-facing reference codes (AGT-/CMP-/SHR-…). One
// implementation so every "we logged your request" surface produces the
// same, reproducible, collision-resistant id from the same inputs — the
// platform's no-randomness doctrine applied to support tickets.

export function civicRef(prefix: string, ...parts: (string | number)[]): string {
  const seed = `${prefix}:${parts.join('|')}`;
  const h = Math.abs([...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 1_000_000;
  return `${prefix}-${String(h).padStart(6, '0')}`;
}
