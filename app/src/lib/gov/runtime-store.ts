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

function emit() {
  _version++;
  for (const l of listeners) l();
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Items for a scope; seeded deterministically on first access. */
export function getScope(scope: string, kind: WorkKind, n: number): WorkItem[] {
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
  emit();
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
  emit();
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
