// Per-device "seen" set for alert ids. localStorage-backed; lets the
// NotificationsBell count down when an operator acknowledges noise
// without mutating substrate state. Bounded at 500 entries with
// trim-from-oldest semantics.

const KEY_PREFIX = 'civicos.seen.';
const MAX = 500;
const listeners = new Set<() => void>();

function safeWindow(): Window | null { return typeof window === 'undefined' ? null : window; }
function keyFor(actorId: string | null) { return KEY_PREFIX + (actorId ?? 'anon'); }

function read(actorId: string | null): { id: string; at: number }[] {
  const w = safeWindow(); if (!w) return [];
  try {
    const raw = w.localStorage.getItem(keyFor(actorId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as { id: string; at: number }[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function write(actorId: string | null, list: { id: string; at: number }[]): void {
  const w = safeWindow(); if (!w) return;
  try {
    w.localStorage.setItem(keyFor(actorId), JSON.stringify(list.slice(-MAX)));
    for (const l of listeners) l();
  } catch { /* quota */ }
}

export function isSeen(actorId: string | null, id: string): boolean {
  return read(actorId).some(e => e.id === id);
}

export function markSeen(actorId: string | null, ids: string[]): void {
  if (ids.length === 0) return;
  const cur = read(actorId);
  const have = new Set(cur.map(e => e.id));
  const at = Date.now();
  for (const id of ids) if (!have.has(id)) cur.push({ id, at });
  write(actorId, cur);
}

export function clearSeen(actorId: string | null): void {
  write(actorId, []);
}

export function subscribeSeen(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
