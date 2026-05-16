'use client';

// Runtime store — session-persistent work-item state.
//
// RuntimeQueue instances previously held local state that was lost on
// navigation. This module-singleton store persists every scope's work
// items and records a global transition ledger, so the platform behaves
// like a continuously operating runtime: actions taken in one surface
// remain when you return, and the Operations Ledger sees them all.

import {
  seedWorkItems, applyAction, type WorkItem, type WorkKind, type ActionKey,
} from '@/lib/gov/runtime-workflow';

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

function emit() {
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
