import { describe, it, expect } from 'vitest';
import { thread, post, version } from './encounter-store';

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
});
