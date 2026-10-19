import { describe, it, expect } from 'vitest';
import { withDefaults } from './defaults';

const seed = () => ({
  list: [{ id: 1 }],
  lifecycle: { state: 'active', history: [] as string[], policy: { retentionDays: 30, legalHold: false } },
  queues: { m1: ['sample'] } as Record<string, string[]>,
  fresh: 'new field',
  setup: null as null | { done: boolean },
});

describe('snapshot defaults', () => {
  it('fills fields added since the snapshot, at any depth, without overwriting saved values', () => {
    const saved = { list: [], lifecycle: { state: 'suspended', history: ['x'], policy: { retentionDays: 90 } }, queues: { m9: ['real'] } };
    const out = withDefaults(saved as never, seed(), { opaque: ['queues'] });
    expect(out.list).toEqual([]);
    expect(out.lifecycle).toEqual({ state: 'suspended', history: ['x'], policy: { retentionDays: 90, legalHold: false } });
    expect(out.fresh).toBe('new field');
    // A dictionary of records keeps exactly what was saved.
    expect(out.queues).toEqual({ m9: ['real'] });
    expect(out.setup).toBeNull();
  });

  it('keeps saved nulls and falsy values; a missing or broken snapshot gives the seed', () => {
    expect(withDefaults({ setup: { done: true }, fresh: '' } as never, seed()).fresh).toBe('');
    expect(withDefaults(undefined, seed()).fresh).toBe('new field');
    expect(withDefaults([] as never, seed()).list).toEqual([{ id: 1 }]);
  });
});
