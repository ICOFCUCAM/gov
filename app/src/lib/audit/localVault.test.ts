import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

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

import { appendAuditEntry, readAuditEntries, clearAuditEntries } from './localVault';

beforeEach(() => {
  (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.clear();
});

describe('localVault', () => {
  it('starts empty', () => {
    expect(readAuditEntries()).toEqual([]);
  });

  it('appends an entry with type and payload', () => {
    const entry = appendAuditEntry('contestation', { id: 'X' });
    expect(entry.type).toBe('contestation');
    expect(entry.payload).toEqual({ id: 'X' });
    expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('reads back appended entries in insertion order', () => {
    appendAuditEntry('a', 1);
    appendAuditEntry('b', 2);
    const entries = readAuditEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.type).toBe('a');
    expect(entries[1]!.type).toBe('b');
  });

  it('clears all entries', () => {
    appendAuditEntry('a', null);
    appendAuditEntry('b', null);
    clearAuditEntries();
    expect(readAuditEntries()).toEqual([]);
  });

  it('tolerates corrupt localStorage payloads', () => {
    (globalThis as unknown as { window: { localStorage: MemoryStorage } })
      .window.localStorage.setItem('civicos:audit', '{not json');
    expect(readAuditEntries()).toEqual([]);
  });
});
