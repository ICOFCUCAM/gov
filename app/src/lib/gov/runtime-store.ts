'use client';

// Runtime store — session-persistent work-item state.
//
// RuntimeQueue instances previously held local state that was lost on
// navigation. This module-singleton store persists every scope's work
// items and records a global transition ledger, so the platform behaves
// like a continuously operating runtime: actions taken in one surface
// remain when you return, and the Operations Ledger sees them all.

import {
  seedWorkItems, applyAction, workflowFor,
  type WorkItem, type WorkKind, type ActionKey,
} from '@/lib/gov/runtime-workflow';
import { appendAudit } from '@/services/audit-ledger';
import { publish as busPublish } from '@/services/event-bus';
import {
  openWorkItemRow, transitionWorkItemRow, substrateAvailable,
} from '@/lib/db/repos/work-items';

export interface LedgerEntry {
  at: number;
  scope: string;
  itemId: string;
  kind: WorkKind;
  from: string;
  to: string;
  action: ActionKey;
  by: string;
}

type Listener = () => void;

const scopes = new Map<string, WorkItem[]>();
const ledger: LedgerEntry[] = [];
const listeners = new Set<Listener>();

let _version = 0;
/** Stable snapshot for useSyncExternalStore — changes only on mutation. */
export function version(): number { return _version; }

// ── Operational continuity ────────────────────────────────────────────
// A sovereign runtime does not forget. Executed work and the transition
// ledger are serialised to client storage so navigation, reload or a new
// session resumes exactly where the operator left off. SSR-safe & inert
// under test (no `window`), so engine determinism is unaffected.

const PERSIST_KEY = 'civicos.runtime.v1';
let _restoredTransitions = 0;
let _persisted = false;
let _lastPersistAt = 0;
let _hydrated = false;

interface RuntimeSnapshot {
  scopes: [string, WorkItem[]][];
  ledger: LedgerEntry[];
  directives: [string, DirectiveRecord][];
  injCount: number;
  at: number;
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    const snap: RuntimeSnapshot = {
      scopes: [...scopes.entries()],
      ledger: ledger.slice(0, 200),
      directives: [...directives.entries()],
      injCount,
      at: Date.now(),
    };
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(snap));
    _persisted = true;
    _lastPersistAt = snap.at;
  } catch {
    // Storage unavailable/quota — continuity degrades gracefully to
    // session-only; never block execution on persistence.
  }
}

/** Hydrate once from client storage before first scope access. */
function hydrate() {
  if (_hydrated || typeof window === 'undefined') return;
  _hydrated = true;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const snap = JSON.parse(raw) as RuntimeSnapshot;
    if (!snap || !Array.isArray(snap.scopes)) return;
    for (const [k, v] of snap.scopes) if (Array.isArray(v)) scopes.set(k, v);
    if (Array.isArray(snap.ledger)) {
      ledger.length = 0;
      ledger.push(...snap.ledger.slice(0, 200));
    }
    if (Array.isArray(snap.directives)) {
      for (const [k, v] of snap.directives) if (k && v) directives.set(k, v);
    }
    if (typeof snap.injCount === 'number') injCount = snap.injCount;
    _restoredTransitions = ledger.length;
    _persisted = true;
    _lastPersistAt = typeof snap.at === 'number' ? snap.at : 0;
    if (scopes.size || ledger.length) _version++;
  } catch {
    // Corrupt snapshot — discard and start a clean runtime.
  }
}

function emit() {
  _version++;
  persist();
  for (const l of listeners) l();
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Items for a scope; seeded deterministically on first access. */
export function getScope(scope: string, kind: WorkKind, n: number): WorkItem[] {
  hydrate();
  let items = scopes.get(scope);
  if (!items) {
    items = seedWorkItems(scope, kind, 0, n);
    scopes.set(scope, items);
  }
  return items;
}

export function actOnItem(scope: string, itemId: string, action: ActionKey, by: string): void {
  const items = scopes.get(scope);
  if (!items) return;
  const idx = items.findIndex(i => i.id === itemId);
  if (idx < 0) return;
  const before = items[idx]!;
  const after = applyAction(before, action, by, Date.now());
  if (after === before) return;
  const next = items.slice();
  next[idx] = after;
  scopes.set(scope, next);
  const last = after.history.at(-1)!;
  ledger.unshift({ at: last.at, scope, itemId, kind: after.kind, from: last.from, to: last.to, action: last.action, by: last.by });
  if (ledger.length > 200) ledger.length = 200;
  appendAudit(scope, by, action, itemId, `${last.from} → ${last.to}`);
  busPublish('runtime.transition', scope, { itemId, action, from: last.from, to: last.to, by, closed: after.closed });
  emit();

  // Mirror to substrate when the item has a persistent counterpart. The
  // server validates the transition independently against the stored
  // workflow definition.
  if (after.meta.persistent === '1' && substrateAvailable()) {
    void transitionWorkItemRow({
      ref: itemId, action, actorName: by, detail: `${last.from} → ${last.to}`,
    }).catch(() => { /* best-effort */ });
  }
}

export function annotateItem(scope: string, itemId: string, note: string, by: string): void {
  const items = scopes.get(scope);
  if (!items || !note.trim()) return;
  const idx = items.findIndex(i => i.id === itemId);
  if (idx < 0) return;
  const it = items[idx]!;
  const notes = it.meta.notes ? `${it.meta.notes}\n${by}: ${note.trim()}` : `${by}: ${note.trim()}`;
  const next = items.slice();
  next[idx] = { ...it, meta: { ...it.meta, notes } };
  scopes.set(scope, next);
  appendAudit(scope, by, 'annotate', itemId, note.trim());
  emit();
}

export function reassignItem(scope: string, itemId: string, assignee: string): void {
  const items = scopes.get(scope);
  if (!items) return;
  const idx = items.findIndex(i => i.id === itemId);
  if (idx < 0) return;
  const next = items.slice();
  next[idx] = { ...items[idx]!, assignee };
  scopes.set(scope, next);
  emit();
}

let injCount = 0;

/** Best-effort substrate mirror for an operator-originated item.
 *  Tags the item with persistent='1' so actOnItem dual-writes transitions. */
function mirrorOpenedItem(scope: string, item: WorkItem, by: string): void {
  if (!substrateAvailable()) return;
  void openWorkItemRow({
    ref: item.id, scope, workflowId: item.kind, kind: item.kind,
    title: item.title, currentStage: item.stage, priority: item.priority,
    assigneeName: by,
    meta: { origin: item.meta.origin ?? 'directive' },
  }).then(row => {
    if (!row) return;
    // Tag the in-memory item so actOnItem mirrors future transitions.
    const items = scopes.get(scope);
    if (!items) return;
    const idx = items.findIndex(i => i.id === item.id);
    if (idx < 0) return;
    const next = items.slice();
    next[idx] = { ...items[idx]!, meta: { ...items[idx]!.meta, persistent: '1' } };
    scopes.set(scope, next);
    _version++;
    for (const l of listeners) l();
  }).catch(() => { /* best-effort */ });
}

/** Inject an operator-originated work item (e.g. an executive directive). */
export function injectItem(scope: string, kind: WorkKind, title: string, by: string): void {
  const wf = workflowFor(kind);
  const items = scopes.get(scope) ?? [];
  const item: WorkItem = {
    id: `${kind.slice(0, 2).toUpperCase()}-D${900 + injCount++}`,
    title,
    kind,
    stage: wf.stages[0]!,
    priority: 'priority',
    assignee: by,
    ageHrs: 0,
    meta: { origin: 'directive' },
    history: [],
    closed: false,
  };
  scopes.set(scope, [item, ...items]);
  ledger.unshift({ at: Date.now(), scope, itemId: item.id, kind, from: '—', to: wf.stages[0]!, action: 'assign', by });
  if (ledger.length > 200) ledger.length = 200;
  appendAudit(scope, by, 'inject', item.id, title);
  mirrorOpenedItem(scope, item, by);
  emit();
}

// ── Idempotent strategic directives ───────────────────────────────────
// A standing sovereign decision must not spam the runtime: executing the
// same directive twice is a no-op. The registry records which decisions
// have been actioned and the runtime item they produced, so the command
// surface can show "executed" state and trace decision → execution.

export interface DirectiveRecord {
  key: string; scope: string; itemId: string; title: string; at: number;
  /** signal the decision is accountable to, captured at execution time */
  metricKey?: string;
  baseline?: number;
  goal?: 'raise' | 'lower';
}
const directives = new Map<string, DirectiveRecord>();

/**
 * Inject a strategic directive exactly once per stable key. Returns the
 * directive record (existing one if already executed — idempotent).
 */
export function injectDirective(
  key: string, scope: string, kind: WorkKind, title: string, by: string,
  accountable?: { metricKey: string; baseline: number; goal: 'raise' | 'lower' },
): DirectiveRecord {
  hydrate();
  const existing = directives.get(key);
  if (existing) return existing;
  const wf = workflowFor(kind);
  const items = scopes.get(scope) ?? [];
  const item: WorkItem = {
    id: `${kind.slice(0, 2).toUpperCase()}-D${900 + injCount++}`,
    title, kind, stage: wf.stages[0]!, priority: 'priority',
    assignee: by, ageHrs: 0, meta: { origin: 'directive' }, history: [], closed: false,
  };
  scopes.set(scope, [item, ...items]);
  ledger.unshift({ at: Date.now(), scope, itemId: item.id, kind, from: '—', to: wf.stages[0]!, action: 'assign', by });
  if (ledger.length > 200) ledger.length = 200;
  const rec: DirectiveRecord = {
    key, scope, itemId: item.id, title, at: Date.now(),
    metricKey: accountable?.metricKey,
    baseline: accountable?.baseline,
    goal: accountable?.goal,
  };
  directives.set(key, rec);
  appendAudit(scope, by, 'inject', item.id, `directive: ${title}`);
  busPublish('runtime.transition', scope, { itemId: item.id, action: 'assign', from: '—', to: wf.stages[0]!, by, closed: false });
  mirrorOpenedItem(scope, item, by);
  emit();
  return rec;
}

/** The execution record for a directive key, or null if not yet actioned. */
export function directiveState(key: string): DirectiveRecord | null {
  return directives.get(key) ?? null;
}

/** True once the runtime work item a directive produced has been closed. */
export function directiveActioned(key: string): boolean {
  const rec = directives.get(key);
  if (!rec) return false;
  const items = scopes.get(rec.scope);
  const it = items?.find(i => i.id === rec.itemId);
  return !!it?.closed;
}

export interface InboxItem { scope: string; item: WorkItem }
/**
 * Directive-origin work items addressed to an institution — the inbound
 * sovereign-command queue rendered INSIDE the institution so a national
 * decision terminates in institutional execution, not a store. An
 * institution is matched tolerantly across its candidate keys (instance
 * id / app id / domain) so scope-id drift never strands a directive.
 */
export function directiveInbox(keys: string[]): InboxItem[] {
  hydrate();
  const ks = keys.filter(Boolean);
  const matches = (scope: string) => {
    const head = scope.split(':')[0]!;
    return ks.some(k => scope === k || scope.startsWith(`${k}:`) || head === k);
  };
  const out: InboxItem[] = [];
  for (const [scope, items] of scopes.entries()) {
    if (!matches(scope)) continue;
    for (const it of items) {
      if (it.meta.origin === 'directive') out.push({ scope, item: it });
    }
  }
  return out.sort((a, b) => Number(a.item.closed) - Number(b.item.closed));
}

export function getLedger(limit = 50): LedgerEntry[] {
  return ledger.slice(0, limit);
}

export interface RuntimeStats {
  scopes: number;
  totalItems: number;
  open: number;
  transitions: number;
  closedByOperator: number;
}
export function runtimeStats(): RuntimeStats {
  let totalItems = 0, open = 0;
  for (const items of scopes.values()) {
    totalItems += items.length;
    open += items.filter(i => !i.closed).length;
  }
  return {
    scopes: scopes.size,
    totalItems,
    open,
    transitions: ledger.length,
    closedByOperator: ledger.filter(e => e.action === 'resolve' || e.action === 'approve').length,
  };
}

export interface RuntimeContinuity {
  persisted: boolean;          // runtime state is being written to client storage
  restoredTransitions: number; // transitions recovered from a prior session
  lastPersistAt: number;       // epoch ms of the last successful persist
}
/** Whether the runtime survived reload — proof of operational continuity. */
export function runtimeContinuity(): RuntimeContinuity {
  return { persisted: _persisted, restoredTransitions: _restoredTransitions, lastPersistAt: _lastPersistAt };
}

export interface ScopeSummary { scope: string; open: number; total: number; transitions: number }
/** Per-scope execution summary — emergent per-institution workload. */
export function scopeSummaries(): ScopeSummary[] {
  const txByScope = new Map<string, number>();
  for (const e of ledger) txByScope.set(e.scope, (txByScope.get(e.scope) ?? 0) + 1);
  return [...scopes.entries()].map(([scope, items]) => ({
    scope,
    open: items.filter(i => !i.closed).length,
    total: items.length,
    transitions: txByScope.get(scope) ?? 0,
  })).sort((a, b) => b.open - a.open);
}

// Operational causality: how much operator execution has improved (or
// degraded) an institution. Positive disposition (advance/approve/resolve/
// assign) lifts; reject/return weigh down. Bounded so a single institution
// cannot dominate national posture but execution is genuinely consequential.
export function executionDelta(instId: string): number {
  let v = 0;
  for (const e of ledger) {
    // Scopes are `${instId}:${domain}` — match the exact instance, not a
    // prefix, so inst1 does not also absorb inst12's execution ledger.
    if (e.scope !== instId && !e.scope.startsWith(`${instId}:`)) continue;
    if (e.action === 'resolve' || e.action === 'approve') v += 2.4;
    else if (e.action === 'advance' || e.action === 'assign') v += 1.2;
    else if (e.action === 'reject' || e.action === 'return') v -= 2.6;
  }
  return Math.round(Math.max(-15, Math.min(15, v)));
}
