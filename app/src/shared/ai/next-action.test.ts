import { describe, it, expect } from 'vitest';
import { nextBestAction } from './next-action';
import { seedWorkItems, actionsFor, applyAction, type WorkItem } from '@/lib/gov/runtime-workflow';

describe('AI next-best-action', () => {
  it('recommends a legitimate action; terminal items recommend none', () => {
    const items = seedWorkItems('AI', 'approval', 0, 8);
    for (const it of items) {
      const n = nextBestAction(it);
      if (n.action) {
        expect(actionsFor(it.kind, it.stage)).toContain(n.action);
        expect(n.confidence).toBeGreaterThanOrEqual(45);
        expect(n.confidence).toBeLessThanOrEqual(96);
      }
    }
    // drive an approval item to a terminal state
    let cur: WorkItem = { ...items[0]!, stage: 'Submitted', history: [], closed: false };
    for (const a of ['advance', 'advance', 'approve', 'resolve'] as const) cur = applyAction(cur, a, 'op', 1);
    const term = nextBestAction(cur);
    expect(term.action).toBeNull();
    expect(term.confidence).toBe(100);
  });

  it('urgent / SLA-breaching items prefer escalation when available & is deterministic', () => {
    const base = seedWorkItems('AI2', 'incident', 0, 1)[0]!;
    const urgent: WorkItem = { ...base, stage: 'Acknowledged', priority: 'urgent', ageHrs: 200 };
    const n = nextBestAction(urgent);
    expect(n).toEqual(nextBestAction(urgent));
    expect(n.urgent).toBe(true);
    if (actionsFor('incident', 'Acknowledged').includes('escalate')) expect(n.action).toBe('escalate');
  });
});
