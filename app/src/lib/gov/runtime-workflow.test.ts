import { describe, it, expect } from 'vitest';
import {
  WORKFLOWS, workflowFor, actionsFor, isTerminal,
  seedWorkItems, applyAction, queueStats, type WorkKind, type WorkItem,
} from './runtime-workflow';

const KINDS: WorkKind[] = ['approval', 'permit', 'procurement', 'encounter', 'bill', 'judicial', 'case', 'incident'];

describe('operational runtime workflow', () => {
  it('every workflow is a coherent reachable state machine', () => {
    for (const k of KINDS) {
      const wf = workflowFor(k);
      expect(wf.stages.length).toBeGreaterThan(2);
      expect(wf.terminal.length).toBeGreaterThan(0);
      // every non-terminal stage has at least one action
      for (const s of wf.stages) {
        if (!wf.terminal.includes(s)) expect(actionsFor(k, s).length).toBeGreaterThan(0);
      }
      // every transition target is a declared stage
      for (const s of Object.keys(wf.transitions)) {
        for (const nx of Object.values(wf.transitions[s]!)) {
          expect(wf.stages.includes(nx as string)).toBe(true);
        }
      }
    }
  });

  it('seeds deterministically and bounded', () => {
    const a = seedWorkItems('MOH', 'encounter', 50);
    expect(a).toEqual(seedWorkItems('MOH', 'encounter', 50));
    expect(a.length).toBe(12);
    for (const it of a) {
      expect(WORKFLOWS.encounter.stages).toContain(it.stage);
      expect(['routine', 'priority', 'urgent']).toContain(it.priority);
    }
  });

  it('applyAction performs real, audited state transitions; invalid is a no-op', () => {
    const [item] = seedWorkItems('X', 'approval', 10);
    expect(item).toBeDefined();
    const bogus = applyAction(item!, 'resolve', 'tester', 1);
    // resolve only valid at Decision; if not there it is a no-op
    if (item!.stage !== 'Decision') expect(bogus).toBe(item);

    // drive a fresh item to a terminal state via valid actions
    let cur: WorkItem = { ...seedWorkItems('Y', 'approval', 0)[0]!, stage: 'Submitted', history: [], closed: false };
    const path: [string, 'advance' | 'approve' | 'resolve'][] = [
      ['Submitted', 'advance'], ['Triaged', 'advance'], ['Under review', 'approve'], ['Decision', 'resolve'],
    ];
    for (const [, act] of path) cur = applyAction(cur, act, 'op', 5);
    expect(cur.stage).toBe('Closed');
    expect(cur.closed).toBe(true);
    expect(cur.history.length).toBe(4);
    expect(isTerminal('approval', cur.stage)).toBe(true);
  });

  it('queueStats aggregates coherently', () => {
    const items = seedWorkItems('Q', 'judicial', 30, 16);
    const s = queueStats(items);
    expect(s.total).toBe(16);
    expect(s.open + s.closed).toBe(16);
    expect(s.urgent).toBeLessThanOrEqual(s.open);
  });
});
