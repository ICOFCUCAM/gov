// Sovereign Event Bus — shared federation service.
//
// Federated institutional applications and the platform core communicate
// through a single sovereign event bus rather than direct imports. Apps
// publish operational events (provisioned, activated, escalation, metric
// emission); the platform core and other apps subscribe.
//
// Architecture: in-memory ring (500 events) for synchronous UI snapshots,
// plus an async dual-write to civicos.federation_events via the
// publish_event RPC. The DB is the canonical, durable record across
// processes/sessions; the in-memory log is the fast read-path. When the
// substrate isn't configured, the bus operates memory-only.

import { publishEventRow, recentEventsRows, substrateAvailable } from '@/lib/db/repos/events';

export type SovereignEventType =
  | 'app.registered'
  | 'app.activated'
  | 'app.deactivated'
  | 'institution.escalation'
  | 'institution.metric'
  | 'runtime.transition'
  | 'constitutional.signal';

export interface SovereignEvent<P = unknown> {
  type: SovereignEventType;
  source: string;          // app/service id
  at: number;
  payload: P;
}

type Handler = (e: SovereignEvent) => void;

// Routing channel inferred from event type — the substrate uses `channel`
// as the federation routing key, distinct from the granular `type`.
function channelFor(t: SovereignEventType): string {
  switch (t) {
    case 'app.registered':
    case 'app.activated':
    case 'app.deactivated':
      return 'lifecycle';
    case 'institution.escalation':
      return 'escalation';
    case 'institution.metric':
      return 'metric';
    case 'runtime.transition':
      return 'runtime';
    case 'constitutional.signal':
      return 'constitutional';
  }
}

const handlers = new Map<SovereignEventType | '*', Set<Handler>>();
const log: SovereignEvent[] = [];
let _version = 0;
const verListeners = new Set<() => void>();
/** Stable snapshot for useSyncExternalStore — changes only on publish. */
export function version(): number { return _version; }
export function subscribeBus(l: () => void): () => void {
  verListeners.add(l);
  return () => verListeners.delete(l);
}

export function publish<P>(type: SovereignEventType, source: string, payload: P): void {
  const e: SovereignEvent<P> = { type, source, at: Date.now(), payload };
  log.unshift(e as SovereignEvent);
  if (log.length > 500) log.length = 500;
  _version++;
  for (const l of verListeners) l();
  for (const h of handlers.get(type) ?? []) h(e as SovereignEvent);
  for (const h of handlers.get('*') ?? []) h(e as SovereignEvent);

  // Persist if substrate is wired — fire and forget. Payload must be
  // jsonb-serialisable; pass through as a plain record.
  if (substrateAvailable()) {
    const channel = channelFor(type);
    const jsonPayload =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : { value: payload as unknown };
    void publishEventRow(type, source, channel, jsonPayload).catch(() => {
      // Persistence is best-effort; in-memory log remains authoritative
      // for the current session.
    });
  }
}

export function subscribe(type: SovereignEventType | '*', handler: Handler): () => void {
  let set = handlers.get(type);
  if (!set) { set = new Set(); handlers.set(type, set); }
  set.add(handler);
  return () => { set!.delete(handler); };
}

export function eventLog(limit = 100, type?: SovereignEventType): SovereignEvent[] {
  const src = type ? log.filter(e => e.type === type) : log;
  return src.slice(0, limit);
}

export function eventStats() {
  const byType: Record<string, number> = {};
  for (const e of log) byType[e.type] = (byType[e.type] ?? 0) + 1;
  return { total: log.length, byType };
}

// ── Persistent reconciliation ─────────────────────────────────────────
// Hydrate the in-memory ring from the canonical DB log. Use at mount time
// to display history beyond the current process's memory.
export async function hydrateEventLog(limit = 200): Promise<number> {
  if (!substrateAvailable()) return 0;
  const rows = await recentEventsRows({ limit });
  if (rows.length === 0) return 0;
  log.length = 0;
  // Rows arrive newest-first, which matches the in-memory convention.
  for (const r of rows) {
    if (!isSovereignType(r.type)) continue;
    log.push({ type: r.type, source: r.source, at: r.at, payload: r.payload });
  }
  _version++;
  for (const l of verListeners) l();
  return log.length;
}

function isSovereignType(t: string): t is SovereignEventType {
  return t === 'app.registered' || t === 'app.activated' || t === 'app.deactivated'
    || t === 'institution.escalation' || t === 'institution.metric'
    || t === 'runtime.transition' || t === 'constitutional.signal';
}

/** Reset (tests only). */
export function __resetBus(): void {
  log.length = 0;
  handlers.clear();
  _version = 0;
}
