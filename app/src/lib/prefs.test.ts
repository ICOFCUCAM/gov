import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// Stub a minimal `window` with localStorage so prefs.ts can read/write.
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

import { getPref, getBoolPref, getStringPref, setPref } from './prefs';

beforeEach(() => {
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.clear();
});

describe('getPref', () => {
  it('returns the fallback when nothing is stored', () => {
    expect(getPref<'a' | 'b'>('test.k', ['a', 'b'] as const, 'a')).toBe('a');
  });

  it('returns the stored value when it is in the allowed set', () => {
    setPref('test.k', 'b');
    expect(getPref<'a' | 'b'>('test.k', ['a', 'b'] as const, 'a')).toBe('b');
  });

  it('falls back when stored value is not in the allowed set', () => {
    setPref('test.k', 'rogue');
    expect(getPref<'a' | 'b'>('test.k', ['a', 'b'] as const, 'a')).toBe('a');
  });
});

describe('getBoolPref', () => {
  it('returns true for "1"', () => {
    setPref('test.b', true);
    expect(getBoolPref('test.b', false)).toBe(true);
  });

  it('returns false for "0"', () => {
    setPref('test.b', false);
    expect(getBoolPref('test.b', true)).toBe(false);
  });

  it('returns fallback when absent', () => {
    expect(getBoolPref('test.absent', true)).toBe(true);
    expect(getBoolPref('test.absent', false)).toBe(false);
  });
});

describe('getStringPref', () => {
  it('returns the stored string', () => {
    setPref('test.s', 'hello');
    expect(getStringPref('test.s', 'fallback')).toBe('hello');
  });

  it('returns fallback when absent', () => {
    expect(getStringPref('test.absent', 'fallback')).toBe('fallback');
  });
});

describe('setPref', () => {
  it('removes the key when value is null', () => {
    setPref('test.x', 'something');
    expect(getStringPref('test.x', '')).toBe('something');
    setPref('test.x', null);
    expect(getStringPref('test.x', 'fallback')).toBe('fallback');
  });

  it('namespaces keys under civicos.pref.', () => {
    setPref('foo', 'bar');
    const w = (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window;
    expect(w.localStorage.getItem('civicos.pref.foo')).toBe('bar');
  });
});
