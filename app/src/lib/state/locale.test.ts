import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

beforeAll(() => {
  (globalThis as unknown as { window: { localStorage: MemoryStorage }; document: { documentElement: { lang: string; dir: string } } }).window = {
    localStorage: new MemoryStorage(),
  };
  (globalThis as unknown as { document: { documentElement: { lang: string; dir: string } } }).document = {
    documentElement: { lang: '', dir: '' },
  };
});

import { getStoredLocale, setStoredLocale } from './locale';

beforeEach(() => {
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.clear();
});

describe('locale state', () => {
  it('returns the default locale when nothing is stored', () => {
    expect(getStoredLocale()).toBe('en');
  });

  it('round-trips a stored locale', () => {
    setStoredLocale('sw');
    expect(getStoredLocale()).toBe('sw');
  });

  it('rejects unrecognised stored locales and returns the default', () => {
    (globalThis as unknown as { window: { localStorage: MemoryStorage } })
      .window.localStorage.setItem('civicos:locale', 'xx');
    expect(getStoredLocale()).toBe('en');
  });

  it('sets documentElement.lang and dir on write', () => {
    const doc = (globalThis as unknown as { document: { documentElement: { lang: string; dir: string } } }).document;
    setStoredLocale('fr');
    expect(doc.documentElement.lang).toBe('fr');
    expect(doc.documentElement.dir).toBe('ltr');
    setStoredLocale('ar');
    expect(doc.documentElement.dir).toBe('rtl');
  });
});
