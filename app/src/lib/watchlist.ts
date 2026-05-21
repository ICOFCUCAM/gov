// Watchlist — per-device, per-actor star/follow registry for substrate refs.
//
// Stores in localStorage keyed by auth.uid() (or 'anon'). Each entry is
// a typed (kind, ref, label) tuple; kind matches SearchHitKind so the
// hyperlink target can be reconstructed from the same routing rules the
// palette/search use.
//
// Pure, SSR-safe (no-op on the server), single-source-of-truth subscribe
// so React surfaces can render live counts.

export type WatchKind =
  | 'work-item' | 'directive' | 'dispatch' | 'escalation'
  | 'service-request' | 'appeal';

export interface WatchEntry {
  kind: WatchKind;
  ref: string;
  label: string;
  addedAt: number;
}

const KEY_PREFIX = 'civicos.watchlist.';
const listeners = new Set<() => void>();

function safeWindow(): Window | null {
  return typeof window === 'undefined' ? null : window;
}

function keyFor(actorId: string | null): string {
  return KEY_PREFIX + (actorId ?? 'anon');
}

function read(actorId: string | null): WatchEntry[] {
  const w = safeWindow(); if (!w) return [];
  try {
    const raw = w.localStorage.getItem(keyFor(actorId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as WatchEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function write(actorId: string | null, entries: WatchEntry[]): void {
  const w = safeWindow(); if (!w) return;
  try {
    w.localStorage.setItem(keyFor(actorId), JSON.stringify(entries.slice(0, 50)));
    for (const l of listeners) l();
  } catch { /* quota/storage unavailable — degrade gracefully */ }
}

export function listWatch(actorId: string | null): WatchEntry[] {
  return read(actorId).sort((a, b) => b.addedAt - a.addedAt);
}

export function isWatched(actorId: string | null, kind: WatchKind, ref: string): boolean {
  return read(actorId).some(e => e.kind === kind && e.ref === ref);
}

export function toggleWatch(actorId: string | null, e: { kind: WatchKind; ref: string; label: string }): boolean {
  const cur = read(actorId);
  const idx = cur.findIndex(x => x.kind === e.kind && x.ref === e.ref);
  if (idx >= 0) {
    cur.splice(idx, 1);
    write(actorId, cur);
    return false;
  } else {
    cur.unshift({ ...e, addedAt: Date.now() });
    write(actorId, cur);
    return true;
  }
}

export function subscribeWatch(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Routing rule — same as substrate search; keeps the watchlist links
 *  in sync if a future re-route ever lands. */
export function watchHref(e: WatchEntry): string {
  switch (e.kind) {
    case 'work-item':       return `/gov/items/${encodeURIComponent(e.ref)}`;
    case 'directive':       return `/gov/directives/${encodeURIComponent(e.ref)}`;
    case 'dispatch':        return `/gov/dispatches/${encodeURIComponent(e.ref)}`;
    case 'escalation':      return `/gov/escalations/${e.ref}`;
    case 'service-request': return `/gov/intake/request/${encodeURIComponent(e.ref)}`;
    case 'appeal':          return `/gov/intake/appeal/${encodeURIComponent(e.ref)}`;
  }
}
