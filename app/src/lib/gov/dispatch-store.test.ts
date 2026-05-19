import { describe, it, expect } from 'vitest';
import { channel, send, digest, version } from './dispatch-store';

describe('dispatch-store', () => {
  it('seeds a deterministic non-empty channel', () => {
    const a = channel('t:disp:1', 1_000_000);
    expect(a.length).toBeGreaterThanOrEqual(3);
    expect(a.every(d => d.seeded)).toBe(true);
    for (let i = 1; i < a.length; i++) expect(a[i]!.at).toBeGreaterThanOrEqual(a[i - 1]!.at);
  });

  it('send appends a live message and bumps version', () => {
    const v0 = version();
    send('t:disp:2', { fromTier: 'FACILITY', from: 'STN-1 desk', toTier: 'MINISTRY', body: 'Resource concurrence requested.', priority: 'priority' }, 2_000_000);
    expect(version()).toBeGreaterThan(v0);
    const c = channel('t:disp:2', 2_000_000);
    expect(c[c.length - 1]!.body).toBe('Resource concurrence requested.');
    expect(c[c.length - 1]!.seeded).toBeFalsy();
  });

  it('digest merges channels newest-last and respects the limit', () => {
    send('t:disp:a', { fromTier: 'MINISTRY', from: 'M', toTier: 'NATIONAL', body: 'first', priority: 'routine' }, 3_000_000);
    send('t:disp:b', { fromTier: 'MINISTRY', from: 'M', toTier: 'NATIONAL', body: 'second', priority: 'routine' }, 3_100_000);
    const d = digest(['t:disp:a', 't:disp:b'], 3_100_000, 5);
    expect(d.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < d.length; i++) expect(d[i]!.at).toBeGreaterThanOrEqual(d[i - 1]!.at);
    expect(d[d.length - 1]!.body).toBe('second');
  });
});
