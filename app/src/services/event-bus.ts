// Sovereign Event Bus — shared federation service.
//
// Federated institutional applications and the platform core communicate
// through a single sovereign event bus rather than direct imports. Apps
// publish operational events (provisioned, activated, escalation, metric
// emission); the platform core and other apps subscribe. Pure runtime
// singleton; no React/DOM.

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
