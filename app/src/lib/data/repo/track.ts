// Which stores were used, for the postgres backend's per-record documents
// (lib/data/repo/documents.ts, architecture review R6, D2). Every store's
// accessor passes its object through `touch()`, and a store captured at
// module level is wrapped once in `tracked()`; with CIVICOS_STATE=postgres the
// backend then compares only the stores used since it last wrote (and every
// store on a slower sweep), instead of re-encoding the whole state on every
// change. In memory, file and supabase modes nothing listens and both are free.
//
// `onFollow()` lets a store re-derive what it computes from its records
// (the nation registry from the profile, say) after another instance's
// change was applied to it.
//
// No imports: the stores that call it run in the edge middleware too.

type Hook = (key: string, store: unknown) => void;
const g = globalThis as unknown as { __recordTrack?: Hook; __recordFollow?: Map<string, (() => void)[]> };

/** Note that a store was used (read or changed); returns it unchanged. */
export function touch<T>(key: string, store: T): T {
  g.__recordTrack?.(key, store);
  return store;
}

/** A store object held at module level: every property read notes the store as used. */
export function tracked<T extends object>(key: string, store: T): T {
  if (store instanceof Map) {
    return new Proxy(store, {
      get(t, p) {
        g.__recordTrack?.(key, t);
        const v = Reflect.get(t, p, t) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
      },
    });
  }
  return new Proxy(store, {
    get(t, p, r) { g.__recordTrack?.(key, t); return Reflect.get(t, p, r) as unknown; },
  });
}

/** Run `fn` after another instance's change to the store `key` was applied here. */
export function onFollow(key: string, fn: () => void): void {
  const m = (g.__recordFollow ??= new Map());
  const list = m.get(key) ?? [];
  if (!list.includes(fn)) list.push(fn);
  m.set(key, list);
}

/** The backend listens (or stops listening, with undefined). */
export function listenForUse(hook: Hook | undefined): void { g.__recordTrack = hook; }

/** Tell the store `key` that another instance's change reached it; returns the errors its hooks threw. */
export function followed(key: string): Error[] {
  const errors: Error[] = [];
  for (const fn of g.__recordFollow?.get(key) ?? []) {
    try { fn(); } catch (e) { errors.push(e as Error); }
  }
  return errors;
}
