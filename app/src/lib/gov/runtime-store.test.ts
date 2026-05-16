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
