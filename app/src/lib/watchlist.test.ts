import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

beforeAll(() => {
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = {
    localStorage: new MemoryStorage(),
  };
});

import { listWatch, isWatched, toggleWatch, subscribeWatch, watchHref, type WatchEntry } from './watchlist';

beforeEach(() => {
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.clear();
});

describe('toggleWatch / isWatched / listWatch', () => {
  it('starts empty', () => {
    expect(listWatch('a-1')).toEqual([]);
    expect(isWatched('a-1', 'work-item', 'WI-1')).toBe(false);
  });

  it('adds an entry the first time toggled', () => {
    const added = toggleWatch('a-1', { kind: 'work-item', ref: 'WI-1', label: 'test' });
    expect(added).toBe(true);
    expect(isWatched('a-1', 'work-item', 'WI-1')).toBe(true);
    expect(listWatch('a-1')).toHaveLength(1);
  });

  it('removes an entry the second time toggled', () => {
    toggleWatch('a-1', { kind: 'work-item', ref: 'WI-1', label: 'test' });
    const removed = toggleWatch('a-1', { kind: 'work-item', ref: 'WI-1', label: 'test' });
    expect(removed).toBe(false);
    expect(isWatched('a-1', 'work-item', 'WI-1')).toBe(false);
  });

  it('keeps separate sets per actor', () => {
    toggleWatch('a-1', { kind: 'directive', ref: 'D-1', label: 'd' });
    expect(isWatched('a-2', 'directive', 'D-1')).toBe(false);
  });

  it('list is sorted newest-first', async () => {
    toggleWatch('a-1', { kind: 'work-item', ref: 'WI-1', label: 'first' });
    await new Promise(r => setTimeout(r, 5));
    toggleWatch('a-1', { kind: 'work-item', ref: 'WI-2', label: 'second' });
    const out = listWatch('a-1');
    expect(out[0]!.ref).toBe('WI-2');
    expect(out[1]!.ref).toBe('WI-1');
  });
});

describe('subscribeWatch', () => {
  it('notifies on writes and stops after unsubscribe', () => {
    const fn = vi.fn();
    const unsub = subscribeWatch(fn);
    toggleWatch('a-1', { kind: 'dispatch', ref: 'DS-1', label: '' });
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    toggleWatch('a-1', { kind: 'dispatch', ref: 'DS-2', label: '' });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('watchHref', () => {
  const cases: Array<[WatchEntry['kind'], string]> = [
    ['work-item', '/gov/items/'],
    ['directive', '/gov/directives/'],
    ['dispatch', '/gov/dispatches/'],
    ['escalation', '/gov/escalations/'],
    ['service-request', '/gov/intake/request/'],
    ['appeal', '/gov/intake/appeal/'],
  ];
  for (const [kind, prefix] of cases) {
    it(`routes ${kind} under ${prefix}`, () => {
      const href = watchHref({ kind, ref: 'X-1', label: '', addedAt: 0 });
      expect(href.startsWith(prefix)).toBe(true);
    });
  }

  it('url-encodes the ref where applicable', () => {
    expect(watchHref({ kind: 'work-item', ref: 'a/b c', label: '', addedAt: 0 }))
      .toBe('/gov/items/a%2Fb%20c');
  });
});
