// lib/format — small display helpers shared across surfaces.
//
// Pure, no imports. Used for relative time labels, duration strings,
// and consistent ISO truncation.

/** "5m ago" / "2h ago" / "yesterday" / "Mar 14" for a recent timestamp. */
export function relativeTime(ms: number, now = Date.now()): string {
  const dt = now - ms;
  if (dt < 0) return formatAbs(ms);
  const m = Math.floor(dt / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return formatAbs(ms);
}

function formatAbs(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "0m" / "2h 14m" / "3d" for a positive duration in ms. */
export function duration(ms: number): string {
  if (ms <= 0) return '0m';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

/** Strict ISO truncation to seconds. */
export function isoSeconds(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19) + 'Z';
}
