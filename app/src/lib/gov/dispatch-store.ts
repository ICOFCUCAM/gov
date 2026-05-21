'use client';

// Live inter-tier dispatch store — the platform was dashboards talking to
// nobody. This is a session-persistent communication bus between the
// bureaucratic tiers (actor ↔ facility ↔ ministry ↔ national): real
// messages/dispatches an operator can send and that persist across
// navigation, seeded with deterministic prior traffic so a channel is
// never empty. SSR-safe and inert under test (no window) so engine
// determinism is unaffected.

import { seed } from '@/lib/telemetry';
import { recordDispatchRow, substrateAvailable } from '@/lib/db/repos/memory';
import { resolvedActor } from '@/services/actor-resolver';

export type DispatchTier = 'ACTOR' | 'FACILITY' | 'MINISTRY' | 'NATIONAL';
export interface Dispatch {
  id: string;
  at: number;
  fromTier: DispatchTier;
  from: string;
  toTier: DispatchTier;
  body: string;
  priority: 'routine' | 'priority' | 'urgent';
  seeded?: boolean;
}

type Listener = () => void;
const channels = new Map<string, Dispatch[]>();
const listeners = new Set<Listener>();
let _version = 0;
let _hydrated = false;
const PERSIST_KEY = 'civicos.dispatch.v1';

export function version(): number { return _version; }
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function bump() { _version++; listeners.forEach(l => l()); persist(); }

function persist() {
  if (typeof window === 'undefined') return;
  try {
    const live = [...channels.entries()].map(([k, v]) => [k, v.filter(d => !d.seeded).slice(-40)] as const);
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(live));
  } catch { /* continuity degrades to session-only */ }
}
function hydrate() {
  if (_hydrated) return;
  _hydrated = true;
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as [string, Dispatch[]][];
    for (const [k, v] of parsed) if (Array.isArray(v)) channels.set(k, v);
  } catch { /* ignore corrupt continuity */ }
}

const SEED_LINES: { fromTier: DispatchTier; toTier: DispatchTier; body: string; priority: Dispatch['priority'] }[] = [
  { fromTier: 'FACILITY', toTier: 'ACTOR', body: 'Shift roster confirmed; capacity within tolerance.', priority: 'routine' },
  { fromTier: 'ACTOR', toTier: 'FACILITY', body: 'Record committed to facility registry — awaiting roll-up.', priority: 'routine' },
  { fromTier: 'MINISTRY', toTier: 'FACILITY', body: 'Quarterly compliance review scheduled; submit returns.', priority: 'priority' },
  { fromTier: 'FACILITY', toTier: 'MINISTRY', body: 'Throughput strained — requesting resource concurrence.', priority: 'priority' },
  { fromTier: 'NATIONAL', toTier: 'MINISTRY', body: 'National synchronisation nominal; continuity acknowledged.', priority: 'routine' },
];

/** Deterministic prior traffic so a channel is never empty. */
function seedChannel(scope: string, now: number): Dispatch[] {
  const n = 3 + Math.floor(seed(`disp:n:${scope}`) * 3);
  return Array.from({ length: n }).map((_, i) => {
    const t = SEED_LINES[Math.floor(seed(`disp:t:${scope}:${i}`) * SEED_LINES.length)] ?? SEED_LINES[0]!;
    return {
      id: `seed-${scope}-${i}`,
      at: now - (n - i) * 1_800_000 - Math.floor(seed(`disp:a:${scope}:${i}`) * 600_000),
      fromTier: t.fromTier, from: tierName(t.fromTier), toTier: t.toTier,
      body: t.body, priority: t.priority, seeded: true,
    };
  });
}
function tierName(t: DispatchTier): string {
  return t === 'ACTOR' ? 'Field actor' : t === 'FACILITY' ? 'Facility desk'
    : t === 'MINISTRY' ? 'Ministry coordination' : 'National system';
}

export function channel(scope: string, now: number): Dispatch[] {
  hydrate();
  if (!channels.has(scope)) channels.set(scope, seedChannel(scope, now));
  else if (!channels.get(scope)!.some(d => d.seeded)) {
    // keep seeded history beneath any live messages
    channels.set(scope, [...seedChannel(scope, now), ...channels.get(scope)!]);
  }
  return channels.get(scope)!;
}

/** Merged recent traffic across several channels — the national tier
 *  reading every ministry's roll-up at once (newest last). */
export function digest(scopes: string[], now: number, limit = 9): Dispatch[] {
  hydrate();
  const all: Dispatch[] = [];
  for (const s of scopes) all.push(...channel(s, now));
  return all.sort((a, b) => a.at - b.at).slice(-limit);
}

export function send(scope: string, msg: Omit<Dispatch, 'id' | 'at' | 'seeded'>, now: number): void {
  hydrate();
  const list = channels.get(scope) ?? seedChannel(scope, now);
  const id = `d-${now}-${Math.floor(seed(`d:${scope}:${now}`) * 1e6)}`;
  list.push({ ...msg, id, at: now });
  channels.set(scope, list.slice(-60));
  bump();

  // Mirror to substrate. The dispatch-store models tier-to-tier traffic;
  // we persist the issuer's tier as the charter and the channel scope
  // as the target, so cross-process consumers can reconstruct the flow.
  if (substrateAvailable()) {
    const a = resolvedActor();
    void recordDispatchRow({
      ref: id,
      issuedByCharterId: msg.from || scope,
      issuedByOfficerId: a?.kind === 'officer' ? a.id : null,
      kind: `${msg.fromTier.toLowerCase()}-to-${msg.toTier.toLowerCase()}`,
      priority: msg.priority,
      detail: msg.body,
      targetCharterId: scope,
      payload: { fromTier: msg.fromTier, toTier: msg.toTier, scope },
    }).catch(() => { /* best-effort */ });
  }
}
