// A request's durable writes finish with the request (wiring audit §13,
// register 18.37).
//
// With CIVICOS_STATE=postgres every change is queued and written by a flush the
// event loop runs a moment later (lib/data/repo/postgres.ts), changes made
// without an audit entry by a 1 s timer, and other instances' commits arrive by
// LISTEN or a 2 s poll. On a long-running server that is enough. On a serverless
// host (Vercel) nothing runs between requests: the function can be frozen with
// a change still in memory, and the next request can land on an instance that
// has not pulled it yet.
//
// So every route handler is wrapped (at build, by scripts/durable-route-loader.cjs;
// the route files are not edited one by one):
//   - before the handler, an instance whose last pull is older than a few
//     hundred milliseconds pulls first, for a bounded time, when other
//     instances' commits reach it only by the poll (behind a transaction pooler);
//   - a changing request (POST, PUT, PATCH, DELETE) writes its changes before
//     its response is returned: the queue and the stores used, in one
//     transaction, committed (or a timeout, after which they stay queued,
//     journaled and retried). A following read on any instance then finds them
//     in the tables at its next pull. Next.js's `after()` alone would only keep
//     the function alive after the response, so a read sent at once could
//     still miss the change; awaiting before returning closes that window.
//   - a reading request that changed something anyway (a store seeded on first
//     use) has it written after its response on a serverless host, kept alive
//     by `after()` (waitUntil on Vercel), so reads are not slowed.
// The middleware cannot do this: it ends before the route runs.
//
// The hooks are installed by lib/data/persist.ts only when there is something to
// write (postgres, or snapshot modes on a serverless host). In memory and file
// modes on a long-running server, and in tests, no hook is installed and the
// wrapper only calls the handler.

import { after } from 'next/server';

export interface SettleHook {
  /** Before the handler: pull other instances' changes first when this instance is stale. */
  before(method: string): Promise<void>;
  /** After a changing request's handler: write its changes; false when not written in time. */
  settle(): Promise<boolean>;
  /** After a reading request: something still waits to be written (then written after the response). */
  pending(): boolean;
}

const g = globalThis as unknown as { __recordSettle?: SettleHook };

/** The methods that change state: their writes are committed before the response. */
export const CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Install the hooks (persist.ts at start), or remove them (undefined). */
export function installSettle(hook: SettleHook | undefined): void { g.__recordSettle = hook; }
export const settleHook = (): SettleHook | undefined => g.__recordSettle;

/** Run `fn` after the response while keeping the function alive; outside a request it runs now. */
function afterResponse(fn: () => Promise<unknown>): void {
  try { after(() => fn().then(() => undefined, () => undefined)); }
  catch { void fn().catch(() => undefined); }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any route handler's signature
type Handler = (...args: any[]) => unknown;

/** A route handler whose request finishes its durable writes (see above). */
export function durableRoute<H>(method: string, handler: H): H {
  if (typeof handler !== 'function') return handler;
  const run = handler as unknown as Handler;
  const changes = CHANGING.has(method);
  const wrapped = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
    const hook = g.__recordSettle;
    if (!hook || method === 'OPTIONS') return run.apply(this, args);
    try { await hook.before(method); } catch { /* a stale read is better than none */ }
    try {
      return await run.apply(this, args);
    } finally {
      if (changes) {
        // Written before the response; a timeout leaves the changes queued and keeps the function alive for the retry.
        const ok = await hook.settle().catch(() => false);
        if (!ok) afterResponse(() => hook.settle());
      } else if (hook.pending()) {
        afterResponse(() => hook.settle());
      }
    }
  };
  Object.defineProperty(wrapped, 'name', { value: run.name || method });
  return wrapped as unknown as H;
}
