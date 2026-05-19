import { describe, it, expect } from 'vitest';
import { thread, post, encounterDigest, version } from './encounter-store';

describe('encounter-store', () => {
  it('seeds a deterministic non-empty thread with both parties', () => {
    const a = thread('t:enc:1', 'Dr Vance', 'A. Okonkwo', 1_000_000);
    expect(a.length).toBeGreaterThanOrEqual(3);
    expect(a.every(m => m.author === 'OFFICIAL' || m.author === 'PUBLIC')).toBe(true);
    const names = new Set(a.map(m => m.name));
    expect([...names].some(n => n === 'Dr Vance' || n === 'A. Okonkwo')).toBe(true);
    // seeded turns are chronological
    for (let i = 1; i < a.length; i++) expect(a[i]!.at).toBeGreaterThanOrEqual(a[i - 1]!.at);
  });

  it('appends a posted turn and bumps version', () => {
    const v0 = version();
    post('t:enc:2', { author: 'PUBLIC', name: 'R. Khan', kind: 'question', body: 'Is my referral approved?' }, 2_000_000);
    expect(version()).toBeGreaterThan(v0);
    const t = thread('t:enc:2', 'Dr Vance', 'R. Khan', 2_000_000);
    const last = t[t.length - 1]!;
    expect(last.body).toBe('Is my referral approved?');
    expect(last.seeded).toBeFalsy();
  });

  it('encounterDigest does not reorder the underlying threads', () => {
    post('t:enc:nm', { author: 'PUBLIC', name: 'C', kind: 'note', body: 'x1' }, 7_000_000);
    post('t:enc:nm', { author: 'OFFICIAL', name: 'O', kind: 'note', body: 'x2' }, 7_100_000);
    const before = thread('t:enc:nm', 'O', 'C', 7_100_000).map(m => m.id);
    encounterDigest(['t:enc:nm'], 'O', 'C', 7_100_000, 999);
    expect(thread('t:enc:nm', 'O', 'C', 7_100_000).map(m => m.id)).toEqual(before);
  });

  it('caps a thread at 60 live turns, keeping the newest', () => {
    for (let i = 0; i < 80; i++) post('t:enc:cap', { author: 'PUBLIC', name: 'C', kind: 'note', body: `t${i}` }, 9_000_000 + i);
    const th = thread('t:enc:cap', 'O', 'C', 9_100_000);
    expect(th.filter(m => !m.seeded).length).toBeLessThanOrEqual(60);
    expect(th[th.length - 1]!.body).toBe('t79');
  });

  it('encounterDigest merges threads newest-last within the limit', () => {
    post('t:enc:d1', { author: 'PUBLIC', name: 'C', kind: 'question', body: 'older' }, 4_000_000);
    post('t:enc:d2', { author: 'OFFICIAL', name: 'O', kind: 'result', body: 'newer' }, 4_500_000);
    const d = encounterDigest(['t:enc:d1', 't:enc:d2'], 'O', 'C', 4_500_000, 6);
    expect(d.length).toBeLessThanOrEqual(6);
    for (let i = 1; i < d.length; i++) expect(d[i]!.msg.at).toBeGreaterThanOrEqual(d[i - 1]!.msg.at);
    expect(d[d.length - 1]!.msg.body).toBe('newer');
  });
});
