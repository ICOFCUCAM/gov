import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

// Memory-backed window.localStorage stub so seen.ts can read/write.
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

import { isSeen, markSeen, clearSeen, subscribeSeen } from './seen';

beforeEach(() => {
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.clear();
});

describe('markSeen / isSeen', () => {
  it('starts empty for an actor', () => {
    expect(isSeen('a-1', 'alert-1')).toBe(false);
  });

  it('records and recognises a seen id', () => {
    markSeen('a-1', ['alert-1']);
    expect(isSeen('a-1', 'alert-1')).toBe(true);
  });

  it('keeps separate sets per actor', () => {
    markSeen('a-1', ['alert-1']);
    expect(isSeen('a-2', 'alert-1')).toBe(false);
  });

  it('treats null actor as the anonymous set', () => {
    markSeen(null, ['alert-x']);
    expect(isSeen(null, 'alert-x')).toBe(true);
    expect(isSeen('a-1', 'alert-x')).toBe(false);
  });

  it('is idempotent when re-marking the same id', () => {
    markSeen('a-1', ['alert-1']);
    markSeen('a-1', ['alert-1']);
    markSeen('a-1', ['alert-1', 'alert-2']);
    expect(isSeen('a-1', 'alert-1')).toBe(true);
    expect(isSeen('a-1', 'alert-2')).toBe(true);
  });

  it('does nothing when called with an empty list', () => {
    markSeen('a-1', []);
    expect(isSeen('a-1', 'anything')).toBe(false);
  });
});

describe('clearSeen', () => {
  it('removes all entries for the actor', () => {
    markSeen('a-1', ['x', 'y', 'z']);
    clearSeen('a-1');
    expect(isSeen('a-1', 'x')).toBe(false);
    expect(isSeen('a-1', 'y')).toBe(false);
  });

  it('does not affect other actors', () => {
    markSeen('a-1', ['x']);
    markSeen('a-2', ['x']);
    clearSeen('a-1');
    expect(isSeen('a-2', 'x')).toBe(true);
  });
});

describe('subscribeSeen', () => {
  it('notifies listeners on writes and stops after unsubscribe', () => {
    const fn = vi.fn();
    const unsub = subscribeSeen(fn);
    markSeen('a-1', ['x']);
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    markSeen('a-1', ['y']);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
