import { describe, it, expect, beforeEach } from 'vitest';
import {
  getScope, actOnItem, annotateItem, reassignItem, injectItem,
  getLedger, runtimeStats,
} from './runtime-store';

describe('runtime store', () => {
  beforeEach(() => {
    // unique scopes per test keep the module singleton isolated
  });

  it('seeds a scope once and persists transitions + ledger', () => {
    const s = 't1';
    const a = getScope(s, 'approval', 8);
    expect(a.length).toBe(8);
    // same reference returned on re-access (persisted)
    expect(getScope(s, 'approval', 8)).toBe(a);

    const item = a[0]!;
    actOnItem(s, item.id, 'advance', 'tester');
    const after = getScope(s, 'approval', 8).find(i => i.id === item.id)!;
    expect(after.stage).not.toBe(item.stage);
    expect(after.history.length).toBe(1);
    const led = getLedger(10);
    expect(led[0]!.scope).toBe(s);
    expect(led[0]!.itemId).toBe(item.id);
    expect(led[0]!.action).toBe('advance');
  });

  it('annotation and reassignment mutate the entity', () => {
    const s = 't2';
    const it = getScope(s, 'case', 5)[0]!;
    annotateItem(s, it.id, 'Investigated root cause', 'K. Otieno');
    reassignItem(s, it.id, 'S. Patel');
    const cur = getScope(s, 'case', 5).find(x => x.id === it.id)!;
    expect(cur.meta.notes).toContain('Investigated root cause');
    expect(cur.assignee).toBe('S. Patel');
  });

  it('injectItem adds an operator-originated item and ledger entry', () => {
    const s = 't3';
    getScope(s, 'case', 3);
    injectItem(s, 'case', 'Convene cabinet cell', 'Cabinet Office');
    const items = getScope(s, 'case', 3);
    expect(items[0]!.title).toBe('Convene cabinet cell');
    expect(items[0]!.meta.origin).toBe('directive');
    expect(getLedger(5)[0]!.by).toBe('Cabinet Office');
    const st = runtimeStats();
    expect(st.scopes).toBeGreaterThan(0);
    expect(st.totalItems).toBeGreaterThan(0);
  });

  it('invalid actions are no-ops (no ledger growth)', () => {
    const s = 't4';
    const it = getScope(s, 'approval', 4).find(x => x.stage === 'Submitted');
    if (it) {
      const before = getLedger(99).length;
      actOnItem(s, it.id, 'resolve', 'tester'); // resolve invalid at Submitted
      expect(getLedger(99).length).toBe(before);
    }
  });

  it('scopeSummaries reflects scopes and a transition writes a verifiable audit chain', async () => {
    const { scopeSummaries } = await import('./runtime-store');
    const { verifyChain } = await import('@/services/audit-ledger');
    const { actionsFor } = await import('./runtime-workflow');
    const s = 't5:command';
    const its = getScope(s, 'incident', 6);
    const target = its.find(i => actionsFor(i.kind, i.stage).length > 0)!;
    actOnItem(s, target.id, actionsFor(target.kind, target.stage)[0]!, 'Duty (commander)');
    const sum = scopeSummaries().find(x => x.scope === s)!;
    expect(sum).toBeTruthy();
    expect(sum.total).toBe(6);
    expect(sum.transitions).toBeGreaterThanOrEqual(1);
    const chain = verifyChain(s);
    expect(chain.entries).toBeGreaterThanOrEqual(1);
    expect(chain.intact).toBe(true);
  });
});

describe('operational causality', () => {
  it('executionDelta is bounded and rewards positive disposition; transitions emit on the bus', async () => {
    const { getScope, actOnItem, executionDelta } = await import('./runtime-store');
    const { actionsFor } = await import('./runtime-workflow');
    const { eventLog } = await import('@/services/event-bus');
    const inst = 'MIN-CAUSAL';
    const s = `${inst}:command`;
    expect(executionDelta(inst)).toBe(0);
    for (let r = 0; r < 4; r++) {
      const items = getScope(s, 'incident', 8);
      const tgt = items.find(i => actionsFor(i.kind, i.stage).length > 0);
      if (!tgt) break;
      actOnItem(s, tgt.id, actionsFor(tgt.kind, tgt.stage)[0]!, 'Officer (commander)');
    }
    const d = executionDelta(inst);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(15);
    expect(eventLog(20).some(e => e.type === 'runtime.transition' && e.source === s)).toBe(true);
  });
});

describe('operational continuity', () => {
  it('persistence is SSR/test-safe and never blocks execution', async () => {
    const { runtimeContinuity, getScope, actOnItem } = await import('./runtime-store');
    const { actionsFor } = await import('./runtime-workflow');
    // No `window` under the node test env → continuity is inert, and the
    // runtime keeps executing deterministically without throwing.
    const s = 'cont:1';
    const its = getScope(s, 'approval', 5);
    const tgt = its.find(i => actionsFor(i.kind, i.stage).length > 0)!;
    actOnItem(s, tgt.id, actionsFor(tgt.kind, tgt.stage)[0]!, 'tester');
    const c = runtimeContinuity();
    expect(c.persisted).toBe(false);
    expect(c.restoredTransitions).toBe(0);
    expect(typeof c.lastPersistAt).toBe('number');
  });

  it('strategic directives are idempotent per key', async () => {
    const { injectDirective, directiveState, getScope } = await import('./runtime-store');
    const s = 'dir:1';
    const k = 'exec-stabilise|dir:1';
    expect(directiveState(k)).toBeNull();
    const r1 = injectDirective(k, s, 'incident', 'Stabilise X', 'Sovereign Command');
    const r2 = injectDirective(k, s, 'incident', 'Stabilise X', 'Sovereign Command');
    // Second execution is a no-op: same record, no duplicate work item.
    expect(r2).toEqual(r1);
    expect(directiveState(k)!.itemId).toBe(r1.itemId);
    expect(getScope(s, 'incident', 4).filter(i => i.id === r1.itemId).length).toBe(1);
  });

  it('directiveInbox surfaces directives to an institution by tolerant key match', async () => {
    const { injectDirective, directiveInbox } = await import('./runtime-store');
    injectDirective('inbox-A|treasury:command', 'treasury:command', 'procurement', 'Liquidity', 'Sovereign Command');
    // Matches on the institution head segment regardless of sub-scope.
    const got = directiveInbox(['treasury']);
    expect(got.some(x => x.scope === 'treasury:command' && x.item.title === 'Liquidity')).toBe(true);
    // A non-matching institution sees nothing of it.
    expect(directiveInbox(['health']).some(x => x.scope === 'treasury:command')).toBe(false);
  });
});
