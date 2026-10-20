import { describe, it, expect, beforeEach } from 'vitest';
import { noteCheck, resetRegisterWatch, HARVEST } from './watch';
import { listAudit } from '@/lib/data/store/audit';

describe('harvesting watch on the public professional check', () => {
  beforeEach(() => resetRegisterWatch());
  it('flags a caller once a day after many misses, keeping only a salted hash of the caller', () => {
    const t = Date.parse('2026-10-20T10:00:00Z');
    const flagged = Array.from({ length: HARVEST.misses + 5 }, (_, i) => noteCheck('a:198.51.100.9', false, t + i * 1000)).filter(Boolean);
    expect(flagged).toHaveLength(1);
    expect(noteCheck('a:203.0.113.1', true, t)).toBe(false);
    const e = listAudit().find(x => x.action === 'register.harvest.suspected')!;
    expect(e.resource).toMatch(/^Caller:[0-9a-f]{16}$/);
    expect(JSON.stringify(e)).not.toContain('198.51.100.9');
    // The next day it can be flagged again.
    expect(Array.from({ length: HARVEST.misses + 1 }, (_, i) => noteCheck('a:198.51.100.9', false, t + 86_400_000 + i * 1000)).filter(Boolean)).toHaveLength(1);
  });
});
