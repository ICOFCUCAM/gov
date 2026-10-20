import { describe, it, expect, afterEach, vi } from 'vitest';
import { seed } from './state';
import { seedQueue, seedIncidents } from './seeds';
import { getSession } from './permits';

// A production installation starts with no sample records (lib/ops/mode.ts, directions 10.3).
describe('seeds by installation mode', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('creates no sample records in production', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const s = seed();
    for (const k of ['permits', 'bills', 'receipts', 'notifications', 'incidents', 'integrations', 'grants', 'webhooks', 'releases', 'configs'] as const) {
      expect(s[k], k).toEqual([]);
    }
    expect(s.tenantSync).toEqual({});
    expect(s.lifecycle.events).toEqual([]);
    // The institutions are structure, not samples.
    expect(s.ministries.length).toBeGreaterThan(0);
    expect(seedQueue(s.ministries[0]!.id)).toEqual([]);
    expect(seedIncidents('x', s.ministries[0]!.archetype).every(i => !i.active)).toBe(true);
    expect(getSession()).toEqual({ authenticated: false });
  });

  it('keeps the samples in demo and training installations', () => {
    for (const mode of ['demo', 'training']) {
      vi.stubEnv('CIVICOS_MODE', mode);
      const s = seed();
      expect(s.permits.length, mode).toBeGreaterThan(0);
      expect(s.bills.length, mode).toBeGreaterThan(0);
      expect(getSession().authenticated, mode).toBe(true);
    }
  });
});
